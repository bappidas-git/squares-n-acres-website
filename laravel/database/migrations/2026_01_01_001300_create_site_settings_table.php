<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Site settings (`siteSettings`): one row, one JSON column per group.
 *
 * Mirrors backend_developer_guidelines/schema.sql; the deviations are listed in
 * laravel/README.md → "Deviations from schema.sql".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_settings', function (Blueprint $table) {
            $table->unsignedTinyInteger('id')->default(1)->comment('always 1 — one row per installation')->primary();
            $table->json('general')->nullable();
            $table->json('hero')->nullable();
            $table->json('navigation')->nullable();
            $table->json('social')->nullable();
            $table->json('footer')->nullable();
            $table->json('newsletter')->nullable();
            $table->json('integrations')->nullable();
            $table->json('leads')->nullable();
            $table->datetimes(3);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_settings');
    }
};
