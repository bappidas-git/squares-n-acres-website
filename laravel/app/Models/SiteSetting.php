<?php

namespace App\Models;

use App\Models\Casts\AsJsonValue;

/**
 * The site settings (`siteSettings`): one row, one JSON column per group.
 *
 * Table `site_settings`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class SiteSetting extends Model
{
    protected $table = 'site_settings';

    public $incrementing = false;

    protected $keyType = 'int';

    protected function casts(): array
    {
        return [
            'general' => AsJsonValue::class,
            'hero' => AsJsonValue::class,
            'navigation' => AsJsonValue::class,
            'social' => AsJsonValue::class,
            'footer' => AsJsonValue::class,
            'newsletter' => AsJsonValue::class,
            'integrations' => AsJsonValue::class,
            'leads' => AsJsonValue::class,
        ];
    }
}
