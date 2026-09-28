<?php

namespace App\Domain\Articles;

use App\Support\Js;

/**
 * What an article needs before it may go live (05_BUSINESS_RULES.md →
 * "Article writes"; `src/config/articleRules.js`).
 *
 * The form refuses a publish that breaks these, and so does the API — `POST`,
 * `PUT`, `PATCH` and the bulk "publish" alike: the bulk bar once put a
 * four-word draft with no picture and no excerpt on the site because nothing
 * asked. The sentences are the form's, so the editor reads the same words in
 * either place.
 */
final class ArticleRules
{
    /** The two states a visitor can reach — a scheduled article is a published one with a date on it. */
    public const GOING_LIVE = ['published', 'scheduled'];

    /** An article needs this many words before it may go live. */
    public const PUBLISH_MIN_WORDS = 300;

    /** Whether a status puts the article in front of a visitor. */
    public static function goesLive(mixed $status): bool
    {
        return in_array($status, self::GOING_LIVE, true);
    }

    /**
     * What stands between an article and the site, keyed the way a 422 keys
     * it; `[]` when it may go live. Alt text is not among them: it is required
     * whenever there is an image, whatever the status (a schema rule).
     *
     * @return array<string, string>
     */
    public static function publishProblems(array $article, mixed $words): array
    {
        $found = [];
        $count = Js::toNumber($words);
        $count = $count !== null && is_finite((float) $count) ? $count : 0;

        if (self::text($article['excerpt'] ?? null) === '') {
            $found['excerpt'] = 'An excerpt is required before an article goes live.';
        }
        if (self::text(Js::get($article['featuredImage'] ?? null, 'url')) === '') {
            $found['featuredImage.url'] = 'A featured image is required before an article goes live.';
        }
        if ($count < self::PUBLISH_MIN_WORDS) {
            $found['content'] = 'An article needs at least '.self::PUBLISH_MIN_WORDS.' words to go live — this one has '.Js::string($count).'.';
        }

        return $found;
    }

    /**
     * The same problems as short phrases — "no featured image", "212 of 300
     * words" — for a refusal that names several articles at once.
     *
     * @param  array<string, string>  $problems  what publishProblems() found
     * @return array<int, string>
     */
    public static function publishGaps(array $problems, mixed $words): array
    {
        $gaps = [];
        if (isset($problems['excerpt'])) {
            $gaps[] = 'no excerpt';
        }
        if (isset($problems['featuredImage.url'])) {
            $gaps[] = 'no featured image';
        }
        if (isset($problems['content'])) {
            $count = Js::toNumber($words);
            $gaps[] = Js::string($count ?: 0).' of '.self::PUBLISH_MIN_WORDS.' words';
        }

        return $gaps;
    }

    private static function text(mixed $value): string
    {
        return is_string($value) ? Js::trim($value) : '';
    }
}
