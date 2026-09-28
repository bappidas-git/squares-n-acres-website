<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Testimonials (`testimonials`).
 *
 * Mirrors backend_developer_guidelines/schema.sql; the deviations are listed in
 * laravel/README.md → "Deviations from schema.sql".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('testimonials', function (Blueprint $table) {
            $table->id();
            $table->string('name', 80);
            $table->string('designation', 120)->nullable();
            $table->string('location', 120)->nullable();
            $table->integer('rating')->default(5);
            $table->string('message', 1000);
            $table->string('avatar_url', 500)->nullable();
            $table->unsignedBigInteger('property_id')->nullable();
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_active')->default(true);
            $table->integer('order')->default(0);
            $table->boolean('is_sample')->default(false);
            $table->datetimes(3);
            $table->index(['is_active'], 'testimonials_is_active_index');
            $table->index(['is_featured'], 'testimonials_is_featured_index');
            $table->index(['order'], 'testimonials_order_index');
            $table->foreign('property_id', 'testimonials_property_id_foreign')->references('id')->on('properties')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('testimonials');
    }
};
