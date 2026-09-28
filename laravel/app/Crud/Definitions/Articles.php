<?php

namespace App\Crud\Definitions;

use App\Domain\Articles\ArticleReads;
use App\Domain\Articles\ArticleWrites;

/**
 * Articles (01_API_CONTRACT.md §5.14; 05_BUSINESS_RULES.md → "Article writes").
 *
 * The engine's generic routes serve the writes — create, replace, patch,
 * delete, `bulk`. The admin reads (list, read, `check-slug`) run the same
 * handlers from App\Http\Controllers\ArticleController, which first settles
 * the scheduled articles so the admin sees what the site shows; the public
 * reads and the preview token are that controller's too.
 */
final class Articles
{
    /** @return array<string, array> resource key → CrudResource options */
    public static function definitions(): array
    {
        return [
            'articles' => [
                'collection' => 'articles',
                'basePath' => 'articles',
                'schema' => 'article',
                'publicPath' => false,
                'routes' => ['create', 'update', 'patch', 'remove', 'bulk'],
                // The admin reads embed `category`, `tags` and `author`; the engine adds `updatedByName`.
                'afterRead' => fn (array $article, array $ctx) => (new ArticleReads($ctx['store']))->present($article),
                'listShape' => fn (array $article) => ArticleReads::adminRow($article),
                'adminFilters' => [
                    'status' => ['field' => 'status', 'type' => 'csv'],
                    'categoryId' => ['field' => 'categoryId'],
                    'authorId' => ['field' => 'authorId'],
                    'isFeatured' => ['field' => 'isFeatured', 'type' => 'bool'],
                    'tagId' => ['field' => 'tagIds', 'type' => 'csvArray'],
                    'seoScoreBand' => ['field' => 'seo.scoreBand'],
                ],
                'sorts' => [
                    'updatedAt' => '-updatedAt',
                    'publishedAt' => '-publishedAt',
                    'newest' => '-publishedAt',
                    'title' => 'title',
                    'viewCount' => '-viewCount',
                    'popular' => '-viewCount',
                ],
                'defaultSort' => 'updatedAt',
                // A form opened before somebody else's save is refused, not replayed over it.
                'staleGuard' => 'article',
                'beforeSave' => ArticleWrites::beforeSave(...),
                'afterSave' => ArticleWrites::afterSave(...),
                'beforeBulk' => ArticleWrites::refuseUnpublishable(...),
                'beforeDelete' => ArticleWrites::releaseSlug(...),
                'bulkActions' => ArticleWrites::BULK_ACTIONS,
                'noun' => ['one' => 'article', 'many' => 'articles'],
            ],
        ];
    }
}
