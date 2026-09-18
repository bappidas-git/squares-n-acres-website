/**
 * Lead write schemas (00_MASTER_CONTEXT.md §6.7).
 *
 * `create` is the public `POST /leads` body — every lead form on the site
 * sends exactly this shape. `status`, `priority`, `activities`, `notes`,
 * `ipAddress` and `userAgent` are server-managed and therefore absent (§10);
 * `patch` is the admin CRM edit.
 */

const {
  AREA_UNITS,
  LEAD_PRIORITY,
  LEAD_SOURCES,
  LEAD_STATUS,
  LEGACY_LEAD_SOURCE_MAP,
  LISTING_TYPES,
  REQUIREMENT_TIMELINES,
} = require('../../config/enums');
const { PATH_SLUG_PATTERN, PATH_SLUG_MAX_LENGTH } = require('./page');

/** What the visitor is looking for; attached to most lead forms. */
const requirement = {
  type: 'object',
  nullable: true,
  shape: {
    listingType: { type: 'enum', enum: LISTING_TYPES.values, nullable: true, default: null },
    propertyTypeId: { type: 'int', nullable: true, default: null },
    localityId: { type: 'int', nullable: true, default: null },
    bedrooms: { type: 'int', nullable: true, min: 0, max: 20, default: null },
    budgetMin: { type: 'number', nullable: true, min: 0, default: null },
    budgetMax: { type: 'number', nullable: true, min: 0, default: null },
    areaUnit: { type: 'enum', enum: AREA_UNITS.values, nullable: true, default: null },
    timeline: {
      type: 'enum',
      enum: REQUIREMENT_TIMELINES.values,
      nullable: true,
      default: null,
    },
  },
  default: null,
};

const utm = {
  type: 'object',
  nullable: true,
  shape: {
    source: { type: 'string', nullable: true, maxLength: 120, default: null },
    medium: { type: 'string', nullable: true, maxLength: 120, default: null },
    campaign: { type: 'string', nullable: true, maxLength: 120, default: null },
    term: { type: 'string', nullable: true, maxLength: 120, default: null },
    content: { type: 'string', nullable: true, maxLength: 120, default: null },
  },
  default: null,
};

const create = {
  name: { type: 'string', required: true, min: 2, maxLength: 80 },
  phone: { type: 'phone', required: true },
  email: { type: 'email', nullable: true, default: null },
  message: { type: 'string', nullable: true, maxLength: 2000, default: null },
  source: {
    type: 'enum',
    required: true,
    enum: LEAD_SOURCES.values,
    accepts: Object.keys(LEGACY_LEAD_SOURCE_MAP),
    default: 'contact-page',
  },
  propertyId: { type: 'int', nullable: true, default: null },
  articleId: { type: 'int', nullable: true, default: null },
  // A page's slug is a URL **path** (§6.10): the four seeded pages under
  // `buyer-assistance/` and `insights/` all carry one, and every lead-capture
  // block hands `page.slug` through verbatim. Typing this as a single-segment
  // slug meant a lead sent from any of them was refused with 422 (MB-02), so
  // it carries the page's own pattern.
  pageSlug: {
    type: 'string',
    nullable: true,
    maxLength: PATH_SLUG_MAX_LENGTH,
    pattern: PATH_SLUG_PATTERN,
    default: null,
  },
  pageUrl: { type: 'url', nullable: true, default: null },
  requirement,
  consent: { type: 'bool', default: false },
  utm,
  // Source-specific payload (decision D56): the financial-assessment answers
  // and score, the selected bank, the workspace size…
  meta: { type: 'object', nullable: true, default: null },
  // Honeypot (§5.11): a non-empty value returns 200 and stores nothing.
  website: { type: 'string', nullable: true, maxLength: 200, default: null },
};

const patch = {
  status: { type: 'enum', enum: LEAD_STATUS.values },
  priority: { type: 'enum', enum: LEAD_PRIORITY.values },
  assignedTo: { type: 'int', nullable: true },
  followUpAt: { type: 'datetime', nullable: true },
  lostReason: { type: 'string', nullable: true, maxLength: 300 },
  requirement,
};

const note = {
  text: { type: 'string', required: true, min: 1, maxLength: 2000 },
};

module.exports = { create, patch, note };
