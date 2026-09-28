<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Listings (`properties`): the flattened objects (`pricing`, `area`, `location`, `configuration`, `project`, `agent`) as columns, the nested arrays as child tables, the id lists as pivots.
 *
 * Mirrors backend_developer_guidelines/schema.sql; the deviations are listed in
 * laravel/README.md → "Deviations from schema.sql".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('properties', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 75);
            $table->string('title', 200);
            $table->string('project_name', 150)->nullable();
            $table->string('listing_type', 40)->default('sale')->comment('sale|rent|lease');
            $table->string('segment', 75)->default('residential');
            $table->unsignedBigInteger('property_type_id');
            $table->string('construction_status', 40)->default('ready-to-move')->comment('pre-launch|under-construction|ready-to-move|resale');
            $table->string('availability', 40)->default('available')->comment('available|sold|rented|reserved');
            $table->date('possession_date')->nullable();
            $table->integer('age_of_property_years')->nullable();
            $table->string('furnishing', 40)->nullable()->comment('unfurnished|semi-furnished|fully-furnished');
            $table->string('facing', 40)->nullable()->comment('north|south|east|west|north-east|north-west|south-east|south-west');
            $table->integer('floor_number')->nullable();
            $table->integer('total_floors')->nullable();
            $table->string('ownership', 40)->nullable()->comment('freehold|leasehold|co-operative-society|power-of-attorney');
            $table->string('rera_number', 80)->nullable();
            $table->boolean('rera_registered')->default(false);
            $table->longText('description')->nullable();
            $table->string('short_description', 300)->default('');
            $table->json('highlights')->nullable();
            $table->json('specifications')->nullable();
            $table->json('construction_specs')->nullable();
            $table->string('video_url', 500)->nullable();
            $table->string('virtual_tour_url', 500)->nullable();
            $table->string('brochure_url', 500)->nullable();
            $table->boolean('brochure_lead_gated')->default(true);
            $table->string('address', 300)->default('')->comment('location.address');
            $table->unsignedBigInteger('locality_id')->comment('location.localityId');
            $table->unsignedBigInteger('city_id')->comment('location.cityId');
            $table->string('pincode', 6)->nullable()->comment('location.pincode');
            $table->string('landmark', 200)->nullable()->comment('location.landmark');
            $table->decimal('latitude', 10, 7)->nullable()->comment('location.latitude');
            $table->decimal('longitude', 10, 7)->nullable()->comment('location.longitude');
            $table->string('map_embed_url', 500)->nullable()->comment('location.mapEmbedUrl');
            $table->boolean('show_exact_location')->default(false)->comment('location.showExactLocation');
            $table->decimal('price', 14, 2)->nullable()->comment('pricing.price');
            $table->boolean('price_on_request')->default(false)->comment('pricing.priceOnRequest');
            $table->decimal('price_range_min', 14, 2)->nullable()->comment('pricing.priceRangeMin');
            $table->decimal('price_range_max', 14, 2)->nullable()->comment('pricing.priceRangeMax');
            $table->decimal('price_per_sqft', 14, 2)->nullable()->comment('pricing.pricePerSqft');
            $table->boolean('price_negotiable')->default(false)->comment('pricing.priceNegotiable');
            $table->decimal('rent_per_month', 14, 2)->nullable()->comment('pricing.rentPerMonth');
            $table->decimal('security_deposit', 14, 2)->nullable()->comment('pricing.securityDeposit');
            $table->decimal('maintenance_charges_monthly', 14, 2)->nullable()->comment('pricing.maintenanceChargesMonthly');
            $table->decimal('booking_amount', 14, 2)->nullable()->comment('pricing.bookingAmount');
            $table->json('other_charges')->nullable()->comment('pricing.otherCharges');
            $table->string('currency', 40)->default('INR')->comment('INR · pricing.currency');
            $table->decimal('super_built_up_area', 14, 2)->nullable()->comment('area.superBuiltUpArea');
            $table->decimal('built_up_area', 14, 2)->nullable()->comment('area.builtUpArea');
            $table->decimal('carpet_area', 14, 2)->nullable()->comment('area.carpetArea');
            $table->decimal('plot_area', 14, 2)->nullable()->comment('area.plotArea');
            $table->string('area_unit', 40)->default('sqft')->comment('sqft|sqm|sqyd|acre|cent|guntha · area.areaUnit');
            $table->decimal('plot_length', 14, 2)->nullable()->comment('area.plotLength');
            $table->decimal('plot_width', 14, 2)->nullable()->comment('area.plotWidth');
            $table->string('plot_dimension_unit', 40)->nullable()->comment('sqft|sqm|sqyd|acre|cent|guntha · area.plotDimensionUnit');
            $table->integer('bedrooms')->nullable()->comment('configuration.bedrooms');
            $table->integer('bathrooms')->nullable()->comment('configuration.bathrooms');
            $table->integer('balconies')->nullable()->comment('configuration.balconies');
            $table->integer('parking_covered')->nullable()->comment('configuration.parkingCovered');
            $table->integer('parking_open')->nullable()->comment('configuration.parkingOpen');
            $table->boolean('servant_room')->default(false)->comment('configuration.servantRoom');
            $table->boolean('study_room')->default(false)->comment('configuration.studyRoom');
            $table->boolean('pooja_room')->default(false)->comment('configuration.poojaRoom');
            $table->string('kitchen_type', 40)->nullable()->comment('modular|semi-modular|regular · configuration.kitchenType');
            $table->unsignedBigInteger('developer_id')->nullable()->comment('project.developerId');
            $table->integer('project_total_units')->nullable()->comment('project.totalUnits');
            $table->integer('project_total_towers')->nullable()->comment('project.totalTowers');
            $table->integer('project_total_floors')->nullable()->comment('project.totalFloors');
            $table->decimal('project_area_acres', 10, 3)->nullable()->comment('project.projectAreaAcres');
            $table->integer('project_open_area_percent')->nullable()->comment('project.openAreaPercent');
            $table->date('project_launch_date')->nullable()->comment('project.launchDate');
            $table->json('project_approvals')->nullable()->comment('project.approvals');
            $table->boolean('is_landmark_project')->default(false)->comment('project.landmarkProject');
            $table->integer('construction_progress_percent')->nullable();
            $table->json('section_visibility')->nullable();
            $table->unsignedBigInteger('agent_team_member_id')->nullable()->comment('agent.teamMemberId');
            $table->string('agent_name', 120)->nullable()->comment('agent.name');
            $table->string('agent_phone', 20)->nullable()->comment('agent.phone');
            $table->string('agent_whatsapp', 20)->nullable()->comment('agent.whatsapp');
            $table->string('agent_email', 191)->nullable()->comment('agent.email');
            $table->string('agent_photo_url', 500)->nullable()->comment('agent.photoUrl');
            $table->boolean('agent_show_on_listing')->default(false)->comment('agent.showOnListing');
            $table->json('seo')->nullable();
            $table->boolean('is_active')->default(false);
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_verified')->default(false);
            $table->integer('priority_order')->default(0);
            $table->integer('view_count')->default(0);
            $table->integer('enquiry_count')->default(0);
            $table->dateTime('published_at', 3)->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->datetimes(3);
            $table->softDeletesDatetime('deleted_at', 3)->comment('soft delete');
            $table->unique(['slug'], 'properties_slug_unique');
            $table->index(['locality_id'], 'properties_locality_id_index');
            $table->index(['city_id'], 'properties_city_id_index');
            $table->index(['property_type_id'], 'properties_property_type_id_index');
            $table->index(['developer_id'], 'properties_developer_id_index');
            $table->index(['listing_type'], 'properties_listing_type_index');
            $table->index(['segment'], 'properties_segment_index');
            $table->index(['construction_status'], 'properties_construction_status_index');
            $table->index(['availability'], 'properties_availability_index');
            $table->index(['is_active'], 'properties_is_active_index');
            $table->index(['is_featured'], 'properties_is_featured_index');
            $table->index(['price'], 'properties_price_index');
            $table->index(['rent_per_month'], 'properties_rent_per_month_index');
            $table->index(['published_at'], 'properties_published_at_index');
            $table->fullText(['title', 'project_name', 'short_description'], 'properties_fulltext');
            $table->foreign('segment', 'properties_segment_foreign')->references('slug')->on('segments')->restrictOnDelete();
            $table->foreign('property_type_id', 'properties_property_type_id_foreign')->references('id')->on('property_types')->restrictOnDelete();
            $table->foreign('locality_id', 'properties_locality_id_foreign')->references('id')->on('localities')->restrictOnDelete();
            $table->foreign('city_id', 'properties_city_id_foreign')->references('id')->on('cities')->restrictOnDelete();
            $table->foreign('developer_id', 'properties_developer_id_foreign')->references('id')->on('developers')->nullOnDelete();
            $table->foreign('agent_team_member_id', 'properties_agent_team_member_id_foreign')->references('id')->on('team_members')->nullOnDelete();
            $table->foreign('created_by', 'properties_created_by_foreign')->references('id')->on('admin_users')->nullOnDelete();
            $table->foreign('updated_by', 'properties_updated_by_foreign')->references('id')->on('admin_users')->nullOnDelete();
        });

        Schema::create('property_images', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('property_id');
            $table->unsignedInteger('local_id')->default(0)->comment('the item id inside its parent document');
            $table->integer('position')->default(0)->comment('the item position inside the parent array');
            $table->string('url', 500);
            $table->string('alt', 200)->default('');
            $table->string('caption', 300)->nullable();
            $table->integer('order')->default(0);
            $table->boolean('is_cover')->default(false);
            $table->datetimes(3);
            $table->index(['property_id'], 'property_images_property_id_index');
            $table->index(['order'], 'property_images_order_index');
            $table->foreign('property_id', 'property_images_property_id_foreign')->references('id')->on('properties')->cascadeOnDelete();
        });

        Schema::create('property_documents', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('property_id');
            $table->unsignedInteger('local_id')->default(0)->comment('the item id inside its parent document');
            $table->integer('position')->default(0)->comment('the item position inside the parent array');
            $table->string('title', 150);
            $table->string('url', 500);
            $table->string('type', 40)->default('other')->comment('brochure|approval|legal|floor-plan|price-list|other');
            $table->boolean('lead_gated')->default(true);
            $table->integer('order')->default(0);
            $table->datetimes(3);
            $table->index(['property_id'], 'property_documents_property_id_index');
            $table->index(['order'], 'property_documents_order_index');
            $table->foreign('property_id', 'property_documents_property_id_foreign')->references('id')->on('properties')->cascadeOnDelete();
        });

        Schema::create('property_floor_plans', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('property_id');
            $table->unsignedInteger('local_id')->default(0)->comment('the item id inside its parent document');
            $table->integer('position')->default(0)->comment('the item position inside the parent array');
            $table->string('title', 120);
            $table->string('image_url', 500);
            $table->string('pdf_url', 500)->nullable();
            $table->decimal('area', 14, 2)->nullable();
            $table->string('area_unit', 40)->default('sqft')->comment('sqft|sqm|sqyd|acre|cent|guntha');
            $table->integer('bedrooms')->nullable();
            $table->decimal('price', 14, 2)->nullable();
            $table->integer('order')->default(0);
            $table->datetimes(3);
            $table->index(['property_id'], 'property_floor_plans_property_id_index');
            $table->index(['order'], 'property_floor_plans_order_index');
            $table->foreign('property_id', 'property_floor_plans_property_id_foreign')->references('id')->on('properties')->cascadeOnDelete();
        });

        Schema::create('property_unit_configurations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('property_id');
            $table->unsignedInteger('local_id')->default(0)->comment('the item id inside its parent document');
            $table->integer('position')->default(0)->comment('the item position inside the parent array');
            $table->string('name', 80);
            $table->integer('bedrooms')->nullable();
            $table->integer('bathrooms')->nullable();
            $table->decimal('super_built_up_area', 14, 2)->nullable();
            $table->decimal('carpet_area', 14, 2)->nullable();
            $table->string('area_unit', 40)->default('sqft')->comment('sqft|sqm|sqyd|acre|cent|guntha');
            $table->decimal('price', 14, 2)->nullable();
            $table->boolean('price_on_request')->default(false);
            $table->string('floor_plan_image_url', 500)->nullable();
            $table->string('floor_plan_pdf_url', 500)->nullable();
            $table->integer('available_units')->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('order')->default(0)->comment('position inside the parent array');
            $table->datetimes(3);
            $table->index(['property_id'], 'property_unit_configurations_property_id_index');
            $table->index(['order'], 'property_unit_configurations_order_index');
            $table->foreign('property_id', 'property_unit_configurations_property_id_foreign')->references('id')->on('properties')->cascadeOnDelete();
        });

        Schema::create('property_nearby_places', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('property_id');
            $table->unsignedInteger('local_id')->default(0)->comment('the item id inside its parent document');
            $table->integer('position')->default(0)->comment('the item position inside the parent array');
            $table->string('name', 150);
            $table->string('category', 40)->default('other')->comment('school|hospital|metro|railway|airport|mall|it-park|restaurant|park|bank|other');
            $table->decimal('distance_km', 14, 2)->nullable();
            $table->integer('travel_time_min')->nullable();
            $table->integer('order')->default(0);
            $table->datetimes(3);
            $table->index(['property_id'], 'property_nearby_places_property_id_index');
            $table->index(['order'], 'property_nearby_places_order_index');
            $table->foreign('property_id', 'property_nearby_places_property_id_foreign')->references('id')->on('properties')->cascadeOnDelete();
        });

        Schema::create('property_construction_timeline', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('property_id');
            $table->unsignedInteger('local_id')->default(0)->comment('the item id inside its parent document');
            $table->integer('position')->default(0)->comment('the item position inside the parent array');
            $table->string('milestone', 150);
            $table->date('date')->nullable();
            $table->string('status', 40)->default('upcoming')->comment('completed|in-progress|upcoming');
            $table->string('image_url', 500)->nullable();
            $table->string('note', 300)->nullable();
            $table->integer('order')->default(0);
            $table->datetimes(3);
            $table->index(['property_id'], 'property_construction_timeline_property_id_index');
            $table->index(['order'], 'property_construction_timeline_order_index');
            $table->foreign('property_id', 'property_construction_timeline_property_id_foreign')->references('id')->on('properties')->cascadeOnDelete();
        });

        Schema::create('property_faqs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('property_id');
            $table->unsignedInteger('local_id')->default(0)->comment('the item id inside its parent document');
            $table->integer('position')->default(0)->comment('the item position inside the parent array');
            $table->string('question', 300);
            $table->longText('answer');
            $table->integer('order')->default(0);
            $table->datetimes(3);
            $table->index(['property_id'], 'property_faqs_property_id_index');
            $table->index(['order'], 'property_faqs_order_index');
            $table->foreign('property_id', 'property_faqs_property_id_foreign')->references('id')->on('properties')->cascadeOnDelete();
        });

        Schema::create('property_amenity', function (Blueprint $table) {
            $table->unsignedBigInteger('property_id');
            $table->unsignedBigInteger('amenity_id');
            $table->integer('position')->default(0)->comment('the order the admin chose');
            $table->primary(['property_id', 'amenity_id']);
            $table->index(['amenity_id'], 'property_amenity_amenity_id_index');
            $table->foreign('property_id', 'property_amenity_property_id_foreign')->references('id')->on('properties')->cascadeOnDelete();
            $table->foreign('amenity_id', 'property_amenity_amenity_id_foreign')->references('id')->on('amenities')->cascadeOnDelete();
        });

        Schema::create('property_badge', function (Blueprint $table) {
            $table->unsignedBigInteger('property_id');
            $table->unsignedBigInteger('badge_id');
            $table->integer('position')->default(0)->comment('the order the admin chose');
            $table->primary(['property_id', 'badge_id']);
            $table->index(['badge_id'], 'property_badge_badge_id_index');
            $table->foreign('property_id', 'property_badge_property_id_foreign')->references('id')->on('properties')->cascadeOnDelete();
            $table->foreign('badge_id', 'property_badge_badge_id_foreign')->references('id')->on('badges')->cascadeOnDelete();
        });

        Schema::create('property_similar', function (Blueprint $table) {
            $table->unsignedBigInteger('property_id');
            $table->unsignedBigInteger('similar_property_id');
            $table->integer('position')->default(0)->comment('the order the admin chose');
            $table->primary(['property_id', 'similar_property_id']);
            $table->index(['similar_property_id'], 'property_similar_similar_property_id_index');
            $table->foreign('property_id', 'property_similar_property_id_foreign')->references('id')->on('properties')->cascadeOnDelete();
            $table->foreign('similar_property_id', 'property_similar_similar_property_id_foreign')->references('id')->on('properties')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('property_similar');
        Schema::dropIfExists('property_badge');
        Schema::dropIfExists('property_amenity');
        Schema::dropIfExists('property_faqs');
        Schema::dropIfExists('property_construction_timeline');
        Schema::dropIfExists('property_nearby_places');
        Schema::dropIfExists('property_unit_configurations');
        Schema::dropIfExists('property_floor_plans');
        Schema::dropIfExists('property_documents');
        Schema::dropIfExists('property_images');
        Schema::dropIfExists('properties');
    }
};
