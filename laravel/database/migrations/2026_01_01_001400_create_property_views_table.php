<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Listing views (`propertyViews`) — the dashboard's trend.
 *
 * Mirrors backend_developer_guidelines/schema.sql; the deviations are listed in
 * laravel/README.md → "Deviations from schema.sql".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('property_views', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('property_id');
            $table->dateTime('viewed_at', 3);
            $table->string('referrer', 500)->nullable();
            $table->datetimes(3);
            $table->foreign('property_id', 'property_views_property_id_foreign')->references('id')->on('properties')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('property_views');
    }
};
