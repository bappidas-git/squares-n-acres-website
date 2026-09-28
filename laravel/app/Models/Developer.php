<?php

namespace App\Models;

use App\Models\Casts\AsJsonValue;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A developer (`developers`).
 *
 * Table `developers`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class Developer extends Model
{
    protected $table = 'developers';

    protected function casts(): array
    {
        return [
            'established_year' => 'integer',
            'total_projects' => 'integer',
            'ongoing_projects' => 'integer',
            'completed_projects' => 'integer',
            'rera_ids' => AsJsonValue::class,
            'highlights' => AsJsonValue::class,
            'is_featured' => 'boolean',
            'is_active' => 'boolean',
            'order' => 'integer',
            'seo' => AsJsonValue::class,
            'created_by' => 'integer',
            'updated_by' => 'integer',
        ];
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
