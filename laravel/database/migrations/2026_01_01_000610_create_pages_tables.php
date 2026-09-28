<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * CMS pages (`pages`) and their content blocks.
 *
 * Mirrors backend_developer_guidelines/schema.sql; the deviations are listed in
 * laravel/README.md → "Deviations from schema.sql".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pages', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 120)->default('');
            $table->string('title', 150);
            $table->string('template', 40)->default('standard')->comment('standard|service|about|contact|careers|awareness|legal|landing|system');
            $table->string('status', 40)->default('draft')->comment('draft|published');
            $table->string('hero_image_url', 500)->nullable();
            $table->string('lead_source', 40)->nullable()->comment('property-enquiry|brochure-download|floor-plan-request|document-request|price-request|site-visit-request|callback-request|post-requirement|contact-page|home-loan|financial-assessment|bank-eligibility|legal-assistance|interior-design|sell-let|careers|partnership|flexible-workspace|direct-lease-retail|real-estate-awareness|newsletter|article|faq|locality-page|developer-page|whatsapp-click|call-click|hero-search|other');
            $table->json('seo')->nullable();
            $table->integer('order')->default(0);
            $table->boolean('show_in_footer')->default(false);
            $table->string('footer_column', 40)->nullable()->comment('company|services|insights');
            $table->boolean('show_in_header')->default(false);
            $table->string('header_menu', 60)->nullable();
            $table->string('header_submenu', 75)->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->datetimes(3);
            $table->softDeletesDatetime('deleted_at', 3)->comment('soft delete');
            $table->index(['status'], 'pages_status_index');
            $table->index(['order'], 'pages_order_index');
            $table->foreign('header_menu', 'pages_header_menu_foreign')->references('slug')->on('header_menus')->nullOnDelete();
            $table->foreign('created_by', 'pages_created_by_foreign')->references('id')->on('admin_users')->nullOnDelete();
            $table->foreign('updated_by', 'pages_updated_by_foreign')->references('id')->on('admin_users')->nullOnDelete();
        });

        Schema::create('page_blocks', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('page_id');
            $table->unsignedInteger('local_id')->default(0)->comment('the item id inside its parent document');
            $table->integer('position')->default(0)->comment('the item position inside the parent array');
            $table->string('type', 40)->comment('hero|richText|features|steps|stats|faq|cta|leadForm|team|testimonials|properties|articles|checklist|quiz|map|contactInfo|image|banks|partners|html|jobs|facts|expandableCards|packages|gallery');
            $table->integer('order')->default(0);
            $table->boolean('hidden')->default(false);
            $table->json('data')->nullable();
            $table->datetimes(3);
            $table->index(['page_id'], 'page_blocks_page_id_index');
            $table->index(['order'], 'page_blocks_order_index');
            $table->foreign('page_id', 'page_blocks_page_id_foreign')->references('id')->on('pages')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('page_blocks');
        Schema::dropIfExists('pages');
    }
};
