#!/usr/bin/env node
/**
 * validate-seed.js — checks that `db.json` is a database the API could have
 * produced (00_MASTER_CONTEXT.md §6).
 *
 * The seed is hand-written and cross-referenced, so it can drift from the
 * contract in ways nothing else notices until a page renders `undefined`. This
 * script is the gate:
 *
 *   1. every record validates against its descriptor in
 *      `mock-server/schemas/models.js` — types, `required`, enums, bounds, and
 *      every non-computed field actually present;
 *   2. ids are unique integers per collection and timestamps are ISO-8601;
 *   3. slugs and e-mail addresses are unique where the model says `unique`;
 *   4. every foreign key resolves — `localityId`, `amenityIds[]`,
 *      `similarPropertyIds[]`, `faq.faqIds` inside a page block, and the rest;
 *   5. the structural rules the schema cannot express: exactly one `isCover`
 *      per non-empty `images[]`, all 18 `sectionVisibility` keys, the §9.6
 *      `seo` shape, a `media` record for every image, document and video URL
 *      the seed mentions anywhere;
 *   6. the §10 "seed quality" rules — what an active listing must carry, how
 *      a rent listing differs from a sale, which badges a status allows,
 *      how long a published article has to be, and the collection counts;
 *   7. no boilerplate traces (the pattern list of `check-traces`).
 *
 * Usage:
 *   node scripts/validate-seed.js            # exit 1 on any error
 *   node scripts/validate-seed.js --stats    # counts only, always exit 0
 */

const fs = require('fs');
const path = require('path');

const { TRACE_PATTERNS, ALLOW_LIST } = require('./check-traces');
const { wordCount } = require('../mock-server/lib/html');
const { MODELS } = require('../mock-server/schemas/models');
const { BUILT_IN_SEGMENT_SLUGS, segmentKind } = require('../src/config/segments');
const { SECTION_VISIBILITY_KEYS } = require('../src/config/enums');

