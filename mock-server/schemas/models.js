/**
 * Collection descriptors — one per `db.json` collection, listing **every**
 * field of 00_MASTER_CONTEXT.md §6 with its type, nullability and default.
 *
 * Shared by three consumers:
 *   - `mock-server/middleware/validate.js` (422 responses, §5.3)
 *   - `scripts/validate-seed.js` (the seed must satisfy the same rules)
 *   - `scripts/generate-backend-guidelines.js` (rendered as Laravel rules)
 *
 * The writable part of each collection is imported from
 * `src/services/schemas/*` so the storage contract and the request contract
 * cannot drift; this file adds the read-only embeds and the server-managed
 * fields on top. The field mini-language is documented in ./README.md.
 */

const propertySchema = require('../../src/services/schemas/property');
const leadSchema = require('../../src/services/schemas/lead');
const articleSchema = require('../../src/services/schemas/article');
const pageSchema = require('../../src/services/schemas/page');
const masterData = require('../../src/services/schemas/masterData');
const settingsSchema = require('../../src/services/schemas/settings');
const jobApplicationSchema = require('../../src/services/schemas/jobApplication');
const {
  JOB_APPLICATION_STATUS,
  LEAD_ACTIVITY_TYPES,
  LEAD_PRIORITY,
  LEAD_SOURCES,
  LEAD_STATUS,
  NEWSLETTER_STATUS,
  ROLES,
} = require('../../src/config/enums');

/* ------------------------------------------------------------------ *
 * Building blocks
 * ------------------------------------------------------------------ */

const id = { id: { type: 'int', required: true, serverManaged: true } };

const timestamps = {
  createdAt: { type: 'datetime', required: true, serverManaged: true },
  updatedAt: { type: 'datetime', required: true, serverManaged: true },
};

/** A denormalised display object the API embeds on reads (§5.5). */
const embed = (shape, { array = false, nullable = true } = {}) =>
  array
    ? { type: 'array', read: true, items: { type: 'object', shape }, default: [] }
    : { type: 'object', read: true, nullable, default: null, shape };

const str = (maxLength = 200) => ({ type: 'string', maxLength });

const refShape = {
  id: { type: 'int', required: true },
  name: str(200),
  slug: { type: 'slug', maxLength: 75 },
};

/** Adds read-only keys to an object descriptor's shape. */
const withShape = (descriptor, extra) => ({
  ...descriptor,
  shape: { ...descriptor.shape, ...extra },
});

/** Computed counter the API derives on read and never stores. */
const computedCount = (note) => ({
  type: 'int',
  read: true,
  min: 0,
  default: 0,
  note,
});

// The honeypot field of a public form is validated but never stored (§5.11).
const { website: _leadHoneypot, ...leadWritable } = leadSchema.create;
const { website: _applicationHoneypot, ...applicationWritable } = jobApplicationSchema.create;

/* ------------------------------------------------------------------ *
 * properties
 * ------------------------------------------------------------------ */

const properties = {
  collection: 'properties',
  slugField: 'slug',
  searchable: ['title', 'projectName', 'shortDescription', 'locality.name', 'developer.name'],
  sortable: [
    'relevance',
    'newest',
    'price-asc',
    'price-desc',
    'area-desc',
    'popular',
    'updatedAt',
    'price',
    'viewCount',
    'priorityOrder',
    'title',
    'seoScore',
  ],
  defaultSort: { field: 'relevance', order: 'desc' },
  publicScope: { isActive: true },
  // `agent.phone` / `agent.whatsapp` / `agent.email` are stripped as well
  // unless `agent.showOnListing` is true (§5.10).
  publicOmit: ['createdBy', 'updatedBy'],
  fields: {
    ...id,
    ...propertySchema.create,
    location: withShape(propertySchema.create.location, {
      locality: embed(refShape),
      city: embed(refShape),
    }),
    project: withShape(propertySchema.create.project, {
      developer: embed({ ...refShape, logoUrl: { type: 'url', nullable: true } }),
    }),
    propertyType: embed({ ...refShape, segment: str(40) }),
    amenities: embed({ ...refShape, icon: str(80), category: str(40) }, { array: true }),
    badges: embed({ ...refShape, color: str(40), icon: str(80) }, { array: true }),
    viewCount: { type: 'int', min: 0, default: 0, serverManaged: true },
    enquiryCount: { type: 'int', min: 0, default: 0, serverManaged: true },
    publishedAt: { type: 'datetime', nullable: true, default: null, serverManaged: true },
    createdBy: { type: 'int', nullable: true, default: null, serverManaged: true },
    updatedBy: { type: 'int', nullable: true, default: null, serverManaged: true },
    ...timestamps,
  },
};

