/**
 * A three-function event bus for the things one screen does and another needs
 * to know about.
 *
 * The admin has exactly one of these problems: a record is saved on one screen
 * and a cache somewhere else is now a lie. The SEO panel's site-wide index —
 * the rows its uniqueness tests compare against — is loaded once per admin
 * session (§9.1), so a title changed in the property form has to reach the
 * article form's copy of that list without either screen knowing the other
 * exists. `emit('seo:changed')` after a save is the whole mechanism.
 *
 * Deliberately not a context: the listeners are caches rather than components,
 * they outlive the tree that registered them, and nothing here should cause a
 * render of its own.
 *
 *   import { EVENTS, emit, on } from '../utils/events';
 *
 *   useEffect(() => on(EVENTS.seoChanged, reload), [reload]);
 *   emit(EVENTS.seoChanged, { entityType: 'property', id: 12 });
 */

/** The names this application publishes, so a typo is a build-time mistake. */
export const EVENTS = {
  /** A record's `seo` branch was saved: every cached SEO index is now stale. */
  seoChanged: 'seo:changed',
  /**
   * `siteSettings` was saved, with the new record as the detail. The screen
   * that saved it has already refreshed `SiteSettingsContext`; this is for
   * anything else holding a copy — the Cloudinary configuration a media screen
   * read, a preview built from the brand assets.
   */
  settingsChanged: 'settings:changed',
};

/** @type {Map<string, Set<Function>>} */
const listeners = new Map();

/**
 * Stops listening. Safe to call twice, and safe to call for a handler that was
 * never registered.
 *
 * @param {string} name
 * @param {Function} handler
 */
export function off(name, handler) {
  const handlers = listeners.get(name);
  if (!handlers) return;
  handlers.delete(handler);
  if (handlers.size === 0) listeners.delete(name);
}

/**
 * Starts listening, and answers with the function that stops — which is what
 * an effect wants to return.
 *
 * @param {string} name
 * @param {(detail: unknown) => void} handler
 * @returns {() => void} the unsubscribe
 */
export function on(name, handler) {
  if (typeof handler !== 'function') return () => {};
  const handlers = listeners.get(name) ?? new Set();
  handlers.add(handler);
  listeners.set(name, handlers);
  return () => off(name, handler);
}

/**
 * Tells every listener, and never lets one of them break the others — or the
 * save that published the event.
 *
 * @param {string} name
 * @param {unknown} [detail]
 */
export function emit(name, detail) {
  const handlers = listeners.get(name);
  if (!handlers) return;

  for (const handler of [...handlers]) {
    try {
      handler(detail);
    } catch (thrown) {
      // A stale cache is a smaller problem than a save that appears to fail.
      console.error(`A listener of “${name}” threw.`, thrown);
    }
  }
}

/** Every listener of every event — for tests, which must not leak into each other. */
export function clearAll() {
  listeners.clear();
}

const events = { EVENTS, clearAll, emit, off, on };

export default events;
