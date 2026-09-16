/**
 * TEMPORARY — the bridge between the contract record of §6.1 and the field
 * names the un-rewritten property screens still read.
 *
 * `PropertyDetails`, `PropertyListing`, `PropertyForm`, the admin property
 * table and the thirteen detail sections were written against the boilerplate's
 * shape (`gallery`, `location.area`, `type`, `status`, `priceUnit`,
 * `configuration` as strings…). Prompts 18–26 rewrite them against the real
 * shape and delete this file; until then every one of those screens fetches
 * through `toLegacyProperty()` so the pages render real data instead of empty
 * states.
 *
 * Nothing writes through this adapter: saving a property is disabled until
 * prompts 18–21 build the real form payload.
 *
 * Registered in `docs/PROJECT_STATE.md` → "Pending rewrites" (owners 18–26).
 */

import { CONSTRUCTION_STATUS, NEARBY_CATEGORIES, SPEC_GROUPS } from '../../config/enums';

/** `nearbyPlaces[].category` (§6.17) back to the old `type` buckets. */
const NEARBY_TYPE = {
  school: 'education',
  college: 'education',
  hospital: 'healthcare',
  clinic: 'healthcare',
  mall: 'shopping',
  supermarket: 'shopping',
  market: 'shopping',
  metro: 'transport',
  'bus-stop': 'transport',
  'railway-station': 'transport',
  airport: 'transport',
  'it-park': 'workplace',
  'business-park': 'workplace',
  bank: 'landmark',
  atm: 'landmark',
  park: 'landmark',
  temple: 'landmark',
  restaurant: 'entertainment',
  cinema: 'entertainment',
  gym: 'entertainment',
  hotel: 'entertainment',
};

/** `constructionSpecs[].group` (§6.17) back to the old grouped object keys. */
const SPEC_GROUP_KEY = {
  structure: 'structure',
  flooring: 'flooring',
  'doors-windows': 'doors',
  'kitchen-utility': 'others',
  bathroom: 'plumbing',
  'painting-finishes': 'others',
  electrical: 'electrical',
  'lift-common-areas': 'others',
  security: 'others',
  other: 'others',
};

/** The old timeline vocabulary; `upcoming` was called `pending`. */
const TIMELINE_STATUS = {
  upcoming: 'pending',
  'in-progress': 'in-progress',
  completed: 'completed',
};

const list = (value) => (Array.isArray(value) ? value : []);

const coverFirst = (images) => {
  const rows = list(images);
  const cover = rows.find((image) => image?.isCover);
  return cover ? [cover, ...rows.filter((image) => image !== cover)] : rows;
};

/** The old `configuration` was an array of strings such as `["2 BHK", "3 BHK"]`. */
function legacyConfiguration(property) {
  const units = list(property.unitConfigurations)
    .filter((unit) => unit?.isActive !== false)
    .map((unit) => unit?.name)
    .filter(Boolean);
  if (units.length > 0) return [...new Set(units)];

  const bedrooms = property.configuration?.bedrooms;
  return bedrooms ? [`${bedrooms} BHK`] : [];
}

/** The old price pair: rent listings carried the unit in a separate field. */
function legacyPrice(property) {
  const pricing = property.pricing ?? {};
  const isRental = property.listingType === 'rent' || property.listingType === 'lease';
  if (isRental) return { price: pricing.rentPerMonth ?? null, priceUnit: 'per month' };
  return { price: pricing.price ?? pricing.priceRangeMin ?? null, priceUnit: 'onwards' };
}

/** `{ min, max, unit }` over the areas the record actually carries. */
function legacyDimensionRange(property) {
  const area = property.area ?? {};
  const unitAreas = list(property.unitConfigurations)
    .map((unit) => unit?.superBuiltUpArea ?? unit?.carpetArea)
    .filter((value) => Number.isFinite(value));

  const base = area.superBuiltUpArea ?? area.carpetArea ?? area.plotArea ?? null;
  const values = [...unitAreas, ...(base === null ? [] : [base])];
  if (values.length === 0) return null;

  return {
    min: Math.min(...values),
    max: Math.max(...values),
    unit: area.areaUnit === 'sqft' ? 'sqft' : (area.areaUnit ?? 'sqft'),
  };
}

