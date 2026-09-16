/**
 * The last eight listings a visitor opened, newest first.
 *
 * Kept in `localStorage` so the row survives the tab being closed, and holding
 * only what a card needs to render — an id, the address, the cover and the
 * headline figures — rather than the whole record, because a stored copy of a
 * property is a price that goes stale. The row that reads it (prompt 27) shows
 * the stored fields and links to the live page.
 */

import storage from './storage';

export const RECENT_KEY = 'sna_recent_properties';
export const MAX_RECENT = 8;

const read = () => {
  const stored = storage.getItem(RECENT_KEY, []);
  return Array.isArray(stored) ? stored.filter((entry) => entry && entry.id !== undefined) : [];
};

/**
 * Put a listing at the top of the list, moving it there if it is already in it.
 *
 * @param {{id: number|string, slug: string, title: string, coverUrl?: string,
 *   price?: number|null, listingType?: string, priceOnRequest?: boolean,
 *   locality?: string, bedrooms?: number|null}} entry
 * @returns {Array<object>} the list as stored
 */
export function add(entry) {
  if (!entry || entry.id === undefined || entry.id === null) return read();

  const record = {
    id: entry.id,
    slug: entry.slug ?? '',
    title: entry.title ?? '',
    coverUrl: entry.coverUrl ?? null,
    price: entry.price ?? null,
    priceOnRequest: entry.priceOnRequest === true,
    listingType: entry.listingType ?? 'sale',
    locality: entry.locality ?? '',
    bedrooms: entry.bedrooms ?? null,
    viewedAt: new Date().toISOString(),
  };

  const rest = read().filter((row) => String(row.id) !== String(record.id));
  const next = [record, ...rest].slice(0, MAX_RECENT);
  storage.setItem(RECENT_KEY, next);
  return next;
}

/**
 * The stored list, newest first.
 *
 * @param {{ exclude?: number|string }} [options] drops one id — the listing
 *   whose own page is asking
 * @returns {Array<object>}
 */
export function list({ exclude } = {}) {
  const rows = read();
  return exclude === undefined || exclude === null
    ? rows
    : rows.filter((row) => String(row.id) !== String(exclude));
}

/** Empty the list. */
export function clear() {
  storage.removeItem(RECENT_KEY);
}

const recentlyViewed = { RECENT_KEY, MAX_RECENT, add, list, clear };
export default recentlyViewed;
