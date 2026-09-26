/**
 * `GET /properties/counts` (prompt 51): how many live listings carry each
 * value of the dimensions a request names, under the same listing filters as
 * `GET /properties` — the home page's tiles in two requests rather than one a
 * tile.
 *
 * The dimensions are the registry's (`PROPERTY_COUNT_DIMENSIONS`); a name in
 * `by` that is not one of them is ignored, as an unknown query parameter is.
 */

const { PROPERTY_COUNT_DIMENSIONS } = require('../../src/services/endpoints');
const { inCsv } = require('./filters');

/** What each dimension reads off a listing. */
const READERS = {
  segment: (property) => property.segment,
  propertyTypeId: (property) => property.propertyTypeId,
  listingType: (property) => property.listingType,
  constructionStatus: (property) => property.constructionStatus,
  localityId: (property) => property.location?.localityId,
};

/** The parameters that say what to count and how to page, not which listings. */
const NOT_FILTERS = new Set(['by', 'page', 'perPage', 'sort', 'order']);

/**
 * The dimensions a `by` names, known ones only, each once, in the order asked.
 *
 * @param {string|string[]} by
 * @returns {string[]}
 */
function dimensionsOf(by) {
  return [...new Set(inCsv(by))].filter((name) => PROPERTY_COUNT_DIMENSIONS.includes(name));
}

/**
 * The query without `by` and the paging parameters: the listing filters.
 *
 * @param {object} query
 * @returns {object}
 */
function filtersOf(query = {}) {
  return Object.fromEntries(Object.entries(query).filter(([key]) => !NOT_FILTERS.has(key)));
}

/**
 * `{ <dimension>: { <value>: count } }` — the values as strings, as a JSON
 * object's keys are, and only the values some listing carries.
 *
 * @param {Array<object>} items the listings, already filtered
 * @param {string[]} dimensions
 * @returns {Record<string, Record<string, number>>}
 */
function countBy(items, dimensions) {
  const counts = {};
  for (const dimension of dimensions) {
    const read = READERS[dimension];
    const tally = {};
    for (const property of items) {
      const value = read(property);
      if (value === undefined || value === null || value === '') continue;
      const key = String(value);
      tally[key] = (tally[key] ?? 0) + 1;
    }
    counts[dimension] = tally;
  }
  return counts;
}

module.exports = { countBy, dimensionsOf, filtersOf };
