<?php

namespace App\Domain\HeaderMenus;

use App\Store\DocumentStore;
use App\Support\Debug\ApiLog;
use App\Support\Js;
use App\Support\Time\Clock;

/**
 * What a menu write does to the pages filed under it (05_BUSINESS_RULES.md →
 * "Header menus"). A page names its menu and its submenu by slug, so a menu
 * that goes — or loses a submenu — writes the pages that named it rather than
 * leaving them pointing at nothing; each page it touches gets a new
 * `updatedAt`.
 */
final class MenuPages
{
    /** The pages placed in a menu, whatever their status. */
    public static function in(DocumentStore $store, mixed $slug): array
    {
        if ($slug === null) {
            return [];
        }

        return array_values(array_filter($store->all('pages'), fn (array $page) => ($page['headerMenu'] ?? null) === $slug));
    }

    /**
     * The CRUD engine's `afterSave`: the pages of a submenu a PUT or PATCH
     * removed move into the menu's own list (`headerSubmenu = null`). Nothing
     * else follows the write — a page keeps its menu.
     */
    public static function releaseRemovedSubmenus(array $menu, array $ctx): void
    {
        $existing = $ctx['existing'] ?? null;
        if (! in_array($ctx['method'] ?? null, ['PUT', 'PATCH'], true) || $existing === null) {
            return;
        }
        $kept = array_map(fn (mixed $entry) => Js::get($entry, 'slug'), (array) ($menu['submenus'] ?? []));
        $removed = array_values(array_filter(
            array_map(fn (mixed $entry) => Js::get($entry, 'slug'), (array) ($existing['submenus'] ?? [])),
            fn (mixed $slug) => ! in_array($slug, $kept, true),
        ));
        if ($removed === []) {
            return;
        }

        $now = Clock::nowIso();
        foreach (self::in($ctx['store'], $existing['slug']) as $page) {
            if (in_array($page['headerSubmenu'] ?? null, $removed, true)) {
                $ctx['store']->update('pages', [...$page, 'headerSubmenu' => null, 'updatedAt' => $now], $page);
                ApiLog::info('header-menus', "Page #{$page['id']} moved into the menu’s own list", ['menu' => $existing['slug'], 'submenu' => $page['headerSubmenu']]);
            }
        }
    }

    /**
     * The CRUD engine's `beforeDelete`: a deleted menu takes its pages out of
     * the header (`showInHeader` off, no menu, no submenu) rather than leaving
     * them filed under a key that no longer exists; they stay published at
     * their addresses.
     */
    public static function takeOutOfHeader(array $menu, array $ctx): void
    {
        $now = Clock::nowIso();
        foreach (self::in($ctx['store'], $menu['slug'] ?? null) as $page) {
            $ctx['store']->update('pages', [
                ...$page,
                'showInHeader' => false,
                'headerMenu' => null,
                'headerSubmenu' => null,
                'updatedAt' => $now,
            ], $page);
            ApiLog::info('header-menus', "Page #{$page['id']} taken out of the header", ['menu' => $menu['slug'] ?? null]);
        }
    }
}
