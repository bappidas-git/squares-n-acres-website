<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Home-loan banks (`banks`) — master data.
 *
 * Mirrors backend_developer_guidelines/schema.sql; the deviations are listed in
 * laravel/README.md → "Deviations from schema.sql".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('banks', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('slug', 75);
            $table->string('logo_url', 500)->nullable();
            $table->decimal('interest_rate_min', 5, 2);
            $table->decimal('interest_rate_max', 5, 2);
            $table->string('processing_fee_note', 200)->nullable();
            $table->integer('max_tenure_years');
            $table->integer('max_ltv_percent');
            $table->decimal('min_loan_amount', 14, 2)->nullable();
            $table->decimal('max_loan_amount', 14, 2)->nullable();
            $table->json('features')->nullable();
            $table->string('apply_url', 500)->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('order')->default(0);
            $table->datetimes(3);
            $table->unique(['slug'], 'banks_slug_unique');
            $table->index(['is_active'], 'banks_is_active_index');
            $table->index(['order'], 'banks_order_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('banks');
    }
};
