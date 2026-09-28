<?php

namespace App\Models;

/**
 * A redirect rule (`redirects`).
 *
 * Table `redirects`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class Redirect extends Model
{
    protected $table = 'redirects';

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'hits' => 'integer',
        ];
    }
}
