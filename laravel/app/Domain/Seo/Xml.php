<?php

namespace App\Domain\Seo;

use App\Support\Js;

/**
 * XML building for the sitemaps and the RSS feed (06_SEO_SITEMAP_ROBOTS.md →
 * "Escaping"; the mock's `lib/xml.js`).
 *
 * Small on purpose: the documents are shallow — a declaration, one root
 * element, one element per URL — and they must come out byte for byte as the
 * mock writes them, two-space indentation and self-closing empties included.
 * The declaration is the very first bytes: no BOM, no leading whitespace.
 */
final class Xml
{
    /** The five predefined entities, escaped in every element and attribute value. */
    private const ESCAPES = ['&' => '&amp;', '<' => '&lt;', '>' => '&gt;', '"' => '&quot;', "'" => '&apos;'];

    /** Escapes text once; null is the empty string. */
    public static function escape(mixed $value): string
    {
        return $value === null ? '' : strtr(Js::string($value), self::ESCAPES);
    }

    /** ` key="value"` pairs, leaving out null and empty values. */
    public static function attributes(array $attributes): string
    {
        $pairs = '';
        foreach ($attributes as $name => $value) {
            if ($value !== null && $value !== '') {
                $pairs .= " {$name}=\"".self::escape($value).'"';
            }
        }

        return $pairs;
    }

    /**
     * One element. `$children` is text (escaped) or a list of elements
     * already built (inserted verbatim, indented by two spaces); an empty
     * value makes the element self-closing, an empty list an empty body.
     */
    public static function element(string $name, mixed $children = '', array $attributes = []): string
    {
        $open = '<'.$name.self::attributes($attributes);
        if ($children === null || $children === '') {
            return "{$open} />";
        }
        if (is_array($children)) {
            $lines = array_map(
                fn (string $child) => '  '.str_replace("\n", "\n  ", $child),
                array_filter($children, fn ($child) => $child !== null && $child !== ''),
            );

            return "{$open}>\n".implode("\n", $lines)."\n</{$name}>";
        }

        return "{$open}>".self::escape($children)."</{$name}>";
    }

    /** The declaration, then the root element. */
    public static function document(string $root): string
    {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n{$root}\n";
    }
}
