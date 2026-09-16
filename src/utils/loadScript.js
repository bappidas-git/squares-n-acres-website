/**
 * Loads a third-party `<script>` once, on demand (decision D42).
 *
 * The Google Maps JS API is the only script the product injects, and it is
 * injected only where a key exists — a keyless install renders the iframe embed
 * instead, which needs no script at all. Keeping the loader here rather than in
 * the component means a second caller reuses the same promise rather than
 * adding a second `<script>` for the same URL, which is what makes the Maps API
 * complain about being loaded twice.
 *
 * A failure rejects; it never throws into a render. The caller is expected to
 * fall back to the keyless path and say so.
 */

/** url → the promise of its load, resolved or pending. */
const pending = new Map();

/**
 * @param {string} src the script URL
 * @param {object} [options]
 * @param {string} [options.id] an `id` for the tag, so it is findable
 * @param {number} [options.timeoutMs] rejects when the script never fires
 * @returns {Promise<void>} resolved once the script has run
 */
export default function loadScript(src, { id, timeoutMs = 15000 } = {}) {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('Scripts can only be loaded in a browser.'));
  }
  if (pending.has(src)) return pending.get(src);

  const promise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing?.dataset.loaded === 'true') {
      resolve();
      return;
    }

    const script = existing ?? document.createElement('script');
    let timer = null;

    const settle = (fail) => {
      if (timer) window.clearTimeout(timer);
      script.removeEventListener('load', onLoad);
      script.removeEventListener('error', onError);
      if (fail) {
        // A failed load is worth retrying — the next caller starts over.
        pending.delete(src);
        script.remove();
        reject(fail);
        return;
      }
      script.dataset.loaded = 'true';
      resolve();
    };

    const onLoad = () => settle(null);
    const onError = () => settle(new Error(`The script at ${src} could not be loaded.`));

    script.addEventListener('load', onLoad);
    script.addEventListener('error', onError);

    if (timeoutMs > 0) {
      timer = window.setTimeout(
        () => settle(new Error(`The script at ${src} did not load in time.`)),
        timeoutMs
      );
    }

    if (!existing) {
      script.src = src;
      script.async = true;
      script.defer = true;
      if (id) script.id = id;
      document.head.appendChild(script);
    }
  });

  pending.set(src, promise);
  return promise;
}

/** Forgets what has been loaded — for a test that asserts on the injection. */
export const resetLoadedScripts = () => pending.clear();
