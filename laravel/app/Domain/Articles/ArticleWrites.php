<?php

namespace App\Domain\Articles;

use App\Support\Api\ApiException;
use App\Support\Debug\ApiLog;
use App\Support\Js;
use App\Support\Text\Html;
use App\Support\Time\Clock;

/**
 * What an article write derives and what it must pass before it is stored
 * (05_BUSINESS_RULES.md → "Article writes", "Scheduled publishing").
 *
 * The derived text — `contentText`, `wordCount`, `readingTimeMinutes` — is
 * computed on every save and never taken from a client: the reading time of
 * an article is a fact about its text. Every rule answers in the one 422, so a
 * body that breaks three of them hears about all three.
 */
final class ArticleWrites
{
    public const UNSAFE_MESSAGE = 'The text may not carry a script, an inline event handler or a javascript: link.';

    /** `POST /admin/articles/bulk`; `feature`, `unfeature` and `delete` come with the resource. */
    public const BULK_ACTIONS = [
        'publish' => ['status' => 'published'],
        'unpublish' => ['status' => 'draft'],
        'archive' => ['status' => 'archived'],
    ];

    /** The fields a PATCH has to touch before the publish rules are asked again. */
    public const PUBLISH_FIELDS = ['status', 'publishedAt', 'excerpt', 'content', 'featuredImage'];

    /**
     * The records an article names by id — Laravel's `exists:<table>,id`. A
     * stale picker in a second tab could otherwise save a category, an author
     * or a tag that no longer exists, and the page would draw no byline.
     */
    private const REFERENCES = [
        ['field' => 'categoryId', 'collection' => 'articleCategories', 'many' => false],
        ['field' => 'authorId', 'collection' => 'authors', 'many' => false],
        ['field' => 'tagIds', 'collection' => 'articleTags', 'many' => true],
        ['field' => 'relatedArticleIds', 'collection' => 'articles', 'many' => true],
        ['field' => 'relatedPropertyIds', 'collection' => 'properties', 'many' => true],
    ];

    /** The plain text the search and the readability checks read, its word count and its reading time. */
    public static function deriveText(array $article): array
    {
        $article['contentText'] = Html::strip($article['content'] ?? null);
        $article['wordCount'] = Html::wordCount($article['contentText']);
        $article['readingTimeMinutes'] = Html::readingTime($article['wordCount']);

        return $article;
    }

    /**
     * The CRUD engine's `beforeSave`: derives the text, then asks every rule.
     *
     *  - every id the article names exists, and it is not related to itself;
     *  - the body and the FAQ answers carry no script, inline handler or
     *    `javascript:` link (asked of a PATCH only when it sends them);
     *  - `scheduled` needs a moment in the future, and `published` may not
     *    carry one — the site reads the date, not the word;
     *  - going live needs an excerpt, a featured image and 300 words, asked of
     *    every create and replace and of a PATCH that touches what they read.
     *
     * The first time an article is published without a date it gets this one.
     */
    public static function beforeSave(array $article, array $ctx): array
    {
        $method = $ctx['method'] ?? null;
        $body = $ctx['body'] ?? [];
        $now = Clock::now();
        $nowMs = (int) $now->getTimestampMs();
        $touches = fn (array $fields) => $method !== 'PATCH' || array_intersect($fields, array_keys($body)) !== [];

        $found = self::referenceProblems($article, $ctx);
        $article = self::deriveText($article);

        if ($touches(['content']) && Html::unsafe($article['content'] ?? null)) {
            $found['content'] = [self::UNSAFE_MESSAGE];
        }
        if ($touches(['faqs'])) {
            foreach (Js::isList($article['faqs'] ?? null) ? $article['faqs'] : [] as $index => $faq) {
                if (Html::unsafe(Js::get($faq, 'answer'))) {
                    $found["faqs.{$index}.answer"] = [self::UNSAFE_MESSAGE];
                }
            }
        }

        $status = $article['status'] ?? null;
        $moment = self::moment($article['publishedAt'] ?? null);
        if ($status === 'scheduled' && ! ($moment !== null && $moment > $nowMs)) {
            $found['publishedAt'] = ['A scheduled article needs a publication date in the future.'];
        }
        if ($status === 'published' && $moment !== null && $moment > $nowMs) {
            $found['publishedAt'] = ['A published article cannot carry a date in the future — schedule it instead.'];
        }

        if (ArticleRules::goesLive($status) && $touches(self::PUBLISH_FIELDS)) {
            foreach (ArticleRules::publishProblems($article, $article['wordCount']) as $field => $message) {
                $found[$field] = [$message];
            }
        }

        if ($found !== []) {
            ApiLog::info('articles', 'Refused an article write', ['id' => $article['id'] ?? null, 'errors' => $found]);

            throw ApiException::validation($found);
        }

        // Unpublishing and publishing again keeps the date it first went live on.
        if ($status === 'published' && ($article['publishedAt'] ?? null) === null) {
            $article['publishedAt'] = Clock::iso($now);
            ApiLog::info('articles', 'Article goes live now', ['id' => $article['id'] ?? null]);
        }

        return FeaturedImage::toStore($article);
    }

