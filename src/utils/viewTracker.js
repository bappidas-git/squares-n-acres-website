/**
 * One view per property per session (D29).
 *
 * `POST /properties/:id/view` is what moves `viewCount`, and a visitor who
 * opens a listing, walks to the similar row and comes back would otherwise
 * count twice — client-side navigation never reloads the page, so nothing else
 * would stop it. The set lives in `sessionStorage`, so closing the tab starts a
 * fresh session and the counter keeps meaning "sessions", not "renders".
 */

import storage from './storage';

export const VIEWED_KEY = 'sna_viewed_properties';

const readIds = () => {
  const stored = storage.getItem(VIEWED_KEY, [], { session: true });
  return Array.isArray(stored) ? stored.map(String) : [];
};

/** Whether this session has already counted a view of `id`. */
export function hasViewed(id) {
  if (id === null || id === undefined) return false;
  return readIds().includes(String(id));
}

/**
 * Remember a view.
 *
 * @param {number|string} id
 * @returns {boolean} `true` the first time in a session — the caller then
 *   sends the request — and `false` every time after
 */
export function recordView(id) {
  if (id === null || id === undefined) return false;
  const ids = readIds();
  const key = String(id);
  if (ids.includes(key)) return false;

  storage.setItem(VIEWED_KEY, [...ids, key], { session: true });
  return true;
}

/** The ids counted so far this session. */
export function viewedIds() {
  return readIds();
}

/** Forget every view — the tests use it; nothing on the site does. */
export function reset() {
  storage.removeItem(VIEWED_KEY, { session: true });
}

const viewTracker = { VIEWED_KEY, hasViewed, recordView, viewedIds, reset };
export default viewTracker;