/* ------------------------------------------------------------------ *
 * Master data
 * ------------------------------------------------------------------ */

const localities = {
  collection: 'localities',
  slugField: 'slug',
  searchable: ['name', 'shortDescription'],
  sortable: ['order', 'name', 'propertyCount'],
  defaultSort: { field: 'order', order: 'asc' },
  publicScope: { isActive: true },
  publicOmit: [],
  fields: {
    ...id,
    ...masterData.locality.create,
    city: embed(refShape),
    propertyCount: computedCount('Active properties in this locality'),
    ...timestamps,
  },
};

const cities = {
  collection: 'cities',
  slugField: 'slug',
  searchable: ['name', 'state'],
  sortable: ['name'],
  defaultSort: { field: 'name', order: 'asc' },
  publicScope: { isActive: true },
  publicOmit: [],
  fields: { ...id, ...masterData.city.create, ...timestamps },
};

const propertyTypes = {
  collection: 'propertyTypes',
  slugField: 'slug',
  searchable: ['name'],
  sortable: ['order', 'name'],
  defaultSort: { field: 'order', order: 'asc' },
  publicScope: { isActive: true },
  publicOmit: [],
  fields: {
    ...id,
    ...masterData.propertyType.create,
    propertyCount: computedCount('Active properties of this type'),
    ...timestamps,
  },
};

const amenities = {
  collection: 'amenities',
  slugField: 'slug',
  searchable: ['name'],
  sortable: ['order', 'name', 'category'],
  defaultSort: { field: 'order', order: 'asc' },
  publicScope: { isActive: true },
  publicOmit: [],
  fields: { ...id, ...masterData.amenity.create, ...timestamps },
};

const badges = {
  collection: 'badges',
  slugField: 'slug',
  searchable: ['name'],
  sortable: ['order', 'name'],
  defaultSort: { field: 'order', order: 'asc' },
  publicScope: { isActive: true },
  publicOmit: [],
  fields: { ...id, ...masterData.badge.create, ...timestamps },
};

const developers = {
  collection: 'developers',
  slugField: 'slug',
  searchable: ['name', 'shortDescription', 'headquarters'],
  sortable: ['order', 'name', 'propertyCount'],
  defaultSort: { field: 'order', order: 'asc' },
  publicScope: { isActive: true },
  publicOmit: [],
  fields: {
    ...id,
    ...masterData.developer.create,
    propertyCount: computedCount('Active properties by this developer'),
    ...timestamps,
  },
};

const banks = {
  collection: 'banks',
  slugField: 'slug',
  searchable: ['name'],
  sortable: ['order', 'name', 'interestRateMin'],
  defaultSort: { field: 'order', order: 'asc' },
  publicScope: { isActive: true },
  publicOmit: [],
  fields: { ...id, ...masterData.bank.create, ...timestamps },
};

/* ------------------------------------------------------------------ *
 * leads
 * ------------------------------------------------------------------ */

