#!/usr/bin/env node
/**
 * build-seed.js — writes `db.json` from the modules in `scripts/seed/data/`.
 *
 *   npm run seed:build
 *
 * The seed is generated rather than hand-written for one reason: forty
 * properties, twenty localities, twelve articles, twenty-six pages and forty-five
 * leads have to agree with each other, and a cross-reference maintained by
 * hand drifts the first time somebody edits one side of it. Here a property's
 * price per square foot is derived from its price, its badges from its status,
 * its FAQs from its own numbers, its media records from the images it
 * actually uses, and its `enquiryCount` from the leads that name it.
 *
 * Determinism is part of the contract: a fixed PRNG seed
 * (`scripts/seed/lib/rng.js`) and a fixed generation instant
 * (`scripts/seed/lib/dates.js`) mean two runs produce a byte-identical file,
 * so `git diff` after a rebuild shows the change you made and nothing else.
 *
 * After running this, run `npm run validate:seed` and `npm run mock:reset`.
 */

const fs = require('fs');
const path = require('path');

const { Rng } = require('./lib/rng');
const { makeStamps } = require('./lib/stamps');
const { createMediaRegistry } = require('./lib/media');
const { buildProperty } = require('./lib/property');
const { slugify } = require('./lib/text');
const dates = require('./lib/dates');
const { DESCRIPTION_MAX, DESCRIPTION_MIN, TITLE_LIMIT } = require('./lib/seo');

const ROOT = path.resolve(__dirname, '..', '..');
const SEED_PATH = path.join(ROOT, 'db.json');

/** The ids reserved for `media` in `docs/DATA_MODEL.md`. */
const MEDIA_ID_CEILING = 400;

/** The master seed. Changing it reshuffles every derived number in the file. */
const MASTER_SEED = 20260916;

const data = (name) => require(`./data/${name}`);

const byKey = (rows, key = 'slug') => Object.fromEntries(rows.map((row) => [row[key], row]));

