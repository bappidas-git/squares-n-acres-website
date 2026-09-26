/**
 * Canonical enums — the single source of truth for every dropdown, filter,
 * chip, label and validation rule in the product (00_MASTER_CONTEXT.md §6.17).
 *
 * Authored in CommonJS (decision D36b) so that one file serves three loaders:
 * webpack interops the named exports for `import { LISTING_TYPES } from
 * '../config/enums'`, Jest reads it directly, and the mock server, the seed
 * validator and the guidelines generator `require('../src/config/enums')`.
 *
 * Every enum is built by `makeEnum()` and exposes `values`, `options`,
 * `labelOf()`, `meta` and `entries`. Extra metadata (tone, icon, …) lives on
 * the entry and is read through `meta[value]`.
 *
 * Tone names are the vocabulary of `src/components/ui/tones.js`; the master
 * context's `muted` and `charcoal` are spelled `neutral` here (see
 * docs/DECISIONS.md).
 */

/**
 * Builds an enum from `[{ value, label, ...meta }]` entries.
 *
 * @param {Array<{value: string|number, label: string}>} entries
 * @returns {{
 *   entries: Array<object>,
 *   values: Array<string|number>,
 *   options: Array<{value: string|number, label: string}>,
 *   meta: Record<string, object>,
 *   labelOf: (value: string|number) => string,
 *   has: (value: string|number) => boolean,
 * }}
 */
function makeEnum(entries) {
  const values = entries.map((entry) => entry.value);
  const options = entries.map(({ value, label }) => ({ value, label }));
  const labels = new Map(entries.map((entry) => [entry.value, entry.label]));
  const meta = {};
  for (const { value, label: _label, ...rest } of entries) {
    meta[value] = rest;
  }

  return {
    entries,
    values,
    options,
    meta,
    labelOf: (value) => labels.get(value) ?? '',
    has: (value) => labels.has(value),
  };
}

/* ------------------------------------------------------------------ *
 * Property
 * ------------------------------------------------------------------ */

const LISTING_TYPES = makeEnum([
  { value: 'sale', label: 'Buy', verb: 'for Sale' },
  { value: 'rent', label: 'Rent', verb: 'for Rent' },
  { value: 'lease', label: 'Lease', verb: 'for Lease' },
]);

/** "for Sale" / "for Rent" / "for Lease"; `''` for an unknown listing type. */
LISTING_TYPES.verbOf = (value) => LISTING_TYPES.meta[value]?.verb ?? '';

/**
 * The three **kinds** a segment can be — the layout its listings get — which
 * are also the slugs of the three built-in segments. Segments themselves are
 * master data (the `segments` collection, QA-52): a listing holds a segment's
 * slug, and `config/segments.js` answers what kind it is.
 */
const SEGMENTS = makeEnum([
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'land', label: 'Plots & Land' },
]);

const CONSTRUCTION_STATUS = makeEnum([
  { value: 'pre-launch', label: 'Pre-Launch' },
  { value: 'under-construction', label: 'Under Construction' },
  { value: 'ready-to-move', label: 'Ready to Move' },
  { value: 'resale', label: 'Resale' },
]);

const AVAILABILITY = makeEnum([
  { value: 'available', label: 'Available', tone: 'success' },
  { value: 'sold', label: 'Sold', tone: 'neutral' },
  { value: 'rented', label: 'Rented', tone: 'neutral' },
  { value: 'reserved', label: 'Reserved', tone: 'warning' },
]);

const FURNISHING = makeEnum([
  { value: 'unfurnished', label: 'Unfurnished' },
  { value: 'semi-furnished', label: 'Semi-furnished' },
  { value: 'fully-furnished', label: 'Fully furnished' },
]);

const FACING = makeEnum([
  { value: 'north', label: 'North' },
  { value: 'south', label: 'South' },
  { value: 'east', label: 'East' },
  { value: 'west', label: 'West' },
  { value: 'north-east', label: 'North-East' },
  { value: 'north-west', label: 'North-West' },
  { value: 'south-east', label: 'South-East' },
  { value: 'south-west', label: 'South-West' },
]);

const OWNERSHIP = makeEnum([
  { value: 'freehold', label: 'Freehold' },
  { value: 'leasehold', label: 'Leasehold' },
  { value: 'co-operative-society', label: 'Co-operative Society' },
  { value: 'power-of-attorney', label: 'Power of Attorney' },
]);

