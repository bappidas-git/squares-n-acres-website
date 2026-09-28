<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The media library (`media`): records of files that live on Cloudinary.
 *
 * Mirrors backend_developer_guidelines/schema.sql; the deviations are listed in
 * laravel/README.md → "Deviations from schema.sql".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('media', function (Blueprint $table) {
            $table->id();
            $table->string('url', 500);
            $table->string('public_id', 200)->nullable();
            $table->string('provider', 40)->default('cloudinary')->comment('cloudinary|external');
            $table->string('type', 40)->default('image')->comment('image|video|document');
            $table->integer('width')->nullable();
            $table->integer('height')->nullable();
            $table->integer('bytes')->nullable();
            $table->string('format', 20)->nullable();
            $table->string('alt', 200);
            $table->string('title', 200)->nullable();
            $table->string('folder', 120)->nullable();
            $table->json('tags')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->datetimes(3);
            $table->unique(['url'], 'media_url_unique');
            $table->foreign('created_by', 'media_created_by_foreign')->references('id')->on('admin_users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('media');
    }
};
