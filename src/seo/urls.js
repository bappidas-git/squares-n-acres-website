/**
 * Where a record lives, and which of the URLs that reach it is the canonical
 * one (§9.4).
 *
 * One listing page can be reached by a hundred URLs — a sort, a price range, a
 * handful of amenities — and all but a few of them are a view one visitor
 * built for themselves. The rule is a whitelist: seven parameters, in a fixed
 * order, are worth a page of their own; every other parameter makes the page
 * `noindex` and canonicalises to the URL without it. Fixed order matters as
 * much as the whitelist, because `?localityId=4&listingType=sale` and
 * `?listingType=sale&localityId=4` are the same page and must produce the same
 * string.
 *
 * Trailing slash policy: none, anywhere, including the home page.
 */

import PATHS from '../routes/paths';

/** Indexed, in this order (§9.4). */
export const INDEX_WORTHY_PARAMS = [
  'listingType',
  'segment',
  'propertyTypeId',
  'localityId',
  'constructionStatus',
  'bedrooms',
  'page',
];

/** The listing parameters whose default value is the same as being absent. */
export const LISTING_PARAM_DEFAULTS = { sort: 'relevance', perPage: 12, page: 1 };

const hasValue = (value) => {
  if (value === undefined || value === null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const asString = (value) => (Array.isArray(value) ? value.join(',') : String(value));

/** `https://site.com/path`, with no trailing slash and no double slash. */
export function absoluteUrl(siteUrl, path = '/') {
  const base = String(siteUrl ?? '').replace(/\/+$/, '');
  const suffix = normalisePath(path);
  if (!base) return suffix;
  return suffix === '/' ? base : `${base}${suffix}`;
}

/** A leading slash, no trailing slash, `/` for the root. */
export function normalisePath(path) {
  const value = String(path ?? '').trim();
  if (!value || value === '/') return '/';
  const withSlash = value.startsWith('/') ? value : `/${value}`;
  return withSlash.replace(/\/+$/, '') || '/';
}

/**
 * The public path of a record (§9.1, `routes/paths.js`).
 *
 * @param {string} entityType `property`, `article`, `articleCategory`,
 *   `articleTag`, `author`, `locality`, `developer`, `page`, `propertyType`
 * @param {object} entity the record; only its slug and — for a property type —
 *   its segment are read
 * @returns {string|null} `null` when the record has no slug yet
 */
export function publicPathFor(entityType, entity = {}) {
  const slug = entity?.seo?.slug || entity?.slug || '';
  if (!slug) return null;

  switch (entityType) {
    case 'property':
      return PATHS.propertyDetails(slug);
    case 'article':
      return PATHS.article(slug);
    case 'articleCategory':
      return PATHS.articleCategory(slug);
    case 'articleTag':
      return PATHS.articleTag(slug);
    case 'author':
      return PATHS.author(slug);
    case 'locality':
      return PATHS.locality(slug);
    case 'developer':
      return PATHS.builder(slug);
    case 'propertyType':
      return entity.segment === 'commercial' ? PATHS.commercialType(slug) : PATHS.buyType(slug);
    case 'page':
      return PATHS.page(slug);
    default:
      return PATHS.page(slug);
  }
}

/**
 * The canonical URL of a path: absolute, without a trailing slash, carrying
 * only the index-worthy parameters and only in the order of §9.4.
 *
 * @param {string} siteUrl `seoSettings.siteUrl`; an empty string yields a path
 * @param {string} path
 * @param {object} [query] the visitor's parameters
 * @param {{indexWorthy?: string[], defaults?: object}} [rules]
 * @returns {string}
 */
export function canonicalFor(siteUrl, path, query = {}, rules = {}) {
  const keys = rules.indexWorthy ?? INDEX_WORTHY_PARAMS;
  const defaults = rules.defaults ?? LISTING_PARAM_DEFAULTS;
  const params = query ?? {};
  const search = [];

  for (const key of keys) {
    const value = params[key];
    if (!hasValue(value)) continue;
    if (key === 'page') {
      const page = Number(value);
      if (!Number.isFinite(page) || page <= 1) continue;
      search.push(`page=${Math.floor(page)}`);
      continue;
    }
    if (key in defaults && String(value) === String(defaults[key])) continue;
    search.push(`${key}=${encodeURIComponent(asString(value))}`);
  }

  const base = absoluteUrl(siteUrl, path);
  return search.length ? `${base}?${search.join('&')}` : base;
}

/**
 * The canonical URL of one record — its own override when it has one, its
 * public path otherwise (§9.3).
 *
 * @param {string} entityType
 * @param {object} entity
 * @param {{seoSettings?: object, siteUrl?: string}} [context]
 * @returns {string|null}
 */
export function canonicalForEntity(entityType, entity = {}, context = {}) {
  const override = entity?.seo?.canonicalUrl;
  if (override) return String(override).replace(/\/+$/, '');

  const path = publicPathFor(entityType, entity);
  if (!path) return null;

  const siteUrl = context.siteUrl ?? context.seoSettings?.siteUrl ?? '';
  return canonicalFor(siteUrl, path);
}

/**
 * Whether a listing URL should be `noindex` (§9.4).
 *
 * Any parameter outside the whitelist means the visitor narrowed the list for
 * themselves; `page > 1` only counts when the settings say it should.
 *
 * @param {object} query
 * @param {object} [seoSettings]
 * @returns {boolean}
 */
export function isNoindexListing(query = {}, seoSettings = {}) {
  const rules = seoSettings?.noindex ?? {};
  const params = query ?? {};

  const filtered = Object.entries(params).some(([key, value]) => {
    if (!hasValue(value)) return false;
    if (INDEX_WORTHY_PARAMS.includes(key)) return false;
    if (key in LISTING_PARAM_DEFAULTS) {
      return String(value) !== String(LISTING_PARAM_DEFAULTS[key]);
    }
    return true;
  });

  if (filtered && rules.filteredListings !== false) return true;
  if (rules.paginatedListings === true && Number(params.page) > 1) return true;
  return false;
}

/**
 * Whether a URL is one search engines should keep at all — the counterpart of
 * {@link isNoindexListing} for a single record (§9.3).
 *
 * @param {object} entity
 * @param {{isPublished?: boolean}} [options]
 * @returns {boolean}
 */
export function isIndexable(entity = {}, { isPublished = true } = {}) {
  const robots = entity?.seo?.robots ?? {};
  if (robots.index === false) return false;
  return isPublished !== false;
}

const urls = {
  INDEX_WORTHY_PARAMS,
  LISTING_PARAM_DEFAULTS,
  absoluteUrl,
  canonicalFor,
  canonicalForEntity,
  isIndexable,
  isNoindexListing,
  normalisePath,
  publicPathFor,
};

export default urls;
