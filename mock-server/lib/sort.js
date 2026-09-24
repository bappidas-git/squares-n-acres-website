/**
 * Sorting (00_MASTER_CONTEXT.md §5.6).
 *
 * A sort specification is either a string (`'pricing.price'`,
 * `'isFeatured,updatedAt'`, `'-viewCount'`) or an array of
 * `{ field, order }` pairs. Field paths are dotted, so `pricing.price` and
 * `location.localityId` sort as well as a top-level key does.
 */

/** Reads a dotted path off an object; `undefined` when any step is missing. */
function getPath(source, path) {
  return String(path)
    .split('.')
    .reduce(
      (value, key) => (value === null || value === undefined ? undefined : value[key]),
      source
    );
}

/**
 * Normalises a sort specification into `[{ field, order }]`.
 *
 * @param {string|Array<string|{field: string, order?: string}>} spec
 * @param {string} [order] the `order` query parameter (`asc` | `desc`), which
 *   applies to the first key, or to every key when the spec is a single string
 * @returns {Array<{field: string, order: 'asc'|'desc'}>}
 */
function parseSort(spec, order) {
  if (!spec) return [];
  const orders = String(order || '')
    .split(',')
    .map((value) => (value.trim().toLowerCase() === 'desc' ? 'desc' : 'asc'));

  const keys = Array.isArray(spec) ? spec : String(spec).split(',');
  return keys
    .map((key, index) => {
      if (key && typeof key === 'object') {
        return { field: key.field, order: key.order === 'desc' ? 'desc' : 'asc' };
      }
      const field = String(key).trim();
      if (field.startsWith('-')) return { field: field.slice(1), order: 'desc' };
      return { field, order: orders[index] ?? orders[0] ?? 'asc' };
    })
    .filter((key) => key.field);
}

/** Whether a value is the "nothing" that sorts after every value. */
const isMissing = (value) => value === null || value === undefined || value === '';

/**
 * Compares two values of unknown type; `null`/`undefined` sort last.
 *
 * Ascending only — {@link sortItems} turns the answer round for `desc`, and
 * keeps the missing values last whichever way it sorts.
 */
function compareValues(a, b) {
  const aMissing = a === null || a === undefined || a === '';
  const bMissing = b === null || b === undefined || b === '';
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;

  if (typeof a === 'boolean' || typeof b === 'boolean') {
    return Number(Boolean(b)) - Number(Boolean(a));
  }
  if (typeof a === 'number' && typeof b === 'number') return a - b;

  return String(a).localeCompare(String(b), 'en', { numeric: true, sensitivity: 'base' });
}

/**
 * Returns a sorted copy of `items`.
 *
 * @param {Array<object>} items
 * @param {string|Array} spec see {@link parseSort}
 * @param {string} [order]
 * @returns {Array<object>}
 */
function sortItems(items, spec, order) {
  const keys = parseSort(spec, order);
  if (keys.length === 0) return items.slice();

  return items.slice().sort((left, right) => {
    for (const { field, order: direction } of keys) {
      const a = getPath(left, field);
      const b = getPath(right, field);
      // Nulls last in both directions (§5.6, `05_business_rules.md`): turning
      // the whole comparison round for `desc` used to put every draft — an
      // article with no `publishedAt` — at the top of "newest first" (QA-55).
      if (isMissing(a) || isMissing(b)) {
        const result = compareValues(a, b);
        if (result !== 0) return result;
        continue;
      }
      const result = compareValues(a, b);
      if (result !== 0) return direction === 'desc' ? -result : result;
    }
    return 0;
  });
}

module.exports = { sortItems, parseSort, compareValues, getPath };