/** Every asset URL the seed mentions anywhere, the way the mock finds them. */
function usedAssetUrls(db) {
  const serialised = JSON.stringify(db);
  const found = new Set();
  const patterns = [
    /https:\/\/picsum\.photos\/seed\/[a-z0-9-]+\/\d+\/\d+/g,
    /https:\/\/res\.cloudinary\.com\/[^"\\]+/g,
    /https:\/\/www\.w3\.org\/[^"\\]+\.pdf/g,
    /https:\/\/www\.youtube\.com\/watch\?v=[\w-]+/g,
  ];

  for (const pattern of patterns) {
    for (const match of serialised.matchAll(pattern)) found.add(match[0]);
  }
  return found;
}

function build() {
  const root = new Rng(MASTER_SEED);
  const media = createMediaRegistry();
  const stampsFor = (name) => makeStamps(root.child(`stamps:${name}`));

  /* ---------------- master data ---------------- */

  const cities = data('cities')({ stamps: stampsFor('cities') });
  const localities = data('localities')({
    stamps: stampsFor('localities'),
    slugify,
    media,
  });
  const segments = data('segments')({ stamps: stampsFor('segments') });
  const propertyTypes = data('propertyTypes')({ stamps: stampsFor('propertyTypes') });
  const amenities = data('amenities')({ stamps: stampsFor('amenities'), slugify });
  const badges = data('badges')({ stamps: stampsFor('badges'), slugify });
  const developers = data('developers')({ stamps: stampsFor('developers'), slugify, media });
  const banks = data('banks')({ stamps: stampsFor('banks'), slugify, media });

  const authors = data('authors')({ stamps: stampsFor('authors'), slugify, media });
  const { articleCategories, articleTags } = data('articleTaxonomy')({
    stamps: stampsFor('taxonomy'),
  });

  const teamMembers = data('team')({ stamps: stampsFor('team'), media });
  const partners = data('partners')({ stamps: stampsFor('partners'), slugify, media });
  const faqs = data('faqs')({ stamps: stampsFor('faqs') });
  const adminUsers = data('users')({ stamps: stampsFor('users'), dates });

  /* ---------------- properties ---------------- */

  const lookup = {
    localities: byKey(localities),
    propertyTypes: byKey(propertyTypes),
    amenities: byKey(amenities),
    badges: byKey(badges, 'name'),
    developers: byKey(developers),
    authors: byKey(authors),
    articleCategories: byKey(articleCategories),
    articleTags: byKey(articleTags),
    users: Object.fromEntries(adminUsers.map((user) => [user.id, user])),
    faqs,
  };

  const { PROPERTIES } = data('properties');
  const propertyRng = root.child('properties');
  const properties = PROPERTIES.map((spec, index) =>
    buildProperty(spec, index, { rng: propertyRng, media, lookup })
  );

  attachSimilarProperties(properties);

  /* ---------------- content ---------------- */

  const testimonials = data('testimonials')({
    stamps: stampsFor('testimonials'),
    propertyIds: properties.map((property) => property.id),
  });

  const { ARTICLES } = data('articles');
  lookup.articleSlugs = Object.fromEntries(
    ARTICLES.map((article, index) => [article.slug, index + 1])
  );
  const articles = data('articles')({ stamps: stampsFor('articles'), media, lookup, dates });

  const pages = data('pages')({ stamps: stampsFor('pages'), media, lookup });
  const headerMenus = data('headerMenus')({ stamps: stampsFor('headerMenus') });
  const { jobOpenings, jobApplications } = data('jobs')({ stamps: stampsFor('jobs'), dates });

  /* ---------------- leads and the counters they move ---------------- */

  lookup.properties = Object.fromEntries(properties.map((property) => [property.id, property]));
  lookup.pages = byKey(pages);

  const leads = data('leads')({ media, lookup, dates });
  applyEnquiryCounts(properties, leads, root.child('enquiries'));

  const newsletterSubscribers = data('subscribers')({ dates });
  const redirects = data('redirects')({ stamps: stampsFor('redirects') });
  const { siteSettings, seoSettings } = data('settings')({ media, dates });

  /* ---------------- assemble ---------------- */

  const db = {
    properties,
    localities,
    cities,
    segments,
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
    headerMenus,
    jobOpenings,
    jobApplications,
    media: [],
    siteSettings,
    seoSettings,
    redirects,
    newsletterSubscribers,
    adminUsers,
    apiTokens: [],
    propertyViews: [],
  };

  db.media = media.records();

  check(db, media);
  return db;
}

/**
 * Fills `similarPropertyIds` with two to four listings a visitor would
 * plausibly look at next: the same type and listing type first, then the same
 * segment, and never a draft or the property itself.
 */
function attachSimilarProperties(properties) {
  const active = properties.filter((property) => property.isActive);

  for (const property of properties) {
    const sameType = active.filter(
      (other) =>
        other.id !== property.id &&
        other.propertyTypeId === property.propertyTypeId &&
        other.listingType === property.listingType
    );
    const sameSegment = active.filter(
      (other) =>
        other.id !== property.id &&
        other.segment === property.segment &&
        other.listingType === property.listingType &&
        !sameType.includes(other)
    );

    property.similarPropertyIds = [...sameType, ...sameSegment]
      .slice(0, 4)
      .map((other) => other.id);
  }
}

/**
 * `enquiryCount` is at least the number of leads that name the property.
 *
 * Prompt 10 leaves the choice between "equals" and "at least" open and asks
 * for it to be documented: the seed uses **at least**, because the counter is
 * the property's lifetime total while `leads` only holds the last ninety days,
 * and a counter that resets when old leads are archived would be wrong.
 */
function applyEnquiryCounts(properties, leads, rng) {
  const counted = new Map();
  for (const lead of leads) {
    if (!lead.propertyId) continue;
    counted.set(lead.propertyId, (counted.get(lead.propertyId) ?? 0) + 1);
  }

  for (const property of properties) {
    const fromLeads = counted.get(property.id) ?? 0;
    const headroom = Math.max(0, 35 - fromLeads);
    const historic = property.isActive
      ? rng.int(0, Math.min(headroom, property.isFeatured ? 22 : 9))
      : 0;
    property.enquiryCount = fromLeads + historic;
  }
}

/* ------------------------------------------------------------------ *
 * Build-time checks — the ones that would otherwise only surface as a
 * broken page. `scripts/validate-seed.js` re-checks all of them and more.
 * ------------------------------------------------------------------ */

function check(db, media) {
  const problems = [];

  const registered = new Set(media.urls());
  const used = usedAssetUrls(db);

  for (const url of used) {
    if (!registered.has(url)) problems.push(`asset not registered in the media library: ${url}`);
  }
  for (const url of registered) {
    if (!used.has(url)) problems.push(`media record points at an unused asset: ${url}`);
  }

  if (db.media.length > MEDIA_ID_CEILING) {
    problems.push(
      `media has ${db.media.length} records; docs/DATA_MODEL.md reserves ids 1\u2013${MEDIA_ID_CEILING}`
    );
  }

  for (const property of db.properties) {
    const { length } = property.seo.description;
    if (length < DESCRIPTION_MIN || length > DESCRIPTION_MAX) {
      problems.push(`properties[${property.id}].seo.description is ${length} characters`);
    }
    if (property.seo.title.length > TITLE_LIMIT) {
      problems.push(`properties[${property.id}].seo.title is over ${TITLE_LIMIT} characters`);
    }
  }

  const slugs = new Set();
  for (const property of db.properties) {
    if (slugs.has(property.slug)) problems.push(`duplicate property slug: ${property.slug}`);
    slugs.add(property.slug);
  }

  if (problems.length > 0) {
    console.error('The seed did not build cleanly:\n');
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
}

function main() {
  const db = build();
  fs.writeFileSync(SEED_PATH, `${JSON.stringify(db, null, 2)}\n`, 'utf8');

  const kilobytes = (fs.statSync(SEED_PATH).size / 1024).toFixed(0);
  const counts = Object.entries(db)
    .filter(([, value]) => Array.isArray(value))
    .map(([name, value]) => `${name} ${value.length}`)
    .join(', ');

  console.log(`db.json written (${kilobytes} KB, generated for ${dates.GENERATED_AT})`);
  console.log(counts);
}

if (require.main === module) main();

module.exports = { build, usedAssetUrls, MASTER_SEED };
