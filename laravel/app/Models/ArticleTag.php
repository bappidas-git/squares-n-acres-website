<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * An article tag (`articleTags`).
 *
 * Table `article_tags`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class ArticleTag extends Model
{
    protected $table = 'article_tags';

    protected function casts(): array
    {
        return [
        ];
    }

    public function articles(): BelongsToMany
    {
        return $this->belongsToMany(Article::class, 'article_tag', 'article_tag_id', 'article_id');
    }
}
