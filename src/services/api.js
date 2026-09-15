import axios from "axios";

// Base URL — points to Laravel backend
const BASE_URL =
  process.env.REACT_APP_API_URL ||
  "https://phplaravel-780646-6246811.cloudwaysapps.com/api";

// Create axios instance
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available (for admin routes)
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor — handles 401 auto-logout
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      const message = data?.message || data?.error || error.message;
      switch (status) {
        case 401:
          // Clear all auth data and redirect to login
          localStorage.removeItem("authToken");
          localStorage.removeItem("adminUser");
          localStorage.removeItem("tokenExpiry");
          sessionStorage.removeItem("authToken");
          sessionStorage.removeItem("adminUser");
          window.location.href = "/admin/login";
          break;
        case 404:
          console.warn(`Resource not found: ${error.config?.url}`, message);
          break;
        case 500:
          console.error(`Server error: ${error.config?.url}`, message);
          break;
        default:
          console.warn(`API error (${status}): ${error.config?.url}`, message);
          break;
      }
    } else if (error.code === "ECONNABORTED") {
      console.error("Request timeout:", error.config?.url);
    } else if (!error.response) {
      console.error("Network error:", error.message);
    }
    return Promise.reject(error);
  },
);

// Helper: normalize list response (handles both array and paginated object responses)
const normalizeListResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data; // Laravel paginated response
  if (data && Array.isArray(data.items)) return data.items;
  return [];
};

// Helper: extract pagination meta from Laravel paginated response
const extractPaginationMeta = (data) => {
  if (!data || Array.isArray(data)) return null;
  // Laravel wraps pagination meta at top level or inside meta key
  const meta = data.meta || {
    current_page: data.current_page,
    per_page: data.per_page,
    total: data.total,
    last_page: data.last_page,
  };
  if (meta && meta.current_page !== undefined) return meta;
  return null;
};

