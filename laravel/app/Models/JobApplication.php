<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * An application to a job opening (`jobApplications`).
 *
 * Table `job_applications`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class JobApplication extends Model
{
    protected $table = 'job_applications';

    protected function casts(): array
    {
        return [
            'job_id' => 'integer',
        ];
    }

    public function job(): BelongsTo
    {
        return $this->belongsTo(JobOpening::class, 'job_id');
    }
}
