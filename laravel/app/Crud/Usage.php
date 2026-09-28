<?php

namespace App\Crud;

use App\Store\DocumentStore;
use App\Support\Js;
use App\Support\Json\JsonValue;

/**
 * "Is this still in use?" (05_BUSINESS_RULES.md → "Master data delete guards").
 *
 * Deleting a locality eleven listings point at makes those listings wrong, so
 * every master-data delete asks here first and a non-empty answer becomes a
 * 409 that names what is in the way:
 *
 *   { "message": "This item is in use.",
 *     "errors": { "id": ["Used by 3 properties"] },
 *     "data": { "usedBy": [{ "type": "property", "id": 12, "title": "Lakeview Heights" }] } }
 *
 * Only a named reference counts: a `team` block with no `memberIds` renders
 * everybody, but names nobody. The same lookup read the other way round is a
 * media file's `usedIn` — a string search, because an address is referenced
 * from a dozen differently shaped places.
 */
final class Usage
{
    /** The plural nouns of the 409 sentence. */
    private const NOUNS = [
        'property' => ['property', 'properties'],
        'propertyType' => ['property type', 'property types'],
        'lead' => ['lead', 'leads'],
        'locality' => ['locality', 'localities'],
        'developer' => ['developer', 'developers'],
        'bank' => ['bank', 'banks'],
        'faq' => ['FAQ', 'FAQs'],
        'article' => ['article', 'articles'],
        'author' => ['author', 'authors'],
        'page' => ['page', 'pages'],
        'teamMember' => ['team member', 'team members'],
        'partner' => ['partner', 'partners'],
        'testimonial' => ['testimonial', 'testimonials'],
        'job' => ['job opening', 'job openings'],
        'jobApplication' => ['application', 'applications'],
        'settings' => 'the site settings',
        'seoSettings' => 'the SEO settings',
    ];

    /** The collections a media address can appear in, and the type each reports. */
    private const MEDIA_HAYSTACKS = [
        ['properties', 'property'],
        ['articles', 'article'],
        ['pages', 'page'],
        ['localities', 'locality'],
        ['developers', 'developer'],
        ['banks', 'bank'],
        ['authors', 'author'],
        ['teamMembers', 'teamMember'],
        ['partners', 'partner'],
        ['testimonials', 'testimonial'],
        ['faqs', 'faq'],
        ['jobOpenings', 'job'],
    ];

    private const MEDIA_SINGLETONS = [
        ['siteSettings', ['type' => 'settings', 'id' => 0, 'title' => 'Site settings']],
        ['seoSettings', ['type' => 'seoSettings', 'id' => 0, 'title' => 'SEO settings']],
    ];

    public function __construct(private DocumentStore $store) {}

    /**
     * What still points at one record.
     *
     * @return array<int, array{type: string, id: mixed, title: string}>
     */
    public function find(string $type, mixed $id): array
    {
        $in = fn (string $collection, string $as, callable $predicate) => $this->usagesIn($collection, $as, $predicate);
        $same = fn (mixed $value) => self::sameId($value, $id);
        $includes = fn (mixed $list) => is_array($list) && array_filter($list, fn ($entry) => self::sameId($entry, $id)) !== [];

        return match ($type) {
            'locality' => [
                ...$in('properties', 'property', fn ($p) => $same(Js::get($p['location'] ?? null, 'localityId'))),
                ...$in('leads', 'lead', fn ($l) => $same(Js::get($l['requirement'] ?? null, 'localityId'))),
            ],
            'city' => [
                ...$in('localities', 'locality', fn ($l) => $same($l['cityId'] ?? null)),
                ...$in('properties', 'property', fn ($p) => $same(Js::get($p['location'] ?? null, 'cityId'))),
            ],
            // Listings and types hold a segment's slug, not its id.
            'segment' => $this->segmentUsages($id),
            'propertyType' => [
                ...$in('properties', 'property', fn ($p) => $same($p['propertyTypeId'] ?? null)),
                ...$in('faqs', 'faq', fn ($f) => $same($f['propertyTypeId'] ?? null)),
            ],
            'amenity' => $in('properties', 'property', fn ($p) => $includes($p['amenityIds'] ?? null)),
            'badge' => $in('properties', 'property', fn ($p) => $includes($p['badgeIds'] ?? null)),
            'developer' => $in('properties', 'property', fn ($p) => $same(Js::get($p['project'] ?? null, 'developerId'))),
            'articleCategory' => $in('articles', 'article', fn ($a) => $same($a['categoryId'] ?? null)),
            'articleTag' => $in('articles', 'article', fn ($a) => $includes($a['tagIds'] ?? null)),
            'author' => $in('articles', 'article', fn ($a) => $same($a['authorId'] ?? null)),
            'faq' => $this->pagesUsing('faq', fn ($data) => $includes(Js::get($data, 'faqIds'))),
            'testimonial' => $this->pagesUsing('testimonials', fn ($data) => $includes(Js::get($data, 'ids'))),
            'teamMember' => [
                ...$in('properties', 'property', fn ($p) => $same(Js::get($p['agent'] ?? null, 'teamMemberId'))),
                ...$this->pagesUsing('team', fn ($data) => $includes(Js::get($data, 'memberIds'))),
            ],
            // A `partners` block selects by category: only one naming this partner's counts.
            'partner' => $this->partnerUsages($id),
            'job' => $in('jobApplications', 'jobApplication', fn ($a) => $same($a['jobId'] ?? null)),
            default => [],
        };
    }

