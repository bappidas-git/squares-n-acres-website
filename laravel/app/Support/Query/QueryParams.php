<?php

namespace App\Support\Query;

use Illuminate\Http\Request;

/**
 * The query string as the contract reads it.
 *
 * PHP keeps the last of `?bedrooms=2&bedrooms=3`; the contract (§5.6) reads
 * both, as Express's `qs` does — a repeated parameter is a list, and so is
 * `bedrooms[]=2`. The raw query string is parsed here once per request, and
 * every list endpoint reads its filters through this class.
 */
final class QueryParams
{
    /** @param  array<string, string|array>  $params */
    public function __construct(private array $params) {}

    public static function fromRequest(Request $request): self
    {
        return self::parse((string) $request->server('QUERY_STRING', ''));
    }

    public static function parse(string $query): self
    {
        $params = [];
        foreach (explode('&', $query) as $pair) {
            if ($pair === '') {
                continue;
            }
            [$rawKey, $rawValue] = array_pad(explode('=', $pair, 2), 2, '');
            $key = urldecode($rawKey);
            $value = urldecode($rawValue);
            if ($key === '') {
                continue;
            }

            // `a[]=1` is a list; `a[b]=1` a one-level object.
            if (preg_match('/^([^\[\]]+)\[([^\[\]]*)\]$/', $key, $match)) {
                [, $name, $inner] = $match;
                $current = $params[$name] ?? [];
                if (! is_array($current)) {
                    $current = [$current];
                }
                if ($inner === '' || ctype_digit($inner)) {
                    $current[] = $value;
                } else {
                    $current[$inner] = $value;
                }
                $params[$name] = $current;

                continue;
            }

            if (array_key_exists($key, $params)) {
                $params[$key] = array_merge((array) $params[$key], [$value]);
            } else {
                $params[$key] = $value;
            }
        }

        return new self($params);
    }

    /** The raw value: a string, a list of strings, or null when absent. */
    public function get(string $key): string|array|null
    {
        return $this->params[$key] ?? null;
    }

    /** The first value of a parameter (`first()` of the mock). */
    public function first(string $key): ?string
    {
        $value = $this->params[$key] ?? null;
        if (is_array($value)) {
            $value = $value === [] ? null : reset($value);
        }

        return $value === null ? null : (string) $value;
    }

    public function has(string $key): bool
    {
        return array_key_exists($key, $this->params) && $this->params[$key] !== '' && $this->params[$key] !== [];
    }

    /** Every parameter. */
    public function all(): array
    {
        return $this->params;
    }

    /** A copy with some parameters replaced; a null value removes one. */
    public function with(array $changes): self
    {
        $params = $this->params;
        foreach ($changes as $key => $value) {
            if ($value === null) {
                unset($params[$key]);
            } else {
                $params[$key] = $value;
            }
        }

        return new self($params);
    }

    /** A copy without some parameters. */
    public function without(string ...$keys): self
    {
        return $this->with(array_fill_keys($keys, null));
    }
}
