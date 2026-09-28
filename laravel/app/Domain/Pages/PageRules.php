<?php

namespace App\Domain\Pages;

use App\Support\Js;

/**
 * The pages the site is made of, and the rules the admin and the API share
 * about them (05_BUSINESS_RULES.md → "Pages"; `src/config/pages.js`, QA-56).
 *
 * **Built-in** pages (template `system`) are one record per page the site
 * generates from its own data — `properties`, `buy`, `rent`, `commercial`,
 * `lease`, `plots`, `localities`, `builders`, `insights/articles`,
 * `insights/faqs`, `shortlist` (the seed writes them). Their content is not
 * edited here, but their name, their place in the menus and their order are,
 * like any page's.
 *
 * Two kinds of page are **protected** — never deleted, and their address never
 * changes — because something other than a menu finds them by that address:
 * the built-in pages, whose address is a route of the site, and the written
 * pages the site's own templates link to (`home`, `contact`, the legal texts…).
 * A protected written page may still be unpublished; a built-in page may not,
 * because its route answers whatever the record says.
 */
final class PageRules
{
    /** The record the home page reads its two CMS bands and its head from (D81). */
    public const HOME_PAGE_SLUG = 'home';

    /** The template of a page the site generates rather than an editor writes. */
    public const SYSTEM_TEMPLATE = 'system';

    /** The written pages the site's own templates reach by their address. */
    public const LINKED_PAGE_SLUGS = [
        // The home page's "Why choose us" and "How it works", and its head (D81).
        self::HOME_PAGE_SLUG,
        // The header's Contact, the 404 page's trail and the seeded buttons.
        'contact',
        // An opening links back to it, and its breadcrumb names it.
        'careers',
        // The home page's "List your property" band.
        'sell-let',
        // The footer's legal line looks the three up by slug.
        'privacy-policy',
        'terms-of-use',
        'disclaimer',
        // Its `insights/` prefix is reserved: deleted, it could not be made again (D11).
        'insights/real-estate-awareness',
    ];

    /** Whether a page is one the site generates (template `system`). */
    public static function isSystemPage(?array $page): bool
    {
        return ($page['template'] ?? null) === self::SYSTEM_TEMPLATE;
    }

    /** Whether a page is the record behind the home page. */
    public static function isHomePage(?array $page): bool
    {
        return self::slugOf($page) === self::HOME_PAGE_SLUG;
    }

    /** Whether the site's own templates link to a written page by its address. */
    public static function isLinkedPage(?array $page): bool
    {
        return in_array(self::slugOf($page), self::LINKED_PAGE_SLUGS, true);
    }

    /** Why a page may not be deleted, or null — the sentence of the API's 409 and of the admin's refusal. */
    public static function deleteRefusal(array $page): ?string
    {
        if (self::isSystemPage($page)) {
            return '“'.self::titleOf($page).'” is built into the site and cannot be deleted. Take it out of the menus instead.';
        }
        if (self::isHomePage($page)) {
            return 'The home page cannot be deleted: its “Why choose us” and “How it works” bands and its search listing are read from it.';
        }
        if (self::isLinkedPage($page)) {
            return '“'.self::titleOf($page).'” cannot be deleted: the site links to it by its address. Unpublish it instead.';
        }

        return null;
    }

    /** Why a page's address may not change, or null. */
    public static function slugRefusal(array $page): ?string
    {
        if (self::isSystemPage($page)) {
            return 'A built-in page keeps its address: it is a route of the site.';
        }
        if (self::isHomePage($page)) {
            return 'The home page’s record keeps its address.';
        }
        if (self::isLinkedPage($page)) {
            return 'This page keeps its address: the site links to it as /'.self::slugOf($page).'.';
        }

        return null;
    }

    /** Why a page may not be taken off the site, or null: only a built-in page, whose route answers whatever the record says. */
    public static function unpublishRefusal(array $page): ?string
    {
        return self::isSystemPage($page)
            ? 'A built-in page is always live: the site generates it. Take it out of the menus instead.'
            : null;
    }

    /** Why the home page's SEO panel may not redirect it: its address is `/`. */
    public static function homeRedirectRefusal(): string
    {
        return 'The home page cannot be redirected: its address is /, where every visitor arrives.';
    }

    private static function slugOf(?array $page): string
    {
        return Js::string($page['slug'] ?? '');
    }

    private static function titleOf(array $page): string
    {
        $title = Js::trim(Js::string($page['title'] ?? ''));

        return $title !== '' ? $title : self::slugOf($page);
    }
}
