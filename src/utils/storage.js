/**
 * The single door to `localStorage` / `sessionStorage` (D10).
 *
 * Every read and write is JSON-encoded and wrapped, so a private window, a
 * blocked origin or a corrupted entry degrades to the default instead of
 * throwing. Keys carry the `sna_` prefix and are listed in
 * `00_MASTER_CONTEXT.md` §4.2.
 */

const area = ({ session = false } = {}) => {
  if (typeof window === 'undefined') return null;
  try {
    return session ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
};

/**
 * @param {string} key
 * @param {*} fallback returned when the key is missing or unreadable
 * @param {{ session?: boolean }} [options]
 */
export function getItem(key, fallback = null, options) {
  const store = area(options);
  if (!store) return fallback;
  try {
    const raw = store.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * @param {string} key
 * @param {*} value JSON-serialisable
 * @param {{ session?: boolean }} [options]
 * @returns {boolean} whether the write went through
 */
export function setItem(key, value, options) {
  const store = area(options);
  if (!store) return false;
  try {
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} key
 * @param {{ session?: boolean }} [options]
 */
export function removeItem(key, options) {
  const store = area(options);
  if (!store) return false;
  try {
    store.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * The keys that start with `prefix` — for a family of entries a feature tidies
 * up after itself, such as the one-time hand-offs of "Preview changes"
 * (prompt 51).
 *
 * @param {string} prefix
 * @param {{ session?: boolean }} [options]
 * @returns {Array<string>}
 */
export function keys(prefix, options) {
  const store = area(options);
  if (!store) return [];
  try {
    const found = [];
    for (let index = 0; index < store.length; index += 1) {
      const key = store.key(index);
      if (typeof key === 'string' && key.startsWith(prefix)) found.push(key);
    }
    return found;
  } catch {
    return [];
  }
}

const storage = { getItem, setItem, removeItem, keys };
export default storage;
