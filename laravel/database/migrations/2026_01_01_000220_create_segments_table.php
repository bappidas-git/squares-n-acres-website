<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Segments (`segments`, QA-52): the vocabulary a listing is filed under. Referenced by slug.
 *
 * Mirrors backend_developer_guidelines/schema.sql; the deviations are listed in
 * laravel/README.md → "Deviations from schema.sql".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('segments', function (Blueprint $table) {
            $table->id();
            $table->string('name', 60);
            $table->string('slug', 75);
            $table->string('kind', 40)->default('residential')->comment('residential|commercial|land');
            $table->string('description', 300)->nullable();
            $table->string('icon', 80)->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('order')->default(0);
            $table->datetimes(3);
            $table->unique(['slug'], 'segments_slug_unique');
            $table->index(['is_active'], 'segments_is_active_index');
            $table->index(['order'], 'segments_order_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('segments');
    }
};
