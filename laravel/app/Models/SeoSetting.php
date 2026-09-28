<?php

namespace App\Models;

use App\Models\Casts\AsJsonValue;

/**
 * The SEO settings (`seoSettings`): one row, one JSON column per group.
 *
 * Table `seo_settings`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class SeoSetting extends Model
{
    protected $table = 'seo_settings';

    public $incrementing = false;

    protected $keyType = 'int';

    protected function casts(): array
    {
        return [
            'site_url' => AsJsonValue::class,
            'separator' => AsJsonValue::class,
            'title_templates' => AsJsonValue::class,
            'defaults' => AsJsonValue::class,
            'knowledge_graph' => AsJsonValue::class,
            'verification' => AsJsonValue::class,
            'robots_txt' => AsJsonValue::class,
            'llms_txt' => AsJsonValue::class,
            'sitemap' => AsJsonValue::class,
            'breadcrumbs' => AsJsonValue::class,
            'noindex' => AsJsonValue::class,
            'custom_head_html' => AsJsonValue::class,
            'custom_body_end_html' => AsJsonValue::class,
        ];
    }
}
