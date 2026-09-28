<?php

namespace App\Support\Json;

use stdClass;

/**
 * JSON in and out without losing the difference between `{}` and `[]`.
 *
 * PHP decodes both to `[]` when asked for arrays, and encodes `[]` back as a
 * list — so a page block whose `data` is `{}`, or a lead's free-form `meta`,
 * would come back from the API as `[]`. The frontend reads those as objects.
 *
 * {@see decode()} therefore returns plain PHP arrays for every JSON object
 * *except* the ones that would not survive the round trip — an empty object,
 * or an object whose keys happen to read `0, 1, 2…` — which stay `stdClass`.
 * Everything else in the API can keep using array syntax, and `data_get()`
 * reads both.
 */
final class JsonValue
{
    /** The flags every response and every stored JSON column is written with. */
    public const ENCODE_FLAGS = JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION;

    /**
     * Decodes a JSON document, keeping objects that PHP arrays cannot represent.
     *
     * @return mixed `null` for an empty or malformed document
     */
    public static function decode(?string $json): mixed
    {
        if ($json === null || trim($json) === '') {
            return null;
        }

        $decoded = json_decode($json, false, 512, JSON_BIGINT_AS_STRING);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return null;
        }

        return self::normalise($decoded);
    }

    /** Whether a string is well-formed JSON. */
    public static function isValid(string $json): bool
    {
        json_decode($json);

        return json_last_error() === JSON_ERROR_NONE;
    }

    /**
     * Converts `stdClass` trees (from `json_decode(…, false)`) into the
     * array-or-object representation described above.
     */
    public static function normalise(mixed $value): mixed
    {
        if ($value instanceof stdClass) {
            $vars = get_object_vars($value);
            if ($vars === [] || array_is_list($vars)) {
                // `{}` or `{"0": …}` — only an object keeps them objects.
                $object = new stdClass;
                foreach ($vars as $key => $entry) {
                    $object->{$key} = self::normalise($entry);
                }

                return $object;
            }
            $array = [];
            foreach ($vars as $key => $entry) {
                $array[$key] = self::normalise($entry);
            }

            return $array;
        }

        if (is_array($value)) {
            return array_map([self::class, 'normalise'], $value);
        }

        return $value;
    }

    /** Encodes a value for a JSON column or a response body. */
    public static function encode(mixed $value): string
    {
        return json_encode($value, self::ENCODE_FLAGS | JSON_THROW_ON_ERROR);
    }

    /** Whether a value is a JSON object in this representation (an associative array or a stdClass). */
    public static function isObject(mixed $value): bool
    {
        return $value instanceof stdClass || (is_array($value) && ($value === [] ? false : ! array_is_list($value)));
    }

    /** A JSON object as an associative array (an empty `stdClass` is `[]`). */
    public static function toArray(mixed $value): array
    {
        if ($value instanceof stdClass) {
            return array_map([self::class, 'normalise'], get_object_vars($value));
        }

        return is_array($value) ? $value : [];
    }

    /**
     * `(object) []` when an associative array would encode as a list — for a
     * value the contract says is an object (a counts map, an empty `data`).
     */
    public static function asObject(mixed $value): mixed
    {
        if (is_array($value) && ($value === [] || array_is_list($value))) {
            return (object) $value;
        }

        return $value;
    }
}
