<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A note on a lead (`leads.notes[]`).
 *
 * Table `lead_notes`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class LeadNote extends Model
{
    protected $table = 'lead_notes';

    protected function casts(): array
    {
        return [
            'lead_id' => 'integer',
            'local_id' => 'integer',
            'position' => 'integer',
            'created_by' => 'integer',
        ];
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(AdminUser::class, 'created_by');
    }
}
