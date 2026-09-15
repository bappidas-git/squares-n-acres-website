/**
 * Generic filter helpers (00_MASTER_CONTEXT.md §5.6).
 *
 * Only the primitives live here — parsing a multi-value parameter, matching a
 * free-text query, testing a numeric range. The domain filters (property
 * facets, lead scoping, article publication windows) belong to the routes that
 * own them and arrive with prompts 08 and 09.
 */

const { getPath } = require('./sort');

/**
 * Splits a comma-separated query parameter into trimmed, non-empty values.
 * Repeated parameters (`?bedrooms=2&bedrooms=3`) are flattened the same way.
 *
 * @param {string|Array<string>|undefined} param
 * @returns {Array<string>}
 */
function inCsv(param) {
  if (param === undefined || param === null || param === '') return [];
  return []
    .concat(param)
    .flatMap((value) => String(value).split(','))
    .map((value) => value.trim())
    .filter(Boolean);
}

/**
 * Reads a boolean query parameter. `true`/`1`/`yes` are true, `false`/`0`/`no`
 * are false, anything else (including an absent parameter) is `undefined`, so
 * a caller can tell "not filtered" from "filtered to false".
 *
 * @param {*} param
 * @returns {boolean|undefined}
 */
function toBool(param) {
  const value = String(Array.isArray(param) ? param[0] : param)
    .trim()
    .toLowerCase();
  if (value === 'true' || value === '1' || value === 'yes') return true;
  if (value === 'false' || value === '0' || value === 'no') return false;
  return undefined;
}

/**
 * Case-insensitive substring match of `q` against the given field paths.
 *
 * @param {object} item
 * @param {Array<string>} fields dotted paths, e.g. `['title', 'locality.name']`
 * @param {string} q
 * @returns {boolean} true when `q` is empty — an absent search filters nothing
 */
function matchesQ(item, fields, q) {
  const needle = String(q ?? '')
    .trim()
    .toLowerCase();
  if (!needle) return true;

  return fields.some((field) => {
    const value = getPath(item, field);
    if (value === null || value === undefined) return false;
    if (Array.isArray(value)) {
      return value.some((entry) => String(entry).toLowerCase().includes(needle));
    }
    return String(value).toLowerCase().includes(needle);
  });
}

/**
 * Tests a value against an inclusive `[min, max]` range. A missing bound is
 * open; a missing value fails a bounded range and passes an unbounded one.
 *
 * @param {number|null|undefined} value
 * @param {number|null|undefined} min
 * @param {number|null|undefined} max
 * @returns {boolean}
 */
function range(value, min, max) {
  const hasMin = min !== null && min !== undefined && min !== '';
  const hasMax = max !== null && max !== undefined && max !== '';
  if (!hasMin && !hasMax) return true;

  const number = Number(value);
  if (!Number.isFinite(number)) return false;
  if (hasMin && number < Number(min)) return false;
  if (hasMax && number > Number(max)) return false;
  return true;
}

module.exports = { inCsv, toBool, matchesQ, range };
