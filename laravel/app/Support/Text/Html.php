<?php

namespace App\Support\Text;

use App\Support\Js;

/**
 * HTML → text (04_DATA_MODELS.md → articles, 05_BUSINESS_RULES.md → "Article writes").
 *
 * Articles and pages are stored as sanitised HTML; `contentText`, `wordCount`
 * and `readingTimeMinutes` are derived from it on every save. The conversion
 * is deliberately shallow: the input is HTML the editor produced.
 */
final class Html
{
    /** Words per minute the reading-time estimate assumes. */
    public const WORDS_PER_MINUTE = 200;

    /** The five predefined entities plus the ones an editor produces routinely. */
    private const ENTITIES = [
        '&amp;' => '&', '&lt;' => '<', '&gt;' => '>', '&quot;' => '"', '&apos;' => "'",
        '&#39;' => "'", '&nbsp;' => ' ', '&ndash;' => '–', '&mdash;' => '—', '&hellip;' => '…',
        '&rsquo;' => '’', '&lsquo;' => '‘', '&rdquo;' => '”', '&ldquo;' => '“', '&#8377;' => '₹',
    ];

    /** The plain text of an HTML fragment: single-spaced, trimmed. */
    public static function strip(mixed $html): string
    {
        if (! is_string($html) || $html === '') {
            return '';
        }

        $text = (string) preg_replace('~<(script|style)\b[^>]*>[\s\S]*?</\1>~i', ' ', $html);
        $text = (string) preg_replace('~<br\s*/?>~i', ' ', $text);
        $text = (string) preg_replace('~</(p|div|h[1-6]|li|tr|td|th|blockquote|section|article|figcaption)>~i', '$0 ', $text);
        $text = (string) preg_replace('~<[^>]*>~', '', $text);
        $text = (string) preg_replace_callback(
            '~&[a-z]+;|&#\d+;~i',
            fn (array $match) => self::ENTITIES[strtolower($match[0])] ?? ' ',
            $text,
        );

        return Js::trim(Js::collapseSpaces($text));
    }

    /** How many whitespace-separated words a text (or HTML) holds. */
    public static function wordCount(mixed $text): int
    {
        $text = (string) ($text ?? '');
        $plain = preg_match('~<[a-z!/]~i', $text) ? self::strip($text) : Js::trim($text);

        return $plain === '' ? 0 : count(Js::words($plain));
    }

    /** Whole minutes to read a word count; at least 1. */
    public static function readingTime(mixed $words, int $wordsPerMinute = self::WORDS_PER_MINUTE): int
    {
        $count = is_numeric($words) ? (float) $words : 0.0;
        if ($count <= 0) {
            return 1;
        }

        return max(1, (int) ceil($count / $wordsPerMinute));
    }

    /**
     * Whether stored HTML carries markup the site must never run: a script
     * element, an inline event handler, a `javascript:` address — looked for
     * inside tags only, and a handler among the attribute names only.
     */
    public static function unsafe(mixed $html): bool
    {
        if (! is_string($html) || $html === '') {
            return false;
        }
        if (preg_match('~<script\b~i', $html)) {
            return true;
        }

        preg_match_all('~<[a-z][^>]*>~i', $html, $tags);
        foreach ($tags[0] as $tag) {
            $names = (string) preg_replace('~"[^"]*"|\'[^\']*\'~', '""', $tag);
            if (preg_match('~\son[a-z]+\s*=~i', $names)) {
                return true;
            }
            preg_match_all(
                '~\s(?:href|src|action|formaction|xlink:href)\s*=\s*(?:"([^"]*)"|\'([^\']*)\'|([^\s>]+))~i',
                $tag,
                $attributes,
                PREG_SET_ORDER,
            );
            foreach ($attributes as $attribute) {
                $value = ($attribute[1] ?? '') !== '' ? $attribute[1] : (($attribute[2] ?? '') !== '' ? $attribute[2] : ($attribute[3] ?? ''));
                if (preg_match('~^javascript:~i', self::withoutBlanks(self::decodeAttribute($value)))) {
                    return true;
                }
            }
        }

        return false;
    }

    /** An attribute value as the browser reads it before it looks for a scheme. */
    private static function decodeAttribute(string $value): string
    {
        $value = (string) preg_replace_callback('~&#x([0-9a-f]+);?~i', fn ($m) => mb_chr(hexdec($m[1]) ?: 0x20, 'UTF-8') ?: '', $value);
        $value = (string) preg_replace_callback('~&#(\d+);?~', fn ($m) => mb_chr((int) $m[1] ?: 0x20, 'UTF-8') ?: '', $value);

        return (string) preg_replace_callback(
            '~&(colon|tab|newline);~i',
            fn ($m) => ['colon' => ':', 'tab' => "\t", 'newline' => "\n"][strtolower($m[1])] ?? $m[0],
            $value,
        );
    }

    /** A string without spaces and control characters, which browsers skip inside a scheme. */
    private static function withoutBlanks(string $value): string
    {
        return (string) preg_replace('/[\x00-\x20]/', '', $value);
    }

    /**
     * HTML → the text a reader sees, for the listing description's length rule
     * (`propertyRules.plainText`): every tag and entity a space.
     */
    public static function plainText(mixed $html): string
    {
        $text = (string) preg_replace('~<[^>]*>~', ' ', (string) ($html ?? ''));
        $text = str_replace('&nbsp;', ' ', $text);
        $text = (string) preg_replace('~&[a-z]+;~i', ' ', $text);

        return Js::trim(Js::collapseSpaces($text));
    }
}