// === Property Payload Transformation ===
// Converts frontend camelCase/nested format to backend snake_case/flat format
const transformPropertyPayload = (data) => {
  const payload = {};

  // Core required fields — snake_case to match DB columns
  if (data.title !== undefined) payload.title = data.title;
  if (data.slug !== undefined) payload.slug = data.slug;
  if (data.type !== undefined) payload.type = data.type;
  if (data.propertyType !== undefined) payload.property_type = data.propertyType;
  if (data.property_type !== undefined) payload.property_type = data.property_type;
  if (data.category !== undefined) payload.category = data.category;
  if (data.status !== undefined) payload.status = data.status;
  if (data.price !== undefined) payload.price = data.price;
  if (data.configuration !== undefined) payload.configuration = data.configuration;

  // Location — flatten nested object to snake_case fields
  if (data.location) {
    if (data.location.area !== undefined) payload.location_area = data.location.area;
    if (data.location.city !== undefined) payload.location_city = data.location.city;
    if (data.location.state !== undefined) payload.location_state = data.location.state || null;
    if (data.location.lat !== undefined) payload.location_lat = data.location.lat || null;
    if (data.location.lng !== undefined) payload.location_lng = data.location.lng || null;
    if (data.location.address !== undefined) payload.location_address = data.location.address || null;
  }
  // Also handle pre-flattened location fields (from partial updates)
  if (data.location_area !== undefined) payload.location_area = data.location_area;
  if (data.location_city !== undefined) payload.location_city = data.location_city;
  if (data.location_state !== undefined) payload.location_state = data.location_state;
  if (data.location_lat !== undefined) payload.location_lat = data.location_lat;
  if (data.location_lng !== undefined) payload.location_lng = data.location_lng;
  if (data.location_address !== undefined) payload.location_address = data.location_address;

  // Optional core fields — snake_case
  if (data.publishStatus !== undefined) payload.publish_status = data.publishStatus;
  if (data.publish_status !== undefined) payload.publish_status = data.publish_status;
  if (data.priceUnit !== undefined) payload.price_unit = data.priceUnit;
  if (data.price_unit !== undefined) payload.price_unit = data.price_unit;
  if (data.developer !== undefined) payload.developer = data.developer;
  if (data.description !== undefined) payload.description = data.description;
  if (data.highlights !== undefined) payload.highlights = data.highlights;
  if (data.possession !== undefined) payload.possession = data.possession;
  if (data.specifications !== undefined) payload.specifications = data.specifications;
  if (data.sections !== undefined) payload.sections = data.sections;
  if (data.tags !== undefined) payload.tags = data.tags;

  // Dimension — flatten nested object
  if (data.dimensionRange) {
    payload.dimension_min = data.dimensionRange.min || null;
    payload.dimension_max = data.dimensionRange.max || null;
    payload.dimension_unit = data.dimensionRange.unit || "sqft";
  }
  if (data.dimension_min !== undefined) payload.dimension_min = data.dimension_min;
  if (data.dimension_max !== undefined) payload.dimension_max = data.dimension_max;
  if (data.dimension_unit !== undefined) payload.dimension_unit = data.dimension_unit;

  // Boolean/URL fields — snake_case
  if (data.isActive !== undefined) payload.is_active = data.isActive;
  if (data.is_active !== undefined) payload.is_active = data.is_active;
  if (data.brochureUrl !== undefined) payload.brochure_url = data.brochureUrl;
  if (data.brochure_url !== undefined) payload.brochure_url = data.brochure_url;
  if (data.floorPlanPdfUrl !== undefined) payload.floor_plan_pdf_url = data.floorPlanPdfUrl;
  if (data.floor_plan_pdf_url !== undefined) payload.floor_plan_pdf_url = data.floor_plan_pdf_url;

  // Relation arrays — pass through (backend accepts these names)
  if (data.amenities !== undefined) payload.amenities = data.amenities;
  if (data.floorPlans !== undefined) payload.floorPlans = data.floorPlans;
  if (data.gallery !== undefined) payload.gallery = data.gallery;
  if (data.nearbyPlaces !== undefined) payload.nearbyPlaces = data.nearbyPlaces;
  if (data.documents !== undefined) payload.documents = data.documents;
  if (data.specialities !== undefined) payload.specialities = data.specialities;
  if (data.constructionSpecs !== undefined) payload.constructionSpecs = data.constructionSpecs;
  if (data.constructionTimeline !== undefined) payload.constructionTimeline = data.constructionTimeline;
  if (data.developerInfo !== undefined) payload.developerInfo = data.developerInfo;
  if (data.faqs !== undefined) payload.faqs = data.faqs;
  if (data.similarPropertyIds !== undefined) payload.similarPropertyIds = data.similarPropertyIds;

  // SEO fields — use snake_case to match backend conventions
  if (data.seoTitle !== undefined) payload.meta_title = data.seoTitle;
  if (data.meta_title !== undefined) payload.meta_title = data.meta_title;
  if (data.seoDescription !== undefined) payload.meta_description = data.seoDescription;
  if (data.meta_description !== undefined) payload.meta_description = data.meta_description;
  if (data.seoKeywords !== undefined) payload.keywords = data.seoKeywords;
  if (data.keywords !== undefined) payload.keywords = data.keywords;
  if (data.ogTitle !== undefined) payload.og_title = data.ogTitle;
  if (data.og_title !== undefined) payload.og_title = data.og_title;
  if (data.ogDescription !== undefined) payload.og_description = data.ogDescription;
  if (data.og_description !== undefined) payload.og_description = data.og_description;
  if (data.ogImage !== undefined) payload.og_image = data.ogImage;
  if (data.og_image !== undefined) payload.og_image = data.og_image;
  if (data.twitterCard !== undefined) payload.twitter_card = data.twitterCard;
  if (data.twitter_card !== undefined) payload.twitter_card = data.twitter_card;
  if (data.canonicalUrl !== undefined) payload.canonical_url = data.canonicalUrl;
  if (data.canonical_url !== undefined) payload.canonical_url = data.canonical_url;
  if (data.schemaMarkup !== undefined) payload.schema_markup = data.schemaMarkup;
  if (data.schema_markup !== undefined) payload.schema_markup = data.schema_markup;

  return payload;
};

// Normalize a single specification item to ensure consistent {key, value, icon} shape
const normalizeSpecificationItem = (item) => {
  if (!item || typeof item !== "object") return null;
  const key = item.key || item.label || item.name || "";
  const value = item.value != null ? String(item.value) : "";
  // Handle various icon field names from different backend formats
  const icon = item.icon || item.icon_name || item.iconify || item.spec_icon || "";
  if (!key && !value) return null;
  return { key, value, icon };
};

