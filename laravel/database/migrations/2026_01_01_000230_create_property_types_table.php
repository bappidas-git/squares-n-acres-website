<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Property types (`propertyTypes`) — master data; `segment` holds a `segments.slug`.
 *
 * Mirrors backend_developer_guidelines/schema.sql; the deviations are listed in
 * laravel/README.md → "Deviations from schema.sql".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('property_types', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('slug', 75);
            $table->string('segment', 75)->default('residential');
            $table->string('icon', 80);
            $table->string('description', 500)->nullable();
            $table->boolean('show_in_rent_menu')->default(false);
            $table->boolean('show_in_commercial_menu')->default(false);
            $table->boolean('is_active')->default(true);
            $table->integer('order')->default(0);
            $table->json('seo')->nullable();
            $table->datetimes(3);
            $table->unique(['slug'], 'property_types_slug_unique');
            $table->index(['segment'], 'property_types_segment_index');
            $table->index(['is_active'], 'property_types_is_active_index');
            $table->index(['order'], 'property_types_order_index');
            $table->foreign('segment', 'property_types_segment_foreign')->references('slug')->on('segments')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('property_types');
    }
};
