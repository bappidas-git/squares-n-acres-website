<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A city (`cities`).
 *
 * Table `cities`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class City extends Model
{
    protected $table = 'cities';

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function localities(): HasMany
    {
        return $this->hasMany(Locality::class);
    }

    public function properties(): HasMany
    {
        return $this->hasMany(Property::class);
    }
}
