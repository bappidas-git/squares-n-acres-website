<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A testimonial (`testimonials`).
 *
 * Table `testimonials`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class Testimonial extends Model
{
    protected $table = 'testimonials';

    protected function casts(): array
    {
        return [
            'rating' => 'integer',
            'property_id' => 'integer',
            'is_featured' => 'boolean',
            'is_active' => 'boolean',
            'order' => 'integer',
            'is_sample' => 'boolean',
        ];
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }
}
