<?php

namespace App\Models;

use App\Models\Casts\AsJsonValue;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * An article (`articles`).
 *
 * Table `articles`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class Article extends Model
{
    use SoftDeletes;

    protected $table = 'articles';

    protected function casts(): array
    {
        return [
            'category_id' => 'integer',
            'author_id' => 'integer',
            'published_at' => 'datetime',
            'updated_at_display' => 'datetime',
            'is_featured' => 'boolean',
            'allow_comments' => 'boolean',
            'related_article_ids' => AsJsonValue::class,
            'related_property_ids' => AsJsonValue::class,
            'faqs' => AsJsonValue::class,
            'table_of_contents' => 'boolean',
            'seo' => AsJsonValue::class,
            'reading_time_minutes' => 'integer',
            'word_count' => 'integer',
            'view_count' => 'integer',
            'created_by' => 'integer',
            'updated_by' => 'integer',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ArticleCategory::class, 'category_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(Author::class);
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(ArticleTag::class, 'article_tag', 'article_id', 'article_tag_id')->withPivot('position')->orderByPivot('position');
    }

    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(AdminUser::class, 'created_by');
    }

    public function editor(): BelongsTo
    {
        return $this->belongsTo(AdminUser::class, 'updated_by');
    }
}
