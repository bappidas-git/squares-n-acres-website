<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Newsletter subscribers (`newsletterSubscribers`).
 *
 * Mirrors backend_developer_guidelines/schema.sql; the deviations are listed in
 * laravel/README.md → "Deviations from schema.sql".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('newsletter_subscribers', function (Blueprint $table) {
            $table->id();
            $table->string('email', 191);
            $table->string('name', 80)->nullable();
            $table->string('source', 40)->default('newsletter')->comment('property-enquiry|brochure-download|floor-plan-request|document-request|price-request|site-visit-request|callback-request|post-requirement|contact-page|home-loan|financial-assessment|bank-eligibility|legal-assistance|interior-design|sell-let|careers|partnership|flexible-workspace|direct-lease-retail|real-estate-awareness|newsletter|article|faq|locality-page|developer-page|whatsapp-click|call-click|hero-search|walk-in|phone|whatsapp-inbound|referral|portal-99acres|portal-magicbricks|portal-housing|other');
            $table->string('status', 40)->default('subscribed')->comment('subscribed|unsubscribed');
            $table->datetimes(3);
            $table->unique(['email'], 'newsletter_subscribers_email_unique');
            $table->index(['status'], 'newsletter_subscribers_status_index');
            $table->index(['source'], 'newsletter_subscribers_source_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('newsletter_subscribers');
    }
};
