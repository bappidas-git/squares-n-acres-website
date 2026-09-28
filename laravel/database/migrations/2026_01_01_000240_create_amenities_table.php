<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Amenities (`amenities`) — master data.
 *
 * Mirrors backend_developer_guidelines/schema.sql; the deviations are listed in
 * laravel/README.md → "Deviations from schema.sql".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('amenities', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('slug', 75);
            $table->string('category', 40)->default('basic')->comment('basic|lifestyle|safety|sports|kids|eco|convenience|commercial');
            $table->string('icon', 80);
            $table->boolean('is_active')->default(true);
            $table->integer('order')->default(0);
            $table->datetimes(3);
            $table->unique(['slug'], 'amenities_slug_unique');
            $table->index(['is_active'], 'amenities_is_active_index');
            $table->index(['order'], 'amenities_order_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('amenities');
    }
};
