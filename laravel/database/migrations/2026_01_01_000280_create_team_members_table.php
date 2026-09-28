<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The team (`teamMembers`): the About page, and the advisor a listing names.
 *
 * Mirrors backend_developer_guidelines/schema.sql; the deviations are listed in
 * laravel/README.md → "Deviations from schema.sql".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('team_members', function (Blueprint $table) {
            $table->id();
            $table->string('name', 80);
            $table->string('slug', 75);
            $table->string('designation', 120);
            $table->string('phone', 20)->nullable();
            $table->string('whatsapp', 20)->nullable();
            $table->string('email', 191)->nullable();
            $table->string('photo_url', 500)->nullable();
            $table->longText('bio')->nullable();
            $table->string('rera_id', 80)->nullable();
            $table->json('social_links')->nullable();
            $table->integer('order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->boolean('show_on_about')->default(true);
            $table->unsignedBigInteger('user_id')->nullable();
            $table->datetimes(3);
            $table->unique(['slug'], 'team_members_slug_unique');
            $table->index(['is_active'], 'team_members_is_active_index');
            $table->index(['order'], 'team_members_order_index');
            $table->foreign('user_id', 'team_members_user_id_foreign')->references('id')->on('admin_users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('team_members');
    }
};