const KITCHEN_TYPES = makeEnum([
  { value: 'modular', label: 'Modular' },
  { value: 'semi-modular', label: 'Semi-modular' },
  { value: 'regular', label: 'Regular' },
]);

const AREA_UNITS = makeEnum([
  { value: 'sqft', label: 'sq ft', sqftFactor: 1 },
  { value: 'sqm', label: 'sq m', sqftFactor: 10.7639 },
  { value: 'sqyd', label: 'sq yd', sqftFactor: 9 },
  { value: 'acre', label: 'acre', sqftFactor: 43560 },
  { value: 'cent', label: 'cent', sqftFactor: 435.6 },
  { value: 'guntha', label: 'guntha', sqftFactor: 1089 },
]);

/**
 * Converts an area to square feet. A missing unit is read as `sqft` (the model
 * default); an unknown unit returns `null` rather than a silently wrong number.
 *
 * @param {number} value
 * @param {string} [unit]
 * @returns {number|null}
 */
AREA_UNITS.toSqft = (value, unit) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const key = unit || 'sqft';
  const factor = AREA_UNITS.meta[key]?.sqftFactor;
  return factor === undefined ? null : value * factor;
};

const BEDROOM_OPTIONS = makeEnum([
  { value: 1, label: '1 BHK' },
  { value: 2, label: '2 BHK' },
  { value: 3, label: '3 BHK' },
  { value: 4, label: '4 BHK' },
  { value: 5, label: '5+ BHK' },
]);

/** Sale price filter buckets; the last bucket is open-ended (`max: null`). */
const PRICE_BUCKETS_SALE = [
  { min: 0, max: 2500000, label: 'Up to ₹25 L' },
  { min: 2500000, max: 5000000, label: '₹25 L – ₹50 L' },
  { min: 5000000, max: 7500000, label: '₹50 L – ₹75 L' },
  { min: 7500000, max: 10000000, label: '₹75 L – ₹1 Cr' },
  { min: 10000000, max: 15000000, label: '₹1 Cr – ₹1.5 Cr' },
  { min: 15000000, max: 25000000, label: '₹1.5 Cr – ₹2.5 Cr' },
  { min: 25000000, max: 50000000, label: '₹2.5 Cr – ₹5 Cr' },
  { min: 50000000, max: 100000000, label: '₹5 Cr – ₹10 Cr' },
  { min: 100000000, max: null, label: '₹10 Cr+' },
];

/** Monthly rent filter buckets; lease listings use them too (decision D90). */
const PRICE_BUCKETS_RENT = [
  { min: 0, max: 10000, label: 'Up to ₹10 K' },
  { min: 10000, max: 20000, label: '₹10 K – ₹20 K' },
  { min: 20000, max: 35000, label: '₹20 K – ₹35 K' },
  { min: 35000, max: 50000, label: '₹35 K – ₹50 K' },
  { min: 50000, max: 75000, label: '₹50 K – ₹75 K' },
  { min: 75000, max: 100000, label: '₹75 K – ₹1 L' },
  { min: 100000, max: 200000, label: '₹1 L – ₹2 L' },
  { min: 200000, max: 500000, label: '₹2 L – ₹5 L' },
  { min: 500000, max: null, label: '₹5 L+' },
];

const SORT_OPTIONS = makeEnum([
  { value: 'relevance', label: 'Relevance' },
  { value: 'newest', label: 'Newest first' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'area-desc', label: 'Area: Largest first' },
  { value: 'popular', label: 'Most viewed' },
]);

const SPEC_GROUPS = makeEnum([
  { value: 'structure', label: 'Structure' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'doors-windows', label: 'Doors & Windows' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'walls-painting', label: 'Walls & Painting' },
  { value: 'security', label: 'Security' },
  { value: 'lift-common-areas', label: 'Lift & Common Areas' },
  { value: 'other', label: 'Other' },
]);

const DOCUMENT_TYPES = makeEnum([
  { value: 'brochure', label: 'Brochure' },
  { value: 'approval', label: 'Approval / Certificate' },
  { value: 'legal', label: 'Legal' },
  { value: 'floor-plan', label: 'Floor Plan' },
  { value: 'price-list', label: 'Price List' },
  { value: 'other', label: 'Other' },
]);

