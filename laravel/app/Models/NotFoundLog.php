<?php

namespace App\Models;

/**
 * An address that answered 404, per IST day (`notFoundLog`).
 *
 * Table `not_found_log`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class NotFoundLog extends Model
{
    protected $table = 'not_found_log';

    protected function casts(): array
    {
        return [
            'day' => 'date:Y-m-d',
            'count' => 'integer',
            'first_seen_at' => 'datetime',
            'last_seen_at' => 'datetime',
        ];
    }
}
