/**
 * The vocabulary of `/properties` and every category route under it.
 *
 * The listing engine speaks the contract's own parameter names (§5.7), so a
 * shared URL is a request the API could answer as it stands: `localityId=4,7`
 * in the address is `localityId=4,7` on the wire. This module is the pure half
 * of that — reading a query string into typed values, writing typed values
 * back, counting what is active and deciding which filter to drop first when
 * nothing matches.
 *
 * Nothing here touches React or the DOM, which is what lets the same functions
 * serve the rail, the mobile sheet, the chips and the SEO rules.
 */

/** Every parameter the engine reads, with the type the URL carries (§5.6). */
export const LISTING_PARAM_TYPES = {
  listingType: 'string',
  segment: 'string',
  propertyTypeId: 'csv',
  localityId: 'csv',
  constructionStatus: 'csv',
  availability: 'string',
  bedrooms: 'csv',
  minPrice: 'number',
  maxPrice: 'number',
  minArea: 'number',
  maxArea: 'number',
  areaUnit: 'string',
  furnishing: 'csv',
  facing: 'csv',
  developerId: 'string',
  amenityIds: 'csv',
  badgeIds: 'csv',
  isFeatured: 'bool',
  reraRegistered: 'bool',
  possessionBy: 'string',
  q: 'string',
  ids: 'csv',
  sort: 'string',
  page: 'int',
  perPage: 'int',
};

/** Values that are the engine's own behaviour rather than a choice — never in the URL. */
export const LISTING_DEFAULTS = { sort: 'relevance', page: 1, perPage: 12 };

/**
 * The filter groups, in the order the rail shows them.
 *
 * A group is what a chip removes and what `countActiveFilters` counts once:
 * a budget is one filter even though it travels as `minPrice` **and**
 * `maxPrice`.
 */
export const FILTER_GROUPS = [
  { id: 'listingType', keys: ['listingType'], label: 'Listing type' },
  { id: 'segment', keys: ['segment'], label: 'Segment' },
  { id: 'propertyType', keys: ['propertyTypeId'], label: 'Property type' },
  { id: 'locality', keys: ['localityId'], label: 'Locality' },
  { id: 'price', keys: ['minPrice', 'maxPrice'], label: 'Budget' },
  { id: 'bedrooms', keys: ['bedrooms'], label: 'Bedrooms' },
  { id: 'constructionStatus', keys: ['constructionStatus'], label: 'Construction status' },
  { id: 'area', keys: ['minArea', 'maxArea', 'areaUnit'], label: 'Area' },
  { id: 'furnishing', keys: ['furnishing'], label: 'Furnishing' },
  { id: 'facing', keys: ['facing'], label: 'Facing' },
  { id: 'amenities', keys: ['amenityIds'], label: 'Amenities' },
  { id: 'badges', keys: ['badgeIds'], label: 'Badges' },
  { id: 'developer', keys: ['developerId'], label: 'Builder' },
  { id: 'availability', keys: ['availability'], label: 'Availability' },
  { id: 'isFeatured', keys: ['isFeatured'], label: 'Featured' },
  { id: 'reraRegistered', keys: ['reraRegistered'], label: 'RERA registered' },
  { id: 'possessionBy', keys: ['possessionBy'], label: 'Possession by' },
  { id: 'q', keys: ['q'], label: 'Search' },
];

/**
 * Which filter is dropped first when a search comes back empty.
 *
 * The order is "most restrictive first": a budget excludes more listings than a
 * locality does, and somebody who filtered a neighbourhood usually means it.
 * `area` is unit-only noise on its own, so it is offered with the numbers.
 */
const WIDEN_ORDER = [
  'price',
  'area',
  'amenities',
  'bedrooms',
  'constructionStatus',
  'locality',
  'badges',
  'furnishing',
  'facing',
  'developer',
  'propertyType',
  'possessionBy',
  'q',
];

/** What removing a group is called, in the visitor's words. */
const WIDEN_LABELS = {
  price: 'Any budget',
  area: 'Any size',
  amenities: 'Any amenities',
  bedrooms: 'Any bedrooms',
  constructionStatus: 'Any construction status',
  locality: 'Any locality',
  badges: 'Any badge',
  furnishing: 'Any furnishing',
  facing: 'Any facing',
  developer: 'Any builder',
  propertyType: 'Any property type',
  possessionBy: 'Any possession date',
  q: 'Drop the search words',
};

const groupById = new Map(FILTER_GROUPS.map((group) => [group.id, group]));