const TIMELINE_STATUS = makeEnum([
  { value: 'completed', label: 'Completed', tone: 'success' },
  { value: 'in-progress', label: 'In Progress', tone: 'warning' },
  { value: 'upcoming', label: 'Upcoming', tone: 'neutral' },
]);

const PROJECT_APPROVALS = makeEnum([
  { value: 'bbmp', label: 'BBMP' },
  { value: 'bda', label: 'BDA' },
  { value: 'bmrda', label: 'BMRDA' },
  { value: 'biaapa', label: 'BIAAPA' },
  { value: 'rera', label: 'RERA' },
  { value: 'other', label: 'Other' },
]);

const NEARBY_CATEGORIES = makeEnum([
  { value: 'school', label: 'Schools', icon: 'mdi:school-outline' },
  { value: 'hospital', label: 'Hospitals', icon: 'mdi:hospital-box-outline' },
  { value: 'metro', label: 'Metro', icon: 'mdi:train-variant' },
  { value: 'railway', label: 'Railway', icon: 'mdi:train' },
  { value: 'airport', label: 'Airport', icon: 'mdi:airplane' },
  { value: 'mall', label: 'Malls & Shopping', icon: 'mdi:shopping-outline' },
  { value: 'it-park', label: 'IT Parks & Offices', icon: 'mdi:office-building-outline' },
  { value: 'restaurant', label: 'Restaurants', icon: 'mdi:silverware-fork-knife' },
  { value: 'park', label: 'Parks', icon: 'mdi:tree-outline' },
  { value: 'bank', label: 'Banks & ATMs', icon: 'mdi:bank-outline' },
  { value: 'other', label: 'Other', icon: 'mdi:map-marker-outline' },
]);

/** The 18 property-detail sections, in the order the page renders them. */
const SECTION_VISIBILITY_KEYS = [
  { key: 'overview', label: 'Overview' },
  { key: 'highlights', label: 'Highlights' },
  { key: 'specifications', label: 'Specifications' },
  { key: 'amenities', label: 'Amenities' },
  { key: 'unitConfigurations', label: 'Unit Configurations' },
  { key: 'floorPlans', label: 'Floor Plans' },
  { key: 'gallery', label: 'Gallery' },
  { key: 'video', label: 'Video' },
  { key: 'virtualTour', label: 'Virtual Tour' },
  { key: 'documents', label: 'Documents' },
  { key: 'construction', label: 'Construction Progress' },
  { key: 'builder', label: 'Builder' },
  { key: 'nearby', label: 'Nearby Places' },
  { key: 'location', label: 'Location' },
  { key: 'finance', label: 'Finance & EMI' },
  { key: 'faqs', label: 'FAQs' },
  { key: 'similar', label: 'Similar Properties' },
  { key: 'enquiry', label: 'Enquiry' },
];

/* ------------------------------------------------------------------ *
 * Master data
 * ------------------------------------------------------------------ */

const AMENITY_CATEGORIES = makeEnum([
  { value: 'basic', label: 'Basic', icon: 'mdi:flash-outline' },
  { value: 'lifestyle', label: 'Lifestyle', icon: 'mdi:sofa-outline' },
  { value: 'safety', label: 'Safety & Security', icon: 'mdi:shield-check-outline' },
  { value: 'sports', label: 'Sports', icon: 'mdi:basketball' },
  { value: 'kids', label: 'Kids', icon: 'mdi:teddy-bear' },
  { value: 'eco', label: 'Eco-friendly', icon: 'mdi:leaf' },
  { value: 'convenience', label: 'Convenience', icon: 'mdi:cart-outline' },
  { value: 'commercial', label: 'Commercial', icon: 'mdi:store-outline' },
]);

