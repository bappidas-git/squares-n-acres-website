<?php

namespace App\Support\Validation;

use App\Support\Api\ApiException;
use App\Support\Debug\ApiLog;
use App\Support\Js;
use App\Support\Time\Clock;
use Closure;

/**
 * Request-body validation against the contract's descriptors (§5.3, §5.8).
 *
 * The rules are the field descriptors exported from the website repository
 * (resources/contract/schemas.php) — the same descriptors the mock validates
 * with, the seed is checked against and 03_ENDPOINTS.md renders as Laravel
 * rules — so a body the mock accepts is a body this API accepts, and a 422
 * names the same keys with the same sentences:
 *
 *   { "message": "The given data was invalid.",
 *     "errors": { "location.localityId": ["The location.localityId field is required."] } }
 *
 * The write semantics decide `required`:
 *
 *  - `POST` (`fillDefaults`) may leave out a required field the model gives a
 *    default — the server fills it;
 *  - `PUT` states the whole record: an omitted required field is a 422, never
 *    a silent wipe;
 *  - `PATCH` (`partial`) checks only what it sends.
 *
 * `requiredIf` (`required_if`) fires only when the sibling it reads is in the
 * body; `exists` (`exists:<table>,<column>`) reads another collection through
 * the `lookup` the caller hands over; `unique` reads `collection`.
 */
final class SchemaValidator
{
    private const EMAIL = '/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u';

    private const INDIAN_MOBILE = '/^(\+91)?[6-9]\d{9}$/';

    /** An empty slug is a request to derive one (§5.9), not a bad slug. */
    private const SLUG = '/^[a-z0-9-]*$/';

    private const DATE = '/^\d{4}-\d{2}-\d{2}$/';

    /** The width of a `url` column: the longest address the API takes. */
    public const URL_MAX_LENGTH = 500;

    /** @var array<string, array<int, string>> */
    private array $errors = [];

    /**
     * @param  array{partial?: bool, fillDefaults?: bool, collection?: array|null, excludeId?: mixed, lookup?: Closure|null}  $options
     */
    private function __construct(private array $options) {}

    /**
     * Validates a body against a `{ field: descriptor }` schema.
     *
     * @throws ApiException 422 when anything failed
     */
    public static function validate(?array $schema, mixed $body, array $options = []): void
    {
        $errors = self::errors($schema, $body, $options);
        if ($errors !== []) {
            ApiLog::info('validation', 'Refused with 422', ['errors' => $errors]);

            throw ApiException::validation($errors);
        }
    }

    /**
     * The per-field messages, without throwing.
     *
     * @return array<string, array<int, string>>
     */
    public static function errors(?array $schema, mixed $body, array $options = []): array
    {
        $validator = new self([
            'partial' => (bool) ($options['partial'] ?? false),
            'fillDefaults' => (bool) ($options['fillDefaults'] ?? false),
            'collection' => $options['collection'] ?? null,
            'excludeId' => $options['excludeId'] ?? null,
            'lookup' => $options['lookup'] ?? null,
        ]);
        $validator->shape($schema ?? [], $body ?? [], '');

        return $validator->errors;
    }

    /** A field the client may never send: computed, embedded or server-managed. */
    public static function isReadOnly(?array $descriptor): bool
    {
        return (bool) (($descriptor['read'] ?? false) || ($descriptor['serverManaged'] ?? false));
    }

    /** What `required` treats as absent: null, a blank string, an empty list. */
    public static function isEmpty(mixed $value): bool
    {
        return $value === null
            || (is_string($value) && Js::trim($value) === '')
            || $value === [];
    }

    /** The longest string a descriptor accepts: its own `maxLength`, else its type's. */
    public static function maxLengthOf(?array $descriptor): ?int
    {
        if (isset($descriptor['maxLength']) && is_int($descriptor['maxLength'])) {
            return $descriptor['maxLength'];
        }

        return ($descriptor['type'] ?? null) === 'url' ? self::URL_MAX_LENGTH : null;
    }

    private function push(string $key, ?string $message): void
    {
        if ($message !== null) {
            $this->errors[$key][] = $message;
        }
    }

