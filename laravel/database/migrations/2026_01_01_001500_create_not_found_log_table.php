<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The 404 log (`notFoundLog`, prompt 51): one row per path per Indian day.
 *
 * Mirrors backend_developer_guidelines/schema.sql; the deviations are listed in
 * laravel/README.md → "Deviations from schema.sql".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('not_found_log', function (Blueprint $table) {
            $table->id();
            $table->string('path', 500);
            $table->date('day')->comment('The Indian (IST) day the path was reached');
            $table->integer('count')->default(1);
            $table->string('referrer', 500)->nullable();
            $table->dateTime('first_seen_at', 3);
            $table->dateTime('last_seen_at', 3);
            $table->datetimes(3);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('not_found_log');
    }
};
