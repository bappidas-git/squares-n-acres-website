<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Badges (`badges`) — master data.
 *
 * Mirrors backend_developer_guidelines/schema.sql; the deviations are listed in
 * laravel/README.md → "Deviations from schema.sql".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('badges', function (Blueprint $table) {
            $table->id();
            $table->string('name', 60);
            $table->string('slug', 75);
            $table->string('color', 40)->default('primary')->comment('neutral|primary|success|warning|error|info');
            $table->string('icon', 80)->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('order')->default(0);
            $table->datetimes(3);
            $table->unique(['slug'], 'badges_slug_unique');
            $table->index(['is_active'], 'badges_is_active_index');
            $table->index(['order'], 'badges_order_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('badges');
    }
};