// Normalize a single floor plan item to ensure consistent shape
const normalizeFloorPlanItem = (fp) => {
  if (!fp || typeof fp !== "object") return null;
  return {
    config: fp.config || fp.configuration || fp.name || fp.title || fp.type || "",
    area: fp.area != null ? String(fp.area) : fp.carpet_area != null ? String(fp.carpet_area) : fp.super_area != null ? String(fp.super_area) : "",
    price: fp.price != null ? String(fp.price) : fp.base_price != null ? String(fp.base_price) : fp.total_price != null ? String(fp.total_price) : "",
    image: fp.image || fp.image_url || fp.floor_image || fp.plan_image || "",
    bedrooms: fp.bedrooms != null ? String(fp.bedrooms) : fp.bed_count != null ? String(fp.bed_count) : fp.bhk != null ? String(fp.bhk) : "",
    bathrooms: fp.bathrooms != null ? String(fp.bathrooms) : fp.bath_count != null ? String(fp.bath_count) : "",
  };
};

// Normalize property response: ensure consistent camelCase format for frontend
const normalizePropertyResponse = (data) => {
  if (!data) return data;

  // Guard: ensure location is always a proper object (backend may return string or null)
  const rawLocation = data.location;
  const location =
    rawLocation && typeof rawLocation === "object" && !Array.isArray(rawLocation)
      ? rawLocation
      : {
          area: data.location_area || "",
          city: data.location_city || "",
          state: data.location_state || "",
          lat: data.location_lat || null,
          lng: data.location_lng || null,
          address: data.location_address || "",
        };

  // Guard: ensure dimensionRange is always a proper object
  const rawDimension = data.dimensionRange || data.dimension_range;
  const dimensionRange =
    rawDimension && typeof rawDimension === "object" && !Array.isArray(rawDimension)
      ? rawDimension
      : {
          min: data.dimension_min || null,
          max: data.dimension_max || null,
          unit: data.dimension_unit || "sqft",
        };

  // Normalize gallery: handle both string arrays and object arrays from backend
  const rawGallery = data.gallery;
  const gallery = Array.isArray(rawGallery)
    ? rawGallery.map((item) =>
        typeof item === "object" && item !== null ? item.url || item.image || "" : item
      )
    : [];

  // Normalize amenities: handle both string arrays and object arrays from backend
  const rawAmenities = data.amenities;
  const amenities = Array.isArray(rawAmenities) ? rawAmenities : [];

  // Normalize specifications: handle "details", "specifications", "property_details" keys,
  // and both array and object formats from backend
  const rawSpecs = data.specifications || data.details || data.property_details || data.specs;
  let specifications;
  if (Array.isArray(rawSpecs)) {
    specifications = rawSpecs.map(normalizeSpecificationItem).filter(Boolean);
  } else if (rawSpecs && typeof rawSpecs === "object") {
    // Object format: { "RERA ID": "PRM/KA/..." } — convert to array (icons lost in this format)
    specifications = Object.entries(rawSpecs)
      .map(([key, val]) => {
        // Value might be a primitive or an object with value+icon
        if (val && typeof val === "object") {
          return normalizeSpecificationItem({ key, ...val });
        }
        return { key, value: String(val ?? ""), icon: "" };
      })
      .filter((s) => s.key || s.value);
  } else {
    specifications = [];
  }

  // Normalize floorPlans: handle snake_case key from backend and normalize items
  const rawFloorPlans = data.floorPlans || data.floor_plans || data.floorPlan || data.floor_plan || [];
  const floorPlansArray = Array.isArray(rawFloorPlans) ? rawFloorPlans : [rawFloorPlans];
  const floorPlans = floorPlansArray.map(normalizeFloorPlanItem).filter(Boolean);

  // Normalize nearbyPlaces: handle snake_case key from backend
  const nearbyPlaces = data.nearbyPlaces || data.nearby_places || [];

  // Normalize constructionSpecs: handle snake_case key from backend
  const constructionSpecs = data.constructionSpecs || data.construction_specs || {};

  // Normalize constructionTimeline: handle snake_case key from backend
  const constructionTimeline = data.constructionTimeline || data.construction_timeline || [];

  // Normalize developerInfo: handle snake_case key from backend
  const developerInfo = data.developerInfo || data.developer_info || null;

  // Normalize similarPropertyIds: handle snake_case key from backend
  const similarPropertyIds = data.similarPropertyIds || data.similar_property_ids || [];

  // Normalize specialities: handle alternate spelling "specialties"
  const specialities = data.specialities || data.specialties || [];

  // Normalize documents
  const documents = data.documents || [];

  // Normalize highlights
  const highlights = data.highlights || [];

  // Normalize configuration
  const configuration = data.configuration || [];

  // Normalize faqs
  const faqs = data.faqs || [];

  // Normalize tags
  const tags = Array.isArray(data.tags) ? data.tags : [];

  // Normalize sections
  const sections = data.sections || {};

  // Handle nested seo object from backend (some APIs nest SEO data under a seo key)
  const seoObj = data.seo && typeof data.seo === "object" && !Array.isArray(data.seo) ? data.seo : {};

  return {
    ...data,
    propertyType: data.propertyType || data.property_type,
    publishStatus: data.publishStatus || data.publish_status,
    priceUnit: data.priceUnit || data.price_unit,
    isActive: !!(data.isActive ?? data.is_active),
    brochureUrl: data.brochureUrl || data.brochure_url || "",
    floorPlanPdfUrl: data.floorPlanPdfUrl || data.floor_plan_pdf_url || "",
    schemaMarkup: (() => {
      const sm = data.schemaMarkup || data.schema_markup || seoObj.schema_markup;
      if (!sm) return "";
      if (typeof sm === "string") return sm;
      return JSON.stringify(sm);
    })(),
    // SEO fields: handle camelCase, snake_case, and nested seo object from backend
    seoTitle: data.seoTitle || data.meta_title || data.seo_title || seoObj.meta_title || seoObj.title || "",
    seoDescription: data.seoDescription || data.meta_description || data.seo_description || seoObj.meta_description || seoObj.description || "",
    seoKeywords: (() => {
      const kw = data.seoKeywords || data.keywords || data.seo_keywords || seoObj.keywords || seoObj.seo_keywords;
      if (Array.isArray(kw)) return kw;
      if (typeof kw === "string" && kw.trim()) return kw.split(",").map((k) => k.trim()).filter(Boolean);
      return [];
    })(),
    canonicalUrl: data.canonicalUrl || data.canonical_url || seoObj.canonical_url || "",
    ogTitle: data.ogTitle || data.og_title || seoObj.og_title || "",
    ogDescription: data.ogDescription || data.og_description || seoObj.og_description || "",
    ogImage: data.ogImage || data.og_image || seoObj.og_image || "",
    twitterCard: data.twitterCard || data.twitter_card || seoObj.twitter_card || "summary_large_image",
    location,
    dimensionRange,
    gallery,
    amenities,
    specifications,
    floorPlans,
    nearbyPlaces,
    constructionSpecs,
    constructionTimeline,
    developerInfo,
    similarPropertyIds,
    specialities,
    documents,
    highlights,
    configuration,
    faqs,
    tags,
    sections,
    possession: data.possession || "",
    createdAt: data.createdAt || data.created_at,
    updatedAt: data.updatedAt || data.updated_at,
  };
};

