<?php

namespace App\Domain\Seo;

use App\Contract\Contract;
use App\Store\DocumentStore;
use App\Support\Js;
use App\Support\Query\Filters;
use App\Support\Query\Paginator;
use App\Support\Query\QueryParams;
use App\Support\Query\Sorter;

/**
 * The SEO desk's index (05_BUSINESS_RULES.md → "SEO overview"): eight entity
 * types flattened into one list of `SeoOverviewRow`s — `{ key, id, type,
 * title, slug, url, seo, isActive, status, updatedAt, duplicateOf }` — so the
 * dashboard can rank the whole site by score and the panel can check that a
 * focus keyword is not already taken. `url` comes from the sitemaps' URL map
 * (App\Domain\Seo\SitemapBuilder), so the desk and the crawler agree.
 *
 * Scores are computed in the browser and stored on the record: this reads
 * them back and never recomputes. `duplicateOf` is computed here, grouping by
 * value in one pass over the whole site — a pairwise comparison in the browser
 * would be the O(n²) the desk pays on every render.
 */
final class SeoOverview
{
    /**
     * The collection behind each type, and the field that names its records.
     * A built-in page (`template: system`) is left out: its head comes from the
     * page-type templates, not from its record.
     */
    private const SOURCES = [
        'property' => ['properties', 'title'],
        'article' => ['articles', 'title'],
        'page' => ['pages', 'title'],
        'locality' => ['localities', 'name'],
        'developer' => ['developers', 'name'],
        'articleCategory' => ['articleCategories', 'name'],
        'author' => ['authors', 'name'],
        'propertyType' => ['propertyTypes', 'name'],
    ];

    /**
     * The sorts the overview accepts: `lastAnalyzedAt` is when the panel last
     * measured the record — the desk's "Last analysed" column (prompt 51).
     */
    private const SORTS = [
        'updatedAt' => ['updatedAt', 'desc'],
        'lastAnalyzedAt' => ['seo.lastAnalyzedAt', 'desc'],
        'title' => ['title', 'asc'],
        'score' => ['seo.score', 'desc'],
        'type' => ['type,title', 'asc'],
    ];

    /** The `seo` fields `?missing=` can ask about. */
    private const MISSING_FIELDS = ['focusKeyword', 'description', 'title'];

    /** The three `seo` fields a duplicate is reported for. */
    private const DUPLICATE_FIELDS = ['title', 'description', 'focusKeyword'];

    public function __construct(private DocumentStore $store) {}

    /**
     * One page of rows: filters `type`, `q` (title, slug, focus keyword),
     * `scoreBand`, `missing`, `index`; `sort`/`order`; `perPage=all` allowed.
     *
     * @return array{0: array, 1: array} the rows and the pagination meta
     */
    public function page(QueryParams $query): array
    {
        $all = Contract::enumValues('SEO_ENTITY_TYPES');
        $requested = array_values(array_filter(Filters::csv($query->get('type')), fn (string $type) => in_array($type, $all, true)));
        $types = $requested !== [] ? $requested : $all;

        // The whole site is read whatever the filter asks for: "this title is
        // also an article's" is only true if the articles were looked at.
        $rows = $this->markDuplicates($this->rows($all));
        if (count($types) !== count($all)) {
            $rows = array_values(array_filter($rows, fn (array $row) => in_array($row['type'], $types, true)));
        }

        $q = $query->first('q');
        if ($q !== null && $q !== '') {
            $rows = array_values(array_filter($rows, fn (array $row) => Filters::matchesQ($row, ['title', 'slug', 'seo.focusKeyword'], $q)));
        }

        $bands = Filters::csv($query->get('scoreBand'));
        if ($bands !== []) {
            $rows = array_values(array_filter($rows, fn (array $row) => in_array(Sorter::path($row, 'seo.scoreBand') ?? 'none', $bands, true)));
        }

        // "No focus keyword" / "No meta description": the records without one,
        // analysed or not (prompt 51).
        $missing = array_values(array_intersect(Filters::csv($query->get('missing')), self::MISSING_FIELDS));
        if ($missing !== []) {
            $rows = array_values(array_filter($rows, function (array $row) use ($missing) {
                foreach ($missing as $field) {
                    $value = Sorter::path($row, "seo.{$field}");
                    if (Js::trim($value === null ? '' : Js::string($value)) === '') {
                        return true;
                    }
                }

                return false;
            }));
        }

        // `index` reads as the SEO panel labels it — `indexed`/`noindex` — and as a plain boolean.
        $index = $query->first('index');
        if ($index !== null && $index !== '') {
            $wanted = match ($index) {
                'indexed' => true,
                'noindex' => false,
                default => Filters::bool($index),
            };
            if ($wanted !== null) {
                $rows = array_values(array_filter($rows, fn (array $row) => (Sorter::path($row, 'seo.robots.index') !== false) === $wanted));
            }
        }

        $key = array_key_exists((string) $query->first('sort'), self::SORTS) ? (string) $query->first('sort') : 'updatedAt';
        [$spec, $order] = self::SORTS[$key];
        $wantedOrder = strtolower((string) $query->first('order'));
        $sorted = Sorter::sort($rows, $spec, in_array($wantedOrder, ['asc', 'desc'], true) ? $wantedOrder : $order);

        $perPage = $query->first('perPage') === 'all'
            ? null
            : Paginator::positiveInt($query->first('perPage'), Paginator::DEFAULT_PER_PAGE_ADMIN);

        return Paginator::paginate($sorted, $query->first('page'), $perPage);
    }