const leads = {
  collection: 'leads',
  slugField: null,
  publicRead: false,
  searchable: ['name', 'phone', 'email', 'message'],
  sortable: ['createdAt', 'updatedAt', 'followUpAt', 'status', 'priority'],
  defaultSort: { field: 'createdAt', order: 'desc' },
  publicScope: null,
  publicOmit: [],
  fields: {
    ...id,
    ...leadWritable,
    property: embed({ id: { type: 'int', required: true }, title: str(200), slug: { type: 'slug' } }),
    status: { type: 'enum', enum: LEAD_STATUS.values, required: true, default: 'new' },
    priority: { type: 'enum', enum: LEAD_PRIORITY.values, required: true, default: 'medium' },
    assignedTo: { type: 'int', nullable: true, default: null },
    assignedUser: embed({ id: { type: 'int', required: true }, name: str(80) }),
    followUpAt: { type: 'datetime', nullable: true, default: null },
    lostReason: { type: 'string', nullable: true, maxLength: 300, default: null },
    notes: {
      type: 'array',
      default: [],
      items: {
        type: 'object',
        shape: {
          id: { type: 'int', required: true },
          text: { type: 'string', required: true, maxLength: 2000 },
          createdBy: { type: 'int', nullable: true, default: null },
          createdByName: { type: 'string', maxLength: 80, default: '' },
          createdAt: { type: 'datetime', required: true },
        },
      },
    },
    activities: {
      type: 'array',
      default: [],
      serverManaged: true,
      items: {
        type: 'object',
        shape: {
          id: { type: 'int', required: true },
          type: { type: 'enum', enum: LEAD_ACTIVITY_TYPES.values, required: true },
          description: { type: 'string', required: true, maxLength: 300 },
          createdBy: { type: 'int', nullable: true, default: null },
          createdAt: { type: 'datetime', required: true },
        },
      },
    },
    source: {
      type: 'enum',
      enum: LEAD_SOURCES.values,
      required: true,
      default: 'contact-page',
    },
    ipAddress: { type: 'string', nullable: true, maxLength: 45, default: null, serverManaged: true },
    userAgent: { type: 'string', nullable: true, maxLength: 500, default: null, serverManaged: true },
    ...timestamps,
  },
};

/* ------------------------------------------------------------------ *
 * Articles
 * ------------------------------------------------------------------ */

const articles = {
  collection: 'articles',
  slugField: 'slug',
  searchable: ['title', 'excerpt', 'contentText'],
  sortable: ['newest', 'popular', 'publishedAt', 'updatedAt', 'title', 'viewCount', 'seoScore'],
  defaultSort: { field: 'publishedAt', order: 'desc' },
  publicScope: { status: 'published' },
  publicOmit: [],
  fields: {
    ...id,
    ...articleSchema.create,
    category: embed(refShape),
    tags: embed(refShape, { array: true }),
    author: embed({
      ...refShape,
      avatarUrl: { type: 'url', nullable: true },
      designation: str(120),
    }),
    contentText: { type: 'string', read: true, default: '' },
    readingTimeMinutes: { type: 'int', read: true, min: 0, default: 0 },
    wordCount: { type: 'int', read: true, min: 0, default: 0 },
    viewCount: { type: 'int', min: 0, default: 0, serverManaged: true },
    ...timestamps,
  },
};

const articleCategories = {
  collection: 'articleCategories',
  slugField: 'slug',
  searchable: ['name'],
  sortable: ['order', 'name', 'articleCount'],
  defaultSort: { field: 'order', order: 'asc' },
  publicScope: { isActive: true },
  publicOmit: [],
  fields: {
    ...id,
    ...masterData.articleCategory.create,
    articleCount: computedCount('Published articles in this category'),
    ...timestamps,
  },
};

const articleTags = {
  collection: 'articleTags',
  slugField: 'slug',
  searchable: ['name'],
  sortable: ['name', 'articleCount'],
  defaultSort: { field: 'name', order: 'asc' },
  publicScope: null,
  publicOmit: [],
  fields: {
    ...id,
    ...masterData.articleTag.create,
    articleCount: computedCount('Published articles carrying this tag'),
    ...timestamps,
  },
};

const authors = {
  collection: 'authors',
  slugField: 'slug',
  searchable: ['name', 'designation'],
  sortable: ['name'],
  defaultSort: { field: 'name', order: 'asc' },
  publicScope: { isActive: true },
  publicOmit: ['email'],
  fields: {
    ...id,
    ...masterData.author.create,
    articleCount: computedCount('Published articles by this author'),
    ...timestamps,
  },
};

/* ------------------------------------------------------------------ *
 * Content
 * ------------------------------------------------------------------ */

