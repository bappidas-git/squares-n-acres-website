<?php

namespace App\Domain\Properties;

use App\Crud\Editors;
use App\Domain\Embed;
use App\Store\DocumentStore;
use App\Support\Debug\ApiLog;
use App\Support\Js;
use App\Support\Query\Filters;
use App\Support\Query\Paginator;
use App\Support\Query\QueryParams;

/**
 * The read side of the listings (the reads of `mock-server/routes/properties.js`).
 *
 * Public reads see active listings only and lose the audit columns, an agent's
 * direct line and the address of every file kept behind the lead form
 * (App\Domain\Properties\PropertyScope); admin reads see the record as
 * stored, with the name of whoever saved it last. Both embed the display
 * objects of §5.5 on the page they return rather than on the whole collection.
 */
final class PropertyReads
{
    /** How many listings `/properties/:id/similar` answers with. */
    public const SIMILAR_LIMIT = 6;

    /** How many entries each group of `/properties/suggestions` holds. */
    public const SUGGESTION_LIMIT = 5;

    /** `q` must be this long before the type-ahead answers with anything. */
    public const SUGGESTION_MIN_LENGTH = 2;

    public function __construct(private DocumentStore $store) {}

    /** `String(left) === String(right)` — how the mock matches an id from a path or a list. */
    public static function sameId(mixed $left, mixed $right): bool
    {
        return Js::string($left) === Js::string($right);
    }

    /** Every stored listing, in id order. */
    public function rows(): array
    {
        return $this->store->all('properties');
    }

    /** The live listings — everything a public read may see. */
    public function active(): array
    {
        return array_values(array_filter($this->rows(), fn (array $property) => (bool) ($property['isActive'] ?? false)));
    }

    /** One listing by slug, whatever its state (the admin preview). */
    public function findBySlug(string $slug): ?array
    {
        foreach ($this->rows() as $property) {
            if (($property['slug'] ?? null) === $slug) {
                return $property;
            }
        }

        return null;
    }

    /** A listing as a response returns it, public or admin. */
    public function present(array $property, bool $admin): array
    {
        $embedded = (new Embed($this->store))->property($property, ! $admin);

        return $admin ? Editors::withName($embedded, $this->store) : PropertyScope::publicProperty($embedded);
    }

    /**
     * The `[data, meta]` of a property list: sorted (unless `ids` asks for an
     * order of its own), paged, presented, with the §5.7 facets of the whole
     * result in `meta`.
     *
     * @param  array<int, array>  $items  the filtered listings
     */
    public function listPage(array $items, QueryParams $query, bool $admin): array
    {
        $sorted = Filters::csv($query->get('ids')) !== []
            ? array_values($items)
            : PropertyFilters::sort($items, $query->first('sort'), $query->first('order'));
        [$page, $meta] = Paginator::paginate($sorted, $query->first('page'), Paginator::pageSize($query, $admin));
        ApiLog::debug('properties', 'Listed', ['admin' => $admin, 'total' => $meta['total'], 'page' => $meta['page']]);

        return [
            array_map(fn (array $property) => $this->present($property, $admin), $page),
            [...$meta, 'facets' => Facets::compute($sorted, $this->store)],
        ];
    }

    /**
     * At most six listings like this one (05_BUSINESS_RULES.md → "Similar
     * properties"): the editor's own picks first, in their order — inactive
     * or deleted ids simply do not appear — then live listings of the same
     * listing type in the same locality or of the same type, by relevance.
     */
    public function similar(array $property): array
    {
        $pool = array_values(array_filter($this->active(), fn (array $row) => ! self::sameId($row['id'], $property['id'])));

        $chosen = [];
        foreach ((array) ($property['similarPropertyIds'] ?? []) as $id) {
            foreach ($pool as $row) {
                if (self::sameId($row['id'], $id)) {
                    $chosen[] = $row;
                    break;
                }
            }
        }

        $taken = array_column($chosen, 'id');
        $locality = Js::get($property['location'] ?? null, 'localityId');
        $related = array_filter($pool, fn (array $row) => ! in_array($row['id'], $taken, true)
            && ($row['listingType'] ?? null) === ($property['listingType'] ?? null)
            && (self::sameId(Js::get($row['location'] ?? null, 'localityId'), $locality)
                || self::sameId($row['propertyTypeId'] ?? null, $property['propertyTypeId'] ?? null)));

        return array_slice([...$chosen, ...PropertyFilters::sort($related, 'relevance')], 0, self::SIMILAR_LIMIT);
    }

    /**
     * The header's type-ahead: up to five live localities, listings, property
     * types and developers whose name holds `q`; nothing below two characters.
     */
    public function suggestions(string $q): array
    {
        $q = Js::trim($q);
        if (Js::length($q) < self::SUGGESTION_MIN_LENGTH) {
            return ['localities' => [], 'properties' => [], 'propertyTypes' => [], 'developers' => []];
        }

        $listings = $this->active();
        $matching = fn (string $collection) => array_slice(array_values(array_filter(
            $this->store->all($collection),
            fn (array $record) => ($record['isActive'] ?? null) !== false && Filters::matchesQ($record, ['name'], $q),
        )), 0, self::SUGGESTION_LIMIT);
        $ref = fn (array $record) => ['id' => $record['id'], 'name' => $record['name'] ?? null, 'slug' => $record['slug'] ?? null];

        $properties = array_slice(array_values(array_filter(
            $listings,
            fn (array $property) => Filters::matchesQ($property, ['title', 'projectName'], $q),
        )), 0, self::SUGGESTION_LIMIT);

        return [
            'localities' => array_map(fn (array $locality) => [
                ...$ref($locality),
                'propertyCount' => count(array_filter(
                    $listings,
                    fn (array $property) => self::sameId(Js::get($property['location'] ?? null, 'localityId'), $locality['id']),
                )),
            ], $matching('localities')),
            'properties' => array_map(fn (array $property) => [
                'id' => $property['id'],
                'title' => $property['title'] ?? null,
                'slug' => $property['slug'] ?? null,
                'localityName' => $this->localityName(Js::get($property['location'] ?? null, 'localityId')),
                'price' => PropertyFilters::priceOf($property),
            ], $properties),
            'propertyTypes' => array_map($ref, $matching('propertyTypes')),
            'developers' => array_map($ref, $matching('developers')),
        ];
    }

    private function localityName(mixed $id): ?string
    {
        $locality = is_int($id) ? $this->store->find('localities', $id) : null;

        return $locality['name'] ?? null;
    }
}