/** `''`, `null`, `undefined` and `[]` are "not set"; `0` and `false` are values. */
export const hasValue = (value) => {
  if (value === undefined || value === null || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

/** One value out of a query string, or `undefined` when it is missing or unreadable. */
function readValue(raw, type) {
  if (raw === null || raw === undefined || raw === '') return undefined;

  if (type === 'csv') {
    const items = String(raw)
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
    return items.length > 0 ? items : undefined;
  }
  if (type === 'int' || type === 'number') {
    const parsed = type === 'int' ? parseInt(raw, 10) : Number(raw);
    // `?minPrice=abc` is not a price: drop it rather than request NaN (§7).
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (type === 'bool') {
    if (raw === true || raw === 'true') return true;
    if (raw === false || raw === 'false') return false;
    return undefined;
  }
  return String(raw);
}

/** A `URLSearchParams` for anything a caller might hold. */
function toSearchParams(input) {
  if (input instanceof URLSearchParams) return input;
  if (typeof input === 'string') return new URLSearchParams(input);
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(input ?? {})) {
    if (!hasValue(value)) continue;
    search.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  return search;
}

/**
 * The params a query string describes: typed, unknown keys ignored, unreadable
 * values dropped, and the defaults filled in.
 *
 * @param {URLSearchParams|string|object} input
 * @param {{ defaults?: object }} [options]
 * @returns {object}
 */
export function parseFilters(input, { defaults = LISTING_DEFAULTS } = {}) {
  const search = toSearchParams(input);
  const params = { ...defaults };

  for (const [key, type] of Object.entries(LISTING_PARAM_TYPES)) {
    const value = readValue(search.get(key), type);
    if (value !== undefined) params[key] = value;
  }

  const page = Number(params.page);
  params.page = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;

  return params;
}

/**
 * The query string for a set of params: arrays as comma-separated lists, and a
 * value equal to its default left out so `/buy` never grows a `?sort=relevance`.
 *
 * @param {object} params
 * @param {{ defaults?: object, omit?: string[] }} [options] `omit` drops the
 *   route's fixed params, which live in the path rather than the query
 * @returns {Record<string, string>}
 */
export function serializeFilters(params, { defaults = LISTING_DEFAULTS, omit = [] } = {}) {
  const search = {};
  const skip = new Set(omit);

  for (const key of Object.keys(LISTING_PARAM_TYPES)) {
    if (skip.has(key)) continue;
    const value = params?.[key];
    if (!hasValue(value)) continue;
    const text = Array.isArray(value) ? value.join(',') : String(value);
    if (text === '' || text === String(defaults?.[key] ?? '')) continue;
    search[key] = text;
  }

  return search;
}

/**
 * How many filters are active — the number on the "Filters (3)" button.
 *
 * Sorting, paging and an `ids` list are not filters, and a group the route
 * fixed is not the visitor's choice, so neither is counted.
 *
 * @param {object} params
 * @param {{ fixed?: object }} [options]
 * @returns {number}
 */
export function countActiveFilters(params, { fixed = {} } = {}) {
  return FILTER_GROUPS.reduce((count, group) => {
    const isFixed = group.keys.some((key) => hasValue(fixed[key]));
    if (isFixed) return count;
    // The unit alone says nothing: "sq ft" is only a filter with a number.
    const keys = group.id === 'area' ? ['minArea', 'maxArea'] : group.keys;
    return keys.some((key) => hasValue(params?.[key])) ? count + 1 : count;
  }, 0);
}

/**
 * The filters an empty result should offer to drop, most restrictive first.
 *
 * Only groups that are actually set are returned, and a group the route fixed
 * is never offered — `/localities/whitefield` cannot widen out of Whitefield.
 *
 * @param {object} params
 * @param {{ fixed?: object }} [options]
 * @returns {Array<{id: string, keys: string[], label: string}>}
 */
export function widenSuggestions(params, { fixed = {} } = {}) {
  return WIDEN_ORDER.map((id) => groupById.get(id))
    .filter(Boolean)
    .filter((group) => !group.keys.some((key) => hasValue(fixed[key])))
    .filter((group) =>
      (group.id === 'area' ? ['minArea', 'maxArea'] : group.keys).some((key) =>
        hasValue(params?.[key])
      )
    )
    .map((group) => ({ id: group.id, keys: group.keys, label: WIDEN_LABELS[group.id] }));
}

/** A patch that clears every key of the named groups (`{ minPrice: undefined, … }`). */
export function clearGroups(groupIds = []) {
  const patch = {};
  for (const id of groupIds) {
    for (const key of groupById.get(id)?.keys ?? []) patch[key] = undefined;
  }
  return patch;
}

/** A patch that clears every filter, keeping the sort and returning to page 1. */
export function clearAllFilters() {
  return {
    ...clearGroups(FILTER_GROUPS.map((group) => group.id)),
    page: 1,
  };
}

const listingFilters = {
  LISTING_PARAM_TYPES,
  LISTING_DEFAULTS,
  FILTER_GROUPS,
  hasValue,
  parseFilters,
  serializeFilters,
  countActiveFilters,
  widenSuggestions,
  clearGroups,
  clearAllFilters,
};

export default listingFilters;
