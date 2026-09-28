<?php

namespace App\Domain\Articles;

use App\Support\Query\Filters;
use App\Support\Query\QueryParams;
use App\Support\Query\Sorter;
use App\Support\Time\Clock;

/**
 * Article visibility, filters and sorting (05_BUSINESS_RULES.md → "Scheduled
 * publishing").
 *
 * An article is public when it says it is published (or scheduled) **and**
 * its `publishedAt` has arrived — so an article scheduled for Tuesday 06:30
 * appears then without anyone touching it. The counters (`articleCount`), the
 * sitemap, the RSS feed and the dashboard all ask here rather than testing
 * `status === 'published'` themselves.
 */
final class ArticleVisibility
{
    /** The sorts `GET /articles` accepts. */
    public const PUBLIC_SORTS = [
        'newest' => ['spec' => 'publishedAt', 'order' => 'desc'],
        'popular' => ['spec' => 'viewCount', 'order' => 'desc'],
    ];

    /** Whether a moment has arrived; a missing date never has. */
    public static function hasArrived(mixed $value, ?int $nowMs = null): bool
    {
        if (! $value) {
            return false;
        }
        $moment = Clock::ms($value);

        return $moment !== null && $moment <= ($nowMs ?? Clock::ms(Clock::now()));
    }

    public static function isLive(?array $article, ?int $nowMs = null): bool
    {
        if ($article === null || ! in_array($article['status'] ?? null, ['published', 'scheduled'], true)) {
            return false;
        }

        return self::hasArrived($article['publishedAt'] ?? null, $nowMs);
    }

    /** The articles the public site may show, in the order they came in. */
    public static function live(array $articles, ?int $nowMs = null): array
    {
        $nowMs ??= Clock::ms(Clock::now());

        return array_values(array_filter($articles, fn (array $article) => self::isLive($article, $nowMs)));
    }

    /**
     * The §5.14 filters of `GET /articles`: `categorySlug`, `tagSlug` and
     * `authorSlug` resolve to ids (a slug nothing matches is an empty list),
     * then `categoryId`, `tagId`, `authorId`, `isFeatured`, `q`, `ids`.
     */
    public static function filter(array $articles, QueryParams $query, array $categories, array $tags, array $authors): array
    {
        $idOfSlug = function (array $rows, ?string $slug) {
            foreach ($rows as $row) {
                if (($row['slug'] ?? null) === $slug) {
                    return $row['id'];
                }
            }

            return null;
        };

        $categoryId = $query->has('categorySlug') ? $idOfSlug($categories, $query->first('categorySlug')) : $query->first('categoryId');
        $tagId = $query->has('tagSlug') ? $idOfSlug($tags, $query->first('tagSlug')) : $query->first('tagId');
        $authorId = $query->has('authorSlug') ? $idOfSlug($authors, $query->first('authorSlug')) : $query->first('authorId');

        if (($query->has('categorySlug') && $categoryId === null)
            || ($query->has('tagSlug') && $tagId === null)
            || ($query->has('authorSlug') && $authorId === null)) {
            return [];
        }

        $same = fn ($left, $right) => $left !== null && (string) $left === (string) $right;
        if ($categoryId !== null && $categoryId !== '') {
            $articles = array_filter($articles, fn ($article) => $same($article['categoryId'] ?? null, $categoryId));
        }
        if ($tagId !== null && $tagId !== '') {
            $articles = array_filter($articles, fn ($article) => array_filter((array) ($article['tagIds'] ?? []), fn ($id) => $same($id, $tagId)) !== []);
        }
        if ($authorId !== null && $authorId !== '') {
            $articles = array_filter($articles, fn ($article) => $same($article['authorId'] ?? null, $authorId));
        }

        $featured = $query->first('isFeatured');
        if ($featured !== null && $featured !== '') {
            $wanted = strtolower($featured);
            if ($wanted === 'true' || $wanted === '1') {
                $articles = array_filter($articles, fn ($article) => (bool) ($article['isFeatured'] ?? false));
            }
            if ($wanted === 'false' || $wanted === '0') {
                $articles = array_filter($articles, fn ($article) => ! ($article['isFeatured'] ?? false));
            }
        }

        $q = $query->first('q');
        if ($q) {
            $articles = array_filter($articles, fn ($article) => Filters::matchesQ($article, ['title', 'excerpt', 'contentText'], $q));
        }

        $articles = array_values($articles);
        $ids = Filters::csv($query->get('ids'));
        if ($ids !== []) {
            $found = [];
            foreach ($ids as $id) {
                foreach ($articles as $article) {
                    if ($same($article['id'], $id)) {
                        $found[] = $article;
                        break;
                    }
                }
            }

            return $found;
        }

        return $articles;
    }

    /** `newest` (the default) or `popular`. */
    public static function sort(array $articles, ?string $sort, ?string $order): array
    {
        $key = isset(self::PUBLIC_SORTS[(string) $sort]) ? (string) $sort : 'newest';
        $wanted = strtolower((string) $order);

        return Sorter::sort($articles, self::PUBLIC_SORTS[$key]['spec'], in_array($wanted, ['asc', 'desc'], true) ? $wanted : self::PUBLIC_SORTS[$key]['order']);
    }
}
