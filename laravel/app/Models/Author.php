<?php

namespace App\Models;

use App\Models\Casts\AsJsonValue;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * An author (`authors`).
 *
 * Table `authors`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class Author extends Model
{
    protected $table = 'authors';

    protected function casts(): array
    {
        return [
            'social_links' => AsJsonValue::class,
            'is_active' => 'boolean',
            'seo' => AsJsonValue::class,
        ];
    }

    public function articles(): HasMany
    {
        return $this->hasMany(Article::class);
    }
}
