/**
 * Listing facets (00_MASTER_CONTEXT.md §5.7).
 *
 * `meta.facets` tells the filter sidebar how many results each further choice
 * would leave, so the counts are computed **after** every other filter and
 * **before** pagination — that is what makes "Whitefield (3)" mean three of the
 * results you are looking at, not three in the database.
 *
 * A property is counted under every bedroom count it can be found under
 * (its own and its active unit configurations'), exactly as the `bedrooms`
 * filter matches it; the other three facets count each property once.
 */

const { bedroomsOf } = require('./propertyFilters');

/** Counts sorted by size, then by their own label, so ties are stable. */
function rank(counts, decorate) {
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .map(({ key, count }) => ({ ...decorate(key), count }))
    .filter((entry) => entry !== null)
    .sort(
      (a, b) =>
        b.count - a.count ||
        String(a.name ?? a.value).localeCompare(String(b.name ?? b.value), 'en', {
          numeric: true,
          sensitivity: 'base',
        })
    );
}

/** Adds one to `key`'s tally. */
function tally(counts, key) {
  if (key === null || key === undefined) return;
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

/**
 * The `meta.facets` block of a property list.
 *
 * @param {Array<object>} items the filtered result set, before pagination
 * @param {object} source collections the ids resolve against (the db state)
 * @returns {{propertyType: Array<object>, locality: Array<object>,
 *   bedrooms: Array<object>, constructionStatus: Array<object>}}
 */
function computeFacets(items, source = {}) {
  const propertyTypes = new Map();
  const localities = new Map();
  const bedrooms = new Map();
  const constructionStatus = new Map();

  for (const property of items) {
    tally(propertyTypes, property.propertyTypeId);
    tally(localities, property.location?.localityId);
    tally(constructionStatus, property.constructionStatus);
    for (const count of bedroomsOf(property)) tally(bedrooms, count);
  }

  const named = (collection) => (id) => {
    const record = (source[collection] ?? []).find((row) => row.id === id);
    return { id, name: record?.name ?? String(id) };
  };

  return {
    propertyType: rank(propertyTypes, named('propertyTypes')),
    locality: rank(localities, named('localities')),
    bedrooms: rank(bedrooms, (value) => ({ value })),
    constructionStatus: rank(constructionStatus, (value) => ({ value })),
  };
}

module.exports = { computeFacets };
