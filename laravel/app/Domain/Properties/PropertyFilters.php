<?php

namespace App\Domain\Properties;

use App\Contract\Contract;
use App\Store\DocumentStore;
use App\Support\Js;
use App\Support\Query\Filters;
use App\Support\Query\QueryParams;
use App\Support\Time\Clock;
use Carbon\CarbonImmutable;
use Collator;

/**
 * Property search (01_API_CONTRACT.md §5.7, 05_BUSINESS_RULES.md → "Property
 * search"; the port of `mock-server/lib/propertyFilters.js`).
 *
 * One class implements every filter and every sort of the listing — public
 * and admin — so `GET /properties` and `GET /admin/properties` cannot
 * disagree about what `bedrooms=3` means. The rules that need explaining:
 *
 *   price   `pricing.price` for a sale, `pricing.rentPerMonth` for a rent or
 *           a lease, `priceRangeMin` for a project quoted as a range. A listing
 *           on request has no number: it drops out as soon as a price filter
 *           is set and sorts last on either price sort, and a price sort puts
 *           sales before rentals — a total and a monthly figure are not one
 *           scale.
 *   area    `superBuiltUpArea ?? carpetArea ?? plotArea` in square feet, and
 *           the bounds converted from `areaUnit`, so `minArea=100&areaUnit=sqm`
 *           compares like with like.
 *   beds    the listing's own `configuration.bedrooms` **or** any active unit
 *           configuration's, `5` meaning "five or more".
 *
 * Everything works on the stored document; the embeds are attached to the
 * page a route returns, not to the whole collection.
 */
final class PropertyFilters
{
    /** `bedrooms=5` and `bedrooms=5,4` both mean "5 or more" for the 5. */
    public const MAX_BEDROOM_BUCKET = 5;

    /** The comparators of §5.7, and the admin columns of §5.14 that honour `order`. */
    private const COMPARATORS = ['relevance', 'newest', 'price-asc', 'price-desc', 'area-desc', 'popular'];

    private const ADMIN_VALUES = ['updatedAt', 'createdAt', 'viewCount', 'priorityOrder', 'seoScore', 'title'];

    /** The filters that match one value of the listing against a list of them. */
    private const LIST_FILTERS = [
        'listingType', 'segment', 'propertyTypeId', 'localityId', 'cityId',
        'constructionStatus', 'availability', 'furnishing', 'facing', 'developerId',
    ];

    /** The admin list's own: `agentId` is the Team list's count and "Reassign listings to…". */
    private const ADMIN_LIST_FILTERS = ['seoScoreBand', 'createdBy', 'agentId'];

    private const FLAGS = ['isFeatured', 'isVerified', 'reraRegistered'];

    private static ?Collator $collator = null;

    /* ------------------------------------------------------------------ *
     * What a listing is found under
     * ------------------------------------------------------------------ */

    /** The number a price filter compares against, or null for "on request". */
    public static function priceOf(array $property): int|float|null
    {
        $pricing = $property['pricing'] ?? null;
        if (Js::get($pricing, 'priceOnRequest')) {
            return null;
        }
        $value = in_array($property['listingType'] ?? null, ['rent', 'lease'], true)
            ? Js::get($pricing, 'rentPerMonth')
            : (Js::get($pricing, 'price') ?? Js::get($pricing, 'priceRangeMin'));

        return Js::isNumber($value) ? $value : null;
    }

    /** `AREA_UNITS.toSqft`: a missing unit is sqft, an unknown one answers null. */
    public static function toSqft(mixed $value, mixed $unit): int|float|null
    {
        if (! Js::isNumber($value)) {
            return null;
        }
        $factor = Contract::enumMeta('AREA_UNITS', $unit === null || $unit === '' ? 'sqft' : $unit)['sqftFactor'] ?? null;

        return $factor === null ? null : $value * $factor;
    }

    /** The listing's headline area in square feet, or null. */
    public static function areaInSqft(array $property): int|float|null
    {
        $area = $property['area'] ?? null;
        $value = Js::get($area, 'superBuiltUpArea') ?? Js::get($area, 'carpetArea') ?? Js::get($area, 'plotArea');

        return Js::isNumber($value) ? self::toSqft($value, Js::get($area, 'areaUnit') ?? 'sqft') : null;
    }

