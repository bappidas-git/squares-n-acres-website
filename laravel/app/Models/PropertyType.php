<?php

namespace App\Models;

use App\Models\Casts\AsJsonValue;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A property type (`propertyTypes`).
 *
 * Table `property_types`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class PropertyType extends Model
{
    protected $table = 'property_types';

    protected function casts(): array
    {
        return [
            'show_in_rent_menu' => 'boolean',
            'show_in_commercial_menu' => 'boolean',
            'is_active' => 'boolean',
            'order' => 'integer',
            'seo' => AsJsonValue::class,
        ];
    }

    public function segmentRecord(): BelongsTo
    {
        return $this->belongsTo(Segment::class, 'segment', 'slug');
    }

    public function properties(): HasMany
    {
        return $this->hasMany(Property::class);
    }

    public function faqs(): HasMany
    {
        return $this->hasMany(Faq::class);
    }
}
