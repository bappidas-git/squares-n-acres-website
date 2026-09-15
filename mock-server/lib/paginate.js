/**
 * Pagination (00_MASTER_CONTEXT.md §5.2, §5.6).
 *
 * Every list response carries `meta`, including the ones that are not
 * paginated: those report `page: 1`, `perPage: total`, `totalPages: 1`.
 */

const DEFAULT_PER_PAGE_PUBLIC = 12;
const DEFAULT_PER_PAGE_ADMIN = 20;
const MAX_PER_PAGE = 100;

/** A positive integer from an arbitrary query value, or `fallback`. */
function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(Array.isArray(value) ? value[0] : value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * The `meta` block of a list response.
 *
 * @param {{page?: number, perPage?: number|null, total: number}} input
 *   `perPage` is `null` for an unpaginated list (`perPage=all`).
 * @returns {{page: number, perPage: number, total: number, totalPages: number}}
 */
function buildMeta({ page = 1, perPage = null, total = 0 }) {
  if (perPage === null || perPage === undefined) {
    return { page: 1, perPage: total, total, totalPages: 1 };
  }
  return {
    page,
    perPage,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / perPage),
  };
}

/**
 * Slices `items` and describes the slice.
 *
 * @param {Array<*>} items every row the filters matched
 * @param {{page?: number|string, perPage?: number|string|null}} [query]
 * @returns {{data: Array<*>, meta: object}}
 */
function paginate(items, { page, perPage } = {}) {
  const total = items.length;
  if (perPage === null || perPage === 'all') {
    return { data: items.slice(), meta: buildMeta({ total, perPage: null }) };
  }

  const size = Math.min(toPositiveInt(perPage, DEFAULT_PER_PAGE_PUBLIC), MAX_PER_PAGE);
  const current = toPositiveInt(page, 1);
  const start = (current - 1) * size;

  return {
    data: items.slice(start, start + size),
    meta: buildMeta({ page: current, perPage: size, total }),
  };
}

module.exports = {
  paginate,
  buildMeta,
  toPositiveInt,
  DEFAULT_PER_PAGE_PUBLIC,
  DEFAULT_PER_PAGE_ADMIN,
  MAX_PER_PAGE,
};
