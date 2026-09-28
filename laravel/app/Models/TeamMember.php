<?php

namespace App\Models;

use App\Models\Casts\AsJsonValue;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A member of the team (`teamMembers`).
 *
 * Table `team_members`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class TeamMember extends Model
{
    protected $table = 'team_members';

    protected function casts(): array
    {
        return [
            'social_links' => AsJsonValue::class,
            'order' => 'integer',
            'is_active' => 'boolean',
            'show_on_about' => 'boolean',
            'user_id' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(AdminUser::class, 'user_id');
    }

    public function properties(): HasMany
    {
        return $this->hasMany(Property::class, 'agent_team_member_id');
    }
}
