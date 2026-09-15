/**
 * View-count debouncing (00_MASTER_CONTEXT.md §5.14, §10).
 *
 * `POST /properties/:id/view` is called by the detail page on every mount, so
 * one visitor reloading a listing must not inflate `viewCount`. The mock keeps
 * the last counted moment per IP and property in memory for an hour — a
 * restart forgets it, which is the point: this is a fixture, not analytics.
 */

/** The window §5.14 gives: one counted view per IP per property per hour. */
const VIEW_WINDOW_MS = 3_600_000;

/** @type {Map<string, number>} `<ip>:<propertyId>` → the moment it was counted */
const seen = new Map();

/** Drops entries older than the window, so the map cannot grow without bound. */
function prune(now) {
  for (const [key, moment] of seen) {
    if (now - moment >= VIEW_WINDOW_MS) seen.delete(key);
  }
}

/**
 * Whether this view counts, remembering it when it does.
 *
 * @param {string} ip
 * @param {number|string} propertyId
 * @param {number} [now]
 * @returns {boolean} false while the same visitor is inside the window
 */
function countView(ip, propertyId, now = Date.now()) {
  prune(now);

  const key = `${ip}:${propertyId}`;
  const last = seen.get(key);
  if (last !== undefined && now - last < VIEW_WINDOW_MS) return false;

  seen.set(key, now);
  return true;
}

/** Forgets every recorded view — used by the tests. */
const resetViews = () => seen.clear();

module.exports = { countView, resetViews, VIEW_WINDOW_MS };
