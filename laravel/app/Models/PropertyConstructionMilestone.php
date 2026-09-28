<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A construction milestone of a listing (`properties.constructionTimeline[]`).
 *
 * Table `property_construction_timeline`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class PropertyConstructionMilestone extends Model
{
    protected $table = 'property_construction_timeline';

    protected function casts(): array
    {
        return [
            'property_id' => 'integer',
            'local_id' => 'integer',
            'position' => 'integer',
            'date' => 'date:Y-m-d',
            'order' => 'integer',
        ];
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }
}