// === Property Service ===
export const propertyService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get("/properties", { params });
    const items = normalizeListResponse(response.data);
    return items.map(normalizePropertyResponse);
  },

  getById: async (id) => {
    const response = await apiClient.get(`/properties/${id}`);
    const data = response.data;
    // Handle both wrapped { data: {...} } and direct object responses
    const property = data?.data && typeof data.data === "object" && !Array.isArray(data.data)
      ? data.data
      : data;
    return normalizePropertyResponse(property);
  },

  getBySlug: async (slug) => {
    const response = await apiClient.get(`/properties/slug/${slug}`);
    const data = response.data;
    // Handle both wrapped { data: {...} } and direct object responses
    const property = data?.data && typeof data.data === "object" && !Array.isArray(data.data)
      ? data.data
      : data || null;
    return normalizePropertyResponse(property);
  },

  getFeatured: async () => {
    const response = await apiClient.get("/properties", {
      params: { featured: true, is_active: true },
    });
    const items = normalizeListResponse(response.data);
    const normalized = items.map(normalizePropertyResponse);
    // Client-side safety net: if backend doesn't filter by featured param,
    // ensure only properties with "featured" tag are returned
    const hasNonFeatured = normalized.some(
      (p) => !Array.isArray(p.tags) || !p.tags.includes("featured"),
    );
    if (hasNonFeatured && normalized.length > 0) {
      return normalized.filter(
        (p) => Array.isArray(p.tags) && p.tags.includes("featured"),
      );
    }
    return normalized;
  },

  getByStatus: async (status, params = {}) => {
    const response = await apiClient.get("/properties", {
      params: { status, is_active: true, ...params },
    });
    const items = normalizeListResponse(response.data);
    return items.map(normalizePropertyResponse).filter(
      (p) => !!p.isActive && p.status === status && p.publishStatus !== "draft"
    );
  },

  getByType: async (type, params = {}) => {
    const response = await apiClient.get("/properties", {
      params: { type, ...params },
    });
    const items = normalizeListResponse(response.data);
    return items.map(normalizePropertyResponse);
  },

  search: async (query, params = {}) => {
    const response = await apiClient.get("/properties", {
      params: { q: query, ...params },
    });
    const items = normalizeListResponse(response.data);
    return items.map(normalizePropertyResponse);
  },

  create: async (data) => {
    const payload = transformPropertyPayload(data);
    const response = await apiClient.post("/admin/properties", payload);
    return normalizePropertyResponse(response.data);
  },

  update: async (id, data) => {
    const payload = transformPropertyPayload(data);
    const response = await apiClient.put(`/admin/properties/${id}`, payload);
    return normalizePropertyResponse(response.data);
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/admin/properties/${id}`);
    return response.data;
  },

  getSeo: async (id) => {
    try {
      const response = await apiClient.get(`/seo/property/${id}`);
      const data = response.data;
      return data?.data && typeof data.data === "object" && !Array.isArray(data.data)
        ? data.data
        : data || null;
    } catch {
      // SEO endpoint may not exist or property may not have SEO data yet
      return null;
    }
  },

  updateSeo: async (id, data) => {
    try {
      const response = await apiClient.put(`/seo/property/${id}`, data);
      return response.data;
    } catch {
      // SEO endpoint may not exist; silently fail
      return null;
    }
  },
};

// === Lead Service ===
export const leadService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get("/admin/leads", { params });
    return normalizeListResponse(response.data);
  },

  getById: async (id) => {
    const response = await apiClient.get(`/admin/leads/${id}`);
    const data = response.data;
    // Handle both direct object and Laravel-wrapped { data: {...} } responses
    return data?.data && typeof data.data === "object" && !Array.isArray(data.data)
      ? data.data
      : data;
  },

  create: async (data) => {
    const response = await apiClient.post("/leads", data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.put(`/admin/leads/${id}`, data);
    return response.data;
  },

  addNote: async (id, noteText) => {
    const response = await apiClient.post(`/admin/leads/${id}/notes`, {
      text: noteText,
    });
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/admin/leads/${id}`);
    return response.data;
  },
};

