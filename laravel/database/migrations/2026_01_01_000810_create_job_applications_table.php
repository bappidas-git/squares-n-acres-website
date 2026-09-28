<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Applications to an opening (`jobApplications`).
 *
 * Mirrors backend_developer_guidelines/schema.sql; the deviations are listed in
 * laravel/README.md → "Deviations from schema.sql".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_applications', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('job_id');
            $table->string('name', 80);
            $table->string('email', 191);
            $table->string('phone', 20);
            $table->string('resume_url', 500);
            $table->text('cover_letter')->nullable();
            $table->string('linkedin_url', 500)->nullable();
            $table->string('status', 40)->default('new')->comment('new|shortlisted|interview|rejected|hired');
            $table->text('notes')->nullable();
            $table->datetimes(3);
            $table->index(['status'], 'job_applications_status_index');
            $table->foreign('job_id', 'job_applications_job_id_foreign')->references('id')->on('job_openings')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_applications');
    }
};
