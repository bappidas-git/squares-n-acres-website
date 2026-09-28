<?php

namespace App\Domain\Properties;

use App\Store\DocumentStore;
use App\Support\Js;
use App\Support\Query\Sorter;

/**
 * Listing facets (01_API_CONTRACT.md §5.7; the port of `mock-server/lib/facets.js`).
 *
 * `meta.facets` tells the filter sidebar how many results each further choice
 * would leave, so the counts are taken **after** every other filter and
 * **before** pagination — that is what makes "Whitefield (3)" mean three of
 * the results on screen, not three in the database. A listing is counted under
 * every bedroom count it can be found under, exactly as the `bedrooms` filter
 * matches it; the other three facets count each listing once. Each facet is
 * ordered by count, then by its label (digits by value), so ties never shuffle.
 */
final class Facets
{
    /**
     * @param  array<int, array>  $items  the filtered result set, before pagination
     * @return array{propertyType: array, locality: array, bedrooms: array, constructionStatus: array}
     */
    public static function compute(array $items, DocumentStore $store): array
    {
        $propertyTypes = [];
        $localities = [];
        $bedrooms = [];
        $statuses = [];
        foreach ($items as $property) {
            self::tally($propertyTypes, $property['propertyTypeId'] ?? null);
            self::tally($localities, Js::get($property['location'] ?? null, 'localityId'));
            self::tally($statuses, $property['constructionStatus'] ?? null);
            foreach (PropertyFilters::bedroomsOf($property) as $count) {
                self::tally($bedrooms, $count);
            }
        }

        $named = fn (string $collection) => function (mixed $id) use ($store, $collection): array {
            $record = is_int($id) ? $store->find($collection, $id) : null;

            return ['id' => $id, 'name' => $record['name'] ?? Js::string($id)];
        };
        $valued = fn (mixed $value): array => ['value' => $value];

        return [
            'propertyType' => self::rank($propertyTypes, $named('propertyTypes')),
            'locality' => self::rank($localities, $named('localities')),
            'bedrooms' => self::rank($bedrooms, $valued),
            'constructionStatus' => self::rank($statuses, $valued),
        ];
    }

    /**
     * Adds one to a key's tally — a Map of the JavaScript original, so `3` and
     * `'3'` stay two keys and the first-seen order is kept for equal ranks.
     */
    private static function tally(array &$counts, mixed $key): void
    {
        if ($key === null) {
            return;
        }
        $slot = (is_string($key) ? 's:' : 'n:').Js::string($key);
        $counts[$slot] ??= ['key' => $key, 'count' => 0];
        $counts[$slot]['count']++;
    }

    /** The tallies as `{ …label, count }`, by count, then by label. */
    private static function rank(array $counts, callable $decorate): array
    {
        $ranked = array_map(fn (array $entry) => [...$decorate($entry['key']), 'count' => $entry['count']], array_values($counts));
        usort($ranked, fn (array $a, array $b) => ($b['count'] <=> $a['count'])
            ?: (Sorter::collator()->compare(Js::string($a['name'] ?? $a['value']), Js::string($b['name'] ?? $b['value'])) <=> 0));

        return $ranked;
    }
}
