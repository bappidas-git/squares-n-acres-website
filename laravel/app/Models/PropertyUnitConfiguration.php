<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A unit configuration of a listing (`properties.unitConfigurations[]`).
 *
 * Table `property_unit_configurations`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class PropertyUnitConfiguration extends Model
{
    protected $table = 'property_unit_configurations';

    protected function casts(): array
    {
        return [
            'property_id' => 'integer',
            'local_id' => 'integer',
            'position' => 'integer',
            'bedrooms' => 'integer',
            'bathrooms' => 'integer',
            'super_built_up_area' => 'float',
            'carpet_area' => 'float',
            'price' => 'float',
            'price_on_request' => 'boolean',
            'available_units' => 'integer',
            'is_active' => 'boolean',
            'order' => 'integer',
        ];
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }
}
