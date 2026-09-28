<?php

namespace App\Models;

use App\Models\Casts\AsJsonValue;

/**
 * A home-loan bank (`banks`).
 *
 * Table `banks`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class Bank extends Model
{
    protected $table = 'banks';

    protected function casts(): array
    {
        return [
            'interest_rate_min' => 'float',
            'interest_rate_max' => 'float',
            'max_tenure_years' => 'integer',
            'max_ltv_percent' => 'integer',
            'min_loan_amount' => 'float',
            'max_loan_amount' => 'float',
            'features' => AsJsonValue::class,
            'is_active' => 'boolean',
            'order' => 'integer',
        ];
    }
}
