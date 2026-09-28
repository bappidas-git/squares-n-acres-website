<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Job openings (`jobOpenings`).
 *
 * Mirrors backend_developer_guidelines/schema.sql; the deviations are listed in
 * laravel/README.md → "Deviations from schema.sql".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_openings', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 75);
            $table->string('title', 150);
            $table->string('department', 120);
            $table->string('location', 120);
            $table->string('employment_type', 40)->default('full-time')->comment('full-time|part-time|contract|internship');
            $table->string('experience', 80)->nullable();
            $table->longText('description');
            $table->json('responsibilities')->nullable();
            $table->json('requirements')->nullable();
            $table->string('salary_range', 80)->nullable();
            $table->boolean('is_active')->default(true);
            $table->date('posted_at')->nullable();
            $table->date('closes_at')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->datetimes(3);
            $table->unique(['slug'], 'job_openings_slug_unique');
            $table->index(['is_active'], 'job_openings_is_active_index');
            $table->foreign('created_by', 'job_openings_created_by_foreign')->references('id')->on('admin_users')->nullOnDelete();
            $table->foreign('updated_by', 'job_openings_updated_by_foreign')->references('id')->on('admin_users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_openings');
    }
};
