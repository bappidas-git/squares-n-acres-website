<?php

namespace App\Domain\Articles;

use App\Support\Js;

/**
 * An article without a featured image, between the document and its row.
 *
 * The contract lets a draft have no picture (`featuredImage: null`), while the
 * table keeps the image in three columns whose address and alt text are NOT
 * NULL (schema.sql) — so "no image" is stored as empty columns and read back
 * as `{ url: '', alt: '', caption: null }`. A client can never send an empty
 * address (the schema requires one inside an image), so that shape means "no
 * image" and nothing else. Writes store `null` in the row's own shape, which
 * keeps "a save that changes nothing" true for an article that has none;
 * reads answer `null`.
 */
final class FeaturedImage
{
    /** What the row holds for an article without an image. */
    public const NONE = ['url' => '', 'alt' => '', 'caption' => null];

    /** The document's image as the row stores it. */
    public static function toStore(array $article): array
    {
        if (array_key_exists('featuredImage', $article) && $article['featuredImage'] === null) {
            $article['featuredImage'] = self::NONE;
        }

        return $article;
    }

    /** The stored image as the contract reads it: `null` when there is none. */
    public static function fromStore(array $article): array
    {
        $image = $article['featuredImage'] ?? null;
        if ($image !== null && Js::get($image, 'url') === '' && Js::get($image, 'alt') === '') {
            $article['featuredImage'] = null;
        }

        return $article;
    }
}
