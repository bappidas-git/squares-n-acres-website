<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Article categories (`articleCategories`).
 *
 * Mirrors backend_developer_guidelines/schema.sql; the deviations are listed in
 * laravel/README.md → "Deviations from schema.sql".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('article_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('slug', 75);
            $table->string('description', 500)->nullable();
            $table->json('seo')->nullable();
            $table->integer('order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->datetimes(3);
            $table->unique(['slug'], 'article_categories_slug_unique');
            $table->index(['is_active'], 'article_categories_is_active_index');
            $table->index(['order'], 'article_categories_order_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('article_categories');
    }
};