/** Badge colours are tone names, never hex (§6.4). */
const BADGE_TONES = makeEnum([
  { value: 'neutral', label: 'Neutral' },
  { value: 'primary', label: 'Primary' },
  { value: 'success', label: 'Success' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
  { value: 'info', label: 'Info' },
]);

const LOCALITY_ZONES = makeEnum([
  { value: 'north', label: 'North Bengaluru' },
  { value: 'south', label: 'South Bengaluru' },
  { value: 'east', label: 'East Bengaluru' },
  { value: 'west', label: 'West Bengaluru' },
  { value: 'central', label: 'Central Bengaluru' },
]);

const FAQ_CATEGORIES = makeEnum([
  { value: 'buying', label: 'Buying', tone: 'success' },
  { value: 'selling', label: 'Selling', tone: 'warning' },
  { value: 'renting', label: 'Renting', tone: 'primary' },
  { value: 'home-loan', label: 'Home Loans', tone: 'info' },
  { value: 'legal', label: 'Legal', tone: 'error' },
  { value: 'rera', label: 'RERA', tone: 'error' },
  { value: 'nri', label: 'NRI', tone: 'info' },
  { value: 'general', label: 'General', tone: 'neutral' },
]);

const PARTNER_CATEGORIES = makeEnum([
  { value: 'developer', label: 'Developer' },
  { value: 'bank', label: 'Bank' },
  { value: 'legal', label: 'Legal' },
  { value: 'interior', label: 'Interior' },
  { value: 'other', label: 'Other' },
]);

/* ------------------------------------------------------------------ *
 * Leads
 * ------------------------------------------------------------------ */

const LEAD_STATUS = makeEnum([
  { value: 'new', label: 'New', tone: 'info', icon: 'mdi:new-box' },
  { value: 'contacted', label: 'Contacted', tone: 'warning', icon: 'mdi:phone-check-outline' },
  { value: 'qualified', label: 'Qualified', tone: 'info', icon: 'mdi:check-decagram-outline' },
  {
    value: 'site-visit',
    label: 'Site Visit',
    tone: 'primary',
    icon: 'mdi:map-marker-check-outline',
  },
  { value: 'negotiation', label: 'Negotiation', tone: 'warning', icon: 'mdi:handshake-outline' },
  { value: 'converted', label: 'Converted', tone: 'success', icon: 'mdi:check-circle-outline' },
  { value: 'lost', label: 'Lost', tone: 'error', icon: 'mdi:close-circle-outline' },
]);

/** The funnel, in order; `lost` is terminal and sits outside it. */
const LEAD_PIPELINE = LEAD_STATUS.values.filter((value) => value !== 'lost');

const LEAD_PRIORITY = makeEnum([
  { value: 'low', label: 'Low', tone: 'neutral' },
  { value: 'medium', label: 'Medium', tone: 'info' },
  { value: 'high', label: 'High', tone: 'error' },
]);

const LEAD_SOURCES = makeEnum([
  { value: 'property-enquiry', label: 'Property Enquiry' },
  { value: 'brochure-download', label: 'Brochure Download' },
  { value: 'floor-plan-request', label: 'Floor Plan Request' },
  { value: 'document-request', label: 'Document Request' },
  { value: 'price-request', label: 'Price Request' },
  { value: 'site-visit-request', label: 'Site Visit Request' },
  { value: 'callback-request', label: 'Callback Request' },
  { value: 'post-requirement', label: 'Post Requirement' },
  { value: 'contact-page', label: 'Contact Page' },
  { value: 'home-loan', label: 'Home Loan' },
  { value: 'financial-assessment', label: 'Financial Assessment' },
  { value: 'bank-eligibility', label: 'Bank Eligibility' },
  { value: 'legal-assistance', label: 'Legal Assistance' },
  { value: 'interior-design', label: 'Interior Design' },
  { value: 'sell-let', label: 'Sell / Let' },
  { value: 'careers', label: 'Careers' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'flexible-workspace', label: 'Flexible Workspace' },
  { value: 'direct-lease-retail', label: 'Direct Lease & Retail' },
  { value: 'real-estate-awareness', label: 'Real Estate Awareness' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'article', label: 'Article' },
  { value: 'faq', label: 'FAQ' },
  { value: 'locality-page', label: 'Locality Page' },
  { value: 'developer-page', label: 'Developer Page' },
  { value: 'whatsapp-click', label: 'WhatsApp Click' },
  { value: 'call-click', label: 'Call Click' },
  { value: 'hero-search', label: 'Hero Search' },
  { value: 'other', label: 'Other' },
]);

/**
 * The 24 source values the boilerplate wrote, mapped onto `LEAD_SOURCES`
 * (decision D20). The seed converter rewrites stored leads through this map and
 * the mock accepts the old values so forms that have not been rewritten yet
 * keep working.
 */
const LEGACY_LEAD_SOURCE_MAP = {
  'property-detail-page': 'property-enquiry',
  property_enquiry: 'property-enquiry',
  'property-listing-page': 'property-enquiry',
  child_form: 'property-enquiry',
  'homepage-contact-form': 'contact-page',
  contact: 'contact-page',
  website: 'contact-page',
  home_loan: 'home-loan',
  legal_assistance: 'legal-assistance',
  interior_design: 'interior-design',
  sell_let: 'sell-let',
  flexible_workspace: 'flexible-workspace',
  direct_lease_retails: 'direct-lease-retail',
  real_estate_awareness: 'real-estate-awareness',
  newsletter_articles: 'newsletter',
  article_detail: 'article',
  faq_contact: 'faq',
  brochure_download: 'brochure-download',
  floorplan_download: 'floor-plan-request',
  floorplan_request: 'floor-plan-request',
  document_download: 'document-request',
  detailed_pricing: 'price-request',
  'bank-eligibility-check': 'bank-eligibility',
  'financial-assessment': 'financial-assessment',
};

/**
 * The label of any lead source, including the legacy values of D20 and anything
 * an older record still carries: the canonical label first, then the legacy
 * map, then a title-cased fallback — so a lead never renders as
 * `flexible_workspace`.
 *
 * @param {string} value
 * @returns {string}
 */
LEAD_SOURCES.labelOfAny = (value) => {
  if (!value) return '';
  const canonical = LEGACY_LEAD_SOURCE_MAP[value] ?? value;
  return (
    LEAD_SOURCES.labelOf(canonical) ||
    String(value)
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
};

const LEAD_ACTIVITY_TYPES = makeEnum([
  { value: 'created', label: 'Created' },
  { value: 'status-changed', label: 'Status changed' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'note-added', label: 'Note added' },
  { value: 'follow-up-set', label: 'Follow-up set' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'email-sent', label: 'E-mail sent' },
  { value: 'call-logged', label: 'Call logged' },
  { value: 'priority-changed', label: 'Priority changed' },
]);

const REQUIREMENT_TIMELINES = makeEnum([
  { value: 'immediate', label: 'Immediately' },
  { value: '1-3-months', label: '1–3 months' },
  { value: '3-6-months', label: '3–6 months' },
  { value: '6-12-months', label: '6–12 months' },
  { value: 'exploring', label: 'Just exploring' },
]);

/* ------------------------------------------------------------------ *
 * Content
 * ------------------------------------------------------------------ */

const ARTICLE_STATUS = makeEnum([
  { value: 'draft', label: 'Draft', tone: 'neutral' },
  { value: 'scheduled', label: 'Scheduled', tone: 'info' },
  { value: 'published', label: 'Published', tone: 'success' },
  { value: 'archived', label: 'Archived', tone: 'warning' },
]);

const PAGE_STATUS = makeEnum([
  { value: 'draft', label: 'Draft', tone: 'neutral' },
  { value: 'published', label: 'Published', tone: 'success' },
]);

const PAGE_TEMPLATES = makeEnum([
  { value: 'standard', label: 'Standard' },
  { value: 'service', label: 'Service' },
  { value: 'about', label: 'About' },
  { value: 'contact', label: 'Contact' },
  { value: 'careers', label: 'Careers' },
  { value: 'awareness', label: 'Awareness' },
  { value: 'legal', label: 'Legal' },
  { value: 'landing', label: 'Landing' },
  // A page the site generates from its own data — Buy, Localities, Articles —
  // listed so that it can be named and placed in the menus (QA-56). The API
  // keeps it for the pages that come with the site: none is created with it.
  { value: 'system', label: 'Built-in' },
]);

/**
 * What a header menu's panel is built from (QA-56).
 *
 * The header's menus were a list in code and a page could join only three of
 * them; they are the `headerMenus` collection now. A `custom` menu is made of
 * the pages placed in it and the links typed into it; the other three are the
 * mega menus the site generates from master data — the construction statuses,
 * the property types, the budget bands and the featured localities — which
 * come with the site and take pages and links on top.
 */
const HEADER_MENU_SOURCES = makeEnum([
  { value: 'custom', label: 'Pages and links' },
  { value: 'buy', label: 'Buy — generated from the listings' },
  { value: 'rent', label: 'Rent — generated from the property types' },
  { value: 'commercial', label: 'Commercial — generated from the property types' },
]);

const FOOTER_COLUMNS = makeEnum([
  { value: 'company', label: 'Company' },
  { value: 'services', label: 'Services' },
  { value: 'insights', label: 'Insights' },
]);

/**
 * CMS block types (§6.10). Each carries the icon the block picker shows and a
 * `defaultData()` factory returning a fresh, fully-keyed `data` object, so a
 * newly inserted block never renders `undefined`.
 */
const BLOCK_TYPES = makeEnum([
  {
    value: 'hero',
    label: 'Hero',
    icon: 'mdi:image-area',
    defaultData: () => ({ title: '', subtitle: '', imageUrl: '', ctaLabel: '', ctaHref: '' }),
  },
  {
    value: 'richText',
    label: 'Rich text',
    icon: 'mdi:format-text',
    defaultData: () => ({ html: '' }),
  },
  {
    value: 'features',
    label: 'Features',
    icon: 'mdi:star-outline',
    defaultData: () => ({ title: '', subtitle: '', items: [] }),
  },
  {
    value: 'steps',
    label: 'Steps',
    icon: 'mdi:format-list-numbered',
    defaultData: () => ({ title: '', subtitle: '', items: [] }),
  },
  {
    value: 'stats',
    label: 'Stats',
    icon: 'mdi:chart-box-outline',
    defaultData: () => ({ items: [] }),
  },
  {
    value: 'faq',
    label: 'FAQ',
    icon: 'mdi:frequently-asked-questions',
    defaultData: () => ({ title: '', faqIds: [], items: [] }),
  },
  {
    value: 'cta',
    label: 'Call to action',
    icon: 'mdi:bullhorn-outline',
    defaultData: () => ({ title: '', text: '', buttonLabel: '', buttonHref: '', leadSource: null }),
  },
  {
    value: 'leadForm',
    label: 'Lead form',
    icon: 'mdi:form-select',
    defaultData: () => ({
      title: '',
      subtitle: '',
      fields: [],
      leadSource: 'contact-page',
      successMessage: '',
    }),
  },
  {
    value: 'team',
    label: 'Team',
    icon: 'mdi:account-group-outline',
    defaultData: () => ({ title: '', memberIds: [] }),
  },
  {
    value: 'testimonials',
    label: 'Testimonials',
    icon: 'mdi:comment-quote-outline',
    defaultData: () => ({ title: '', ids: [] }),
  },
  {
    value: 'properties',
    label: 'Properties',
    icon: 'mdi:home-city-outline',
    defaultData: () => ({ title: '', mode: 'featured', ids: [], filter: {} }),
  },
  {
    value: 'articles',
    label: 'Articles',
    icon: 'mdi:newspaper-variant-outline',
    defaultData: () => ({ title: '', mode: 'latest', ids: [], categoryId: null }),
  },
  {
    value: 'checklist',
    label: 'Checklist',
    icon: 'mdi:format-list-checks',
    defaultData: () => ({ title: '', intro: '', items: [] }),
  },
  {
    value: 'quiz',
    label: 'Quiz',
    icon: 'mdi:comment-question-outline',
    defaultData: () => ({ title: '', intro: '', questions: [] }),
  },
  {
    value: 'map',
    label: 'Map',
    icon: 'mdi:map-outline',
    defaultData: () => ({ embedUrl: '', latitude: null, longitude: null }),
  },
  {
    value: 'contactInfo',
    label: 'Contact details',
    icon: 'mdi:card-account-phone-outline',
    defaultData: () => ({}),
  },
  {
    value: 'image',
    label: 'Image',
    icon: 'mdi:image-outline',
    defaultData: () => ({ url: '', alt: '', caption: '' }),
  },
  {
    value: 'banks',
    label: 'Banks & EMI',
    icon: 'mdi:bank-outline',
    defaultData: () => ({ title: '', showEmiCalculator: true }),
  },
  {
    value: 'partners',
    label: 'Partners',
    icon: 'mdi:handshake-outline',
    defaultData: () => ({ title: '', category: null }),
  },
  { value: 'html', label: 'Custom HTML', icon: 'mdi:code-tags', defaultData: () => ({ html: '' }) },
  {
    value: 'jobs',
    label: 'Job openings',
    icon: 'mdi:briefcase-outline',
    defaultData: () => ({ title: '' }),
  },
  {
    value: 'facts',
    label: 'Did you know',
    icon: 'mdi:lightbulb-on-outline',
    defaultData: () => ({ title: '', items: [] }),
  },
  {
    value: 'expandableCards',
    label: 'Expandable cards',
    icon: 'mdi:card-text-outline',
    defaultData: () => ({ title: '', items: [] }),
  },
  {
    value: 'packages',
    label: 'Packages',
    icon: 'mdi:package-variant-closed',
    defaultData: () => ({ title: '', items: [] }),
  },
  {
    value: 'gallery',
    label: 'Gallery',
    icon: 'mdi:image-multiple-outline',
    defaultData: () => ({ title: '', items: [] }),
  },
]);

/** A fresh `data` object for a block type; `{}` for an unknown type. */
BLOCK_TYPES.defaultDataOf = (value) => BLOCK_TYPES.meta[value]?.defaultData?.() ?? {};

/* ------------------------------------------------------------------ *
 * Careers, media, users, newsletter
 * ------------------------------------------------------------------ */

const EMPLOYMENT_TYPES = makeEnum([
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
]);

const JOB_APPLICATION_STATUS = makeEnum([
  { value: 'new', label: 'New', tone: 'info' },
  { value: 'shortlisted', label: 'Shortlisted', tone: 'primary' },
  { value: 'interview', label: 'Interview', tone: 'warning' },
  { value: 'rejected', label: 'Rejected', tone: 'error' },
  { value: 'hired', label: 'Hired', tone: 'success' },
]);

const MEDIA_TYPES = makeEnum([
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'document', label: 'Document' },
]);

const MEDIA_PROVIDERS = makeEnum([
  { value: 'cloudinary', label: 'Cloudinary' },
  { value: 'external', label: 'External URL' },
]);

const NEWSLETTER_STATUS = makeEnum([
  { value: 'subscribed', label: 'Subscribed', tone: 'success' },
  { value: 'unsubscribed', label: 'Unsubscribed', tone: 'neutral' },
]);

const ROLES = makeEnum([
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'sales', label: 'Sales' },
]);

