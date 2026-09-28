<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * FAQs (`faqs`).
 *
 * Mirrors backend_developer_guidelines/schema.sql; the deviations are listed in
 * laravel/README.md → "Deviations from schema.sql".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('faqs', function (Blueprint $table) {
            $table->id();
            $table->string('question', 300);
            $table->longText('answer');
            $table->string('category', 40)->default('general')->comment('buying|selling|renting|home-loan|legal|rera|nri|general');
            $table->integer('order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->boolean('show_on_home')->default(false);
            $table->unsignedBigInteger('property_type_id')->nullable();
            $table->datetimes(3);
            $table->index(['property_type_id'], 'faqs_property_type_id_index');
            $table->index(['is_active'], 'faqs_is_active_index');
            $table->index(['order'], 'faqs_order_index');
            $table->foreign('property_type_id', 'faqs_property_type_id_foreign')->references('id')->on('property_types')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('faqs');
    }
};