    private function shape(array $shape, mixed $body, string $prefix): void
    {
        // An empty body is `{}`; anywhere else a list is not an object.
        $isObject = Js::isPlainObject($body) || ($prefix === '' && $body === []);
        if (! $isObject) {
            $this->push($prefix, "The {$prefix} must be an object.");

            return;
        }
        $fields = Js::entries($body);

        foreach ($shape as $field => $descriptor) {
            if (! is_array($descriptor) || self::isReadOnly($descriptor)) {
                continue;
            }

            $key = $prefix === '' ? (string) $field : "{$prefix}.{$field}";
            $present = array_key_exists($field, $fields);
            $conditionallyRequired = $this->requiredIfArmed($descriptor, $fields);

            if (! $present) {
                $filledByServer = $this->options['fillDefaults'] && array_key_exists('default', $descriptor);
                if ($conditionallyRequired
                    || (! $this->options['partial'] && ($descriptor['required'] ?? false) && ! $filledByServer)) {
                    $this->push($key, "The {$key} field is required.");
                }

                continue;
            }

            $value = $fields[$field];
            if ((($descriptor['required'] ?? false) || $conditionallyRequired) && self::isEmpty($value)) {
                $this->push($key, "The {$key} field is required.");

                continue;
            }

            $this->value($key, (string) $field, $value, $descriptor);
        }
    }

    /** `requiredIf: { field, in }` fires when the sibling is present and holds one of the values. */
    private function requiredIfArmed(array $descriptor, array $siblings): bool
    {
        $rule = $descriptor['requiredIf'] ?? null;
        if (! is_array($rule) || ! array_key_exists($rule['field'] ?? '', $siblings)) {
            return false;
        }

        return in_array($siblings[$rule['field']], $rule['in'] ?? [], true);
    }

    private function value(string $key, string $field, mixed $value, array $descriptor): void
    {
        if ($value === null) {
            if ($descriptor['required'] ?? false) {
                $this->push($key, "The {$key} field is required.");
            } elseif (! ($descriptor['nullable'] ?? false)) {
                $this->push($key, $this->typeError($key, $value, $descriptor));
            }

            return;
        }

        $wrongType = $this->typeError($key, $value, $descriptor);
        if ($wrongType !== null) {
            $this->push($key, $wrongType);

            return;
        }

        foreach ($this->boundsErrors($key, $value, $descriptor) as $message) {
            $this->push($key, $message);
        }

        if ($descriptor['unique'] ?? false) {
            $this->push($key, $this->uniqueError($key, $field, $value));
        }
        if (isset($descriptor['exists'])) {
            $this->push($key, $this->existsError($key, $value, $descriptor['exists']));
        }

        if (($descriptor['type'] ?? null) === 'array' && isset($descriptor['items'])) {
            $items = $descriptor['items'];
            foreach (array_values($value) as $index => $entry) {
                $itemKey = "{$key}.{$index}";
                if (($items['type'] ?? null) === 'object' && isset($items['shape'])) {
                    $this->shape($items['shape'], $entry, $itemKey);

                    continue;
                }
                $this->value($itemKey, $field, $entry, $items);
            }
        }

        if (($descriptor['type'] ?? null) === 'object' && isset($descriptor['shape']) && is_array($descriptor['shape'])) {
            $this->shape($descriptor['shape'], $value, $key);
        }
    }

