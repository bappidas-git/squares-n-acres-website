<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A place near a listing (`properties.nearbyPlaces[]`).
 *
 * Table `property_nearby_places`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class PropertyNearbyPlace extends Model
{
    protected $table = 'property_nearby_places';

    protected function casts(): array
    {
        return [
            'property_id' => 'integer',
            'local_id' => 'integer',
            'position' => 'integer',
            'distance_km' => 'float',
            'travel_time_min' => 'integer',
            'order' => 'integer',
        ];
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }
}