const HERO_SEARCH_TABS = makeEnum([
  { value: 'sale', label: 'Buy' },
  { value: 'rent', label: 'Rent' },
  { value: 'lease', label: 'Lease' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'plots', label: 'Plots' },
]);

/** Bulk-action verbs accepted by `POST /admin/<resource>/bulk` (§5.8). */
const BULK_ACTIONS = makeEnum([
  { value: 'activate', label: 'Activate' },
  { value: 'deactivate', label: 'Deactivate' },
  { value: 'delete', label: 'Delete' },
  { value: 'feature', label: 'Feature' },
  { value: 'unfeature', label: 'Remove from featured' },
  { value: 'verify', label: 'Mark verified' },
  { value: 'unverify', label: 'Remove verification' },
  { value: 'publish', label: 'Publish' },
  { value: 'unpublish', label: 'Unpublish' },
  { value: 'assign', label: 'Assign' },
  { value: 'status', label: 'Change status' },
  { value: 'priority', label: 'Change priority' },
  // Media: `payload.folder`, a folder name or `null` (prompt 51).
  { value: 'move', label: 'Move to folder' },
]);

/* ------------------------------------------------------------------ *
 * SEO
 * ------------------------------------------------------------------ */

const SEO_SCHEMA_TYPES = makeEnum([
  { value: 'auto', label: 'Automatic' },
  { value: 'RealEstateListing', label: 'RealEstateListing' },
  { value: 'Article', label: 'Article' },
  { value: 'BlogPosting', label: 'BlogPosting' },
  { value: 'NewsArticle', label: 'NewsArticle' },
  { value: 'FAQPage', label: 'FAQPage' },
  { value: 'WebPage', label: 'WebPage' },
  { value: 'Place', label: 'Place' },
  { value: 'Organization', label: 'Organization' },
  { value: 'LocalBusiness', label: 'LocalBusiness' },
  { value: 'Product', label: 'Product' },
  { value: 'Event', label: 'Event' },
]);

