<?php

namespace App\Crud\Definitions;

use App\Domain\HeaderMenus\HeaderMenuRules;
use App\Domain\HeaderMenus\MenuPages;

/**
 * The header's menus (05_BUSINESS_RULES.md → "Header menus"; QA-56).
 *
 * The engine serves the admin half; the public `GET /header-menus` is
 * App\Http\Controllers\HeaderMenuController's — a menu has no page of its
 * own, so there is no read by slug. Unlike master data, a POST or PUT leaves
 * the collection's `order` alone; only an `order` PATCH renumbers it.
 */
final class HeaderMenus
{
    /** @return array<string, array> resource key → CrudResource options */
    public static function definitions(): array
    {
        return [
            'headerMenus' => [
                'collection' => 'headerMenus',
                'basePath' => 'header-menus',
                'schema' => 'headerMenu',
                'publicPath' => false,
                'beforeValidate' => HeaderMenuRules::prepare(...),
                'protect' => HeaderMenuRules::deleteRefusal(...),
                'afterRead' => fn (array $menu) => HeaderMenuRules::withBuiltIn($menu),
                // Removing a submenu moves its pages into the menu's own list.
                'afterSave' => MenuPages::releaseRemovedSubmenus(...),
                // A deleted menu takes its pages out of the header.
                'beforeDelete' => MenuPages::takeOutOfHeader(...),
                'sorts' => ['order' => 'order,name', 'name' => 'name'],
                'defaultSort' => 'order',
                'noun' => ['one' => 'menu', 'many' => 'menus'],
            ],
        ];
    }
}
