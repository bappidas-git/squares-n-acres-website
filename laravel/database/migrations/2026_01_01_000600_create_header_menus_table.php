<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The header menus (`headerMenus`, QA-56).
 *
 * Mirrors backend_developer_guidelines/schema.sql; the deviations are listed in
 * laravel/README.md → "Deviations from schema.sql".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('header_menus', function (Blueprint $table) {
            $table->id();
            $table->string('name', 40);
            $table->string('slug', 60);
            $table->string('href', 500)->nullable();
            $table->string('source', 40)->default('custom')->comment('custom|buy|rent|commercial');
            $table->json('submenus')->nullable();
            $table->json('links')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('order')->default(0);
            $table->datetimes(3);
            $table->unique(['slug'], 'header_menus_slug_unique');
            $table->index(['is_active'], 'header_menus_is_active_index');
            $table->index(['source'], 'header_menus_source_index');
            $table->index(['order'], 'header_menus_order_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('header_menus');
    }
};
