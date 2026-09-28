<?php

namespace App\Models;

use App\Models\Casts\AsJsonValue;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * An enquiry (`leads`).
 *
 * Table `leads`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class Lead extends Model
{
    use SoftDeletes;

    protected $table = 'leads';

    protected function casts(): array
    {
        return [
            'property_id' => 'integer',
            'article_id' => 'integer',
            'requirement' => AsJsonValue::class,
            'consent' => 'boolean',
            'utm' => AsJsonValue::class,
            'meta' => AsJsonValue::class,
            'assigned_to' => 'integer',
            'follow_up_at' => 'datetime',
            'property_snapshot' => AsJsonValue::class,
        ];
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(AdminUser::class, 'assigned_to');
    }

    public function notes(): HasMany
    {
        return $this->hasMany(LeadNote::class)->orderBy('position');
    }

    public function activities(): HasMany
    {
        return $this->hasMany(LeadActivity::class)->orderBy('position');
    }
}
