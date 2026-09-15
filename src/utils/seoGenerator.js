/**
 * SEO Data Auto-Generation Engine
 *
 * Generates production-grade SEO metadata from property data.
 * Uses location-based modifiers, intelligent title construction,
 * and avoids duplicate/spammy patterns.
 *
 * Design principles:
 *  - Unique titles per property (no generic templates)
 *  - Location + config-aware meta tags
 *  - Keyword stuffing prevention
 *  - Clean JSON-LD schema generation (RealEstateListing + Residence + BreadcrumbList)
 *  - Laravel-migration safe (pure functions, no side effects)
 */

const SITE_NAME = 'HOM Advisory';
const SITE_URL = 'https://homadvisory.com';

// ─── Helpers ──────────────────────────────────────────────────

const capitalize = (str) => {
  if (!str) return '';
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
};

const truncate = (str, max) => {
  if (!str || str.length <= max) return str || '';
  return str.slice(0, max - 3).trim() + '...';
};

const formatPrice = (price) => {
  if (!price || isNaN(Number(price))) return null;
  const num = Number(price);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  return `₹${num.toLocaleString('en-IN')}`;
};

const getPropertyTypeLabel = (type, propertyType) => {
  const typeMap = {
    apartment: 'Apartments',
    villa: 'Villas',
    plot: 'Plots',
    penthouse: 'Penthouses',
    duplex: 'Duplexes',
    studio: 'Studios',
    farmhouse: 'Farm Houses',
    rowhouse: 'Row Houses',
  };
  return typeMap[propertyType] || 'Properties';
};

const getStatusLabel = (status) => {
  const statusMap = {
    'ready-to-move': 'Ready to Move',
    'under-construction': 'Under Construction',
    'pre-launch': 'Pre-Launch',
    'new-launch': 'New Launch',
  };
  return statusMap[status] || '';
};

// ─── Title Generation ─────────────────────────────────────────

/**
 * Generate a unique, optimized SEO title.
 * Target length: 50–60 characters.
 *
 * Pattern variants (to avoid duplication):
 *  1. "{Title} — {Config} in {Area}, {City}"
 *  2. "{Config} {PropertyType} in {Area} | {Title}"
 *  3. "{Title} by {Developer} | {Area}, {City}"
 */
const generateTitle = (property) => {
  const { title, configuration, location, developer, propertyType } = property;
  const area = location?.area || '';
  const city = location?.city || '';
  const configs = configuration?.length > 0 ? configuration.slice(0, 3).join(', ') : '';
  const typeLabel = getPropertyTypeLabel(property.type, propertyType);

  // Try pattern 1: compact title with config
  let candidate = '';
  if (configs && area) {
    candidate = `${title} — ${configs} in ${area}`;
    if (candidate.length <= 60) return candidate;
  }

  // Pattern 2: title with location
  if (area && city) {
    candidate = `${title} | ${area}, ${city}`;
    if (candidate.length <= 60) return candidate;
  }

  // Pattern 3: developer-based
  if (developer && city) {
    candidate = `${title} by ${developer} | ${city}`;
    if (candidate.length <= 60) return candidate;
  }

  // Pattern 4: type-based
  if (configs && city) {
    candidate = `${configs} ${typeLabel} in ${city} | ${title}`;
    if (candidate.length <= 60) return truncate(candidate, 60);
  }

  // Fallback: truncated title with site name
  return truncate(`${title} | ${SITE_NAME}`, 60);
};

// ─── Description Generation ───────────────────────────────────

/**
 * Generate a compelling meta description.
 * Target length: 140–160 characters.
 * Includes CTA words for better CTR.
 */
