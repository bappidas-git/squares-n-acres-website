<?php

namespace App\Models;

use App\Models\Casts\AsJsonValue;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * An article category (`articleCategories`).
 *
 * Table `article_categories`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class ArticleCategory extends Model
{
    protected $table = 'article_categories';

    protected function casts(): array
    {
        return [
            'seo' => AsJsonValue::class,
            'order' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function articles(): HasMany
    {
        return $this->hasMany(Article::class, 'category_id');
    }
}
