<?php

namespace App\Domain\Properties;

use App\Support\Js;
use App\Support\Query\Filters;
use App\Support\Query\QueryParams;
use stdClass;

/**
 * `GET /properties/counts` (01_API_CONTRACT.md → "Category counts"; the port of
 * `mock-server/lib/propertyCounts.js`): how many live listings carry each
 * value of the dimensions `by` names, under the same listing filters as
 * `GET /properties` — the home page's tiles in two requests rather than one a
 * tile. A name in `by` that is not a dimension is ignored, as an unknown
 * query parameter is.
 */
final class PropertyCounts
{
    /** The registry's PROPERTY_COUNT_DIMENSIONS. */
    public const DIMENSIONS = ['segment', 'propertyTypeId', 'listingType', 'constructionStatus', 'localityId'];

    /** The parameters that say what to count and how to page, not which listings. */
    private const NOT_FILTERS = ['by', 'page', 'perPage', 'sort', 'order'];

    /** The dimensions `by` names, known ones only, each once, in the order asked. */
    public static function dimensionsOf(QueryParams $query): array
    {
        return array_values(array_intersect(array_unique(Filters::csv($query->get('by'))), self::DIMENSIONS));
    }

    /** The query without `by` and the paging parameters: the listing filters. */
    public static function filtersOf(QueryParams $query): QueryParams
    {
        return $query->without(...self::NOT_FILTERS);
    }

    /**
     * `{ <dimension>: { "<value>": count } }` — the values as strings, as a
     * JSON object's keys are, and only the values some listing carries; the
     * keys in the order JavaScript gives an object's (integer-like first).
     *
     * @param  array<int, array>  $items  the listings, already filtered
     */
    public static function countBy(array $items, array $dimensions): array|stdClass
    {
        $counts = [];
        foreach ($dimensions as $dimension) {
            $tally = [];
            foreach ($items as $property) {
                $value = self::read($dimension, $property);
                if ($value === null || $value === '') {
                    continue;
                }
                $key = Js::string($value);
                $tally[$key] = ($tally[$key] ?? 0) + 1;
            }
            $counts[$dimension] = (object) self::jsKeyOrder($tally);
        }

        return $counts === [] ? new stdClass : $counts;
    }

    /** What each dimension reads off a listing. */
    private static function read(string $dimension, array $property): mixed
    {
        return $dimension === 'localityId'
            ? Js::get($property['location'] ?? null, 'localityId')
            : ($property[$dimension] ?? null);
    }

    /** Array-index keys ascending, then the others in insertion order. */
    private static function jsKeyOrder(array $tally): array
    {
        $indexes = array_filter($tally, fn ($key) => is_int($key) && $key >= 0, ARRAY_FILTER_USE_KEY);
        ksort($indexes);

        return $indexes + array_diff_key($tally, $indexes);
    }
}
