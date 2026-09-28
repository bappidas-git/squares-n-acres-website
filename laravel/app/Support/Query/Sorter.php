<?php

namespace App\Support\Query;

use App\Support\Js;
use Collator;
use stdClass;

/**
 * Sorting (§5.6, 05_BUSINESS_RULES.md → "Ordering").
 *
 * A specification is a string (`'pricing.price'`, `'isFeatured,updatedAt'`,
 * `'-viewCount'`) or a list of `{field, order}` pairs; field paths are
 * dotted. Nulls (and empty strings) sort last in both directions, booleans
 * sort `true` first, numbers numerically and text the way the admin panel's
 * locale compare does: case- and accent-insensitive, digits by value.
 */
final class Sorter
{
    private static ?Collator $collator = null;

    /** A dotted path off an array or object; null when any step is missing. */
    public static function path(mixed $source, string $path): mixed
    {
        $value = $source;
        foreach (explode('.', $path) as $key) {
            if ($value instanceof stdClass) {
                $value = property_exists($value, $key) ? $value->{$key} : null;
            } elseif (is_array($value)) {
                $value = array_key_exists($key, $value) ? $value[$key] : null;
            } else {
                return null;
            }
            if ($value === null) {
                return null;
            }
        }

        return $value;
    }

    /**
     * @return array<int, array{field: string, order: string}>
     */
    public static function parse(string|array|null $spec, ?string $order = null): array
    {
        if ($spec === null || $spec === '' || $spec === []) {
            return [];
        }
        $orders = array_map(
            fn (string $value) => strtolower(trim($value)) === 'desc' ? 'desc' : 'asc',
            explode(',', (string) $order),
        );

        $keys = is_array($spec) ? $spec : explode(',', $spec);
        $parsed = [];
        foreach (array_values($keys) as $index => $key) {
            if (is_array($key)) {
                $parsed[] = ['field' => (string) ($key['field'] ?? ''), 'order' => ($key['order'] ?? 'asc') === 'desc' ? 'desc' : 'asc'];

                continue;
            }
            $field = trim((string) $key);
            if (str_starts_with($field, '-')) {
                $parsed[] = ['field' => substr($field, 1), 'order' => 'desc'];

                continue;
            }
            $parsed[] = ['field' => $field, 'order' => $orders[$index] ?? $orders[0] ?? 'asc'];
        }

        return array_values(array_filter($parsed, fn (array $key) => $key['field'] !== ''));
    }

    private static function missing(mixed $value): bool
    {
        return $value === null || $value === '';
    }

    /** Ascending comparison of two values of unknown type; missing values last. */
    public static function compare(mixed $a, mixed $b): int
    {
        $aMissing = self::missing($a);
        $bMissing = self::missing($b);
        if ($aMissing && $bMissing) {
            return 0;
        }
        if ($aMissing) {
            return 1;
        }
        if ($bMissing) {
            return -1;
        }

        if (is_bool($a) || is_bool($b)) {
            return (int) (bool) $b - (int) (bool) $a;
        }
        if (Js::isNumber($a) && Js::isNumber($b)) {
            return $a <=> $b;
        }

        return self::collator()->compare(Js::string($a), Js::string($b)) <=> 0;
    }

    /**
     * A sorted copy of `items` (stable, as JavaScript's sort is).
     *
     * @param  array<int, mixed>  $items
     * @return array<int, mixed>
     */
    public static function sort(array $items, string|array|null $spec, ?string $order = null): array
    {
        $keys = self::parse($spec, $order);
        $items = array_values($items);
        if ($keys === []) {
            return $items;
        }

        usort($items, function ($left, $right) use ($keys) {
            foreach ($keys as $key) {
                $a = self::path($left, $key['field']);
                $b = self::path($right, $key['field']);
                // Nulls last in both directions.
                if (self::missing($a) || self::missing($b)) {
                    $result = self::compare($a, $b);
                    if ($result !== 0) {
                        return $result;
                    }

                    continue;
                }
                $result = self::compare($a, $b);
                if ($result !== 0) {
                    return $key['order'] === 'desc' ? -$result : $result;
                }
            }

            return 0;
        });

        return $items;
    }

    /** `String.prototype.localeCompare(…, 'en', { numeric: true, sensitivity: 'base' })`. */
    public static function collator(): Collator
    {
        if (self::$collator === null) {
            $collator = new Collator('en');
            $collator->setAttribute(Collator::NUMERIC_COLLATION, Collator::ON);
            $collator->setStrength(Collator::PRIMARY);
            self::$collator = $collator;
        }

        return self::$collator;
    }
}