const ROOT = path.resolve(__dirname, '..');
const SEED_PATH = path.join(ROOT, 'db.json');
const STATS_ONLY = process.argv.slice(2).includes('--stats');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const INDIAN_MOBILE_RE = /^(\+91)?[6-9]\d{9}$/;
const SLUG_RE = /^[a-z0-9-]+$/;
/** A CMS page's slug is a URL path: `buyer-assistance/home-loan` (§6.10). */
const PATH_SLUG_RE = /^[a-z0-9-]+(\/[a-z0-9-]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * Slug fields that hold a URL **path** rather than a single segment. Only the
 * CMS pages do: §6.10 seeds `buyer-assistance/home-loan`, and the public route
 * serves the page at exactly that path.
 */
const PATH_SLUG_FIELDS = { pages: new Set(['slug', 'seo.slug']) };

/**
 * Every asset host the seed is allowed to reference. The media library must
 * hold one record per distinct URL, and nothing else (§6.12).
 */
const ASSET_URL_PATTERNS = [
  /https:\/\/picsum\.photos\/seed\/[a-z0-9-]+\/\d+\/\d+/g,
  /https:\/\/res\.cloudinary\.com\/[^"\\]+/g,
  /https:\/\/www\.w3\.org\/[^"\\]+\.pdf/g,
  /https:\/\/www\.youtube\.com\/watch\?v=[\w-]+/g,
];

/**
 * The image fields whose URLs must have a `media` record. Each entry is a
 * collection name and the dotted paths to read, with `[]` marking a list.
 */
const IMAGE_PATHS = {
  properties: [
    'images[].url',
    'floorPlans[].imageUrl',
    'unitConfigurations[].floorPlanImageUrl',
    'constructionTimeline[].imageUrl',
    'agent.photoUrl',
    'seo.og.imageUrl',
    'seo.twitter.imageUrl',
    'videoUrl',
    'brochureUrl',
    'documents[].url',
    'floorPlans[].pdfUrl',
    'unitConfigurations[].floorPlanPdfUrl',
  ],
  localities: ['heroImageUrl', 'seo.og.imageUrl'],
  developers: ['logoUrl', 'coverImageUrl', 'seo.og.imageUrl'],
  banks: ['logoUrl'],
  articles: ['featuredImage.url', 'seo.og.imageUrl'],
  authors: ['avatarUrl', 'seo.og.imageUrl'],
  teamMembers: ['photoUrl'],
  partners: ['logoUrl'],
  testimonials: ['avatarUrl'],
  pages: [
    'heroImageUrl',
    'blocks[].data.imageUrl',
    'blocks[].data.url',
    'blocks[].data.items[].url',
    'seo.og.imageUrl',
  ],
  propertyTypes: ['seo.og.imageUrl'],
  articleCategories: ['seo.og.imageUrl'],
  siteSettings: [
    'general.logoUrl',
    'general.iconUrl',
    'hero.backgroundImageUrl',
    'hero.mobileImageUrl',
    'footer.galleryImageUrls[]',
  ],
  seoSettings: ['defaults.ogImageUrl', 'knowledgeGraph.logoUrl'],
};

/**
 * Every asset URL the seed mentions **anywhere**, including inside the HTML of
 * an article or a page block.
 *
 * `collectImageUrls` reads the structured fields and can therefore say which
 * record a missing image belongs to; this reads the serialised database the
 * way `mock-server/lib/usage.js` does, so the "is this media record used?"
 * question gets the same answer here as it does in the admin panel.
 *
 * @param {object} db
 * @returns {Set<string>}
 */
function embeddedAssetUrls(db) {
  const serialised = JSON.stringify(db.media ? { ...db, media: [] } : db);
  const found = new Set();

  for (const pattern of ASSET_URL_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of serialised.matchAll(pattern)) found.add(match[0]);
  }

  return found;
}

/**
 * Uniqueness §6 states but the shared write schemas cannot carry: `adminUsers`
 * reuses `masterData.user`, which is also the shape of a `PUT` that keeps the
 * record's own e-mail address.
 */
const EXTRA_UNIQUE = { adminUsers: ['email'] };

/** Foreign keys the seed cross-references by hand, and what they point at. */
const REFERENCES = {
  properties: [
    ['propertyTypeId', 'propertyTypes'],
    ['location.localityId', 'localities'],
    ['location.cityId', 'cities'],
    ['project.developerId', 'developers'],
    ['amenityIds[]', 'amenities'],
    ['badgeIds[]', 'badges'],
    ['similarPropertyIds[]', 'properties'],
    ['agent.teamMemberId', 'teamMembers'],
    ['createdBy', 'adminUsers'],
    ['updatedBy', 'adminUsers'],
  ],
  localities: [['cityId', 'cities']],
  leads: [
    ['propertyId', 'properties'],
    ['articleId', 'articles'],
    ['assignedTo', 'adminUsers'],
    ['requirement.propertyTypeId', 'propertyTypes'],
    ['requirement.localityId', 'localities'],
  ],
  articles: [
    ['categoryId', 'articleCategories'],
    ['authorId', 'authors'],
    ['tagIds[]', 'articleTags'],
    ['relatedArticleIds[]', 'articles'],
    ['relatedPropertyIds[]', 'properties'],
  ],
  faqs: [['propertyTypeId', 'propertyTypes']],
  testimonials: [['propertyId', 'properties']],
  jobApplications: [['jobId', 'jobOpenings']],
  media: [['createdBy', 'adminUsers']],
  pages: [
    ['blocks[].data.faqIds[]', 'faqs'],
    ['blocks[].data.memberIds[]', 'teamMembers'],
  ],
};

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Reads a dotted path, expanding `[]` into every element of an array.
 *
 * @param {*} source
 * @param {string} dotted e.g. `blocks[].data.items[].url`
 * @returns {Array<*>} every value found; missing branches contribute nothing
 */
function readPath(source, dotted) {
  let current = [source];

  for (const segment of dotted.split('.')) {
    const isList = segment.endsWith('[]');
    const key = isList ? segment.slice(0, -2) : segment;

    const next = [];
    for (const value of current) {
      if (value === null || value === undefined) continue;
      const child = value[key];
      if (child === null || child === undefined) continue;
      if (isList) {
        if (Array.isArray(child)) next.push(...child);
      } else {
        next.push(child);
      }
    }
    current = next;
  }

  return current;
}

/** Every image URL the seed uses, with the record it came from. */
function collectImageUrls(db) {
  const found = [];

  for (const [collection, paths] of Object.entries(IMAGE_PATHS)) {
    const value = db[collection];
    if (value === undefined) continue;
    const records = Array.isArray(value) ? value : [value];

    records.forEach((record, index) => {
      for (const dotted of paths) {
        for (const url of readPath(record, dotted)) {
          if (typeof url === 'string' && url.startsWith('http')) {
            found.push({ url, collection, id: record.id ?? index + 1, path: dotted });
          }
        }
      }
    });
  }

  return found;
}

/* ------------------------------------------------------------------ *
 * Field validation
 * ------------------------------------------------------------------ */

function typeMessage(key, value, descriptor, allowPathSlug = false) {
  switch (descriptor.type) {
    case 'string':
    case 'html':
      return typeof value === 'string' ? null : `${key}: expected a string`;
    case 'int':
      return Number.isInteger(value) ? null : `${key}: expected an integer`;
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
        ? null
        : `${key}: expected a number`;
    case 'bool':
      return typeof value === 'boolean' ? null : `${key}: expected true or false`;
    case 'enum':
      return [...(descriptor.enum ?? []), ...(descriptor.accepts ?? [])].includes(value)
        ? null
        : `${key}: "${value}" is not one of ${(descriptor.enum ?? []).join(', ')}`;
    case 'date':
      return typeof value === 'string' && DATE_RE.test(value)
        ? null
        : `${key}: expected a yyyy-mm-dd date`;
    case 'datetime':
      return typeof value === 'string' && ISO_RE.test(value)
        ? null
        : `${key}: expected an ISO-8601 timestamp`;
    case 'email':
      return typeof value === 'string' && EMAIL_RE.test(value)
        ? null
        : `${key}: expected an e-mail address`;
    case 'phone':
      return typeof value === 'string' && INDIAN_MOBILE_RE.test(value.replace(/[\s-]/g, ''))
        ? null
        : `${key}: expected an Indian mobile number`;
    case 'url':
      return typeof value === 'string' && /^https?:\/\/[^\s]+$/i.test(value)
        ? null
        : `${key}: expected an absolute URL`;
    case 'slug': {
      const pattern = allowPathSlug ? PATH_SLUG_RE : SLUG_RE;
      return typeof value === 'string' && pattern.test(value)
        ? null
        : `${key}: expected a lowercase ${allowPathSlug ? 'slug path' : 'slug'}`;
    }
    case 'array':
      return Array.isArray(value) ? null : `${key}: expected an array`;
    case 'object':
      return isPlainObject(value) ? null : `${key}: expected an object`;
    default:
      return null;
  }
}

function boundsMessages(key, value, descriptor) {
  const messages = [];
  const { min, max, maxLength, pattern } = descriptor;

  if (typeof value === 'number') {
    if (min !== undefined && value < min) messages.push(`${key}: must be at least ${min}`);
    if (max !== undefined && value > max) messages.push(`${key}: must be at most ${max}`);
  } else if (typeof value === 'string') {
    if (min !== undefined && value.length < min) {
      messages.push(`${key}: must be at least ${min} characters`);
    }
    if (maxLength !== undefined && value.length > maxLength) {
      messages.push(`${key}: must be at most ${maxLength} characters (is ${value.length})`);
    }
    if (pattern !== undefined && !new RegExp(pattern).test(value)) {
      messages.push(`${key}: does not match ${pattern}`);
    }
  } else if (Array.isArray(value)) {
    if (min !== undefined && value.length < min)
      messages.push(`${key}: needs at least ${min} items`);
    if (max !== undefined && value.length > max) {
      messages.push(`${key}: may hold at most ${max} items (has ${value.length})`);
    }
  }

  return messages;
}

/**
 * Validates a record against a `{ field: descriptor }` shape.
 *
 * Computed and embedded fields (`read: true`) are optional — the API derives
 * them on the way out and the seed does not store them — but every other field
 * must be present, which is what makes "every field of §6" an enforced rule
 * rather than an intention.
 */
function validateShape(shape, record, prefix, errors, pathSlugKeys = null) {
  if (!isPlainObject(record)) {
    errors.push(`${prefix || '<record>'}: expected an object`);
    return;
  }

  for (const [field, descriptor] of Object.entries(shape)) {
    const key = prefix ? `${prefix}.${field}` : field;
    const present = Object.prototype.hasOwnProperty.call(record, field);

    if (!present) {
      if (!descriptor.read) errors.push(`${key}: missing`);
      continue;
    }

    const value = record[field];

    if (value === null) {
      if (!descriptor.nullable && descriptor.default !== null) {
        errors.push(`${key}: null is not allowed`);
      }
      continue;
    }

    const wrongType = typeMessage(key, value, descriptor, Boolean(pathSlugKeys?.has(key)));
    if (wrongType) {
      errors.push(wrongType);
      continue;
    }

    if (descriptor.required && (value === '' || (Array.isArray(value) && value.length === 0))) {
      errors.push(`${key}: required but empty`);
      continue;
    }

    boundsMessages(key, value, descriptor).forEach((message) => errors.push(message));

    if (descriptor.type === 'array' && descriptor.items) {
      value.forEach((entry, index) => {
        const itemKey = `${key}.${index}`;
        if (descriptor.items.type === 'object' && descriptor.items.shape) {
          validateShape(descriptor.items.shape, entry, itemKey, errors, pathSlugKeys);
          return;
        }
        const itemError = typeMessage(itemKey, entry, descriptor.items);
        if (itemError) errors.push(itemError);
        else boundsMessages(itemKey, entry, descriptor.items).forEach((m) => errors.push(m));
      });
    }

    if (descriptor.type === 'object' && descriptor.shape) {
      validateShape(descriptor.shape, value, key, errors, pathSlugKeys);
    }
  }
}

/* ------------------------------------------------------------------ *
 * Structural rules the descriptors cannot express
 * ------------------------------------------------------------------ */

const SECTION_KEYS = SECTION_VISIBILITY_KEYS.map(({ key }) => key);

function checkProperty(property, report) {
  const label = `properties[${property.id}]`;
  const errors = { push: report };

  const images = property.images ?? [];
  if (images.length > 0) {
    const covers = images.filter((image) => image.isCover).length;
    if (covers !== 1) errors.push(`${label}.images: expected exactly one isCover, found ${covers}`);
  }

  const missing = SECTION_KEYS.filter(
    (key) => !Object.prototype.hasOwnProperty.call(property.sectionVisibility ?? {}, key)
  );
  if (missing.length > 0) {
    errors.push(`${label}.sectionVisibility: missing ${missing.join(', ')}`);
  }
  const extra = Object.keys(property.sectionVisibility ?? {}).filter(
    (key) => !SECTION_KEYS.includes(key)
  );
  if (extra.length > 0) {
    errors.push(`${label}.sectionVisibility: unknown key ${extra.join(', ')}`);
  }

  if ((property.similarPropertyIds ?? []).includes(property.id)) {
    errors.push(`${label}.similarPropertyIds: a property cannot be similar to itself`);
  }
}

/** The §9.6 `seo` object must carry every key, on every entity that owns a URL. */
const SEO_KEYS = [
  'focusKeyword',
  'secondaryKeywords',
  'title',
  'description',
  'slug',
  'canonicalUrl',
  'robots',
  'og',
  'twitter',
  'breadcrumbTitle',
  'schema',
  'sitemap',
  'redirect',
  'score',
  'scoreBand',
  'testsPassed',
  'testsTotal',
  'analysis',
  'lastAnalyzedAt',
];

function checkSeo(record, label, report) {
  const errors = { push: report };
  const seo = record.seo;
  if (!isPlainObject(seo)) {
    errors.push(`${label}.seo: missing the §9.6 object`);
    return;
  }

  const missing = SEO_KEYS.filter((key) => !Object.prototype.hasOwnProperty.call(seo, key));
  if (missing.length > 0) errors.push(`${label}.seo: missing ${missing.join(', ')}`);

  if (record.slug && seo.slug && seo.slug !== record.slug) {
    errors.push(
      `${label}.seo.slug: "${seo.slug}" does not mirror the entity slug "${record.slug}"`
    );
  }
}

/* ------------------------------------------------------------------ *
 * §10 "seed quality" — the rules that make the data usable rather than
 * merely well-typed.
 * ------------------------------------------------------------------ */

/** The minimum an **active** listing has to carry before it may be published. */
const ACTIVE_PROPERTY_RULES = [
  [(p) => p.images.length >= 5, 'needs at least 5 images'],
  [
    (p) => p.images.every((image) => image.alt && image.alt.trim() !== ''),
    'every image needs alt text',
  ],
  [(p) => p.amenityIds.length >= 8, 'needs at least 8 amenities'],
  [(p) => p.faqs.length >= 3, 'needs at least 3 FAQs'],
  [(p) => p.description.length >= 300, 'description must be at least 300 characters'],
  [(p) => p.shortDescription.trim() !== '', 'shortDescription is empty'],
  [(p) => p.seo.title.trim() !== '', 'seo.title is empty'],
  [(p) => p.seo.description.trim() !== '', 'seo.description is empty'],
  [(p) => p.seo.focusKeyword.trim() !== '', 'seo.focusKeyword is empty'],
];

/** Badges a listing may only wear when the record earns them (§6.4). */
const BADGE_RULES = {
  'Ready to Move': (p) => p.constructionStatus === 'ready-to-move',
  'New Launch': (p) =>
    p.constructionStatus === 'pre-launch' || p.constructionStatus === 'under-construction',
  'RERA Approved': (p) => p.reraRegistered === true,
  Verified: (p) => p.isVerified === true,
};

/** The minimum count each collection has to reach (§10, prompt 10 §8). */
const MINIMUM_COUNTS = {
  properties: 36,
  localities: 20,
  cities: 1,
  segments: 3,
  propertyTypes: 17,
  amenities: 40,
  badges: 8,
  developers: 8,
  banks: 6,
  articles: 12,
  articleCategories: 4,
  articleTags: 15,
  authors: 3,
  faqs: 20,
  testimonials: 8,
  teamMembers: 6,
  partners: 6,
  pages: 15,
  jobOpenings: 4,
  jobApplications: 3,
  leads: 45,
  newsletterSubscribers: 12,
  redirects: 3,
  adminUsers: 3,
};

/** The §9.6 fields an editor is expected to have filled in. */
const SEO_FILLED = ['title', 'description', 'focusKeyword'];

/**
 * The quality rules of §10, which the field descriptors cannot express: what
 * an active listing carries, how a rent listing differs from a sale one, which
 * badges a construction status allows, and how long a published article is.
 *
 * @param {object} db
 * @param {(collection: string, message: string) => void} add
 * @param {(message: string) => void} warn
 */
function checkQuality(db, add, warn) {
  const propertyTypes = new Map((db.propertyTypes ?? []).map((type) => [type.id, type]));
  const badgeNames = new Map((db.badges ?? []).map((badge) => [badge.id, badge.name]));

  const leadsPerProperty = new Map();
  for (const lead of db.leads ?? []) {
    if (!lead.propertyId) continue;
    leadsPerProperty.set(lead.propertyId, (leadsPerProperty.get(lead.propertyId) ?? 0) + 1);
  }

  for (const property of db.properties ?? []) {
    const label = `properties[${property.id}]`;
    const type = propertyTypes.get(property.propertyTypeId);
    const isLand = segmentKind(type?.segment, db.segments) === 'land';
    const isCommercial = segmentKind(type?.segment, db.segments) === 'commercial';
    const forSale = property.listingType === 'sale';

    if (property.isActive) {
      for (const [passes, message] of ACTIVE_PROPERTY_RULES) {
        if (!passes(property)) add('properties', `${label}: ${message}`);
      }
    }

    if (forSale) {
      if (property.pricing.price === null && !property.pricing.priceOnRequest) {
        add('properties', `${label}: a sale listing needs a price or priceOnRequest`);
      }
      if (property.pricing.rentPerMonth !== null) {
        add('properties', `${label}: a sale listing must not carry rentPerMonth`);
      }
    } else {
      if (property.pricing.rentPerMonth === null) {
        add('properties', `${label}: a ${property.listingType} listing needs rentPerMonth`);
      }
      if (property.pricing.price !== null) {
        add(
          'properties',
          `${label}: a ${property.listingType} listing must not carry pricing.price`
        );
      }
      if (property.listingType === 'rent' && !property.pricing.securityDeposit) {
        add('properties', `${label}: a rent listing needs a securityDeposit`);
      }
    }

    if (isLand) {
      if (!property.area.plotArea)
        add('properties', `${label}: a land listing needs area.plotArea`);
      if (property.configuration.bedrooms !== null) {
        add('properties', `${label}: a land listing must not carry configuration.bedrooms`);
      }
    }

    if (isCommercial && property.configuration.bedrooms !== null) {
      add('properties', `${label}: a commercial listing must not carry configuration.bedrooms`);
    }

    const underConstruction =
      property.constructionStatus === 'pre-launch' ||
      property.constructionStatus === 'under-construction';

    if (underConstruction) {
      if (!property.possessionDate) {
        add('properties', `${label}: ${property.constructionStatus} needs a possessionDate`);
      }
      if (property.constructionTimeline.length === 0) {
        add('properties', `${label}: ${property.constructionStatus} needs a constructionTimeline`);
      }
      if (property.constructionProgressPercent === null) {
        add(
          'properties',
          `${label}: ${property.constructionStatus} needs constructionProgressPercent`
        );
      }
    } else if (property.ageOfPropertyYears === null) {
      add('properties', `${label}: ${property.constructionStatus} needs ageOfPropertyYears`);
    }

    for (const badgeId of property.badgeIds) {
      const name = badgeNames.get(badgeId);
      const rule = BADGE_RULES[name];
      if (rule && !rule(property)) {
        add('properties', `${label}: the "${name}" badge does not match the record`);
      }
    }

    // Decided and documented (prompt 10 §4.8): the counter is the lifetime
    // total, `leads` holds the last ninety days, so it is "at least".
    const fromLeads = leadsPerProperty.get(property.id) ?? 0;
    if (property.enquiryCount < fromLeads) {
      add(
        'properties',
        `${label}: enquiryCount ${property.enquiryCount} is below the ${fromLeads} leads that name it`
      );
    }
  }

  for (const article of db.articles ?? []) {
    const label = `articles[${article.id}]`;
    const words = wordCount(article.content);

    if (article.status === 'published' && words < 800) {
      add('articles', `${label}: a published article needs at least 800 words (has ${words})`);
    }
    if (article.excerpt.length > 300) {
      add('articles', `${label}: excerpt is longer than 300 characters`);
    }
    if (!article.featuredImage || !article.featuredImage.alt) {
      add('articles', `${label}: the featured image needs alt text`);
    }
    if (article.status === 'scheduled') {
      if (!article.publishedAt) {
        add('articles', `${label}: a scheduled article needs a publishedAt`);
      } else if (Date.parse(article.publishedAt) <= Date.now()) {
        warn(
          `${label}: the scheduled publishedAt (${article.publishedAt.slice(0, 10)}) is in the past — rebuild the seed`
        );
      }
    }
  }

  for (const page of db.pages ?? []) {
    const label = `pages[${page.id}]`;
    const ids = new Set();
    for (const block of page.blocks) {
      if (ids.has(block.id)) add('pages', `${label}: duplicate block id ${block.id}`);
      ids.add(block.id);
    }
  }

  // Every entity that owns a public URL carries a filled-in `seo` object.
  for (const collection of ['properties', 'articles', 'pages', 'localities', 'developers']) {
    for (const record of db[collection] ?? []) {
      for (const key of SEO_FILLED) {
        if (!record.seo || String(record.seo[key] ?? '').trim() === '') {
          add(collection, `${collection}[${record.id}].seo.${key} is empty`);
        }
      }
    }
  }

  for (const [collection, minimum] of Object.entries(MINIMUM_COUNTS)) {
    const count = Array.isArray(db[collection]) ? db[collection].length : 0;
    if (count < minimum) {
      add(collection, `${collection}: §10 asks for at least ${minimum} records, found ${count}`);
    }
  }

  const active = (db.properties ?? []).filter((property) => property.isActive).length;
  if (active < 34) {
    add('properties', `properties: §10 asks for at least 34 active listings, found ${active}`);
  }
}

function checkTraces(db, errors) {
  const serialised = JSON.stringify(db);

  for (const { re, label } of TRACE_PATTERNS) {
    // The shared patterns are global; a fresh `lastIndex` per run keeps the
    // result independent of the previous collection.
    re.lastIndex = 0;
    const match = re.exec(serialised);
    if (!match) continue;

    // "home", "homes" and "home-loan" legitimately contain the "hom" patterns.
    const word = serialised.slice(Math.max(0, match.index - 1), match.index + match[0].length + 4);
    if (ALLOW_LIST.some((allowed) => word.toLowerCase().includes(allowed))) continue;

    errors.push(`traces: ${label} found in the seed ("${match[0]}")`);
  }
}

/* ------------------------------------------------------------------ *
 * The run
 * ------------------------------------------------------------------ */

function loadSeed() {
  try {
    return JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
  } catch (error) {
    console.error(`db.json could not be read: ${error.message}`);
    process.exit(1);
  }
  return null;
}

function validate(db) {
  /** @type {Map<string, string[]>} */
  const byCollection = new Map();
  const counts = new Map();
  /** Non-blocking notes: true today, and worth acting on before they are not. */
  const warnings = [];
  const add = (collection, message) => {
    if (!byCollection.has(collection)) byCollection.set(collection, []);
    byCollection.get(collection).push(message);
  };
  const warn = (message) => warnings.push(message);

  // Unknown or missing top-level keys.
  for (const name of Object.keys(MODELS)) {
    if (!Object.prototype.hasOwnProperty.call(db, name)) {
      add(name, `collection "${name}" is missing from db.json`);
    }
  }
  for (const name of Object.keys(db)) {
    if (!MODELS[name]) add(name, `"${name}" is not a collection of the data model`);
  }

  for (const [name, model] of Object.entries(MODELS)) {
    const value = db[name];
    if (value === undefined) {
      counts.set(name, 0);
      continue;
    }

    if (model.singleton) {
      counts.set(name, isPlainObject(value) ? 1 : 0);
      const errors = [];
      validateShape(model.fields, value, '', errors);
      errors.forEach((message) => add(name, message));
      continue;
    }

    if (!Array.isArray(value)) {
      counts.set(name, 0);
      add(name, `"${name}" must be an array`);
      continue;
    }

    counts.set(name, value.length);

    const seenIds = new Set();
    const uniqueFields = Object.entries(model.fields)
      .filter(([, descriptor]) => descriptor.unique)
      .map(([field]) => field);
    for (const field of [model.slugField, ...(EXTRA_UNIQUE[name] ?? [])]) {
      if (field && !uniqueFields.includes(field)) uniqueFields.push(field);
    }
    const seenUnique = new Map(uniqueFields.map((field) => [field, new Set()]));

    value.forEach((record, index) => {
      const label = `${name}[${record?.id ?? `#${index}`}]`;

      if (!Number.isInteger(record?.id) || record.id < 1) {
        add(name, `${label}.id: expected a positive integer`);
      } else if (seenIds.has(record.id)) {
        add(name, `${label}.id: duplicate id`);
      } else {
        seenIds.add(record.id);
      }

      for (const field of uniqueFields) {
        const fieldValue = record?.[field];
        if (fieldValue === undefined || fieldValue === null || fieldValue === '') continue;
        const key = String(fieldValue).toLowerCase();
        if (seenUnique.get(field).has(key)) {
          add(name, `${label}.${field}: "${fieldValue}" is not unique`);
        } else {
          seenUnique.get(field).add(key);
        }
      }

      const errors = [];
      validateShape(model.fields, record, '', errors, PATH_SLUG_FIELDS[name]);
      errors.forEach((message) => add(name, `${label}.${message}`));

      const report = (message) => add(name, message);
      if (Object.prototype.hasOwnProperty.call(model.fields, 'seo'))
        checkSeo(record, label, report);
      if (name === 'properties') checkProperty(record, report);
    });
  }

  // Referential integrity.
  for (const [name, references] of Object.entries(REFERENCES)) {
    const records = Array.isArray(db[name]) ? db[name] : [];
    for (const [dotted, target] of references) {
      const ids = new Set((db[target] ?? []).map((record) => record.id));
      for (const record of records) {
        for (const value of readPath(record, dotted)) {
          if (!ids.has(value)) {
            add(name, `${name}[${record.id}].${dotted}: ${value} is not a ${target} id`);
          }
        }
      }
    }
  }

  // References by something other than an id — a field whose descriptor
  // carries `exists`, which is how a property and a property type name their
  // segment (QA-52).
  for (const [name, model] of Object.entries(MODELS)) {
    const records = Array.isArray(db[name]) ? db[name] : [];
    for (const [field, descriptor] of Object.entries(model.fields)) {
      const rule = descriptor?.exists;
      if (!rule?.collection) continue;
      const column = rule.field ?? 'id';
      const known = new Set((db[rule.collection] ?? []).map((record) => record?.[column]));
      for (const record of records) {
        const value = record?.[field];
        if (value === undefined || value === null || value === '' || known.has(value)) continue;
        add(
          name,
          `${name}[${record.id}].${field}: "${value}" is not a ${rule.collection} ${column}`
        );
      }
    }
  }

  // The three segments the public site is built on, each its own kind.
  for (const slug of BUILT_IN_SEGMENT_SLUGS) {
    const record = (db.segments ?? []).find((row) => row?.slug === slug);
    if (!record) add('segments', `segments: the built-in "${slug}" segment is missing`);
    else if (record.kind !== slug) {
      add(
        'segments',
        `segments[${record.id}]: the built-in "${slug}" segment must be of kind "${slug}"`
      );
    }
  }

  // Every image the seed shows must exist in the media library, and the
  // library must not accumulate records nothing points at.
  const usages = collectImageUrls(db);
  const mediaUrls = new Set((db.media ?? []).map((record) => record.url));
  const usedUrls = embeddedAssetUrls(db);
  const reported = new Set();

  for (const { url, collection, id, path: dotted } of usages) {
    if (mediaUrls.has(url) || reported.has(url)) continue;
    reported.add(url);
    add('media', `${collection}[${id}].${dotted}: ${url} has no media record`);
  }
  for (const url of usedUrls) {
    if (mediaUrls.has(url) || reported.has(url)) continue;
    reported.add(url);
    add('media', `${url} is referenced in the seed but has no media record`);
  }
  for (const record of db.media ?? []) {
    if (!usedUrls.has(record.url)) {
      add('media', `media[${record.id}]: ${record.url} is not used anywhere in the seed`);
    }
  }

  checkQuality(db, add, warn);

  const traceErrors = [];
  checkTraces(db, traceErrors);
  traceErrors.forEach((message) => add('db.json', message));

  return { byCollection, counts, warnings };
}

function printTable(counts, byCollection) {
  const rows = [...counts.entries()].map(([name, count]) => ({
    collection: name,
    count: MODELS[name]?.singleton ? 'object' : String(count),
    errors: (byCollection.get(name) ?? []).length,
  }));

  const width = (key, heading) =>
    Math.max(heading.length, ...rows.map((row) => String(row[key]).length));
  const widths = {
    collection: width('collection', 'collection'),
    count: width('count', 'count'),
    errors: width('errors', 'errors'),
  };

  const line = (a, b, c) =>
    `${String(a).padEnd(widths.collection)}  ${String(b).padStart(widths.count)}  ${String(c).padStart(widths.errors)}`;

  console.log(line('collection', 'count', 'errors'));
  console.log(
    `${'-'.repeat(widths.collection)}  ${'-'.repeat(widths.count)}  ${'-'.repeat(widths.errors)}`
  );
  for (const row of rows) console.log(line(row.collection, row.count, row.errors || ''));
}

function main() {
  const db = loadSeed();
  const { byCollection, counts, warnings } = validate(db);

  printTable(counts, byCollection);

  const total = [...byCollection.values()].reduce((sum, list) => sum + list.length, 0);

  if (warnings.length > 0) {
    console.warn(`\n${warnings.length} warning${warnings.length === 1 ? '' : 's'}:`);
    for (const message of warnings) console.warn(`  ! ${message}`);
  }

  if (STATS_ONLY) {
    console.log(`\n${counts.size} collections and singletons.`);
    return;
  }

  if (total === 0) {
    console.log('\ndb.json is valid.');
    return;
  }

  console.error(`\n${total} problem${total === 1 ? '' : 's'} found:\n`);
  for (const [collection, messages] of byCollection) {
    console.error(`  ${collection}`);
    for (const message of messages) console.error(`    - ${message}`);
  }
  process.exit(1);
}

if (require.main === module) main();

module.exports = {
  collectImageUrls,
  embeddedAssetUrls,
  readPath,
  validate,
  IMAGE_PATHS,
  REFERENCES,
};