const generateDescription = (property) => {
  const { title, developer, configuration, location, dimensionRange, status, possession, price, priceUnit, propertyType } = property;
  const area = location?.area || '';
  const city = location?.city || '';
  const configs = configuration?.length > 0 ? configuration.join(', ') : '';
  const typeLabel = getPropertyTypeLabel(property.type, propertyType);
  const statusLabel = getStatusLabel(status);
  const priceStr = formatPrice(price);

  const parts = [];

  // Opening line
  if (developer && area) {
    parts.push(`Explore ${title} by ${developer} in ${area}, ${city}.`);
  } else if (area) {
    parts.push(`Discover ${title} in ${area}, ${city}.`);
  } else {
    parts.push(`Explore ${title} — premium ${typeLabel.toLowerCase()} by ${developer || SITE_NAME}.`);
  }

  // Configuration + size
  if (configs) {
    let configStr = `${configs} ${typeLabel.toLowerCase()}`;
    if (dimensionRange?.min && dimensionRange?.max) {
      configStr += ` from ${dimensionRange.min}-${dimensionRange.max} ${dimensionRange.unit || 'sqft'}`;
    }
    parts.push(configStr + '.');
  }

  // Status and price
  const extras = [];
  if (statusLabel) extras.push(statusLabel);
  if (priceStr && priceUnit) extras.push(`Starting ${priceStr} ${priceUnit}`);
  else if (priceStr) extras.push(`Starting ${priceStr}`);
  if (extras.length) parts.push(extras.join('. ') + '.');

  let description = parts.join(' ');

  // Ensure within bounds
  if (description.length > 160) {
    description = truncate(description, 160);
  }

  // Pad if too short
  if (description.length < 140 && possession) {
    description = description.replace(/\.$/, '') + `. Possession: ${possession}.`;
  }

  return truncate(description, 160);
};

// ─── Keywords Generation ──────────────────────────────────────

/**
 * Generate relevant, non-spammy keywords.
 * Uses property data intelligently.
 * Max 8 keywords to avoid keyword stuffing.
 */
const generateKeywords = (property) => {
  const { title, configuration, location, developer, propertyType, type, status } = property;
  const area = location?.area || '';
  const city = location?.city || '';
  const typeLabel = getPropertyTypeLabel(type, propertyType).toLowerCase();

  const keywords = new Set();

  // Property name
  if (title) keywords.add(title.toLowerCase());

  // Location + type combinations
  if (area) keywords.add(`${typeLabel} in ${area.toLowerCase()}`);
  if (city) keywords.add(`${typeLabel} in ${city.toLowerCase()}`);

  // Developer + city
  if (developer && city) keywords.add(`${developer.toLowerCase()} ${city.toLowerCase()}`);

  // Transaction type + city
  if (city) {
    const action = type === 'rent' ? 'rent' : 'buy';
    keywords.add(`${action} ${typeLabel} ${city.toLowerCase()}`);
  }

  // Configuration keywords
  if (configuration?.length > 0) {
    // Add first and last config as geo-modified keywords
    const firstConfig = configuration[0];
    if (area) keywords.add(`${firstConfig} ${typeLabel.replace(/s$/, '')} in ${area.toLowerCase()}`);
  }

  // Status-based
  const statusLabel = getStatusLabel(status);
  if (statusLabel && city) {
    keywords.add(`${statusLabel.toLowerCase()} ${typeLabel} ${city.toLowerCase()}`);
  }

  // Geo modifier
  if (area && city) keywords.add(`${area.toLowerCase()}, ${city.toLowerCase()} real estate`);

  // Limit to 8 keywords
  return Array.from(keywords).slice(0, 8);
};

// ─── Canonical URL Generation ─────────────────────────────────

const generateCanonicalUrl = (property) => {
  const slug = property.slug || '';
  if (!slug) return '';
  return `${SITE_URL}/properties/${slug}`;
};

// ─── Schema Markup Generation ─────────────────────────────────

/**
 * Generate comprehensive JSON-LD schema.
 * Includes:
 *  - RealEstateListing (primary)
 *  - Residence (nested)
 *  - Offer (pricing)
 *  - BreadcrumbList
 */