// === Neighborhood Service ===
export const neighborhoodService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get("/neighborhoods", { params });
    return normalizeListResponse(response.data);
  },

  getById: async (id) => {
    const response = await apiClient.get(`/neighborhoods/${id}`);
    return response.data;
  },

  getActive: async () => {
    const response = await apiClient.get("/neighborhoods/active");
    return normalizeListResponse(response.data);
  },

  create: async (data) => {
    const response = await apiClient.post("/admin/neighborhoods", data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.put(`/admin/neighborhoods/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/admin/neighborhoods/${id}`);
    return response.data;
  },
};

// === Partner Service ===
export const partnerService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get("/partners", { params });
    return normalizeListResponse(response.data);
  },

  getById: async (id) => {
    const response = await apiClient.get(`/partners/${id}`);
    return response.data;
  },

  getActive: async () => {
    const response = await apiClient.get("/partners/active");
    return normalizeListResponse(response.data);
  },

  create: async (data) => {
    const response = await apiClient.post("/admin/partners", data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.put(`/admin/partners/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/admin/partners/${id}`);
    return response.data;
  },
};

// === FAQ Service ===
export const faqService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get("/faqs", { params });
    const data = normalizeListResponse(response.data);
    return data.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },

  getById: async (id) => {
    const response = await apiClient.get(`/faqs/${id}`);
    return response.data;
  },

  getByCategory: async (category) => {
    const response = await apiClient.get("/faqs", {
      params: { category },
    });
    const data = normalizeListResponse(response.data);
    return data.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },

  create: async (data) => {
    const response = await apiClient.post("/admin/faqs", data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.put(`/admin/faqs/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/admin/faqs/${id}`);
    return response.data;
  },
};

