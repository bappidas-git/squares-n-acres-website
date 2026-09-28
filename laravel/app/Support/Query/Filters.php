<?php

namespace App\Support\Query;

use App\Support\Js;

/**
 * The filter primitives of §5.6: a multi-value parameter, a boolean, the free
 * text `q`, a numeric range.
 */
final class Filters
{
    /**
     * A comma-separated parameter as trimmed, non-empty values; repeated
     * parameters are flattened the same way.
     *
     * @return array<int, string>
     */
    public static function csv(mixed $param): array
    {
        if ($param === null || $param === '') {
            return [];
        }
        $values = [];
        foreach ((array) $param as $value) {
            if (is_array($value)) {
                continue;
            }
            foreach (explode(',', Js::string($value)) as $part) {
                $part = Js::trim($part);
                if ($part !== '') {
                    $values[] = $part;
                }
            }
        }

        return $values;
    }

    /** `true`/`1`/`yes` → true, `false`/`0`/`no` → false, anything else → null. */
    public static function bool(mixed $param): ?bool
    {
        if (is_array($param)) {
            $param = $param[0] ?? null;
        }
        if (is_bool($param)) {
            return $param;
        }
        $value = strtolower(Js::trim(Js::string($param)));

        return match ($value) {
            'true', '1', 'yes' => true,
            'false', '0', 'no' => false,
            default => null,
        };
    }

    /**
     * Case-insensitive substring match of `q` against dotted field paths; an
     * empty `q` matches everything.
     *
     * @param  array<int, string>  $fields
     */
    public static function matchesQ(mixed $item, array $fields, mixed $q): bool
    {
        $needle = Js::lower(Js::trim((string) ($q ?? '')));
        if ($needle === '') {
            return true;
        }

        foreach ($fields as $field) {
            $value = Sorter::path($item, $field);
            if ($value === null) {
                continue;
            }
            if (Js::isList($value)) {
                foreach ($value as $entry) {
                    if (str_contains(Js::lower(Js::string($entry)), $needle)) {
                        return true;
                    }
                }

                continue;
            }
            if (str_contains(Js::lower(Js::string($value)), $needle)) {
                return true;
            }
        }

        return false;
    }

    /**
     * An inclusive `[min, max]` test: a missing bound is open; a missing value
     * fails a bounded range.
     */
    public static function range(mixed $value, mixed $min, mixed $max): bool
    {
        $hasMin = $min !== null && $min !== '';
        $hasMax = $max !== null && $max !== '';
        if (! $hasMin && ! $hasMax) {
            return true;
        }
        // `Number(value)`: a stored null reads as 0, as it does for the mock.
        $number = Js::toNumber($value);
        if ($number === null || (is_float($number) && ! is_finite($number))) {
            return false;
        }
        if ($hasMin && $number < (Js::toNumber($min) ?? NAN)) {
            return false;
        }
        if ($hasMax && $number > (Js::toNumber($max) ?? NAN)) {
            return false;
        }

        return true;
    }
}
