<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Authors (`authors`).
 *
 * Mirrors backend_developer_guidelines/schema.sql; the deviations are listed in
 * laravel/README.md → "Deviations from schema.sql".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('authors', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('slug', 75);
            $table->string('designation', 120)->nullable();
            $table->longText('bio')->nullable();
            $table->string('avatar_url', 500)->nullable();
            $table->string('email', 191)->nullable();
            $table->json('social_links')->nullable();
            $table->boolean('is_active')->default(true);
            $table->json('seo')->nullable();
            $table->datetimes(3);
            $table->unique(['slug'], 'authors_slug_unique');
            $table->index(['is_active'], 'authors_is_active_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('authors');
    }
};
