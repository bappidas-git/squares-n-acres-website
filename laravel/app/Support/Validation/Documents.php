<?php

namespace App\Support\Validation;

use App\Support\Js;
use stdClass;

/**
 * What a write stores (§5.5, §5.8, 05_BUSINESS_RULES.md → "Writes that change nothing"):
 *
 *   POST  → the model's defaults, then the body
 *   PUT   → replaces the record: defaults first, then the body; the id,
 *           `createdAt` and every server-managed value survive
 *   PATCH → merges only what it sends, one level deep for the object fields,
 *           so `PATCH { seo: { title } }` keeps the rest of `seo`
 *
 * Read-only fields are dropped from every body rather than refused: a field is
 * read-only exactly when its descriptor says `read` or `serverManaged`.
 */
final class Documents
{
    /** Object fields a PATCH merges one level deep. */
    public const DEEP_MERGE_FIELDS = [
        'pricing', 'area', 'location', 'configuration', 'project', 'sectionVisibility', 'seo', 'agent',
    ];

    /**
     * The keys the schema knows and a client may send; unknown keys are
     * dropped silently (a PATCH carrying a typo stores nothing and answers 200).
     */
    public static function sanitize(mixed $body, array $shape): array
    {
        if (! Js::isPlainObject($body) && $body !== []) {
            return [];
        }
        $fields = Js::entries($body);
        $clean = [];

        foreach ($shape as $field => $descriptor) {
            if (! is_array($descriptor) || SchemaValidator::isReadOnly($descriptor)) {
                continue;
            }
            if (! array_key_exists($field, $fields)) {
                continue;
            }
            $value = $fields[$field];
            if (($descriptor['type'] ?? null) === 'object' && isset($descriptor['shape']) && is_array($descriptor['shape']) && Js::isPlainObject($value)) {
                $nested = self::sanitize($value, $descriptor['shape']);
                $clean[$field] = $nested === [] ? new stdClass : $nested;

                continue;
            }
            $clean[$field] = $value;
        }

        return $clean;
    }

    /**
     * Every optional field at its documented default. An object field with a
     * shape gets the shape's defaults, refined by a declared object default;
     * a declared non-object default (`null`) replaces them outright.
     */
    public static function defaults(array $shape): array
    {
        $defaults = [];

        foreach ($shape as $field => $descriptor) {
            if (! is_array($descriptor) || ($descriptor['read'] ?? false)) {
                continue;
            }
            $declared = array_key_exists('default', $descriptor);

            if (($descriptor['type'] ?? null) === 'object' && isset($descriptor['shape']) && is_array($descriptor['shape'])) {
                if ($declared && ! Js::isPlainObject($descriptor['default']) && ! ($descriptor['default'] instanceof stdClass)) {
                    $defaults[$field] = Js::copy($descriptor['default']);

                    continue;
                }
                $nested = self::defaults($descriptor['shape']);
                $merged = $declared ? array_replace($nested, Js::entries(Js::copy($descriptor['default']))) : $nested;
                if ($merged !== []) {
                    $defaults[$field] = $merged;
                }

                continue;
            }
            if ($declared) {
                $defaults[$field] = Js::copy($descriptor['default']);

                continue;
            }
            if (($descriptor['type'] ?? null) === 'array' && ! ($descriptor['required'] ?? false)) {
                $defaults[$field] = [];
            }
        }

        return $defaults;
    }

    /**
     * A body layered over the defaults, descending into objects, so a PUT
     * sending `pricing: { price }` keeps `pricing.currency`.
     */
    public static function mergeDefaults(array $defaults, array $body): array
    {
        $merged = $defaults;
        foreach ($body as $field => $value) {
            $merged[$field] = Js::isPlainObject($value) && Js::isPlainObject($defaults[$field] ?? null)
                ? self::mergeDefaults(Js::entries($defaults[$field]), Js::entries($value))
                : $value;
        }

        return $merged;
    }

    /** The server-managed values of a stored record, which a PUT may not reset. */
    public static function serverManagedValues(array $record, array $shape): array
    {
        $kept = [];
        foreach ($shape as $field => $descriptor) {
            if (is_array($descriptor) && ($descriptor['serverManaged'] ?? false) && array_key_exists($field, $record)) {
                $kept[$field] = $record[$field];
            }
        }

        return $kept;
    }

    /**
     * One level of merging for the object fields of DEEP_MERGE_FIELDS — or
     * for every object field (`$everyField`), which is what a singleton needs.
     */
    public static function deepPatch(array $existing, array $body, bool $everyField = false): array
    {
        $patched = [];
        foreach ($body as $field => $value) {
            $merge = $everyField || in_array($field, self::DEEP_MERGE_FIELDS, true);
            $patched[$field] = $merge && Js::isPlainObject($value) && Js::isPlainObject($existing[$field] ?? null)
                ? Js::spread($existing[$field], $value)
                : $value;
        }

        return $patched;
    }

    /**
     * Trims the text a write sends, in place — Laravel's TrimStrings, applied
     * where the shape declares text: a `string`, the strings of an array of
     * them, the strings of an array of objects. HTML, slugs, URLs and passwords
     * are left as they came.
     */
    public static function trimText(array $body, ?array $shape): array
    {
        if (! is_array($shape)) {
            return $body;
        }
        foreach ($shape as $field => $descriptor) {
            if (is_array($descriptor) && array_key_exists($field, $body)) {
                $body[$field] = self::trimValue($body[$field], $descriptor);
            }
        }

        return $body;
    }

    private static function trimValue(mixed $value, ?array $descriptor): mixed
    {
        $type = $descriptor['type'] ?? null;
        if ($type === 'string') {
            return is_string($value) ? Js::trim($value) : $value;
        }
        if ($type === 'object' && Js::isPlainObject($value) && is_array($descriptor['shape'] ?? null)) {
            $trimmed = self::trimText(Js::entries($value), $descriptor['shape']);

            return $trimmed === [] ? new stdClass : $trimmed;
        }
        if ($type === 'array' && Js::isList($value)) {
            return array_map(fn ($entry) => self::trimValue($entry, $descriptor['items'] ?? null), $value);
        }

        return $value;
    }

    /**
     * A value as a string whatever order its keys were written in — how two
     * records are compared for "the write changes nothing".
     */
    public static function canonical(mixed $value): string
    {
        return json_encode(self::sortKeys($value), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION) ?: '';
    }

    private static function sortKeys(mixed $value): mixed
    {
        if ($value instanceof stdClass) {
            $value = get_object_vars($value);
            if ($value === []) {
                return new stdClass;
            }
        }
        if (is_array($value)) {
            if (! array_is_list($value)) {
                ksort($value, SORT_STRING);
            }

            return array_map([self::class, 'sortKeys'], $value);
        }
        if (is_float($value) && floor($value) === $value && abs($value) < 9.0E15) {
            return (int) $value;
        }

        return $value;
    }

    /** Whether a write would store exactly what is stored, the audit fields aside. */
    public static function unchanged(array $existing, array $record, array $ignore = ['updatedAt', 'updatedBy']): bool
    {
        $strip = fn (array $source) => array_diff_key($source, array_flip($ignore));

        return self::canonical($strip($existing)) === self::canonical($strip($record));
    }
}
