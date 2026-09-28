<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Leads (`leads`), their notes and their activity trail.
 *
 * Mirrors backend_developer_guidelines/schema.sql; the deviations are listed in
 * laravel/README.md → "Deviations from schema.sql".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leads', function (Blueprint $table) {
            $table->id();
            $table->string('name', 80);
            $table->string('phone', 20);
            $table->string('email', 191)->nullable();
            $table->text('message')->nullable();
            $table->string('source', 40)->default('contact-page')->comment('property-enquiry|brochure-download|floor-plan-request|document-request|price-request|site-visit-request|callback-request|post-requirement|contact-page|home-loan|financial-assessment|bank-eligibility|legal-assistance|interior-design|sell-let|careers|partnership|flexible-workspace|direct-lease-retail|real-estate-awareness|newsletter|article|faq|locality-page|developer-page|whatsapp-click|call-click|hero-search|walk-in|phone|whatsapp-inbound|referral|portal-99acres|portal-magicbricks|portal-housing|other');
            $table->unsignedBigInteger('property_id')->nullable();
            $table->unsignedBigInteger('article_id')->nullable();
            $table->string('page_slug', 120)->nullable();
            $table->string('page_url', 500)->nullable();
            $table->json('requirement')->nullable();
            $table->boolean('consent')->default(false);
            $table->json('utm')->nullable();
            $table->json('meta')->nullable();
            $table->string('status', 40)->default('new')->comment('new|contacted|qualified|site-visit|negotiation|converted|lost');
            $table->string('priority', 40)->default('medium')->comment('low|medium|high');
            $table->unsignedBigInteger('assigned_to')->nullable();
            $table->dateTime('follow_up_at', 3)->nullable();
            $table->string('lost_reason', 300)->nullable();
            $table->json('property_snapshot')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->datetimes(3);
            $table->softDeletesDatetime('deleted_at', 3)->comment('soft delete');
            $table->index(['assigned_to'], 'leads_assigned_to_index');
            $table->index(['status'], 'leads_status_index');
            $table->index(['priority'], 'leads_priority_index');
            $table->index(['source'], 'leads_source_index');
            $table->foreign('property_id', 'leads_property_id_foreign')->references('id')->on('properties')->nullOnDelete();
            $table->foreign('article_id', 'leads_article_id_foreign')->references('id')->on('articles')->nullOnDelete();
            $table->foreign('assigned_to', 'leads_assigned_to_foreign')->references('id')->on('admin_users')->nullOnDelete();
        });

        Schema::create('lead_notes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('lead_id');
            $table->unsignedInteger('local_id')->default(0)->comment('the item id inside its parent document');
            $table->integer('position')->default(0)->comment('the item position inside the parent array');
            $table->text('text');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->string('created_by_name', 80)->default('');
            $table->dateTime('created_at', 3);
            $table->dateTime('updated_at', 3)->nullable();
            $table->index(['lead_id'], 'lead_notes_lead_id_index');
            $table->foreign('lead_id', 'lead_notes_lead_id_foreign')->references('id')->on('leads')->cascadeOnDelete();
            $table->foreign('created_by', 'lead_notes_created_by_foreign')->references('id')->on('admin_users')->nullOnDelete();
        });

        Schema::create('lead_activities', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('lead_id');
            $table->unsignedInteger('local_id')->default(0)->comment('the item id inside its parent document');
            $table->integer('position')->default(0)->comment('the item position inside the parent array');
            $table->string('type', 40)->comment('created|status-changed|assigned|note-added|follow-up-set|contacted|email-sent|call-logged|priority-changed|whatsapp-logged|site-visit-logged|meeting-logged|activity-logged|details-updated|enquired-again');
            $table->string('description', 300);
            $table->text('note')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->dateTime('created_at', 3);
            $table->dateTime('updated_at', 3)->nullable();
            $table->index(['lead_id'], 'lead_activities_lead_id_index');
            $table->foreign('lead_id', 'lead_activities_lead_id_foreign')->references('id')->on('leads')->cascadeOnDelete();
            $table->foreign('created_by', 'lead_activities_created_by_foreign')->references('id')->on('admin_users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_activities');
        Schema::dropIfExists('lead_notes');
        Schema::dropIfExists('leads');
    }
};
