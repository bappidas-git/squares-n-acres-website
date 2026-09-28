<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A question answered on a listing (`properties.faqs[]`).
 *
 * Table `property_faqs`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class PropertyFaq extends Model
{
    protected $table = 'property_faqs';

    protected function casts(): array
    {
        return [
            'property_id' => 'integer',
            'local_id' => 'integer',
            'position' => 'integer',
            'order' => 'integer',
        ];
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }
}
