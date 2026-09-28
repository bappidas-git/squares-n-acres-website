<?php

namespace App\Domain\Articles;

use App\Contract\Contract;
use App\Domain\Embed;
use App\Domain\Pages\SitePaths;
use App\Domain\Tokens\PreviewTokens;
use App\Store\DocumentStore;
use App\Support\Api\ApiException;
use App\Support\Debug\ApiLog;
use App\Support\Js;
use App\Support\Query\Filters;
use App\Support\Query\Paginator;
use App\Support\Query\QueryParams;
use App\Support\Time\Clock;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * The article reads (01_API_CONTRACT.md §5.14; 05_BUSINESS_RULES.md →
 * "Scheduled publishing", "Preview tokens", "View counting").
 *
 * Publication is a moment, not a flag: a `scheduled` article whose
 * `publishedAt` has passed is public (App\Domain\Articles\ArticleVisibility),
 * and every read — public or admin — first writes its status back as
 * `published`, so the admin list, the SEO desk and the site never disagree
 * between two runs of the scheduler.
 */
final class ArticleReads
{
    /** How many articles `GET /articles/trending` answers with. */
    public const TRENDING_LIMIT = 6;

    /** The public list row (`ArticleSummary`): everything a card renders, nothing heavier. */
    public const SUMMARY_FIELDS = [
        'id',
        'slug',
        'title',
        'excerpt',
        'featuredImage',
        'category',
        'tags',
        'author',
        'publishedAt',
        'readingTimeMinutes',
        'isFeatured',
        'viewCount',
    ];

    /** What no list returns: the body of the article and its plain text. */
    public const LIST_OMIT = ['content', 'contentText'];

    /** One counted view per visitor per article per hour. */
    public const VIEW_WINDOW_MINUTES = 60;

    public function __construct(private DocumentStore $store) {}

    /**
     * Brings the stored articles up to date before a read: a scheduled
     * article whose moment has passed becomes `published`, and a record that
     * never went through a save (an import) gets its derived text. Neither
     * moves `updatedAt` — both follow from what is already there.
     */
    public function settle(): void
    {
        $nowMs = Clock::ms(Clock::now());
        foreach ($this->store->all('articles') as $article) {
            $columns = [];
            if (($article['status'] ?? null) === 'scheduled' && ArticleVisibility::hasArrived($article['publishedAt'] ?? null, $nowMs)) {
                $columns['status'] = 'published';
            }
            if (! is_string($article['contentText'] ?? null) || ! Js::isNumber($article['readingTimeMinutes'] ?? null)) {
                $derived = ArticleWrites::deriveText($article);
                $columns += [
                    'content_text' => $derived['contentText'],
                    'word_count' => $derived['wordCount'],
                    'reading_time_minutes' => $derived['readingTimeMinutes'],
                ];
            }
            if ($columns !== []) {
                $this->store->setColumns('articles', $article['id'], $columns);
                ApiLog::info('articles', "Settled article #{$article['id']} on read", ['columns' => array_keys($columns)]);
            }
        }
    }

    /** An article with `category`, `tags` and `author` embedded, and its image as the contract reads it. */
    public function present(array $article): array
    {
        return FeaturedImage::fromStore((new Embed($this->store))->article($article));
    }

    /** The public list row. */
    public static function summary(array $article): array
    {
        $row = [];
        foreach (self::SUMMARY_FIELDS as $field) {
            $row[$field] = $article[$field] ?? null;
        }

        return $row;
    }

    /** The admin list row: the whole record without the body text. */
    public static function adminRow(array $article): array
    {
        return array_diff_key($article, array_flip(self::LIST_OMIT));
    }

    /**
     * `GET /articles`: the live articles, filtered (§5.14), `newest` first or
     * `popular`, as summary rows.
     *
     * @return array{0: array, 1: array} rows and meta
     */
    public function list(QueryParams $query): array
    {
        $this->settle();
        $articles = ArticleVisibility::sort(
            $this->filter(ArticleVisibility::live($this->store->all('articles')), $query),
            $query->first('sort'),
            $query->first('order'),
        );
        [$page, $meta] = Paginator::paginate(
            $articles,
            $query->first('page'),
            Paginator::positiveInt($query->first('perPage'), Paginator::DEFAULT_PER_PAGE_PUBLIC),
        );

        return [array_map(fn (array $article) => self::summary($this->present($article)), $page), $meta];
    }