    /** Every row of the given types, in type order, then collection order. */
    private function rows(array $types): array
    {
        $siteUrl = Js::get($this->store->singleton('seoSettings') ?? [], 'siteUrl') ?? '';
        $segments = $this->store->all('segments');
        $rows = [];
        foreach ($types as $type) {
            [$collection, $titleField] = self::SOURCES[$type];
            foreach ($this->store->all($collection) as $record) {
                if ($type === 'page' && ($record['template'] ?? null) === 'system') {
                    continue;
                }
                $rows[] = $this->row($type, $record, $titleField, $siteUrl, $segments);
            }
        }

        return $rows;
    }

    /**
     * One `SeoOverviewRow`. An id is only unique inside its collection, so
     * the row carries a `key` of its own — what `duplicateOf` points at.
     * `status` is null for an entity that has none, and `url` is the public
     * page, so the desk can open it without knowing the routing rules.
     */
    private function row(string $type, array $record, string $titleField, mixed $siteUrl, array $segments): array
    {
        $path = SitemapBuilder::publicPathOf($type, $record, ['segments' => $segments]);

        return [
            'key' => $type.':'.Js::string($record['id'] ?? null),
            'id' => $record['id'] ?? null,
            'type' => $type,
            'title' => $record[$titleField] ?? null,
            'slug' => $record['slug'] ?? null,
            'url' => $path !== null && $path !== '' ? SitemapBuilder::absoluteUrl($siteUrl, $path) : null,
            'seo' => $record['seo'] ?? null,
            'isActive' => $record['isActive'] ?? null,
            'status' => $record['status'] ?? null,
            'updatedAt' => $record['updatedAt'] ?? null,
            'duplicateOf' => ['title' => [], 'description' => [], 'focusKeyword' => []],
        ];
    }

    /**
     * Fills every row's `duplicateOf` from the whole site, grouping by the
     * normalised value — case and surrounding or repeated whitespace do not
     * make two titles different. Empty values never collide: two records
     * nobody has written a description for are not duplicates.
     */
    private function markDuplicates(array $rows): array
    {
        foreach (self::DUPLICATE_FIELDS as $field) {
            $groups = [];
            foreach ($rows as $index => $row) {
                $value = Sorter::path($row, "seo.{$field}");
                $normalised = Js::collapseSpaces(Js::lower(Js::trim($value === null ? '' : Js::string($value))));
                if ($normalised !== '') {
                    $groups["={$normalised}"][] = $index;
                }
            }
            foreach ($groups as $members) {
                if (count($members) < 2) {
                    continue;
                }
                foreach ($members as $index) {
                    $rows[$index]['duplicateOf'][$field] = array_values(array_map(
                        fn (int $other) => $rows[$other]['key'],
                        array_filter($members, fn (int $other) => $other !== $index),
                    ));
                }
            }
        }

        return $rows;
    }
}