const faqs = {
  collection: 'faqs',
  slugField: null,
  searchable: ['question', 'answer'],
  sortable: ['order', 'question', 'category'],
  defaultSort: { field: 'order', order: 'asc' },
  publicScope: { isActive: true },
  publicOmit: [],
  fields: { ...id, ...masterData.faq.create, ...timestamps },
};

const testimonials = {
  collection: 'testimonials',
  slugField: null,
  searchable: ['name', 'message', 'location'],
  sortable: ['order', 'createdAt', 'rating'],
  defaultSort: { field: 'order', order: 'asc' },
  publicScope: { isActive: true },
  publicOmit: [],
  fields: { ...id, ...masterData.testimonial.create, ...timestamps },
};

const teamMembers = {
  collection: 'teamMembers',
  slugField: 'slug',
  searchable: ['name', 'designation'],
  sortable: ['order', 'name'],
  defaultSort: { field: 'order', order: 'asc' },
  publicScope: { isActive: true },
  publicOmit: [],
  fields: { ...id, ...masterData.teamMember.create, ...timestamps },
};

const partners = {
  collection: 'partners',
  slugField: null,
  searchable: ['name'],
  sortable: ['order', 'name'],
  defaultSort: { field: 'order', order: 'asc' },
  publicScope: { isActive: true },
  publicOmit: [],
  fields: { ...id, ...masterData.partner.create, ...timestamps },
};

const pages = {
  collection: 'pages',
  slugField: 'slug',
  searchable: ['title', 'slug'],
  sortable: ['order', 'title', 'updatedAt'],
  defaultSort: { field: 'order', order: 'asc' },
  publicScope: { status: 'published' },
  publicOmit: [],
  fields: { ...id, ...pageSchema.create, ...timestamps },
};

/* ------------------------------------------------------------------ *
 * Careers
 * ------------------------------------------------------------------ */

const jobOpenings = {
  collection: 'jobOpenings',
  slugField: 'slug',
  searchable: ['title', 'department', 'location'],
  sortable: ['postedAt', 'title', 'department'],
  defaultSort: { field: 'postedAt', order: 'desc' },
  publicScope: { isActive: true },
  publicOmit: [],
  fields: {
    ...id,
    ...masterData.job.create,
    applicationCount: computedCount('Applications received for this opening'),
    ...timestamps,
  },
};

const jobApplications = {
  collection: 'jobApplications',
  slugField: null,
  publicRead: false,
  searchable: ['name', 'email', 'phone'],
  sortable: ['createdAt', 'status'],
  defaultSort: { field: 'createdAt', order: 'desc' },
  publicScope: null,
  publicOmit: [],
  fields: {
    ...id,
    jobId: { type: 'int', required: true },
    job: embed({ id: { type: 'int', required: true }, title: str(150), slug: { type: 'slug' } }),
    ...applicationWritable,
    status: {
      type: 'enum',
      enum: JOB_APPLICATION_STATUS.values,
      required: true,
      default: 'new',
    },
    notes: { type: 'string', nullable: true, maxLength: 2000, default: null },
    ...timestamps,
  },
};

/* ------------------------------------------------------------------ *
 * Media, settings, SEO, users
 * ------------------------------------------------------------------ */

const media = {
  collection: 'media',
  slugField: null,
  publicRead: false,
  searchable: ['alt', 'title', 'folder', 'publicId'],
  sortable: ['createdAt', 'bytes', 'alt'],
  defaultSort: { field: 'createdAt', order: 'desc' },
  publicScope: null,
  publicOmit: [],
  fields: {
    ...id,
    ...masterData.media.create,
    usedIn: embed(
      { type: str(40), id: { type: 'int', required: true }, title: str(200) },
      { array: true }
    ),
    createdBy: { type: 'int', nullable: true, default: null, serverManaged: true },
    ...timestamps,
  },
};

const siteSettings = {
  collection: 'siteSettings',
  singleton: true,
  slugField: null,
  searchable: [],
  sortable: [],
  defaultSort: null,
  publicScope: null,
  // `leads` is the only admin-only branch of the model (§5.10).
  publicOmit: ['leads'],
  fields: {
    ...settingsSchema.siteSettings.update,
    updatedAt: timestamps.updatedAt,
  },
};

