<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Redirect rules (`redirects`).
 *
 * Mirrors backend_developer_guidelines/schema.sql; the deviations are listed in
 * laravel/README.md → "Deviations from schema.sql".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('redirects', function (Blueprint $table) {
            $table->id();
            $table->string('from_path', 500);
            $table->string('to_path', 500);
            $table->string('status_code', 40)->default('301')->comment('301|302');
            $table->boolean('is_active')->default(true);
            $table->string('note', 300)->nullable();
            $table->integer('hits')->default(0);
            $table->datetimes(3);
            $table->index(['is_active'], 'redirects_is_active_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('redirects');
    }
};