    private function typeError(string $key, mixed $value, array $descriptor): ?string
    {
        return match ($descriptor['type'] ?? null) {
            'string', 'html' => is_string($value) ? null : "The {$key} must be a string.",
            'int' => Js::isInteger($value) ? null : "The {$key} must be an integer.",
            'number' => Js::isNumber($value) ? null : "The {$key} must be a number.",
            'bool' => is_bool($value) ? null : "The {$key} field must be true or false.",
            'enum' => in_array($value, array_merge($descriptor['enum'] ?? [], $descriptor['accepts'] ?? []), true)
                ? null : "The selected {$key} is invalid.",
            'date' => is_string($value) && preg_match(self::DATE, $value) && Clock::isValid($value)
                ? null : "The {$key} does not match the format Y-m-d.",
            // A moment the column cannot hold is as unreadable as one that does not parse.
            'datetime' => is_string($value) && Clock::isStorable($value) ? null : "The {$key} is not a valid date.",
            'email' => is_string($value) && preg_match(self::EMAIL, $value)
                ? null : "The {$key} must be a valid email address.",
            'phone' => is_string($value) && preg_match(self::INDIAN_MOBILE, (string) preg_replace('/[\s-]/', '', $value))
                ? null : "The {$key} must be a valid Indian mobile number.",
            'url' => is_string($value) && preg_match('~^https?://[^\s]+$~iu', $value)
                ? null : "The {$key} must be a valid URL.",
            'slug' => is_string($value) && preg_match(self::SLUG, $value)
                ? null : "The {$key} may only contain lowercase letters, numbers and hyphens.",
            'array' => Js::isList($value) ? null : "The {$key} must be an array.",
            'object' => Js::isPlainObject($value) ? null : "The {$key} must be an object.",
            default => null,
        };
    }

    /** @return array<int, string> */
    private function boundsErrors(string $key, mixed $value, array $descriptor): array
    {
        $messages = [];
        $min = $descriptor['min'] ?? null;
        $max = $descriptor['max'] ?? null;
        $pattern = $descriptor['pattern'] ?? null;
        $maxLength = self::maxLengthOf($descriptor);

        if (Js::isNumber($value)) {
            if ($min !== null && $value < $min) {
                $messages[] = "The {$key} must be at least {$min}.";
            }
            if ($max !== null && $value > $max) {
                $messages[] = "The {$key} may not be greater than {$max}.";
            }
        } elseif (is_string($value)) {
            $length = Js::length($value);
            if ($min !== null && $length < $min) {
                $messages[] = "The {$key} must be at least {$min} characters.";
            }
            if ($maxLength !== null && $length > $maxLength) {
                $messages[] = "The {$key} may not be greater than {$maxLength} characters.";
            }
            if ($pattern !== null && ! preg_match(self::regex($pattern), $value)) {
                $messages[] = "The {$key} format is invalid.";
            }
        } elseif (Js::isList($value)) {
            if ($min !== null && count($value) < $min) {
                $messages[] = "The {$key} must have at least {$min} items.";
            }
            if ($max !== null && count($value) > $max) {
                $messages[] = "The {$key} may not have more than {$max} items.";
            }
        }

        return $messages;
    }

    /** A JavaScript regular-expression source as a PCRE pattern. */
    public static function regex(string $source): string
    {
        return '~'.str_replace('~', '\~', $source).'~u';
    }

    /** `unique: true` — no other row of the collection holds the value (case-insensitively). */
    private function uniqueError(string $key, string $field, mixed $value): ?string
    {
        $collection = $this->options['collection'];
        if (! is_array($collection)) {
            return null;
        }
        $exclude = $this->options['excludeId'] === null ? null : (string) $this->options['excludeId'];
        $wanted = Js::lower(Js::string($value));

        foreach ($collection as $record) {
            if ($exclude !== null && (string) ($record['id'] ?? '') === $exclude) {
                continue;
            }
            $stored = $record[$field] ?? null;
            if ($stored !== null && Js::lower(Js::string($stored)) === $wanted) {
                return "The {$key} has already been taken.";
            }
        }

        return null;
    }

    /** `exists: { collection, field }` — some row of another collection holds the value. */
    private function existsError(string $key, mixed $value, array $rule): ?string
    {
        $lookup = $this->options['lookup'];
        if (! $lookup instanceof Closure || empty($rule['collection'])) {
            return null;
        }
        $rows = $lookup($rule['collection']);
        if (! is_array($rows)) {
            return null;
        }
        $field = $rule['field'] ?? 'id';
        foreach ($rows as $record) {
            if (isset($record[$field]) && Js::string($record[$field]) === Js::string($value)) {
                return null;
            }
        }

        return "The selected {$key} is invalid.";
    }
}
