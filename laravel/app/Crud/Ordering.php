<?php

namespace App\Crud;

use App\Support\Js;
use App\Support\Query\Sorter;

/**
 * A collection's `order`, kept `1..n` (05_BUSINESS_RULES.md → "Ordering").
 *
 * A reorder sends one write — the moved record's new position — and the API
 * works out what everything else becomes. Both functions take the records as
 * they are stored and answer the order every record should have; the caller
 * writes the ones that changed.
 */
final class Ordering
{
    /**
     * Sorts by `order`, the touched record first among the records sharing
     * its number, then the collection's own tie-break, then as they read —
     * and renumbers `1..n`.
     *
     * @param  array<int, array>  $records
     * @param  array<int, string>  $tieBreak
     * @return array<int, int> id → order
     */
    public static function renumber(array $records, mixed $touchedId = null, array $tieBreak = []): array
    {
        $position = fn (array $record) => Js::isNumber(Js::toNumber($record['order'] ?? null)) ? Js::toNumber($record['order'] ?? 0) : 0;
        $touched = fn (array $record) => $touchedId !== null && Usage::sameId($record['id'] ?? null, $touchedId);

        $indexed = [];
        foreach (array_values($records) as $index => $record) {
            $indexed[] = ['record' => $record, 'index' => $index];
        }

        usort($indexed, function (array $left, array $right) use ($position, $touched, $tieBreak) {
            $a = $position($left['record']);
            $b = $position($right['record']);
            if ($a != $b) {
                return $a <=> $b;
            }
            $leftTouched = $touched($left['record']);
            if ($leftTouched !== $touched($right['record'])) {
                return $leftTouched ? -1 : 1;
            }
            foreach ($tieBreak as $field) {
                $result = Sorter::compare(Sorter::path($left['record'], $field), Sorter::path($right['record'], $field));
                if ($result !== 0) {
                    return $result;
                }
            }

            return $left['index'] <=> $right['index'];
        });

        $orders = [];
        foreach ($indexed as $index => $entry) {
            $orders[(int) $entry['record']['id']] = $index + 1;
        }

        return $orders;
    }

    /**
     * Puts one record at the position its `order` names — 1 is first — and
     * renumbers the rest `1..n` around it: what a form means by the number it
     * saves. The others keep the order they read in, made dense first.
     *
     * @return array<int, int> id → order
     */
    public static function place(array $records, mixed $placedId, array $tieBreak = []): array
    {
        $placed = null;
        $others = [];
        foreach ($records as $record) {
            if (Usage::sameId($record['id'] ?? null, $placedId)) {
                $placed = $record;
            } else {
                $others[] = $record;
            }
        }
        if ($placed === null) {
            return self::renumber($records, null, $tieBreak);
        }

        $orders = self::renumber($others, null, $tieBreak);
        $wanted = Js::toNumber($placed['order'] ?? null);
        $wanted = $wanted === null ? 1 : (int) $wanted;
        $at = min(max($wanted, 1), count($others) + 1);
        foreach ($orders as $id => $order) {
            if ($order >= $at) {
                $orders[$id] = $order + 1;
            }
        }
        $orders[(int) $placed['id']] = $at;

        return $orders;
    }

    /**
     * The orders that differ from what is stored.
     *
     * @return array<int, int>
     */
    public static function changes(array $records, array $orders): array
    {
        $changed = [];
        foreach ($records as $record) {
            $id = (int) $record['id'];
            if (isset($orders[$id]) && ($record['order'] ?? null) !== $orders[$id]) {
                $changed[$id] = $orders[$id];
            }
        }

        return $changed;
    }
}