    /**
     * `GET /articles/trending`: the most read live articles, six unless
     * `perPage` says otherwise, unpaginated.
     *
     * @return array{0: array, 1: array}
     */
    public function trending(QueryParams $query): array
    {
        $this->settle();
        $trending = array_slice(
            ArticleVisibility::sort(ArticleVisibility::live($this->store->all('articles')), 'popular', null),
            0,
            Paginator::positiveInt($query->first('perPage'), self::TRENDING_LIMIT),
        );

        return [array_map(fn (array $article) => self::summary($this->present($article)), $trending), Paginator::meta(count($trending))];
    }

    /**
     * `GET /articles/:id/adjacent`: the live articles published just before
     * (`prev`) and just after (`next`) this one, within `categoryId` when it
     * is given, so an article page walks its category in the order it was
     * written. Either side is null at the ends.
     *
     * @return array{prev: ?array, next: ?array}
     */
    public function adjacent(string $id, QueryParams $query): array
    {
        $this->settle();
        $article = $this->store->find('articles', $id);
        if ($article === null || ! ArticleVisibility::isLive($article)) {
            throw ApiException::notFound();
        }

        $categoryId = $query->first('categoryId');
        $pool = array_values(array_filter(
            ArticleVisibility::live($this->store->all('articles')),
            fn (array $row) => $categoryId === null || $categoryId === '' || Js::string($row['categoryId'] ?? null) === $categoryId,
        ));
        usort($pool, fn (array $left, array $right) => (Clock::ms($left['publishedAt']) <=> Clock::ms($right['publishedAt']))
            ?: ($left['id'] <=> $right['id']));

        $index = null;
        foreach ($pool as $position => $row) {
            if (Js::string($row['id']) === Js::string($article['id'])) {
                $index = $position;
                break;
            }
        }
        $at = fn (int $offset) => $index !== null && isset($pool[$index + $offset])
            ? self::summary($this->present($pool[$index + $offset]))
            : null;

        return ['prev' => $at(-1), 'next' => $at(1)];
    }

    /**
     * `GET /articles/slug/:slug`: a live article — or any article, with its
     * preview token — counting one view per visitor per hour. A preview is
     * the editor checking their own work, not readership, and counts nothing.
     */
    public function bySlug(string $slug, ?string $preview, ?string $ip): array
    {
        $this->settle();
        $article = null;
        foreach ($this->store->all('articles') as $row) {
            if (($row['slug'] ?? null) === $slug) {
                $article = $row;
                break;
            }
        }
        if ($article === null) {
            throw ApiException::notFound();
        }

        $previewing = PreviewTokens::verify($preview, 'article', $article['id']);
        if (! ArticleVisibility::isLive($article) && ! $previewing) {
            throw ApiException::notFound();
        }
        if ($previewing) {
            ApiLog::info('articles', "Article #{$article['id']} opened with its preview token");
        } elseif (Cache::add("view:{$ip}:article-{$article['id']}", true, Clock::now()->addMinutes(self::VIEW_WINDOW_MINUTES))) {
            $this->store->setColumns('articles', $article['id'], ['view_count' => DB::raw('view_count + 1')]);
            $article = $this->store->find('articles', $article['id']) ?? $article;
            ApiLog::debug('articles', "Counted a view of article #{$article['id']}", ['viewCount' => $article['viewCount']]);
        }

        // Who wrote it into the panel is the panel's business.
        return array_diff_key($this->present($article), array_flip(Contract::model('articles')['publicOmit'] ?? []));
    }

    /**
     * `GET /admin/articles/:id/preview-token`: a 24-hour token bound to this
     * article, and the link that opens it on the site.
     *
     * @return array{token: string, expiresAt: string, url: string}
     */
    public function previewToken(array $article): array
    {
        ['token' => $token, 'expiresAt' => $expiresAt] = PreviewTokens::issue('article', $article['id']);

        return [
            'token' => $token,
            'expiresAt' => $expiresAt,
            'url' => SitePaths::siteUrl($this->store).'/insights/articles/'.Js::string($article['slug'] ?? '')."?preview={$token}",
        ];
    }

    /**
     * The §5.14 filters (App\Domain\Articles\ArticleVisibility), with `q`
     * read as JavaScript reads it: any non-empty text searches, `0` included.
     */
    private function filter(array $articles, QueryParams $query): array
    {
        $articles = ArticleVisibility::filter(
            $articles,
            $query->without('q'),
            $this->store->all('articleCategories'),
            $this->store->all('articleTags'),
            $this->store->all('authors'),
        );
        $q = $query->first('q');
        if ($q === null || $q === '') {
            return $articles;
        }

        return array_values(array_filter($articles, fn (array $article) => Filters::matchesQ($article, ['title', 'excerpt', 'contentText'], $q)));
    }
}
