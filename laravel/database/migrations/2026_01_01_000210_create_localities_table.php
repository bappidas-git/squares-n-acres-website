<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Localities (`localities`) — master data with a locality guide.
 *
 * Mirrors backend_developer_guidelines/schema.sql; the deviations are listed in
 * laravel/README.md → "Deviations from schema.sql".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('localities', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('slug', 75);
            $table->unsignedBigInteger('city_id');
            $table->string('zone', 40)->nullable()->comment('north|south|east|west|central');
            $table->longText('description')->nullable();
            $table->string('short_description', 300)->default('');
            $table->string('hero_image_url', 500)->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->json('pincodes')->nullable();
            $table->json('highlights')->nullable();
            $table->json('connectivity')->nullable();
            $table->integer('avg_price_per_sqft')->nullable();
            $table->string('price_trend_note', 300)->nullable();
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_active')->default(true);
            $table->integer('order')->default(0);
            $table->json('seo')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->datetimes(3);
            $table->unique(['slug'], 'localities_slug_unique');
            $table->index(['city_id'], 'localities_city_id_index');
            $table->index(['is_active'], 'localities_is_active_index');
            $table->index(['is_featured'], 'localities_is_featured_index');
            $table->index(['order'], 'localities_order_index');
            $table->foreign('city_id', 'localities_city_id_foreign')->references('id')->on('cities')->restrictOnDelete();
            $table->foreign('created_by', 'localities_created_by_foreign')->references('id')->on('admin_users')->nullOnDelete();
            $table->foreign('updated_by', 'localities_updated_by_foreign')->references('id')->on('admin_users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('localities');
    }
};
