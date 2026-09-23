/**
 * A blank property, at the values the form's controls read as empty
 * (00_MASTER_CONTEXT.md §6.1).
 *
 * This is the **form** shape, which is the write shape plus two conveniences:
 * a nullable string the user types into is `''` rather than `null` (an input
 * cannot hold `null` without going uncontrolled), and every row of every
 * repeating list carries an id, so React has a stable key and
 * `LIST_UPDATE`/`LIST_REMOVE` have something to address. Rows the server has
 * never seen carry a temporary `tmp-<n>`; `toPayload` strips those and the API
 * assigns the real ones (§5.5).
 */

import { SECTION_VISIBILITY_KEYS } from '../../../../config/enums';

/** The client-side counter behind `tmp-<n>`. */
let sequence = 0;

/** The next temporary row id. */
export const tmpId = () => {
  sequence += 1;
  return `tmp-${sequence}`;
};

/** True for an id this browser invented, which the API must never receive. */
export const isTmpId = (id) => typeof id === 'string' && id.startsWith('tmp-');

/** Restarts the counter so a test can assert on `tmp-1`. */
export const resetTmpIds = () => {
  sequence = 0;
};

/**
 * Moves the counter past every `tmp-<n>` id a value already holds.
 *
 * A draft restored from another session carries ids that session invented; the
 * counter of this one starts again at 1, so the next row added would share an
 * id with a restored one — one key for two rows, and an update or a removal
 * addressed to one of them reaching both.
 *
 * @param {unknown} value anything the form holds (the draft's values)
 */
export function reserveTmpIds(value) {
  const visit = (node) => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!node || typeof node !== 'object') return;
    const match = /^tmp-(\d+)$/.exec(typeof node.id === 'string' ? node.id : '');
    if (match) sequence = Math.max(sequence, Number(match[1]));
    Object.values(node).forEach(visit);
  };
  visit(value);
}

/* ------------------------------------------------------------------ *
 * Row factories — one per repeating list of §6.1
 * ------------------------------------------------------------------ */

export const makeImage = (patch = {}) => ({
  id: tmpId(),
  url: '',
  alt: '',
  caption: '',
  order: 0,
  isCover: false,
  ...patch,
});

export const makeUnitConfiguration = (patch = {}) => ({
  id: tmpId(),
  name: '',
  bedrooms: null,
  bathrooms: null,
  superBuiltUpArea: null,
  carpetArea: null,
  areaUnit: 'sqft',
  price: null,
  priceOnRequest: false,
  floorPlanImageUrl: '',
  floorPlanPdfUrl: '',
  availableUnits: null,
  isActive: true,
  ...patch,
});

export const makeFloorPlan = (patch = {}) => ({
  id: tmpId(),
  title: '',
  imageUrl: '',
  pdfUrl: '',
  area: null,
  areaUnit: 'sqft',
  bedrooms: null,
  price: null,
  order: 0,
  ...patch,
});

export const makeDocument = (patch = {}) => ({
  id: tmpId(),
  title: '',
  url: '',
  type: 'other',
  leadGated: true,
  order: 0,
  ...patch,
});

export const makeNearbyPlace = (patch = {}) => ({
  id: tmpId(),
  name: '',
  category: 'other',
  distanceKm: null,
  travelTimeMin: null,
  order: 0,
  ...patch,
});

export const makeSpecification = (group = 'other', patch = {}) => ({
  id: tmpId(),
  group,
  label: '',
  value: '',
  icon: '',
  ...patch,
});

export const makeConstructionSpec = (group = 'other', patch = {}) => ({
  id: tmpId(),
  group,
  label: '',
  value: '',
  ...patch,
});

export const makeTimelineItem = (patch = {}) => ({
  id: tmpId(),
  milestone: '',
  date: '',
  status: 'upcoming',
  imageUrl: '',
  note: '',
  order: 0,
  ...patch,
});

export const makeFaq = (patch = {}) => ({
  id: tmpId(),
  question: '',
  answer: '',
  order: 0,
  ...patch,
});

export const makeOtherCharge = (patch = {}) => ({
  id: tmpId(),
  label: '',
  amount: null,
  note: '',
  ...patch,
});

/* ------------------------------------------------------------------ *
 * Sub-objects
 * ------------------------------------------------------------------ */

