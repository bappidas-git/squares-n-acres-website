import { useEffect } from 'react';

import { PRERENDER_READY_ATTRIBUTE } from '../utils/prerender';

/**
 * Tells the prerender crawler that this page has finished its primary query.
 *
 * `scripts/prerender.js` has to know when a page is worth saving. `networkidle`
 * is not that moment — a page fetches its record *after* the bundle settles and
 * renders a skeleton in between — so every public page says so itself: once its
 * own request has resolved, `<main>` carries `data-prerender-ready` and the
 * crawler saves the HTML (§9.9).
 *
 * **It is the end of the wait, not the end of success.** A page whose data
 * failed renders an error state, and that is still a finished page: it reports
 * ready, the crawl moves on, and the prerender run reports what it saved rather
 * than hanging for ten seconds on every URL behind a broken endpoint.
 *
 * The attribute goes on the `<main>` of `MainLayout` rather than on an element
 * of the page, because the page is `<main>`'s child and a crawler should not
 * have to know which one.
 *
 *   const { data, loading } = useApi(…);
 *   usePrerenderReady(loading);
 *
 * @param {boolean} loading whether the page's primary query is still in flight
 */
export default function usePrerenderReady(loading) {
  useEffect(() => {
    if (loading) return undefined;
    if (typeof document === 'undefined') return undefined;

    const main = document.getElementById('main-content') ?? document.querySelector('main');
    if (!main) return undefined;

    main.setAttribute(PRERENDER_READY_ATTRIBUTE, 'true');
    // Removed on the way out so the next route starts un-ready: the crawler
    // opens each URL in a fresh document, but a human navigating the app would
    // otherwise leave the flag standing from the first page they opened.
    return () => main.removeAttribute(PRERENDER_READY_ATTRIBUTE);
  }, [loading]);
}