const generateSchemaMarkup = (property) => {
  const { title, description, location, developer, price, configuration, dimensionRange, gallery, slug, amenities, specifications } = property;
  const area = location?.area || '';
  const city = location?.city || '';
  const state = location?.state || '';
  const priceStr = price ? Number(price) : null;

  // Main listing schema
  const listingSchema = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: title,
    description: description ? truncate(description, 300) : undefined,
    url: slug ? `${SITE_URL}/properties/${slug}` : undefined,
    datePosted: property.createdAt || new Date().toISOString(),
    image: gallery?.length > 0 ? gallery.slice(0, 5) : undefined,

    // Address
    address: {
      '@type': 'PostalAddress',
      streetAddress: location?.address || area,
      addressLocality: area,
      addressRegion: city,
      addressCountry: 'IN',
    },

    // Geo coordinates
    ...(location?.lat && location?.lng
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: location.lat,
            longitude: location.lng,
          },
        }
      : {}),

    // Offer / pricing
    ...(priceStr
      ? {
          offers: {
            '@type': 'Offer',
            price: priceStr,
            priceCurrency: 'INR',
            availability: 'https://schema.org/InStock',
          },
        }
      : {}),

    // Nested Residence
    about: {
      '@type': 'Residence',
      name: title,
      numberOfRooms: configuration?.length > 0 ? configuration[0]?.replace(/[^0-9]/g, '') : undefined,
      floorSize: dimensionRange?.min && dimensionRange?.max
        ? {
            '@type': 'QuantitativeValue',
            minValue: dimensionRange.min,
            maxValue: dimensionRange.max,
            unitCode: dimensionRange.unit === 'sqft' ? 'FTK' : 'MTK',
          }
        : undefined,
      amenityFeature: amenities?.slice(0, 10).map((a) => ({
        '@type': 'LocationFeatureSpecification',
        name: a.name,
      })),
    },

    // Developer
    ...(developer
      ? {
          seller: {
            '@type': 'Organization',
            name: developer,
          },
        }
      : {}),
  };

  // Breadcrumb schema
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Properties',
        item: `${SITE_URL}/properties`,
      },
      ...(city
        ? [
            {
              '@type': 'ListItem',
              position: 3,
              name: city,
              item: `${SITE_URL}/properties?city=${encodeURIComponent(city)}`,
            },
          ]
        : []),
      {
        '@type': 'ListItem',
        position: city ? 4 : 3,
        name: title,
      },
    ],
  };

  // Combine schemas as array
  const schemas = [listingSchema, breadcrumbSchema];

  // Clean undefined values
  const cleanObj = (obj) => JSON.parse(JSON.stringify(obj));

  return JSON.stringify(cleanObj(schemas), null, 2);
};

// ─── Main Generator Function ──────────────────────────────────

/**
 * Generate complete SEO data for a property.
 *
 * @param {Object} property — full property object
 * @returns {Object} — all SEO fields ready to save
 */
export const generateSeoData = (property) => {
  if (!property) return {};

  return {
    seoTitle: generateTitle(property),
    seoDescription: generateDescription(property),
    seoKeywords: generateKeywords(property),
    canonicalUrl: generateCanonicalUrl(property),
    ogTitle: generateTitle(property),
    ogDescription: generateDescription(property),
    ogImage: property.gallery?.[0] || '',
    twitterCard: 'summary_large_image',
    schemaMarkup: generateSchemaMarkup(property),
  };
};

/**
 * Generate SEO for a single field only (for partial updates).
 */
export const generateField = (property, field) => {
  const generators = {
    seoTitle: () => generateTitle(property),
    seoDescription: () => generateDescription(property),
    seoKeywords: () => generateKeywords(property),
    canonicalUrl: () => generateCanonicalUrl(property),
    schemaMarkup: () => generateSchemaMarkup(property),
    ogTitle: () => generateTitle(property),
    ogDescription: () => generateDescription(property),
    ogImage: () => property.gallery?.[0] || '',
  };
  return generators[field] ? generators[field]() : null;
};
