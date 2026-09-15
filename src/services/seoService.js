import apiClient from './api';

/**
 * Dedicated SEO Service Layer
 *
 * Uses Laravel /seo/* endpoints for all SEO operations.
 *
 * Laravel route mapping:
 *   GET    /seo/properties          → SeoController@index
 *   GET    /seo/property/:id        → SeoController@show
 *   PUT    /seo/property/:id        → SeoController@update
 *   POST   /seo/auto-generate       → SeoController@autoGenerate
 */

// Helper: normalize list response (handles array, paginated, and wrapped formats)
const normalizeListResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.properties)) return data.properties;
  // Handle single-object response (wrap in array for consistent processing)
  if (data && typeof data === 'object' && data.id) return [data];
  return [];
};

// Map backend field names (snake_case) to frontend field names (camelCase)
const mapBackendToFrontend = (item) => {
  if (!item) return item;

  // Get the property data (may be nested under 'property' or inline)
  const property = item.property || {};

  // Guard: ensure location is always a proper object
  const rawLocation = property.location || item.location;
  const location =
    rawLocation && typeof rawLocation === 'object' && !Array.isArray(rawLocation)
      ? rawLocation
      : {
          area: property.location_area || item.location_area || '',
          city: property.location_city || item.location_city || '',
          state: property.location_state || item.location_state || '',
        };

  // Guard: normalize keywords (may come as array, comma-separated string, or null)
  const rawKeywords = item.keywords || item.seo_keywords || item.seoKeywords;
  const seoKeywords = (() => {
    if (Array.isArray(rawKeywords)) return rawKeywords;
    if (typeof rawKeywords === 'string' && rawKeywords.trim()) {
      return rawKeywords.split(',').map((k) => k.trim()).filter(Boolean);
    }
    return [];
  })();

  return {
    id: item.property_id || item.id,
    propertyId: item.property_id || item.id,
    title: property.title || item.title || '',
    slug: property.slug || item.slug || '',
    location,
    developer: property.developer || item.developer,
    configuration: property.configuration || item.configuration,
    dimensionRange: property.dimensionRange || item.dimensionRange || item.dimension_range,
    status: property.status || item.status,
    possession: property.possession || item.possession,
    price: property.price || item.price,
    priceUnit: property.priceUnit || item.priceUnit || item.price_unit,
    propertyType: property.propertyType || item.propertyType || item.property_type,
    type: property.type || item.type,
    description: property.description || item.description,
    gallery: property.gallery || item.gallery,
    highlights: property.highlights || item.highlights,
    amenities: property.amenities || item.amenities,
    tags: property.tags || item.tags || [],
    // SEO-specific fields: backend may use meta_title, seo_title, or seoTitle
    seoTitle: item.meta_title || item.seo_title || item.seoTitle || '',
    seoDescription: item.meta_description || item.seo_description || item.seoDescription || '',
    seoKeywords,
    canonicalUrl: item.canonical_url || item.canonicalUrl || '',
    ogTitle: item.og_title || item.ogTitle || '',
    ogDescription: item.og_description || item.ogDescription || '',
    ogImage: item.og_image || item.ogImage || '',
    twitterCard: item.twitter_card || item.twitterCard || 'summary_large_image',
    schemaMarkup: item.schema_json || item.schema_markup || item.schemaMarkup || '',
    seoScore: item.seo_score ?? item.seoScore ?? 0,
  };
};

// Map frontend field names (camelCase) to backend field names (snake_case)
const mapFrontendToBackend = (seoData) => ({
  meta_title: seoData.seoTitle ?? seoData.meta_title ?? '',
  meta_description: seoData.seoDescription ?? seoData.meta_description ?? '',
  keywords: seoData.seoKeywords ?? seoData.keywords ?? [],
  canonical_url: seoData.canonicalUrl ?? seoData.canonical_url ?? '',
  og_title: seoData.ogTitle ?? seoData.og_title ?? '',
  og_description: seoData.ogDescription ?? seoData.og_description ?? '',
  og_image: seoData.ogImage ?? seoData.og_image ?? '',
  twitter_card: seoData.twitterCard ?? seoData.twitter_card ?? 'summary_large_image',
  schema_json: seoData.schemaMarkup ?? seoData.schema_json ?? seoData.schema_markup ?? '',
});

const seoService = {
  /**
   * GET /seo/properties
   * Fetch all properties with their SEO data.
   */
  getAllProperties: async () => {
    const response = await apiClient.get('/seo/properties');
    const items = normalizeListResponse(response.data);
    return items.map(mapBackendToFrontend);
  },

  /**
   * GET /seo/property/:id
   * Fetch SEO data for a single property.
   */
  getPropertySeo: async (id) => {
    const response = await apiClient.get(`/seo/property/${id}`);
    const data = response.data;
    // Handle both wrapped { data: {...} } and direct object responses
    const seoData = data?.data && typeof data.data === 'object' && !Array.isArray(data.data)
      ? data.data
      : data;
    return mapBackendToFrontend(seoData);
  },

  /**
   * PUT /seo/property/:id
   * Update SEO data for a single property.
   */
  updatePropertySeo: async (id, seoData) => {
    const payload = mapFrontendToBackend(seoData);
    const response = await apiClient.put(`/seo/property/${id}`, payload);
    const data = response.data;
    const result = data?.data && typeof data.data === 'object' && !Array.isArray(data.data)
      ? data.data
      : data;
    return mapBackendToFrontend(result);
  },

  /**
   * POST /seo/auto-generate
   * Auto-generate SEO data for a single property (server-side).
   */
  autoGenerate: async (propertyId) => {
    const response = await apiClient.post('/seo/auto-generate', {
      property_id: propertyId,
    });
    const data = response.data;
    const result = data?.data && typeof data.data === 'object' && !Array.isArray(data.data)
      ? data.data
      : data;
    return mapBackendToFrontend(result);
  },

  /**
   * Bulk auto-generate SEO for all properties missing complete data.
   * Calls auto-generate for each incomplete property.
   */
  bulkAutoGenerate: async (properties, scoreFn) => {
    const incomplete = properties.filter((p) => scoreFn(p).totalScore < 100);
    if (incomplete.length === 0) return [];

    const updates = [];
    for (const prop of incomplete) {
      const result = await seoService.autoGenerate(prop.propertyId || prop.id);
      updates.push(result);
    }
    return updates;
  },
};

export default seoService;