    /**
     * Every bedroom count the listing can be found under: its own and its
     * active unit configurations', each once, in that order.
     *
     * @return array<int, int|float>
     */
    public static function bedroomsOf(array $property): array
    {
        $counts = [];
        $own = Js::get($property['configuration'] ?? null, 'bedrooms');
        if (Js::isNumber($own)) {
            $counts[] = $own;
        }
        foreach (Js::isList($property['unitConfigurations'] ?? null) ? $property['unitConfigurations'] : [] as $unit) {
            $bedrooms = Js::get($unit, 'bedrooms');
            if (Js::get($unit, 'isActive') !== false && Js::isNumber($bedrooms) && ! in_array($bedrooms, $counts)) {
                $counts[] = $bedrooms;
            }
        }

        return $counts;
    }

    /* ------------------------------------------------------------------ *
     * Filtering
     * ------------------------------------------------------------------ */

    /**
     * Applies every §5.7 filter the query sets. `ids=3,1` answers those
     * listings in that order and ignores every other filter.
     *
     * @param  array<int, array>  $items  the listings in scope (public: active only)
     */
    public static function apply(array $items, QueryParams $query, DocumentStore $store, bool $admin = false): array
    {
        $wanted = Filters::csv($query->get('ids'));
        if ($wanted !== []) {
            $found = [];
            foreach ($wanted as $id) {
                foreach ($items as $property) {
                    if (Js::string($property['id']) === $id) {
                        $found[] = $property;
                        break;
                    }
                }
            }

            return $found;
        }

        $criteria = self::criteria($query, $admin);

        return array_values(array_filter($items, fn (array $property) => self::matches($property, $criteria, $store)));
    }

    /** The query read once: the multi-value filters it sets, its bounds, flags and search. */
    private static function criteria(QueryParams $query, bool $admin): array
    {
        $names = [...self::LIST_FILTERS, 'bedrooms', 'amenityIds', 'badgeIds', ...($admin ? self::ADMIN_LIST_FILTERS : [])];
        $lists = [];
        foreach ($names as $name) {
            $values = Filters::csv($query->get($name));
            if ($values !== []) {
                $lists[$name] = $values;
            }
        }
        if (isset($lists['bedrooms'])) {
            // The counts asked for; `bedrooms=abc` asks for none and so matches nothing.
            $lists['bedrooms'] = array_values(array_filter(
                array_map(fn (string $value) => Js::toNumber($value), $lists['bedrooms']),
                fn ($count) => $count !== null && is_finite((float) $count),
            ));
        }
        $flags = [];
        foreach ([...self::FLAGS, ...($admin ? ['isActive'] : [])] as $flag) {
            $wanted = Filters::bool($query->get($flag));
            if ($wanted !== null) {
                $flags[$flag] = $wanted;
            }
        }
        $possessionBy = $query->first('possessionBy');

        return [
            'lists' => $lists,
            'flags' => $flags,
            // A price filter is set as soon as either bound is filled in, a number or not.
            'priced' => self::isFilled($query->first('minPrice')) || self::isFilled($query->first('maxPrice')),
            'minPrice' => self::asNumber($query->get('minPrice')),
            'maxPrice' => self::asNumber($query->get('maxPrice')),
            'minArea' => self::asNumber($query->get('minArea')),
            'maxArea' => self::asNumber($query->get('maxArea')),
            'areaUnit' => $query->first('areaUnit') ?? 'sqft',
            'possessionBy' => self::isFilled($possessionBy),
            'deadline' => self::isFilled($possessionBy) ? self::endOfMonth($possessionBy) : null,
            'q' => Js::trim($query->first('q') ?? ''),
        ];
    }

