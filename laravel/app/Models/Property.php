<?php

namespace App\Models;

use App\Models\Casts\AsJsonValue;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A listing (`properties`). The API document nests `pricing`, `area`, `location`, `configuration`, `project` and `agent`; here they are flattened columns (04_DATA_MODELS.md → "Naming").
 *
 * Table `properties`. The API reads and writes this aggregate as one JSON
 * document through App\Store\DocumentStore; the relations below are the
 * Eloquent view of the same rows, for code that works with models.
 */
class Property extends Model
{
    use SoftDeletes;

    protected $table = 'properties';

    protected function casts(): array
    {
        return [
            'property_type_id' => 'integer',
            'possession_date' => 'date:Y-m-d',
            'age_of_property_years' => 'integer',
            'floor_number' => 'integer',
            'total_floors' => 'integer',
            'rera_registered' => 'boolean',
            'highlights' => AsJsonValue::class,
            'specifications' => AsJsonValue::class,
            'construction_specs' => AsJsonValue::class,
            'brochure_lead_gated' => 'boolean',
            'locality_id' => 'integer',
            'city_id' => 'integer',
            'latitude' => 'float',
            'longitude' => 'float',
            'show_exact_location' => 'boolean',
            'price' => 'float',
            'price_on_request' => 'boolean',
            'price_range_min' => 'float',
            'price_range_max' => 'float',
            'price_per_sqft' => 'float',
            'price_negotiable' => 'boolean',
            'rent_per_month' => 'float',
            'security_deposit' => 'float',
            'maintenance_charges_monthly' => 'float',
            'booking_amount' => 'float',
            'other_charges' => AsJsonValue::class,
            'super_built_up_area' => 'float',
            'built_up_area' => 'float',
            'carpet_area' => 'float',
            'plot_area' => 'float',
            'plot_length' => 'float',
            'plot_width' => 'float',
            'bedrooms' => 'integer',
            'bathrooms' => 'integer',
            'balconies' => 'integer',
            'parking_covered' => 'integer',
            'parking_open' => 'integer',
            'servant_room' => 'boolean',
            'study_room' => 'boolean',
            'pooja_room' => 'boolean',
            'developer_id' => 'integer',
            'project_total_units' => 'integer',
            'project_total_towers' => 'integer',
            'project_total_floors' => 'integer',
            'project_area_acres' => 'float',
            'project_open_area_percent' => 'integer',
            'project_launch_date' => 'date:Y-m-d',
            'project_approvals' => AsJsonValue::class,
            'is_landmark_project' => 'boolean',
            'construction_progress_percent' => 'integer',
            'section_visibility' => AsJsonValue::class,
            'agent_team_member_id' => 'integer',
            'agent_show_on_listing' => 'boolean',
            'seo' => AsJsonValue::class,
            'is_active' => 'boolean',
            'is_featured' => 'boolean',
            'is_verified' => 'boolean',
            'priority_order' => 'integer',
            'view_count' => 'integer',
            'enquiry_count' => 'integer',
            'published_at' => 'datetime',
            'created_by' => 'integer',
            'updated_by' => 'integer',
        ];
    }

    public function propertyType(): BelongsTo
    {
        return $this->belongsTo(PropertyType::class);
    }

    public function segmentRecord(): BelongsTo
    {
        return $this->belongsTo(Segment::class, 'segment', 'slug');
    }

    public function locality(): BelongsTo
    {
        return $this->belongsTo(Locality::class);
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    public function developer(): BelongsTo
    {
        return $this->belongsTo(Developer::class);
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(TeamMember::class, 'agent_team_member_id');
    }

    public function images(): HasMany
    {
        return $this->hasMany(PropertyImage::class)->orderBy('position');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(PropertyDocument::class)->orderBy('position');
    }

    public function floorPlans(): HasMany
    {
        return $this->hasMany(PropertyFloorPlan::class)->orderBy('position');
    }

    public function unitConfigurations(): HasMany
    {
        return $this->hasMany(PropertyUnitConfiguration::class)->orderBy('position');
    }

    public function nearbyPlaces(): HasMany
    {
        return $this->hasMany(PropertyNearbyPlace::class)->orderBy('position');
    }

    public function constructionTimeline(): HasMany
    {
        return $this->hasMany(PropertyConstructionMilestone::class)->orderBy('position');
    }

    public function faqs(): HasMany
    {
        return $this->hasMany(PropertyFaq::class)->orderBy('position');
    }

    public function amenities(): BelongsToMany
    {
        return $this->belongsToMany(Amenity::class, 'property_amenity')->withPivot('position')->orderByPivot('position');
    }

    public function badges(): BelongsToMany
    {
        return $this->belongsToMany(Badge::class, 'property_badge')->withPivot('position')->orderByPivot('position');
    }

    public function similarProperties(): BelongsToMany
    {
        return $this->belongsToMany(Property::class, 'property_similar', 'property_id', 'similar_property_id')->withPivot('position')->orderByPivot('position');
    }

    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class);
    }

    public function views(): HasMany
    {
        return $this->hasMany(PropertyView::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(AdminUser::class, 'created_by');
    }

    public function editor(): BelongsTo
    {
        return $this->belongsTo(AdminUser::class, 'updated_by');
    }
}