// === Article Service ===
export const articleService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get("/articles", { params });
    return normalizeListResponse(response.data);
  },

  getById: async (id) => {
    const response = await apiClient.get(`/articles/${id}`);
    return response.data;
  },

  getBySlug: async (slug) => {
    const response = await apiClient.get(`/articles/slug/${slug}`);
    const data = response.data;
    // Handle both wrapped { data: {...} } and direct object responses
    return data?.data || data || null;
  },

  getTrending: async () => {
    const response = await apiClient.get("/articles/trending");
    return normalizeListResponse(response.data);
  },

  getByIds: async (ids) => {
    if (!ids || ids.length === 0) return [];
    // Fetch each article individually and combine
    const results = await Promise.allSettled(
      ids.map((id) => apiClient.get(`/articles/${id}`)),
    );
    return results
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value.data);
  },

  getByCategory: async (category, params = {}) => {
    const response = await apiClient.get("/articles", {
      params: { category, ...params },
    });
    return normalizeListResponse(response.data);
  },

  create: async (data) => {
    const response = await apiClient.post("/admin/articles", data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.put(`/admin/articles/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/admin/articles/${id}`);
    return response.data;
  },
};

// === Site Settings Service ===
export const siteSettingsService = {
  get: async () => {
    const response = await apiClient.get("/settings");
    const data = response.data;
    // Handle both direct object and Laravel-wrapped { data: {...} } responses
    return data?.data && typeof data.data === "object" && !Array.isArray(data.data)
      ? data.data
      : data;
  },

  update: async (data) => {
    const response = await apiClient.put("/admin/settings", data);
    const result = response.data;
    return result?.data && typeof result.data === "object" && !Array.isArray(result.data)
      ? result.data
      : result;
  },
};

// === Auth Service (Laravel) ===
export const authService = {
  login: async (email, password) => {
    const response = await apiClient.post("/auth/login", { email, password });
    const data = response.data;

    // Laravel returns: { token, user, tokenExpiry? }
    const token = data.token;
    const userData = data.user || data;
    const tokenExpiry =
      data.tokenExpiry ||
      data.token_expiry ||
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const safeUser = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      avatar: userData.avatar || null,
    };

    return { user: safeUser, token, tokenExpiry };
  },

  getProfile: async () => {
    const response = await apiClient.get("/auth/profile");
    return response.data;
  },

  logout: async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Silently fail — we still want to clear local state
    }
    localStorage.removeItem("authToken");
    localStorage.removeItem("adminUser");
    localStorage.removeItem("tokenExpiry");
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("adminUser");
  },
};

// === Admin User Management Service ===
export const adminService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get("/admin/users", { params });
    return normalizeListResponse(response.data);
  },

  getById: async (id) => {
    const response = await apiClient.get(`/admin/users/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await apiClient.post("/admin/users", data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.put(`/admin/users/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/admin/users/${id}`);
    return response.data;
  },
};

// === User Management Service (Admin Panel) ===
export const userService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get("/admin/users", { params });
    return normalizeListResponse(response.data);
  },

  getById: async (id) => {
    const response = await apiClient.get(`/admin/users/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await apiClient.post("/admin/users", data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.put(`/admin/users/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/admin/users/${id}`);
    return response.data;
  },
};

// === Dashboard Service ===
export const dashboardService = {
  get: async () => {
    const response = await apiClient.get("/admin/dashboard");
    return response.data;
  },
};

// === Visit Tracking Service ===
export const visitService = {
  record: async (data = {}) => {
    try {
      const response = await apiClient.post("/visits", data);
      return response.data;
    } catch {
      // Silently fail — visit tracking should never block UX
    }
  },
};

// === Newsletter Service ===
export const newsletterService = {
  subscribe: async (email) => {
    const response = await apiClient.post("/newsletter/subscribe", { email });
    return response.data;
  },
};

export default apiClient;
