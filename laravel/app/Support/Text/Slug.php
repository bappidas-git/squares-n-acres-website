<?php

namespace App\Support\Text;

use Normalizer;

/**
 * Slugs (01_API_CONTRACT.md §5.9, 05_BUSINESS_RULES.md → "Slugs").
 *
 * Lowercase ASCII, `[a-z0-9-]`, no leading or trailing hyphen, at most 75
 * characters. Latin diacritics are transliterated by decomposing to NFD and
 * dropping the combining marks; the Latin letters that do not decompose carry
 * an explicit mapping. Everything else — Devanagari, Kannada, emoji — is
 * dropped rather than guessed at.
 *
 * A CMS page's slug is a URL path (`buyer-assistance/home-loan`): its
 * separators survive and each segment is slugified on its own, within 120
 * characters.
 */
final class Slug
{
    public const MAX_LENGTH = 75;

    public const MAX_PATH_LENGTH = 120;

    /** Latin letters without a canonical decomposition. */
    private const LIGATURES = [
        'ß' => 'ss', 'æ' => 'ae', 'œ' => 'oe', 'ø' => 'o', 'đ' => 'd', 'ð' => 'd',
        'þ' => 'th', 'ł' => 'l', 'ħ' => 'h', 'ı' => 'i', 'ŋ' => 'n', 'ſ' => 's',
    ];

    /** Arbitrary text as a URL slug; `''` when nothing survives. */
    public static function make(?string $text): string
    {
        $source = mb_strtolower((string) $text, 'UTF-8');
        $source = strtr($source, self::LIGATURES);
        $source = Normalizer::normalize($source, Normalizer::FORM_D) ?: $source;
        $source = (string) preg_replace('/[\x{0300}-\x{036f}]/u', '', $source);

        $slug = (string) preg_replace('/[^a-z0-9]+/u', '-', $source);
        $slug = (string) preg_replace('/-+/', '-', $slug);
        $slug = (string) preg_replace('/^-|-$/', '', $slug);

        return (string) preg_replace('/-$/', '', substr($slug, 0, self::MAX_LENGTH));
    }

    /** Arbitrary text as a URL path slug: each `/` segment slugified on its own. */
    public static function makePath(?string $text): string
    {
        $segments = array_filter(
            array_map([self::class, 'make'], explode('/', (string) $text)),
            fn (string $segment) => $segment !== '',
        );

        return (string) preg_replace('~[-/]+$~', '', substr(implode('/', $segments), 0, self::MAX_PATH_LENGTH));
    }

    /**
     * The first free variant of a slug among `records`: `slug`, then `slug-2`,
     * `slug-3`… trimmed back into the length budget.
     *
     * @param  array<int, array>  $records
     */
    public static function unique(array $records, string $slug, mixed $excludeId = null, string $field = 'slug', bool $path = false): string
    {
        $base = $path ? self::makePath($slug) : self::make($slug);
        if ($base === '') {
            return $base;
        }

        $taken = self::taken($records, $excludeId, $field);
        if (! isset($taken[$base])) {
            return $base;
        }

        $budget = $path ? self::MAX_PATH_LENGTH : self::MAX_LENGTH;
        for ($suffix = 2; ; $suffix++) {
            $tail = "-{$suffix}";
            $candidate = preg_replace('~[-/]$~', '', substr($base, 0, $budget - strlen($tail))).$tail;
            if (! isset($taken[$candidate])) {
                return $candidate;
            }
        }
    }

    /**
     * `GET /admin/<resource>/check-slug`.
     *
     * @return array{available: bool, suggestion: string}
     */
    public static function check(array $records, ?string $slug, mixed $excludeId = null, string $field = 'slug', bool $path = false): array
    {
        $candidate = $path ? self::makePath($slug) : self::make($slug);
        $suggestion = self::unique($records, $candidate, $excludeId, $field, $path);

        return ['available' => $candidate !== '' && $candidate === $suggestion, 'suggestion' => $suggestion];
    }

    /** @return array<string, true> */
    private static function taken(array $records, mixed $excludeId, string $field): array
    {
        $exclude = $excludeId === null ? null : (string) $excludeId;
        $taken = [];
        foreach ($records as $record) {
            if ($exclude !== null && (string) ($record['id'] ?? '') === $exclude) {
                continue;
            }
            $value = $record[$field] ?? null;
            if (is_string($value) && $value !== '') {
                $taken[$value] = true;
            }
        }

        return $taken;
    }
}
