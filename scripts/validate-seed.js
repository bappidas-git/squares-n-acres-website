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
 *      `seo` shape, a `media` record for every image URL the seed uses;
 *   6. no boilerplate traces (the pattern list of `check-traces`).
 *
 * Usage:
 *   node scripts/validate-seed.js            # exit 1 on any error
 *   node scripts/validate-seed.js --stats    # counts only, always exit 0
 */

const fs = require('fs');
const path = require('path');

const { TRACE_PATTERNS, ALLOW_LIST } = require('./check-traces');
const { MODELS } = require('../mock-server/schemas/models');
const { SECTION_VISIBILITY_KEYS } = require('../src/config/enums');

const ROOT = path.resolve(__dirname, '..');
const SEED_PATH = path.join(ROOT, 'db.json');
const STATS_ONLY = process.argv.slice(2).includes('--stats');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const INDIAN_MOBILE_RE = /^(\+91)?[6-9]\d{9}$/;
const SLUG_RE = /^[a-z0-9-]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

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

function typeMessage(key, value, descriptor) {
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
    case 'slug':
      return typeof value === 'string' && SLUG_RE.test(value)
        ? null
        : `${key}: expected a lowercase slug`;
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
function validateShape(shape, record, prefix, errors) {
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

    const wrongType = typeMessage(key, value, descriptor);
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
          validateShape(descriptor.items.shape, entry, itemKey, errors);
          return;
        }
        const itemError = typeMessage(itemKey, entry, descriptor.items);
        if (itemError) errors.push(itemError);
        else boundsMessages(itemKey, entry, descriptor.items).forEach((m) => errors.push(m));
      });
    }

    if (descriptor.type === 'object' && descriptor.shape) {
      validateShape(descriptor.shape, value, key, errors);
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
  const add = (collection, message) => {
    if (!byCollection.has(collection)) byCollection.set(collection, []);
    byCollection.get(collection).push(message);
  };

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
      validateShape(model.fields, record, '', errors);
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

  // Every image the seed shows must exist in the media library, and the
  // library must not accumulate records nothing points at.
  const usages = collectImageUrls(db);
  const mediaUrls = new Set((db.media ?? []).map((record) => record.url));
  const usedUrls = new Set(usages.map((usage) => usage.url));
  const reported = new Set();

  for (const { url, collection, id, path: dotted } of usages) {
    if (mediaUrls.has(url) || reported.has(url)) continue;
    reported.add(url);
    add('media', `${collection}[${id}].${dotted}: ${url} has no media record`);
  }
  for (const record of db.media ?? []) {
    if (!usedUrls.has(record.url)) {
      add('media', `media[${record.id}]: ${record.url} is not used anywhere in the seed`);
    }
  }

  const traceErrors = [];
  checkTraces(db, traceErrors);
  traceErrors.forEach((message) => add('db.json', message));

  return { byCollection, counts };
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
  const { byCollection, counts } = validate(db);

  printTable(counts, byCollection);

  const total = [...byCollection.values()].reduce((sum, list) => sum + list.length, 0);

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

module.exports = { collectImageUrls, readPath, validate, IMAGE_PATHS, REFERENCES };