const SEO_SCORE_BANDS = makeEnum([
  { value: 'good', label: 'Good', tone: 'success', min: 81, max: 100 },
  { value: 'ok', label: 'Needs work', tone: 'warning', min: 51, max: 80 },
  { value: 'poor', label: 'Poor', tone: 'error', min: 0, max: 50 },
  { value: 'none', label: 'Not analysed', tone: 'neutral', min: null, max: null },
]);

/**
 * The band of a score: `none` when the entity has not been analysed,
 * `poor` ≤ 50, `ok` 51–80, `good` ≥ 81.
 *
 * @param {number|null|undefined} score
 * @returns {'good'|'ok'|'poor'|'none'}
 */
SEO_SCORE_BANDS.bandOf = (score) => {
  if (typeof score !== 'number' || !Number.isFinite(score)) return 'none';
  if (score <= 50) return 'poor';
  if (score <= 80) return 'ok';
  return 'good';
};

/** Per-entity and per-type sitemap change frequency (sitemaps.org values). */
const SITEMAP_CHANGEFREQ = makeEnum([
  { value: 'always', label: 'Always' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'never', label: 'Never' },
]);

/** The outcome of one SEO analyser test (`seo.analysis[].status`). */
const SEO_TEST_STATUS = makeEnum([
  { value: 'pass', label: 'Pass', tone: 'success' },
  { value: 'warn', label: 'Warning', tone: 'warning' },
  { value: 'fail', label: 'Fail', tone: 'error' },
  { value: 'skip', label: 'Not applicable', tone: 'neutral' },
]);

