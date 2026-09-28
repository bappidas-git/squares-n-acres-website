<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * SEO settings (`seoSettings`): one row, one JSON column per group.
 *
 * Mirrors backend_developer_guidelines/schema.sql; the deviations are listed in
 * laravel/README.md → "Deviations from schema.sql".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seo_settings', function (Blueprint $table) {
            $table->unsignedTinyInteger('id')->default(1)->comment('always 1 — one row per installation')->primary();
            $table->json('site_url');
            $table->json('separator')->nullable();
            $table->json('title_templates')->nullable();
            $table->json('defaults')->nullable();
            $table->json('knowledge_graph')->nullable();
            $table->json('verification')->nullable();
            $table->json('robots_txt')->nullable();
            $table->json('llms_txt')->nullable();
            $table->json('sitemap')->nullable();
            $table->json('breadcrumbs')->nullable();
            $table->json('noindex')->nullable();
            $table->json('custom_head_html')->nullable();
            $table->json('custom_body_end_html')->nullable();
            $table->datetimes(3);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seo_settings');
    }
};
