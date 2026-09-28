<?php

namespace App\Support;

use stdClass;

/**
 * The handful of JavaScript semantics the contract is written in.
 *
 * The reference implementation of this API is the Node mock server, and a few
 * of its answers depend on how JavaScript reads a value: what `.trim()` calls
 * whitespace, what `String(value)` prints, that a string's `length` counts
 * UTF-16 units (a 300-character limit counts an emoji as two), that `5.0` is
 * an integer. Porting those rules once, here, keeps every validator and
 * filter of the API giving the same answer as the mock.
 */
final class Js
{
    /** JavaScript's `\s`: ASCII whitespace plus the Unicode spaces and the BOM. */
    public const SPACE = '\s\x{00a0}\x{1680}\x{2000}-\x{200a}\x{2028}\x{2029}\x{202f}\x{205f}\x{3000}\x{feff}';

    /** `String.prototype.trim()`. */
    public static function trim(string $text): string
    {
        return (string) preg_replace('/^['.self::SPACE.']+|['.self::SPACE.']+$/u', '', $text);
    }

    /** `text.replace(/\s+/g, ' ')`. */
    public static function collapseSpaces(string $text, string $with = ' '): string
    {
        return (string) preg_replace('/['.self::SPACE.']+/u', $with, $text);
    }

    /** `text.split(/\s+/)`, without the empty strings. */
    public static function words(string $text): array
    {
        return array_values(array_filter(
            preg_split('/['.self::SPACE.']+/u', $text) ?: [],
            fn (string $word) => $word !== '',
        ));
    }

    /** `String.prototype.length`: UTF-16 code units. */
    public static function length(string $text): int
    {
        if ($text === '' || ! preg_match('/[^\x00-\x7F]/', $text)) {
            return strlen($text);
        }

        return intdiv(strlen((string) mb_convert_encoding($text, 'UTF-16LE', 'UTF-8')), 2);
    }

    /** `String.prototype.toLowerCase()`. */
    public static function lower(string $text): string
    {
        return mb_strtolower($text, 'UTF-8');
    }

    /** `Number.isInteger(value)` — `5.0` is an integer, `'5'` is not. */
    public static function isInteger(mixed $value): bool
    {
        return is_int($value) || (is_float($value) && is_finite($value) && floor($value) === $value);
    }

    /** `typeof value === 'number' && Number.isFinite(value)`. */
    public static function isNumber(mixed $value): bool
    {
        return is_int($value) || (is_float($value) && is_finite($value));
    }

    /** A JSON object: an associative array, or a `stdClass` (`{}`). */
    public static function isPlainObject(mixed $value): bool
    {
        return $value instanceof stdClass || (is_array($value) && $value !== [] && ! array_is_list($value));
    }

    /** A JSON array: a list (`[]` included). */
    public static function isList(mixed $value): bool
    {
        return is_array($value) && array_is_list($value);
    }

    /** `String(value)`. */
    public static function string(mixed $value): string
    {
        return match (true) {
            $value === null => 'null',
            is_bool($value) => $value ? 'true' : 'false',
            is_float($value) => self::number($value),
            is_array($value) && array_is_list($value) => implode(',', array_map(
                fn ($entry) => $entry === null ? '' : self::string($entry),
                $value,
            )),
            is_array($value), is_object($value) => '[object Object]',
            default => (string) $value,
        };
    }

    /** A number as JavaScript prints it: `12400000`, `8.5`, `0.1`. */
    public static function number(int|float $value): string
    {
        if (is_int($value)) {
            return (string) $value;
        }
        if (floor($value) === $value && abs($value) < 1e21) {
            return number_format($value, 0, '.', '');
        }

        // The shortest text that reads back as the same number, as JavaScript prints it.
        return (string) json_encode($value);
    }

    /**
     * `Number.parseInt(value, 10)` for a query value: the leading digits, or
     * null when there are none — `'12abc'` is 12, `'1e3'` is 1.
     */
    public static function parseInt(mixed $value): ?int
    {
        if (is_array($value)) {
            $value = $value[0] ?? null;
        }
        if (is_int($value)) {
            return $value;
        }
        if (is_float($value)) {
            return is_finite($value) ? (int) $value : null;
        }
        if (! is_string($value) || ! preg_match('/^['.self::SPACE.']*([+-]?\d+)/u', $value, $match)) {
            return null;
        }

        return (int) $match[1];
    }

    /** `Number.parseFloat(value)`, null for NaN. */
    public static function parseFloat(mixed $value): ?float
    {
        if (is_int($value) || is_float($value)) {
            return (float) $value;
        }
        if (! is_string($value) || ! preg_match('/^['.self::SPACE.']*([+-]?(?:\d+\.?\d*(?:e[+-]?\d+)?|\.\d+(?:e[+-]?\d+)?))/iu', $value, $match)) {
            return null;
        }

        return (float) $match[1];
    }

    /** `Number(value)` for a query or a stored value; null for NaN. */
    public static function toNumber(mixed $value): int|float|null
    {
        if (is_int($value) || is_float($value)) {
            return $value;
        }
        if (is_bool($value)) {
            return (int) $value;
        }
        if ($value === null) {
            return 0;
        }
        if (is_array($value)) {
            return count($value) === 0 ? 0 : (count($value) === 1 ? self::toNumber($value[0] ?? null) : null);
        }
        $text = self::trim((string) $value);
        if ($text === '') {
            return 0;
        }
        if (! is_numeric($text)) {
            return null;
        }

        return $text + 0;
    }

    /** A number that is whole as an int — what a DECIMAL column reads back as in JSON. */
    public static function normaliseNumber(int|float|string|null $value): int|float|null
    {
        if ($value === null || $value === '') {
            return null;
        }
        $number = is_string($value) ? $value + 0 : $value;
        if (is_float($number) && floor($number) === $number && abs($number) < 9.007199254740992E15) {
            return (int) $number;
        }

        return $number;
    }

    /**
     * A deep copy: arrays are values in PHP, but a `stdClass` is shared, and
     * the contract's `(object) []` defaults must never be.
     */
    public static function copy(mixed $value): mixed
    {
        if ($value instanceof stdClass) {
            $copy = new stdClass;
            foreach (get_object_vars($value) as $key => $entry) {
                $copy->{$key} = self::copy($entry);
            }

            return $copy;
        }
        if (is_array($value)) {
            return array_map([self::class, 'copy'], $value);
        }

        return $value;
    }

    /**
     * `{ ...left, ...right }` for two JSON objects; an empty result stays an
     * object.
     */
    public static function spread(mixed $left, mixed $right): array|stdClass
    {
        $merged = array_replace(self::entries($left), self::entries($right));

        return $merged === [] ? new stdClass : $merged;
    }

    /** A JSON object's entries as an array (a `stdClass` included). */
    public static function entries(mixed $value): array
    {
        if ($value instanceof stdClass) {
            return get_object_vars($value);
        }

        return is_array($value) ? $value : [];
    }

    /** Whether `key` is an own property of a JSON object. */
    public static function has(mixed $object, string|int $key): bool
    {
        if ($object instanceof stdClass) {
            return property_exists($object, (string) $key);
        }

        return is_array($object) && array_key_exists($key, $object);
    }

    /** `object[key]`, for an array or a `stdClass`. */
    public static function get(mixed $object, string|int $key, mixed $default = null): mixed
    {
        if ($object instanceof stdClass) {
            return property_exists($object, (string) $key) ? $object->{$key} : $default;
        }

        return is_array($object) && array_key_exists($key, $object) ? $object[$key] : $default;
    }
}
