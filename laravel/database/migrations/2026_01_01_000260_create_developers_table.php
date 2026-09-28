<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Developers (`developers`) — master data with a builder page.
 *
 * Mirrors backend_developer_guidelines/schema.sql; the deviations are listed in
 * laravel/README.md → "Deviations from schema.sql".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('developers', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('slug', 75);
            $table->string('logo_url', 500)->nullable();
            $table->string('cover_image_url', 500)->nullable();
            $table->longText('description')->nullable();
            $table->string('short_description', 300)->default('');
            $table->integer('established_year')->nullable();
            $table->string('headquarters', 150)->nullable();
            $table->string('website', 500)->nullable();
            $table->integer('total_projects')->nullable();
            $table->integer('ongoing_projects')->nullable();
            $table->integer('completed_projects')->nullable();
            $table->json('rera_ids')->nullable();
            $table->json('highlights')->nullable();
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_active')->default(true);
            $table->integer('order')->default(0);
            $table->json('seo')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->datetimes(3);
            $table->unique(['slug'], 'developers_slug_unique');
            $table->index(['is_active'], 'developers_is_active_index');
            $table->index(['is_featured'], 'developers_is_featured_index');
            $table->index(['order'], 'developers_order_index');
            $table->foreign('created_by', 'developers_created_by_foreign')->references('id')->on('admin_users')->nullOnDelete();
            $table->foreign('updated_by', 'developers_updated_by_foreign')->references('id')->on('admin_users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('developers');
    }
};
