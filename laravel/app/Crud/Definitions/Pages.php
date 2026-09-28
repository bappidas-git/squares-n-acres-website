<?php

namespace App\Crud\Definitions;

use App\Domain\Pages\PageRules;
use App\Domain\Pages\PageWrites;

/**
 * CMS pages (01_API_CONTRACT.md §5.14; 05_BUSINESS_RULES.md → "Pages").
 *
 * The engine serves the admin half. A page's slug is a URL path, so its
 * separators survive slugification and `check-slug` answers about the whole
 * path. The navigation list, the public read by path (which understands
 * `?preview=`) and the preview token are App\Http\Controllers\PageController's.
 * Unlike master data, a POST or PUT leaves the collection's `order` alone;
 * only an `order` PATCH renumbers it.
 */
final class Pages
{
    /** @return array<string, array> resource key → CrudResource options */
    public static function definitions(): array
    {
        return [
            'pages' => [
                'collection' => 'pages',
                'basePath' => 'pages',
                'schema' => 'page',
                'publicPath' => false,
                'pathSlug' => true,
                'beforeValidate' => PageWrites::prepare(...),
                // A protected page is never deleted; a bulk action is refused whole, naming the pages in the way.
                'protect' => PageRules::deleteRefusal(...),
                'beforeBulk' => PageWrites::refuseProtected(...),
                'adminFilters' => [
                    'status' => ['field' => 'status', 'type' => 'csv'],
                    'template' => ['field' => 'template', 'type' => 'csv'],
                ],
                'sorts' => ['order' => 'order,title', 'title' => 'title', 'updatedAt' => '-updatedAt'],
                'defaultSort' => 'order',
                'bulkActions' => PageWrites::BULK_ACTIONS,
                'noun' => ['one' => 'page', 'many' => 'pages'],
                'staleGuard' => 'page',
            ],
        ];
    }
}