    /** True when the listing satisfies every filter the query sets. */
    private static function matches(array $property, array $criteria, DocumentStore $store): bool
    {
        foreach ($criteria['lists'] as $name => $wanted) {
            $matched = match ($name) {
                'bedrooms' => self::matchesBedrooms($property, $wanted),
                // Every amenity asked for; any one of the badges.
                'amenityIds' => array_diff($wanted, self::idsOf($property['amenityIds'] ?? null)) === [],
                'badgeIds' => array_intersect($wanted, self::idsOf($property['badgeIds'] ?? null)) !== [],
                default => in_array(Js::string(self::valueOf($name, $property)), $wanted, true),
            };
            if (! $matched) {
                return false;
            }
        }

        foreach ($criteria['flags'] as $flag => $wanted) {
            if ((bool) ($property[$flag] ?? false) !== $wanted) {
                return false;
            }
        }

        // A price filter is a question about a number, and "on request" is not one.
        if ($criteria['priced']) {
            $price = self::priceOf($property);
            if ($price === null
                || ($criteria['minPrice'] !== null && $price < $criteria['minPrice'])
                || ($criteria['maxPrice'] !== null && $price > $criteria['maxPrice'])) {
                return false;
            }
        }

        if ($criteria['minArea'] !== null || $criteria['maxArea'] !== null) {
            $area = self::areaInSqft($property);
            // An unknown unit converts to nothing, which JavaScript compares as 0.
            if ($area === null
                || ($criteria['minArea'] !== null && $area < (self::toSqft($criteria['minArea'], $criteria['areaUnit']) ?? 0))
                || ($criteria['maxArea'] !== null && $area > (self::toSqft($criteria['maxArea'], $criteria['areaUnit']) ?? 0))) {
                return false;
            }
        }

        // Something you can move into is available by any date (§5.7).
        $ready = in_array($property['constructionStatus'] ?? null, ['ready-to-move', 'resale'], true);
        if ($criteria['possessionBy'] && ! $ready) {
            $possession = Clock::ms($property['possessionDate'] ?? null);
            if ($criteria['deadline'] === null || $possession === null || $possession > $criteria['deadline']) {
                return false;
            }
        }

        return self::matchesSearch($property, $criteria['q'], $store);
    }

    /** What a multi-value filter compares, read off a listing. */
    private static function valueOf(string $name, array $property): mixed
    {
        return match ($name) {
            'localityId', 'cityId' => Js::get($property['location'] ?? null, $name),
            'developerId' => Js::get($property['project'] ?? null, 'developerId'),
            'seoScoreBand' => Js::get($property['seo'] ?? null, 'scoreBand') ?? 'none',
            'agentId' => Js::get($property['agent'] ?? null, 'teamMemberId'),
            default => $property[$name] ?? null,
        };
    }

    /** @return array<int, string> a list of ids as text */
    private static function idsOf(mixed $ids): array
    {
        return array_map(fn ($id) => Js::string($id), Js::isList($ids) ? $ids : []);
    }

    /** `bedrooms=3` matches 3 exactly; `5` (the last bucket) five or more. */
    private static function matchesBedrooms(array $property, array $wanted): bool
    {
        $counts = self::bedroomsOf($property);
        foreach ($wanted as $value) {
            foreach ($counts as $count) {
                if ($value >= self::MAX_BEDROOM_BUCKET ? $count >= $value : $count == $value) {
                    return true;
                }
            }
        }

        return false;
    }

    /** `q` also searches the locality and the developer, which live elsewhere. */
    private static function matchesSearch(array $property, string $needle, DocumentStore $store): bool
    {
        if ($needle === '') {
            return true;
        }
        $localityId = Js::get($property['location'] ?? null, 'localityId');
        $developerId = Js::get($property['project'] ?? null, 'developerId');
        $locality = is_int($localityId) ? $store->find('localities', $localityId) : null;
        $developer = is_int($developerId) ? $store->find('developers', $developerId) : null;

        return Filters::matchesQ(
            [...$property, 'localityName' => $locality['name'] ?? null, 'developerName' => $developer['name'] ?? null],
            ['title', 'projectName', 'shortDescription', 'localityName', 'developerName'],
            $needle,
        );
    }

    private static function isFilled(?string $value): bool
    {
        return $value !== null && $value !== '';
    }

    /** `Number(value)` of a query parameter (its first value), null for NaN or when absent. */
    private static function asNumber(string|array|null $value): int|float|null
    {
        if (is_array($value)) {
            $value = $value === [] ? null : reset($value);
        }
        if (! is_string($value)) {
            return null;
        }
        $number = Js::toNumber($value);

        return $number !== null && is_finite((float) $number) ? $number : null;
    }

    /** The last millisecond of `yyyy-mm`, for `possessionBy`. */
    private static function endOfMonth(string $value): ?int
    {
        if (! preg_match('/^(\d{4})-(\d{2})$/', Js::trim($value), $match)) {
            return null;
        }
        $year = (int) $match[1];
        $month = (int) $match[2];
        if ($month < 1 || $month > 12) {
            return null;
        }
        // `Date.UTC` reads the years 0–99 as 1900–1999.
        $year += $year <= 99 ? 1900 : 0;

        return (int) CarbonImmutable::create($year, $month, 1, 0, 0, 0, 'UTC')->addMonth()->getTimestampMs() - 1;
    }

    /* ------------------------------------------------------------------ *
     * Sorting
     * ------------------------------------------------------------------ */

