<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Partners (`partners`).
 *
 * Mirrors backend_developer_guidelines/schema.sql; the deviations are listed in
 * laravel/README.md → "Deviations from schema.sql".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('partners', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('logo_url', 500);
            $table->string('website_url', 500)->nullable();
            $table->string('category', 40)->default('developer')->comment('developer|bank|legal|interior|other');
            $table->integer('order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->datetimes(3);
            $table->index(['is_active'], 'partners_is_active_index');
            $table->index(['order'], 'partners_order_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('partners');
    }
};
