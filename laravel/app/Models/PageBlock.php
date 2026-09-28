<?php

namespace App\Models;

use App\Models\Casts\AsJsonValue;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A content block of a page (`pages.blocks[]`).
 *
 * Table `page_blocks`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class PageBlock extends Model
{
    protected $table = 'page_blocks';

    protected function casts(): array
    {
        return [
            'page_id' => 'integer',
            'local_id' => 'integer',
            'position' => 'integer',
            'order' => 'integer',
            'hidden' => 'boolean',
            'data' => AsJsonValue::class,
        ];
    }

    public function page(): BelongsTo
    {
        return $this->belongsTo(Page::class);
    }
}