const SEO_ENTITY_TYPES = makeEnum([
  { value: 'property', label: 'Properties' },
  { value: 'article', label: 'Articles' },
  { value: 'page', label: 'Pages' },
  { value: 'locality', label: 'Localities' },
  { value: 'developer', label: 'Developers' },
  { value: 'articleCategory', label: 'Article categories' },
  { value: 'author', label: 'Authors' },
  { value: 'propertyType', label: 'Property types' },
]);

const REDIRECT_CODES = makeEnum([
  { value: 301, label: '301 — Permanent' },
  { value: 302, label: '302 — Temporary' },
]);

module.exports = {
  makeEnum,
  // Property
  LISTING_TYPES,
  SEGMENTS,
  CONSTRUCTION_STATUS,
  AVAILABILITY,
  FURNISHING,
  FACING,
  OWNERSHIP,
  KITCHEN_TYPES,
  AREA_UNITS,
  BEDROOM_OPTIONS,
  PRICE_BUCKETS_SALE,
  PRICE_BUCKETS_RENT,
  SORT_OPTIONS,
  SPEC_GROUPS,
  DOCUMENT_TYPES,
  TIMELINE_STATUS,
  PROJECT_APPROVALS,
  NEARBY_CATEGORIES,
  SECTION_VISIBILITY_KEYS,
  // Master data
  AMENITY_CATEGORIES,
  BADGE_TONES,
  LOCALITY_ZONES,
  FAQ_CATEGORIES,
  PARTNER_CATEGORIES,
  // Leads
  LEAD_STATUS,
  LEAD_PIPELINE,
  LEAD_PRIORITY,
  LEAD_SOURCES,
  LEGACY_LEAD_SOURCE_MAP,
  LEAD_ACTIVITY_TYPES,
  REQUIREMENT_TIMELINES,
  // Content
  ARTICLE_STATUS,
  PAGE_STATUS,
  PAGE_TEMPLATES,
  HEADER_MENU_SOURCES,
  FOOTER_COLUMNS,
  BLOCK_TYPES,
  // Careers, media, users, newsletter
  EMPLOYMENT_TYPES,
  JOB_APPLICATION_STATUS,
  MEDIA_TYPES,
  MEDIA_PROVIDERS,
  NEWSLETTER_STATUS,
  ROLES,
  HERO_SEARCH_TABS,
  BULK_ACTIONS,
  // SEO
  SEO_SCHEMA_TYPES,
  SEO_SCORE_BANDS,
  SEO_ENTITY_TYPES,
  SITEMAP_CHANGEFREQ,
  SEO_TEST_STATUS,
  REDIRECT_CODES,
};
