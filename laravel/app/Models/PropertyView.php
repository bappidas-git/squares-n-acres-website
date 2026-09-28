<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One counted view of a listing (`propertyViews`).
 *
 * Table `property_views`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class PropertyView extends Model
{
    protected $table = 'property_views';

    protected function casts(): array
    {
        return [
            'property_id' => 'integer',
            'viewed_at' => 'datetime',
        ];
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }
}