/** All eighteen section toggles, on (§6.1). */
export const createSectionVisibility = () =>
  Object.fromEntries(SECTION_VISIBILITY_KEYS.map(({ key }) => [key, true]));

/** The §9.6 `seo` branch at its defaults — identical on every entity. */
export const createSeo = () => ({
  focusKeyword: '',
  secondaryKeywords: [],
  title: '',
  description: '',
  slug: '',
  canonicalUrl: '',
  robots: {
    index: true,
    follow: true,
    noarchive: false,
    nosnippet: false,
    noimageindex: false,
    maxSnippet: null,
    maxImagePreview: 'large',
    maxVideoPreview: null,
  },
  og: { title: '', description: '', imageUrl: '' },
  twitter: { card: 'summary_large_image', title: '', description: '', imageUrl: '' },
  breadcrumbTitle: '',
  schema: { type: 'auto', custom: '', disabledAutoTypes: [] },
  sitemap: { include: true, priority: null, changefreq: '' },
  redirect: { enabled: false, toPath: '', statusCode: 301 },
  score: null,
  scoreBand: 'none',
  testsPassed: 0,
  testsTotal: 0,
  analysis: { basic: [], additional: [], titleReadability: [], contentReadability: [] },
  lastAnalyzedAt: null,
});

/* ------------------------------------------------------------------ *
 * The record
 * ------------------------------------------------------------------ */

/**
 * A new property, every key of §6.1 present.
 *
 * `plotDimensionUnit` is `null` rather than a length unit: the contract types
 * it as an `AREA_UNITS` value, which holds no `ft` (decision logged in
 * `docs/DECISIONS.md`).
 *
 * @returns {object} the form values
 */
export default function createInitialState() {
  return {
    title: '',
    slug: '',
    projectName: '',
    listingType: 'sale',
    segment: 'residential',
    propertyTypeId: null,
    constructionStatus: 'ready-to-move',
    availability: 'available',
    possessionDate: '',
    ageOfPropertyYears: null,
    furnishing: '',
    facing: '',
    floorNumber: null,
    totalFloors: null,
    ownership: '',
    reraNumber: '',
    reraRegistered: false,
    description: '',
    shortDescription: '',
    highlights: [],
    amenityIds: [],
    badgeIds: [],
    specifications: [],
    constructionSpecs: [],
    unitConfigurations: [],
    floorPlans: [],
    images: [],
    videoUrl: '',
    virtualTourUrl: '',
    brochureUrl: '',
    brochureLeadGated: true,
    documents: [],
    location: {
      address: '',
      localityId: null,
      cityId: null,
      pincode: '',
      landmark: '',
      latitude: null,
      longitude: null,
      mapEmbedUrl: '',
      showExactLocation: false,
    },
    nearbyPlaces: [],
    pricing: {
      price: null,
      priceOnRequest: false,
      priceRangeMin: null,
      priceRangeMax: null,
      pricePerSqft: null,
      priceNegotiable: false,
      rentPerMonth: null,
      securityDeposit: null,
      maintenanceChargesMonthly: null,
      bookingAmount: null,
      otherCharges: [],
      currency: 'INR',
    },
    area: {
      superBuiltUpArea: null,
      builtUpArea: null,
      carpetArea: null,
      plotArea: null,
      areaUnit: 'sqft',
      plotLength: null,
      plotWidth: null,
      plotDimensionUnit: null,
    },
    configuration: {
      bedrooms: null,
      bathrooms: null,
      balconies: null,
      parkingCovered: null,
      parkingOpen: null,
      servantRoom: false,
      studyRoom: false,
      poojaRoom: false,
      kitchenType: '',
    },
    project: {
      developerId: null,
      totalUnits: null,
      totalTowers: null,
      totalFloors: null,
      projectAreaAcres: null,
      openAreaPercent: null,
      launchDate: '',
      approvals: [],
      landmarkProject: false,
    },
    constructionTimeline: [],
    constructionProgressPercent: null,
    faqs: [],
    similarPropertyIds: [],
    sectionVisibility: createSectionVisibility(),
    agent: {
      teamMemberId: null,
      name: '',
      phone: '',
      whatsapp: '',
      email: '',
      photoUrl: '',
      showOnListing: false,
    },
    seo: createSeo(),
    isActive: false,
    isFeatured: false,
    isVerified: false,
    priorityOrder: 0,
  };
}
