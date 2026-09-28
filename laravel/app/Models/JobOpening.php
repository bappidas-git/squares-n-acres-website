<?php

namespace App\Models;

use App\Models\Casts\AsJsonValue;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A job opening (`jobOpenings`).
 *
 * Table `job_openings`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class JobOpening extends Model
{
    protected $table = 'job_openings';

    protected function casts(): array
    {
        return [
            'responsibilities' => AsJsonValue::class,
            'requirements' => AsJsonValue::class,
            'is_active' => 'boolean',
            'posted_at' => 'date:Y-m-d',
            'closes_at' => 'date:Y-m-d',
            'created_by' => 'integer',
            'updated_by' => 'integer',
        ];
    }

    public function applications(): HasMany
    {
        return $this->hasMany(JobApplication::class, 'job_id');
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
