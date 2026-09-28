<?php

namespace App\Domain\Pages;

use App\Store\DocumentStore;
use App\Support\Js;

/**
 * The public site's own addresses, as far as the CMS needs them
 * (`src/routes/paths.js`; 05_BUSINESS_RULES.md → "Pages", "Preview tokens").
 */
final class SitePaths
{
    /**
     * The first URL segments the CMS may never own (D11): each is answered by
     * a static route of the site before the CMS catch-all is reached, so a
     * page saved under one would exist and never be reachable.
     */
    public const RESERVED_PATH_PREFIXES = [
        'properties',
        'buy',
        'rent',
        'lease',
        'commercial',
        'plots',
        'localities',
        'builders',
        'insights',
        'careers',
        'shortlist',
        'admin',
    ];

    /** Whether a page slug's first segment is a reserved prefix. */
    public static function isReservedPath(mixed $slug): bool
    {
        $path = (string) preg_replace('~^/+~', '', Js::string($slug ?? ''));

        return in_array(Js::lower(explode('/', $path)[0]), self::RESERVED_PATH_PREFIXES, true);
    }

    /**
     * A CMS page's address: its path segments encoded one by one, and the
     * `home` record at the root — the home page reads its bands and its head
     * from that record, and `/home` is nobody's address (QA-56).
     */
    public static function page(mixed $slug): string
    {
        $segments = array_filter(explode('/', Js::string($slug ?? '')), fn (string $segment) => $segment !== '');
        $path = implode('/', array_map([self::class, 'encode'], $segments));

        return $path === 'home' ? '/' : "/{$path}";
    }

    /** The address a preview link is built on: the SEO settings' site URL, else the general one. */
    public static function siteUrl(DocumentStore $store): string
    {
        $url = Js::get($store->singleton('seoSettings'), 'siteUrl')
            ?? Js::get(Js::get($store->singleton('siteSettings'), 'general'), 'siteUrl')
            ?? '';

        return (string) preg_replace('~/+$~', '', Js::string($url));
    }

    /** `encodeURIComponent()`, which leaves `! ' ( ) *` as they are. */
    private static function encode(string $segment): string
    {
        return strtr(rawurlencode($segment), ['%21' => '!', '%27' => "'", '%28' => '(', '%29' => ')', '%2A' => '*']);
    }
}
