<?php

namespace App\Models;

/**
 * A partner (`partners`).
 *
 * Table `partners`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class Partner extends Model
{
    protected $table = 'partners';

    protected function casts(): array
    {
        return [
            'order' => 'integer',
            'is_active' => 'boolean',
        ];
    }
}
