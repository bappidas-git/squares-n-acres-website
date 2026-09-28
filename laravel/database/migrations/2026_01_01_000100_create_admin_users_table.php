<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The staff accounts of the admin panel (`adminUsers`). The password is a bcrypt hash; no endpoint ever returns it.
 *
 * Mirrors backend_developer_guidelines/schema.sql; the deviations are listed in
 * laravel/README.md → "Deviations from schema.sql".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_users', function (Blueprint $table) {
            $table->id();
            $table->string('name', 80);
            $table->string('email', 191);
            $table->string('password', 100);
            $table->string('role', 40)->default('sales')->comment('admin|manager|sales');
            $table->string('phone', 20)->nullable();
            $table->string('avatar_url', 500)->nullable();
            $table->boolean('is_active')->default(true);
            $table->dateTime('last_login_at', 3)->nullable();
            $table->datetimes(3);
            $table->index(['is_active'], 'admin_users_is_active_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_users');
    }
};
