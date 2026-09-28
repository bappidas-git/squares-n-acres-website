<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * A staff account of the admin panel (`adminUsers`): admin, manager or sales.
 *
 * Table `admin_users`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class AdminUser extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $table = 'admin_users';

    /** Milliseconds, as every other table (DATETIME(3)). */
    protected $dateFormat = 'Y-m-d H:i:s.v';

    protected $guarded = [];

    /** The password never leaves the model: no resource of the API includes it, hashed or not. */
    protected $hidden = ['password'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function teamMember(): HasOne
    {
        return $this->hasOne(TeamMember::class, 'user_id');
    }

    public function assignedLeads(): HasMany
    {
        return $this->hasMany(Lead::class, 'assigned_to');
    }
}
