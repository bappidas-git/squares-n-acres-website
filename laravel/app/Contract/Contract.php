<?php

namespace App\Contract;

use InvalidArgumentException;

/**
 * The API contract, as `scripts/export-contract.cjs` exported it from the
 * website repository (resources/contract/*.php):
 *
 *  - `models`  — one descriptor per collection: fields, types, defaults,
 *                what the public may see, what the API computes;
 *  - `schemas` — the request bodies, by registry key (`property.create`);
 *  - `enums`   — every enum's values and entries;
 *  - `tables`  — the MySQL tables, their columns and the document path each
 *                column stores.
 *
 * The files are plain PHP arrays, so OPcache keeps them compiled and a
 * request pays nothing to read them twice.
 */
final class Contract
{
    /** @var array<string, array> */
    private static array $loaded = [];

    /** @return array<string, array> */
    public static function models(): array
    {
        return self::load('models');
    }

    /** @return array<string, array> */
    public static function schemas(): array
    {
        return self::load('schemas');
    }

    /** @return array<string, mixed> */
    public static function enums(): array
    {
        return self::load('enums');
    }

    /** @return array<string, array> */
    public static function tables(): array
    {
        return self::load('tables');
    }

    /** One collection's descriptor (`properties`, `siteSettings`). */
    public static function model(string $collection): array
    {
        return self::models()[$collection]
            ?? throw new InvalidArgumentException("Unknown collection [{$collection}].");
    }

    /** A request-body schema by registry key (`property.create`), or null. */
    public static function schema(string $key): ?array
    {
        return self::schemas()[$key] ?? null;
    }

    /** The values of an enum (`LEAD_STATUS`). */
    public static function enumValues(string $name): array
    {
        $enum = self::enums()[$name] ?? [];

        return is_array($enum) && array_key_exists('values', $enum) ? $enum['values'] : (array) $enum;
    }

    /** The entries of an enum, `[{value, label, …meta}]`. */
    public static function enumEntries(string $name): array
    {
        return self::enums()[$name]['entries'] ?? [];
    }

    /** The label of one value of an enum, `''` when unknown (`labelOf`). */
    public static function enumLabel(string $name, mixed $value): string
    {
        foreach (self::enumEntries($name) as $entry) {
            if (($entry['value'] ?? null) === $value) {
                return (string) ($entry['label'] ?? '');
            }
        }

        return '';
    }

    /** The meta of one enum value (`tone`, `icon`, `sqftFactor`…). */
    public static function enumMeta(string $name, mixed $value): array
    {
        foreach (self::enumEntries($name) as $entry) {
            if (($entry['value'] ?? null) === $value) {
                unset($entry['value'], $entry['label']);

                return $entry;
            }
        }

        return [];
    }

    /** The tables that store one collection: its own, its child tables, its pivots. */
    public static function tablesOf(string $collection): array
    {
        return array_filter(self::tables(), fn (array $table) => $table['collection'] === $collection);
    }

    private static function load(string $name): array
    {
        return self::$loaded[$name] ??= require resource_path("contract/{$name}.php");
    }
}
