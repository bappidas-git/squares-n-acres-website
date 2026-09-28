<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A segment (`segments`, QA-52): the vocabulary a listing is filed under, referenced by slug.
 *
 * Table `segments`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class Segment extends Model
{
    protected $table = 'segments';

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'order' => 'integer',
        ];
    }

    public function propertyTypes(): HasMany
    {
        return $this->hasMany(PropertyType::class, 'segment', 'slug');
    }

    public function properties(): HasMany
    {
        return $this->hasMany(Property::class, 'segment', 'slug');
    }
}
