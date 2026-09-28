<?php

namespace App\Models;

use App\Models\Casts\AsJsonValue;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A locality and its guide (`localities`).
 *
 * Table `localities`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class Locality extends Model
{
    protected $table = 'localities';

    protected function casts(): array
    {
        return [
            'city_id' => 'integer',
            'latitude' => 'float',
            'longitude' => 'float',
            'pincodes' => AsJsonValue::class,
            'highlights' => AsJsonValue::class,
            'connectivity' => AsJsonValue::class,
            'avg_price_per_sqft' => 'integer',
            'is_featured' => 'boolean',
            'is_active' => 'boolean',
            'order' => 'integer',
            'seo' => AsJsonValue::class,
            'created_by' => 'integer',
            'updated_by' => 'integer',
        ];
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    public function properties(): HasMany
    {
        return $this->hasMany(Property::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(AdminUser::class, 'created_by');
    }

    public function editor(): BelongsTo
    {
        return $this->belongsTo(AdminUser::class, 'updated_by');
    }
}