    /**
     * The ids an article names that name nothing, keyed like the schema's own
     * 422 — "The selected tagIds.2 is invalid." A PATCH is asked only about
     * the references it sends: flipping `isFeatured` must not fail over a
     * field nobody touched.
     *
     * @return array<string, array<int, string>>
     */
    public static function referenceProblems(array $article, array $ctx): array
    {
        $found = [];
        $body = $ctx['body'] ?? [];

        foreach (self::REFERENCES as ['field' => $field, 'collection' => $collection, 'many' => $many]) {
            if (($ctx['method'] ?? null) === 'PATCH' && ! array_key_exists($field, $body)) {
                continue;
            }
            $known = [];
            foreach ($ctx['store']->all($collection) as $row) {
                $known[Js::string($row['id'] ?? null)] = true;
            }

            if ($many) {
                foreach (Js::isList($article[$field] ?? null) ? $article[$field] : [] as $index => $id) {
                    if (! isset($known[Js::string($id)])) {
                        $found["{$field}.{$index}"] = ["The selected {$field}.{$index} is invalid."];
                    }
                }
            } elseif (($article[$field] ?? null) !== null && ! isset($known[Js::string($article[$field])])) {
                $found[$field] = ["The selected {$field} is invalid."];
            }
        }

        // An article is not further reading for itself.
        $own = $ctx['existing']['id'] ?? null;
        if ($own !== null) {
            foreach (Js::isList($article['relatedArticleIds'] ?? null) ? $article['relatedArticleIds'] : [] as $index => $id) {
                if (Js::string($id) === Js::string($own)) {
                    $found["relatedArticleIds.{$index}"] = ['An article cannot be related to itself.'];
                }
            }
        }

        return $found;
    }

    /**
     * The CRUD engine's `afterSave`: a published article whose date has not
     * come goes live now. A bulk "publish" never reaches `beforeSave`, and a
     * scheduled piece published from the list used to stay dated in the
     * future — "published", and invisible until that date.
     */
    public static function afterSave(array $article, array $ctx): void
    {
        $moment = self::moment($article['publishedAt'] ?? null);
        if (($article['status'] ?? null) !== 'published' || ($moment !== null && $moment <= Clock::ms(Clock::now()))) {
            return;
        }

        $ctx['store']->update('articles', [...$article, 'publishedAt' => Clock::nowIso()], $article);
        ApiLog::info('articles', "Article #{$article['id']} went live now", ['was' => $article['publishedAt'] ?? null, 'method' => $ctx['method'] ?? null]);
    }

    /**
     * The CRUD engine's `beforeBulk`: a bulk "publish" asks the publish rules
     * of every article it would put on the site, all or nothing, so the editor
     * sees one list of what is missing rather than half a batch published. An
     * article already published is not asked: publishing it again changes
     * nothing.
     */
    public static function refuseUnpublishable(string $action, array $targets): void
    {
        if ($action !== 'publish') {
            return;
        }

        $refused = [];
        foreach ($targets as $article) {
            if (($article['status'] ?? null) === 'published') {
                continue;
            }
            $words = Js::isNumber($article['wordCount'] ?? null) ? $article['wordCount'] : Html::wordCount(Html::strip($article['content'] ?? null));
            $gaps = ArticleRules::publishGaps(ArticleRules::publishProblems($article, $words), $words);
            if ($gaps !== []) {
                $refused[] = ['article' => $article, 'gaps' => $gaps];
            }
        }
        if ($refused === []) {
            return;
        }

        $title = fn (array $entry) => Js::string($entry['article']['title'] ?? null);
        $message = count($refused) === 1
            ? '“'.$title($refused[0]).'” is not ready to go live: '.implode(', ', $refused[0]['gaps']).'.'
            : count($refused).' of the selected articles are not ready to go live.';
        ApiLog::info('articles', 'Bulk publish refused', ['ids' => array_map(fn (array $entry) => $entry['article']['id'], $refused)]);

        throw new ApiException(
            422,
            $message,
            ['ids' => array_map(fn (array $entry) => '“'.$title($entry).'”: '.implode(', ', $entry['gaps']).'.', $refused)],
            ['notReady' => array_map(fn (array $entry) => [
                'id' => $entry['article']['id'],
                'title' => $entry['article']['title'] ?? null,
                'gaps' => $entry['gaps'],
            ], $refused)],
        );
    }

    /**
     * The CRUD engine's `beforeDelete`. A deleted article keeps its row (soft
     * delete) but gives up its address, as it does on the mock, where the
     * record is gone: the slug's unique index covers deleted rows too, so a
     * new article could otherwise never take it. The row keeps the old slug
     * in `seo.slug`; a `~` never appears in a live slug.
     */
    public static function releaseSlug(array $article, array $ctx): void
    {
        $suffix = "~{$article['id']}";
        $slug = Js::string($article['slug'] ?? '');
        $ctx['store']->setColumns('articles', $article['id'], ['slug' => substr($slug, 0, 75 - strlen($suffix)).$suffix]);
        ApiLog::debug('articles', "Article #{$article['id']} gives up the slug {$slug}");
    }

    /** `Date.parse(value)` of a stored date in milliseconds; null (NaN) when there is none. */
    private static function moment(mixed $value): ?int
    {
        return is_string($value) && $value !== '' ? Clock::ms($value) : null;
    }
}
