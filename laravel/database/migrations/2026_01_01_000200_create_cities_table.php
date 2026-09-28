<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Cities (`cities`) — master data.
 *
 * Mirrors backend_developer_guidelines/schema.sql; the deviations are listed in
 * laravel/README.md → "Deviations from schema.sql".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cities', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('slug', 75);
            $table->string('state', 120);
            $table->boolean('is_active')->default(true);
            $table->datetimes(3);
            $table->unique(['slug'], 'cities_slug_unique');
            $table->index(['is_active'], 'cities_is_active_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cities');
    }
};
