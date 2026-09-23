/**
 * The template variables of §9.5, and the two functions that turn a template
 * into a title.
 *
 * A title template is the one piece of SEO an editor writes once and applies to
 * a thousand records, so the rules are small and strict: a variable that
 * cannot be resolved is **removed**, and what the removal leaves behind —
 * double spaces, a comma with nothing in front of it, a dangling `–` before
 * the separator — is cleaned up by {@link cleanTitle}. "Properties in ,
 * Bengaluru" is the failure this module exists to prevent.
 *
 * Authored in CommonJS (D36b, extended in prompt 38) so that `scripts/
 * validate-jsonld.js` can `require` this module from Node with no bundler in
 * front of it; React and Jest keep importing it.
 */

const { AREA_UNITS, CONSTRUCTION_STATUS, LISTING_TYPES } = require('../config/enums');
const { segmentKind } = require('../config/segments');
const { SITE } = require('../config/site');
const { formatArea, formatBhk, formatDate, formatPrice } = require('../utils/format');

/** Every variable, with the copy the panel's insert menu shows. */
const VARIABLES = [
  { token: '%title%', label: 'Title', hint: "The record's own title" },
  { token: '%sitename%', label: 'Site name', hint: 'Squares N Acres' },
  { token: '%sep%', label: 'Separator', hint: 'The separator from SEO settings' },
  { token: '%tagline%', label: 'Tagline', hint: 'The site tagline' },
  { token: '%excerpt%', label: 'Excerpt', hint: 'Excerpt or short description' },
  { token: '%category%', label: 'Category', hint: "An article's category" },
  { token: '%author%', label: 'Author', hint: "An article's author" },
  { token: '%date%', label: 'Published date', hint: 'dd MMM yyyy' },
  { token: '%modified%', label: 'Modified date', hint: 'dd MMM yyyy' },
  { token: '%currentyear%', label: 'Current year', hint: 'Refreshed every January' },
  { token: '%page%', label: 'Page', hint: '"Page 2" from page two onwards' },
  { token: '%propertytype%', label: 'Property type', hint: 'Apartment, Villa, Plot…' },
  { token: '%listingtype%', label: 'Listing type', hint: 'for Sale / for Rent / for Lease' },
  { token: '%bhk%', label: 'Configuration', hint: '"3 BHK"; empty for plots and commercial' },
  { token: '%locality%', label: 'Locality', hint: 'Whitefield, Hebbal…' },
  { token: '%city%', label: 'City', hint: 'Bengaluru' },
  { token: '%price%', label: 'Price', hint: '₹1.42 Cr, ₹45,000/month, Price on Request' },
  { token: '%area%', label: 'Area', hint: '1,650 sq ft' },
  { token: '%developer%', label: 'Developer', hint: 'The builder behind the project' },
  { token: '%status%', label: 'Construction status', hint: 'Ready to Move, Under Construction…' },
  { token: '%projectname%', label: 'Project name', hint: 'The name of the project' },
  { token: '%count%', label: 'Result count', hint: 'How many listings a page shows' },
];

/**
 * The variables the panel offers, in menu order.
 *
 * @returns {Array<{token: string, label: string, hint: string}>}
 */
const listVariables = () => VARIABLES.map((variable) => ({ ...variable }));

/**
 * Removes the punctuation an unresolved variable leaves behind (§9.5).
 *
 * `"– | Squares N Acres"` is `"Squares N Acres"`; `"Properties in , Bengaluru"`
 * is `"Properties in Bengaluru"`; `"3 BHK in Whitefield, – Squares N Acres"` is
 * `"3 BHK in Whitefield – Squares N Acres"` (NEW-39): a variable that resolved
 * to nothing between a comma and the separator leaves the comma leaning on the
 * separator, which no editor typed and no result should show.
 *
 * @param {string} text
 * @returns {string}
 */
