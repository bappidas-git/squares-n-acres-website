<?php

namespace App\Models;

use App\Models\Casts\AsJsonValue;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A CMS page (`pages`).
 *
 * Table `pages`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class Page extends Model
{
    use SoftDeletes;

    protected $table = 'pages';

    protected function casts(): array
    {
        return [
            'seo' => AsJsonValue::class,
            'order' => 'integer',
            'show_in_footer' => 'boolean',
            'show_in_header' => 'boolean',
            'created_by' => 'integer',
            'updated_by' => 'integer',
        ];
    }

    public function blocks(): HasMany
    {
        return $this->hasMany(PageBlock::class)->orderBy('position');
    }

    public function headerMenuRecord(): BelongsTo
    {
        return $this->belongsTo(HeaderMenu::class, 'header_menu', 'slug');
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
