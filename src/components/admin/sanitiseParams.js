/**
 * The list parameters a screen may act on (QA-59, QA-61).
 */

/** The values a toggle filter can hold (§5.6). */
const TOGGLE_VALUES = new Set(['true', 'false']);

/**
 * The list's parameters as the screen may act on them (QA-59).
 *
 * The URL is somebody's to type, and a value no control can show is no
 * filter: `?category=bogus&showOnHome=maybe` drew "Category: bogus" and "Home
 * page: Not on the home page" chips over selects reading "All categories" and
 * "Anywhere", and a list narrowed to nothing by the one the API did read. A
 * sort that is not a column is the default sort, and an `order` that is not a
 * direction is the default direction — `?order=desc` of a drag list used to
 * turn it upside down and every move into its opposite.
 *
 * A filter whose `options` are `null` has none to judge by yet — they are
 * still loading — and its value is kept as it stands (QA-61).
 *
 * @param {object} params what the URL holds
 * @param {{filters?: Array<object>, sortKeys?: Array<string>, defaults?: object}} spec
 * @returns {object} the params, with what cannot be honoured left out
 */
export default function sanitiseParams(
  params,
  { filters = [], sortKeys = [], defaults = {} } = {}
) {
  const clean = { ...params };

  for (const filter of filters) {
    const value = clean[filter.key];
    if (value === undefined || value === null || value === '') continue;

    if (filter.type === 'toggle') {
      if (!TOGGLE_VALUES.has(String(value))) clean[filter.key] = undefined;
      continue;
    }

    const known = Array.isArray(filter.options)
      ? new Set(filter.options.map((option) => String(option.value)))
      : null;
    if (!known) continue;

    if (filter.type === 'select' && !known.has(String(value))) clean[filter.key] = undefined;
    if (filter.type === 'multiselect' && Array.isArray(value)) {
      const kept = value.filter((entry) => known.has(String(entry)));
      clean[filter.key] = kept.length > 0 ? kept : undefined;
    }
  }

  if (sortKeys.length > 0 && !sortKeys.includes(clean.sort)) {
    clean.sort = defaults.sort;
    clean.order = defaults.order;
  }
  if (clean.order !== 'asc' && clean.order !== 'desc') clean.order = defaults.order;

  return clean;
}
