/**
 * The one flag that tells the app it is being photographed rather than read.
 *
 * `scripts/prerender.js` drives a real Chrome over every public URL and saves
 * the rendered HTML (§9.9). Two things the app does for a human are wrong for
 * that crawl:
 *
 * - **Below-the-fold sections wait to be scrolled to.** A crawler never
 *   scrolls, so the saved HTML would be missing the localities, the builders,
 *   the insights and three of the four listing rows.
 * - **Sections fade in when they enter the viewport.** The ones that never
 *   entered it would be saved at `opacity: 0`.
 *
 * So the prerender sets `window.__SNA_PRERENDER__` before the first script
 * runs, and `useInView` reports "in view" immediately when it is set: every
 * section fetches at once and every section is visible. Nothing else in the
 * app branches on it, and in an ordinary browser it is simply absent.
 *
 * The attribute half of the contract lives in `hooks/usePrerenderReady.js`.
 */

/** The property the crawler sets on `window` before the page's own scripts. */
export const PRERENDER_FLAG = '__SNA_PRERENDER__';

/** The attribute the crawler waits for before it saves the page. */
export const PRERENDER_READY_ATTRIBUTE = 'data-prerender-ready';

/**
 * Whether this page is being rendered for the prerender crawl.
 *
 * @returns {boolean}
 */
export function isPrerendering() {
  return typeof window !== 'undefined' && window[PRERENDER_FLAG] === true;
}