    /** "Used by 3 properties and 1 lead". */
    public static function describe(array $usages): string
    {
        $counts = [];
        foreach ($usages as $usage) {
            $counts[$usage['type']] = ($counts[$usage['type']] ?? 0) + 1;
        }

        $parts = [];
        foreach ($counts as $type => $count) {
            $noun = self::NOUNS[$type] ?? [$type, "{$type}s"];
            $parts[] = is_string($noun) ? $noun : $count.' '.($count === 1 ? $noun[0] : $noun[1]);
        }

        if (count($parts) <= 1) {
            return 'Used by '.($parts[0] ?? 'other records');
        }
        $last = array_pop($parts);

        return 'Used by '.implode(', ', $parts).' and '.$last;
    }

    /**
     * A reusable "where is this address used?": each record is turned into
     * JSON once, however many addresses are asked about.
     *
     * @return callable(string): array<int, array>
     */
    public function mediaIndex(): callable
    {
        $entries = [];
        foreach (self::MEDIA_HAYSTACKS as [$collection, $type]) {
            foreach ($this->store->all($collection) as $record) {
                $entries[] = ['text' => JsonValue::encode($record), 'usage' => self::usage($type, $record)];
            }
        }
        foreach (self::MEDIA_SINGLETONS as [$name, $found]) {
            $record = $this->store->singleton($name);
            if ($record !== null) {
                $entries[] = ['text' => JsonValue::encode($record), 'usage' => $found];
            }
        }

        return function (mixed $url) use ($entries): array {
            if (! is_string($url) || $url === '') {
                return [];
            }
            // The address as it sits inside a JSON string.
            $needle = substr(JsonValue::encode($url), 1, -1);
            $found = [];
            foreach ($entries as $entry) {
                if (self::holdsUrl($entry['text'], $needle)) {
                    $found[] = $entry['usage'];
                }
            }

            return $found;
        };
    }

    /**
     * Whether `text` holds `url` as a whole address rather than as the start
     * of a longer one: `…/villa.jpg` is not used by `…/villa.jpg.webp`.
     */
    public static function holdsUrl(string $text, string $url): bool
    {
        $from = strpos($text, $url);
        while ($from !== false) {
            $next = substr($text, $from + strlen($url), 1);
            if ($next === '' || ! preg_match('~[A-Za-z0-9\-._\~/%]~', $next)) {
                return true;
            }
            $from = strpos($text, $url, $from + 1);
        }

        return false;
    }

    /** `{ type, id, title }` for one record, from its first title-like field. */
    public static function usage(string $type, array $record): array
    {
        return [
            'type' => $type,
            'id' => $record['id'] ?? null,
            'title' => $record['title'] ?? $record['name'] ?? $record['question'] ?? $record['email'] ?? Js::string($record['id'] ?? ''),
        ];
    }

    private function usagesIn(string $collection, string $type, callable $predicate): array
    {
        $found = [];
        foreach ($this->store->all($collection) as $record) {
            if ($predicate($record)) {
                $found[] = self::usage($type, $record);
            }
        }

        return $found;
    }

    /** Pages holding a block of `type` that names the record. */
    private function pagesUsing(string $type, callable $predicate): array
    {
        $found = [];
        foreach ($this->store->all('pages') as $page) {
            foreach ((array) ($page['blocks'] ?? []) as $block) {
                if (Js::get($block, 'type') !== $type) {
                    continue;
                }
                if ($predicate(Js::get($block, 'data') ?? [])) {
                    $found[] = self::usage('page', $page);
                    break;
                }
            }
        }

        return $found;
    }

    private function segmentUsages(mixed $id): array
    {
        $segment = $this->store->find('segments', $id);
        if ($segment === null) {
            return [];
        }
        $slug = $segment['slug'];

        return [
            ...$this->usagesIn('propertyTypes', 'propertyType', fn ($t) => ($t['segment'] ?? null) === $slug),
            ...$this->usagesIn('properties', 'property', fn ($p) => ($p['segment'] ?? null) === $slug),
        ];
    }

    private function partnerUsages(mixed $id): array
    {
        $partner = $this->store->find('partners', $id);

        return $this->pagesUsing('partners', function ($data) use ($partner) {
            $category = Js::get($data, 'category');

            return $category && $partner !== null && $category === ($partner['category'] ?? null);
        });
    }

    public static function sameId(mixed $left, mixed $right): bool
    {
        return $left !== null && $right !== null && Js::string($left) === Js::string($right);
    }
}