function cleanTitle(text) {
  return (
    String(text ?? '')
      .replace(/%\w+%/g, '')
      .replace(/\s+/g, ' ')
      .replace(/\s+([,;:])/g, '$1')
      .replace(/([,–—|])\s*\1/g, '$1')
      .replace(/\b(in|at|for|near|from|on|by)\s*,\s*/gi, '$1 ')
      // A comma, semicolon or colon standing immediately in front of a separator.
      // The separator must be surrounded by space so that "₹1,20,000-₹1,50,000"
      // and "Whitefield, Bengaluru" are left exactly as they are.
      .replace(/([,;:])(\s+[|–—-]\s)/g, '$2')
      .replace(/[|–—-]\s*(?=[|–—])/g, '')
      .replace(/^[\s,\-–—|:]+|[\s,\-–—|:]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * A template with its variables filled in and the result cleaned.
 *
 * A variable this build does not know is removed exactly like one that
 * resolved to nothing: a template is editor-authored text and a typo in it
 * must never reach a `<title>`.
 *
 * @param {string} template e.g. `'%title% %sep% %sitename%'`
 * @param {Record<string, string|number|null|undefined>} [vars]
 * @returns {string}
 */
function resolveTemplate(template, vars = {}) {
  const lookup = {};
  for (const [key, value] of Object.entries(vars ?? {})) {
    lookup[key.toLowerCase().replace(/%/g, '')] =
      value === null || value === undefined ? '' : String(value);
  }

  const resolved = String(template ?? '').replace(/%([a-z0-9_]+)%/gi, (match, name) => {
    const value = lookup[name.toLowerCase()];
    return value === undefined ? '' : value;
  });

  return cleanTitle(resolved);
}

/** A record of a master-data collection by id, tolerant of string ids. */
const findById = (records, id) =>
  (Array.isArray(records) ? records : []).find((row) => String(row?.id) === String(id)) ?? null;

/** A formatter's answer, or an empty string — a title never shows an em dash. */
const orEmpty = (value) => (value && value !== '—' ? value : '');

/**
 * Whether this property is the kind that has bedrooms at all (§9.5) — by its
 * segment's kind, so an added segment of the commercial kind has none (QA-52).
 */
const hasBedrooms = (property, segments) => {
  const kind = segmentKind(property?.segment, segments);
  return kind !== 'commercial' && kind !== 'land' && Number(property?.configuration?.bedrooms) > 0;
};

/** The locality of a record, from the embedded read field or from master data. */
const localityOf = (entity, context) =>
  entity?.location?.locality ?? findById(context.localities, entity?.location?.localityId);

/** The city name a record belongs to. */
function cityNameOf(entity, context) {
  const city =
    entity?.location?.city ??
    findById(context.cities, entity?.location?.cityId ?? entity?.cityId) ??
    (Array.isArray(context.cities) ? context.cities[0] : null);
  return city?.name ?? '';
}

/** The area a property leads with, in the unit it was entered in. */
function areaOf(property) {
  const area = property?.area ?? {};
  const value =
    area.superBuiltUpArea ?? area.builtUpArea ?? area.carpetArea ?? area.plotArea ?? null;
  if (value === null || value === undefined || value === '') return '';
  return orEmpty(formatArea(value, AREA_UNITS.labelOf(area.areaUnit ?? 'sqft')));
}

/** The price a property leads with. */
function priceOf(property) {
  const pricing = property?.pricing ?? {};
  if (pricing.priceOnRequest) return 'Price on Request';

  const listingType = property?.listingType;
  const value = listingType === 'sale' ? pricing.price : (pricing.rentPerMonth ?? pricing.price);
  return orEmpty(formatPrice(value, { listingType }));
}

/**
 * Every §9.5 variable for one record.
 *
 * @param {string} entityType one of `SEO_ENTITY_TYPES`
 * @param {object} entity the record
 * @param {object} [context] `{ seoSettings, siteSettings, localities, cities,
 *   propertyTypes, segments, developers, categories, authors, count, page, now }`
 * @returns {Record<string, string>}
 */
function buildVariables(entityType, entity = {}, context = {}) {
  const record = entity ?? {};
  const seoSettings = context.seoSettings ?? {};
  const siteSettings = context.siteSettings ?? {};
  const now = context.now ? new Date(context.now) : new Date();
  const page = Number(context.page) || 1;

  const propertyType =
    record.propertyType ?? findById(context.propertyTypes, record.propertyTypeId) ?? null;
  const developer =
    record.project?.developer ?? findById(context.developers, record.project?.developerId) ?? null;
  const category = record.category ?? findById(context.categories, record.categoryId) ?? null;
  const author = record.author ?? findById(context.authors, record.authorId) ?? null;

  const locality = entityType === 'locality' ? record : localityOf(record, context);
  const isProperty = entityType === 'property';

  return {
    title: record.title ?? record.name ?? '',
    sitename: seoSettings.knowledgeGraph?.name ?? siteSettings.general?.siteName ?? SITE.name ?? '',
    sep: seoSettings.separator ?? '|',
    tagline: siteSettings.general?.tagline ?? '',
    excerpt: record.excerpt ?? record.shortDescription ?? '',
    category: category?.name ?? '',
    author: author?.name ?? (entityType === 'author' ? (record.name ?? '') : ''),
    date: orEmpty(formatDate(record.publishedAt ?? record.createdAt ?? null)),
    modified: orEmpty(formatDate(record.updatedAt ?? null)),
    currentyear: String(now.getFullYear()),
    page: page > 1 ? `Page ${page}` : '',
    propertytype: entityType === 'propertyType' ? (record.name ?? '') : (propertyType?.name ?? ''),
    listingtype: isProperty ? LISTING_TYPES.verbOf(record.listingType) : '',
    bhk:
      isProperty && hasBedrooms(record, context.segments)
        ? formatBhk(record.configuration.bedrooms)
        : '',
    locality: locality?.name ?? '',
    city: cityNameOf(record, context),
    price: isProperty ? priceOf(record) : '',
    area: isProperty ? areaOf(record) : '',
    developer: entityType === 'developer' ? (record.name ?? '') : (developer?.name ?? ''),
    status: isProperty ? CONSTRUCTION_STATUS.labelOf(record.constructionStatus) : '',
    projectname: record.projectName ?? '',
    count: context.count === null || context.count === undefined ? '' : String(context.count),
  };
}

/**
 * Which `seoSettings.titleTemplates` key a page type uses (§9.5).
 *
 * The list is every key §6.14 stores, not only the eight record types: `home`,
 * `listing` and `search` are pages rather than records, and a template an
 * editor can write but nothing can ever select would be a field that does
 * nothing (found while building the SEO settings screen's head preview,
 * prompt 37).
 */
const templateKeyFor = (entityType) =>
  [
    'home',
    'property',
    'listing',
    'locality',
    'developer',
    'article',
    'articleCategory',
    'page',
    'author',
    'search',
  ].includes(entityType)
    ? entityType
    : 'default';

/**
 * The title an entity gets when its `seo.title` is empty: the type's template,
 * resolved (§9.3).
 *
 * @param {string} entityType
 * @param {object} entity
 * @param {object} [context]
 * @returns {string}
 */
function resolveTitleTemplate(entityType, entity, context = {}) {
  const templates = context.seoSettings?.titleTemplates ?? {};
  const template =
    templates[templateKeyFor(entityType)] ?? templates.default ?? '%title% %sep% %sitename%';

  return resolveTemplate(template, buildVariables(entityType, entity, context));
}

const variables = {
  buildVariables,
  cleanTitle,
  listVariables,
  resolveTemplate,
  resolveTitleTemplate,
  templateKeyFor,
};

module.exports = variables;