    /**
     * A sorted copy: a §5.7 option (`relevance` by default and for anything
     * unknown), or an admin column in the direction `order` asks for (`desc`
     * unless it says `asc`).
     */
    public static function sort(array $items, ?string $sort, ?string $order = null): array
    {
        $key = $sort === null || $sort === '' ? 'relevance' : $sort;
        $direction = Js::lower($order ?? '') === 'asc' ? 'asc' : 'desc';
        $items = array_values($items);

        if (in_array($key, self::COMPARATORS, true)) {
            usort($items, fn (array $a, array $b) => self::compare($key, $a, $b));
        } elseif ($key === 'price') {
            usort($items, fn (array $a, array $b) => self::comparePrice($a, $b, $direction));
        } elseif (in_array($key, self::ADMIN_VALUES, true)) {
            usort($items, fn (array $a, array $b) => self::compareColumn($key, $a, $b, $direction));
        } else {
            usort($items, fn (array $a, array $b) => self::compare('relevance', $a, $b));
        }

        return $items;
    }

    private static function compare(string $key, array $a, array $b): int
    {
        return match ($key) {
            'relevance' => ((bool) ($b['isFeatured'] ?? false) <=> (bool) ($a['isFeatured'] ?? false))
                ?: (($b['priorityOrder'] ?? 0) <=> ($a['priorityOrder'] ?? 0))
                ?: self::compareNullable(Clock::ms($a['updatedAt'] ?? null), Clock::ms($b['updatedAt'] ?? null), 'desc'),
            'newest' => self::compareNullable(Clock::ms($a['publishedAt'] ?? null), Clock::ms($b['publishedAt'] ?? null), 'desc'),
            'price-asc' => self::comparePrice($a, $b, 'asc'),
            'price-desc' => self::comparePrice($a, $b, 'desc'),
            'area-desc' => self::compareNullable(self::areaInSqft($a), self::areaInSqft($b), 'desc'),
            'popular' => ($b['viewCount'] ?? 0) <=> ($a['viewCount'] ?? 0),
        };
    }

    /** Null sorts last whichever direction the caller asked for. */
    private static function compareNullable(int|float|null $left, int|float|null $right, string $direction): int
    {
        if ($left === null || $right === null) {
            return ($left === null ? 1 : 0) - ($right === null ? 1 : 0);
        }

        return $direction === 'desc' ? $right <=> $left : $left <=> $right;
    }

    /**
     * Orders by price without comparing a total with a monthly figure: sales
     * first and rentals after, each in the direction asked; a listing on
     * request last.
     */
    private static function comparePrice(array $a, array $b, string $direction): int
    {
        $left = self::priceOf($a);
        $right = self::priceOf($b);
        if ($left === null || $right === null) {
            return self::compareNullable($left, $right, $direction);
        }

        return (self::priceScaleOf($a) <=> self::priceScaleOf($b)) ?: self::compareNullable($left, $right, $direction);
    }

    /** 0 for a sale, 1 for a rent or a lease — the two scales a price comes in. */
    private static function priceScaleOf(array $property): int
    {
        return in_array($property['listingType'] ?? null, ['rent', 'lease'], true) ? 1 : 0;
    }

    /** An admin column: a plain value, text compared case- and accent-insensitively. */
    private static function compareColumn(string $key, array $a, array $b, string $direction): int
    {
        $left = self::columnValue($key, $a);
        $right = self::columnValue($key, $b);
        if (is_string($left) || is_string($right)) {
            $result = self::collator()->compare(Js::string($left), Js::string($right)) <=> 0;

            return $direction === 'desc' ? -$result : $result;
        }

        return self::compareNullable($left, $right, $direction);
    }

    private static function columnValue(string $key, array $property): int|float|string|null
    {
        $score = Js::get($property['seo'] ?? null, 'score');

        return match ($key) {
            'updatedAt' => Clock::ms($property['updatedAt'] ?? null),
            'createdAt' => Clock::ms($property['createdAt'] ?? null),
            'viewCount' => $property['viewCount'] ?? 0,
            'priorityOrder' => $property['priorityOrder'] ?? 0,
            'seoScore' => Js::isNumber($score) ? $score : null,
            'title' => $property['title'] ?? '',
        };
    }

    /** `localeCompare(…, 'en', { sensitivity: 'base' })` — digits as characters, unlike the facets'. */
    private static function collator(): Collator
    {
        if (self::$collator === null) {
            self::$collator = new Collator('en');
            self::$collator->setStrength(Collator::PRIMARY);
        }

        return self::$collator;
    }
}
