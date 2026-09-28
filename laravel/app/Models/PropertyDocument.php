<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A file of a listing (`properties.documents[]`).
 *
 * Table `property_documents`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class PropertyDocument extends Model
{
    protected $table = 'property_documents';

    protected function casts(): array
    {
        return [
            'property_id' => 'integer',
            'local_id' => 'integer',
            'position' => 'integer',
            'lead_gated' => 'boolean',
            'order' => 'integer',
        ];
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }
}
