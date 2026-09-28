<?php

namespace App\Models;

use App\Models\Casts\AsJsonValue;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A menu of the site header (`headerMenus`, QA-56).
 *
 * Table `header_menus`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class HeaderMenu extends Model
{
    protected $table = 'header_menus';

    protected function casts(): array
    {
        return [
            'submenus' => AsJsonValue::class,
            'links' => AsJsonValue::class,
            'is_active' => 'boolean',
            'order' => 'integer',
        ];
    }

    public function pages(): HasMany
    {
        return $this->hasMany(Page::class, 'header_menu', 'slug');
    }
}