const seoSettings = {
  collection: 'seoSettings',
  singleton: true,
  slugField: null,
  searchable: [],
  sortable: [],
  defaultSort: null,
  publicScope: null,
  publicOmit: [],
  fields: {
    ...settingsSchema.seoSettings.update,
    updatedAt: timestamps.updatedAt,
  },
};

const redirects = {
  collection: 'redirects',
  slugField: null,
  searchable: ['fromPath', 'toPath', 'note'],
  sortable: ['fromPath', 'hits', 'createdAt'],
  defaultSort: { field: 'fromPath', order: 'asc' },
  publicScope: { isActive: true },
  publicOmit: ['note', 'hits'],
  fields: {
    ...id,
    ...masterData.redirect.create,
    hits: { type: 'int', min: 0, default: 0, serverManaged: true },
    ...timestamps,
  },
};

const newsletterSubscribers = {
  collection: 'newsletterSubscribers',
  slugField: null,
  publicRead: false,
  searchable: ['email', 'name'],
  sortable: ['createdAt', 'email', 'status'],
  defaultSort: { field: 'createdAt', order: 'desc' },
  publicScope: null,
  publicOmit: [],
  fields: {
    ...id,
    email: { type: 'email', required: true, unique: true },
    name: { type: 'string', nullable: true, maxLength: 80, default: null },
    source: { type: 'enum', enum: LEAD_SOURCES.values, required: true, default: 'newsletter' },
    status: {
      type: 'enum',
      enum: NEWSLETTER_STATUS.values,
      required: true,
      default: 'subscribed',
    },
    ...timestamps,
  },
};

const adminUsers = {
  collection: 'adminUsers',
  slugField: null,
  publicRead: false,
  searchable: ['name', 'email'],
  sortable: ['name', 'createdAt', 'lastLoginAt', 'role'],
  defaultSort: { field: 'name', order: 'asc' },
  publicScope: null,
  publicOmit: [],
  fields: {
    ...id,
    ...masterData.user.create,
    // Plaintext in the mock seed only; Laravel stores a hash (§6.14).
    password: { type: 'string', required: true, min: 8, maxLength: 100, secret: true },
    role: { type: 'enum', enum: ROLES.values, required: true, default: 'sales' },
    lastLoginAt: { type: 'datetime', nullable: true, default: null, serverManaged: true },
    ...timestamps,
  },
};

const apiTokens = {
  collection: 'apiTokens',
  slugField: null,
  publicRead: false,
  searchable: [],
  sortable: ['createdAt'],
  defaultSort: { field: 'createdAt', order: 'desc' },
  publicScope: null,
  publicOmit: [],
  // Mock-only: Laravel Sanctum owns tokens on the real API.
  fields: {
    ...id,
    userId: { type: 'int', required: true },
    token: { type: 'string', required: true, min: 48, maxLength: 48, secret: true },
    expiresAt: { type: 'datetime', required: true },
    createdAt: timestamps.createdAt,
  },
};

const propertyViews = {
  collection: 'propertyViews',
  slugField: null,
  publicRead: false,
  searchable: [],
  sortable: ['viewedAt'],
  defaultSort: { field: 'viewedAt', order: 'desc' },
  publicScope: null,
  publicOmit: [],
  fields: {
    ...id,
    propertyId: { type: 'int', required: true },
    viewedAt: { type: 'datetime', required: true, serverManaged: true },
    referrer: { type: 'string', nullable: true, maxLength: 500, default: null },
  },
};

const MODELS = {
  properties,
  localities,
  cities,
  propertyTypes,
  amenities,
  badges,
  developers,
  banks,
  leads,
  articles,
  articleCategories,
  articleTags,
  authors,
  faqs,
  testimonials,
  teamMembers,
  partners,
  pages,
  jobOpenings,
  jobApplications,
  media,
  siteSettings,
  seoSettings,
  redirects,
  newsletterSubscribers,
  adminUsers,
  apiTokens,
  propertyViews,
};

/** A collection descriptor by name, or `null` when the name is unknown. */
const getModel = (name) => MODELS[name] ?? null;

module.exports = { MODELS, getModel };
