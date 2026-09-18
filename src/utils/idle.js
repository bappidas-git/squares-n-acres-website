/**
 * "Later, when the browser has nothing better to do."
 *
 * Two things on this site are genuinely not urgent: the measurement tags and
 * the web-vitals report. Both used to run as part of the first render, where
 * they competed with the hero image for bandwidth and with React for the main
 * thread — and a tag manager's container is a third-party script that can take
 * hundreds of milliseconds of it (§8.6).
 *
 * So both go through here: after `load`, and then in an idle slot. Every
 * function returns a cancel, because a React effect has to be able to take
 * back what it scheduled.
 *
 * `requestIdleCallback` is absent in Safari before 17, so the fallback is a
 * `setTimeout`. Nothing here needs the callback's deadline, only its timing.
 */

/** How long an idle slot may be waited for before it is taken anyway. */
const IDLE_TIMEOUT_MS = 2000;

/**
 * Runs `callback` in the browser's next idle slot.
 *
 * @param {() => void} callback
 * @param {{timeout?: number}} [options]
 * @returns {() => void} cancels it, if it has not run yet
 */
export function whenIdle(callback, { timeout = IDLE_TIMEOUT_MS } = {}) {
  if (typeof window === 'undefined') return () => {};

  if (typeof window.requestIdleCallback === 'function') {
    const handle = window.requestIdleCallback(callback, { timeout });
    return () => window.cancelIdleCallback?.(handle);
  }

  const handle = window.setTimeout(callback, 1);
  return () => window.clearTimeout(handle);
}

/**
 * Runs `callback` once the page has finished loading.
 *
 * A page that has already finished — a client-side navigation, a remount —
 * does not wait for a `load` event that will never fire again.
 *
 * @param {() => void} callback
 * @returns {() => void} cancels it, if it has not run yet
 */
export function afterLoad(callback) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  if (document.readyState === 'complete') {
    callback();
    return () => {};
  }

  window.addEventListener('load', callback, { once: true });
  return () => window.removeEventListener('load', callback);
}

/**
 * {@link afterLoad} and then {@link whenIdle} — the latest of the two.
 *
 * @param {() => void} callback
 * @param {{timeout?: number}} [options]
 * @returns {() => void} cancels whichever stage is still pending
 */
export function afterLoadIdle(callback, options) {
  let cancelIdle = () => {};
  const cancelLoad = afterLoad(() => {
    cancelIdle = whenIdle(callback, options);
  });

  return () => {
    cancelLoad();
    cancelIdle();
  };
}

const idle = { afterLoad, afterLoadIdle, whenIdle };

export default idle;