/** The old "possession" line: a ready property said so, others gave a month. */
function legacyPossession(property) {
  if (property.constructionStatus === 'ready-to-move') return 'Ready to Move';
  if (!property.possessionDate) return '';
  const date = new Date(property.possessionDate);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** `specifications[]` of §6.1 in the `{ key, value, icon }` shape the UI reads. */
const legacySpecifications = (property) =>
  list(property.specifications)
    .filter((spec) => spec?.label)
    .map((spec) => ({
      key: spec.label,
      value: String(spec.value ?? ''),
      icon: spec.icon || '',
      group: SPEC_GROUPS.labelOf?.(spec.group) || spec.group || '',
    }));

/** `constructionSpecs[]` regrouped into the old `{ flooring: [...] }` object. */
function legacyConstructionSpecs(property) {
  const grouped = {};
  for (const spec of list(property.constructionSpecs)) {
    const key = SPEC_GROUP_KEY[spec?.group] ?? 'others';
    (grouped[key] ??= []).push({
      area: spec?.label ?? '',
      spec: spec?.value ?? '',
    });
  }
  return grouped;
}

/** `{ config, area, price, image, bedrooms, bathrooms }` per floor plan. */
function legacyFloorPlans(property) {
  const units = list(property.unitConfigurations);
  const plans = list(property.floorPlans);
  const source = plans.length > 0 ? plans : units;

  return source.map((row, index) => {
    const unit = plans.length > 0 ? (units[index] ?? units[0] ?? {}) : row;
    return {
      config: row?.name ?? unit?.name ?? '',
      area: unit?.superBuiltUpArea ?? unit?.carpetArea ?? '',
      price: unit?.price ?? null,
      image: row?.imageUrl ?? row?.url ?? '',
      bedrooms: unit?.bedrooms ?? '',
      bathrooms: unit?.bathrooms ?? '',
    };
  });
}

/** `{ name, type, distance: '3 km' }` — the old shape rendered a string. */
const legacyNearbyPlaces = (property) =>
  list(property.nearbyPlaces).map((place) => ({
    name: place?.name ?? '',
    type: NEARBY_TYPE[place?.category] ?? 'landmark',
    category: place?.category ?? '',
    distance: Number.isFinite(place?.distanceKm)
      ? `${place.distanceKm} km`
      : NEARBY_CATEGORIES.labelOf?.(place?.category) || '',
  }));

/** `{ name, url, icon }`. */
const legacyDocuments = (property) =>
  list(property.documents).map((doc) => ({
    name: doc?.title ?? 'Document',
    url: doc?.url ?? '',
    type: doc?.type ?? 'other',
    leadGated: doc?.leadGated !== false,
    icon: '',
  }));

/** `{ label, status, icon }`. */
const legacyTimeline = (property) =>
  list(property.constructionTimeline).map((step) => ({
    label: step?.milestone ?? '',
    status: TIMELINE_STATUS[step?.status] ?? 'pending',
    icon: '',
  }));

/** The old flat SEO fields the details page still reads for its Helmet tags. */
function legacySeo(property) {
  const seo = property.seo ?? {};
  const keywords = [seo.focusKeyword, ...list(seo.secondaryKeywords)].filter(Boolean);
  return {
    seoTitle: seo.title ?? '',
    seoDescription: seo.description ?? '',
    seoKeywords: keywords,
    canonicalUrl: seo.canonicalUrl ?? '',
    ogTitle: seo.og?.title ?? '',
    ogDescription: seo.og?.description ?? '',
    ogImage: seo.og?.imageUrl ?? '',
    twitterCard: seo.twitter?.card ?? 'summary_large_image',
    schemaMarkup: seo.schema?.custom ?? '',
  };
}

/** `sectionVisibility` of §6.1 under the old `sections` keys. */
function legacySections(property) {
  const visibility = property.sectionVisibility ?? {};
  return {
    ...visibility,
    details: visibility.specifications !== false,
    constructionSpecs: visibility.specifications !== false,
    developer: visibility.builder !== false,
    location: visibility.nearby !== false || visibility.location !== false,
    floorPlans: visibility.floorPlans !== false || visibility.unitConfigurations !== false,
  };
}

/**
 * One contract property in the shape the legacy screens read.
 *
 * Every new field is kept alongside the old ones, so a section that has
 * already been rewritten can read `images`/`pricing` while its neighbour still
 * reads `gallery`/`price`.
 *
 * @param {object|null} property a record from `/properties*`
 * @returns {object|null}
 */
export function toLegacyProperty(property) {
  if (!property || typeof property !== 'object') return null;

  const { price, priceUnit } = legacyPrice(property);
  const location = property.location ?? {};
  const developer = property.project?.developer ?? null;

  return {
    ...property,

    gallery: coverFirst(property.images)
      .map((image) => image?.url)
      .filter(Boolean),
    type: property.listingType ?? '',
    status: property.constructionStatus ?? '',
    statusLabel: CONSTRUCTION_STATUS.labelOf?.(property.constructionStatus) || '',
    propertyType: property.propertyType?.slug ?? '',
    propertyTypeId: property.propertyTypeId ?? property.propertyType?.id ?? null,
    propertyTypeName: property.propertyType?.name ?? '',
    category: property.segment ?? '',
    publishStatus: property.isActive ? 'published' : 'draft',

    price,
    priceUnit,
    configuration: legacyConfiguration(property),
    dimensionRange: legacyDimensionRange(property),
    possession: legacyPossession(property),

    location: {
      ...location,
      area: location.locality?.name ?? '',
      city: location.city?.name ?? '',
      state: location.city?.state ?? '',
      lat: location.latitude ?? null,
      lng: location.longitude ?? null,
      address: location.address ?? '',
    },

    developer: developer?.name ?? '',
    developerInfo: developer
      ? {
          name: developer.name ?? '',
          description: developer.description ?? '',
          logo: developer.logoUrl ?? '',
          stats: [],
        }
      : null,

    amenities: list(property.amenities),
    specialities: [],
    specifications: legacySpecifications(property),
    constructionSpecs: legacyConstructionSpecs(property),
    floorPlans: legacyFloorPlans(property),
    nearbyPlaces: legacyNearbyPlaces(property),
    documents: legacyDocuments(property),
    constructionTimeline: legacyTimeline(property),
    faqs: list(property.faqs),
    highlights: list(property.highlights),
    similarPropertyIds: list(property.similarPropertyIds),

    sections: legacySections(property),
    ...legacySeo(property),

    tags: [
      ...(property.isFeatured ? ['featured'] : []),
      ...list(property.badges)
        .map((badge) => badge?.slug)
        .filter(Boolean),
    ],

    isActive: property.isActive !== false,
    createdAt: property.createdAt ?? null,
    updatedAt: property.updatedAt ?? null,
  };
}

/** `toLegacyProperty` over a list, dropping anything unusable. */
export const toLegacyProperties = (properties) =>
  list(properties).map(toLegacyProperty).filter(Boolean);

export default toLegacyProperty;
