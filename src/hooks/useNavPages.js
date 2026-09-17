import { useEffect, useState } from 'react';

import pageService from '../services/pageService';
import { isCanceled } from '../services/apiError';

/**
 * The CMS pages the header and the footer are built from
 * (`GET /pages?showInHeader=true` and `?showInFooter=true`).
 *
 * Four components need the same two lists — `Header`, `MobileDrawer`, `Footer`
 * and the bottom bar's drawer — and they are mounted on every public page, so
 * the answer is cached in memory for the page load the way `SiteSettingsContext`
 * caches the settings (D93). The first component to mount makes the request;
 * the rest join the promise already in flight.
 *
 * A failed request leaves both lists empty, which is exactly what the menus do
 * with it: a menu key with no pages behind it is not rendered (§7).
 */

/** `{ header, footer }` once the request has resolved. */
let cache = null;

/** The request in flight, so three mounts in one tick make one call. */
let pending = null;

const EMPTY = { header: [], footer: [] };

/** Both lists, fetched once per page load. */
function load() {
  if (cache) return Promise.resolve(cache);
  if (pending) return pending;

  pending = Promise.all([
    pageService.list({ showInHeader: true }),
    pageService.list({ showInFooter: true }),
  ])
    .then(([header, footer]) => {
      cache = {
        header: Array.isArray(header?.data) ? header.data : [],
        footer: Array.isArray(footer?.data) ? footer.data : [],
      };
      return cache;
    })
    .finally(() => {
      pending = null;
    });

  return pending;
}

/** Forgets the cached lists — for tests, and for a settings save that adds a page. */
export function resetNavPagesCache() {
  cache = null;
  pending = null;
}

/**
 * @returns {{header: Array<object>, footer: Array<object>, loading: boolean}}
 *   each row is `{ slug, title, headerMenu, footerColumn, order }`
 */
export default function useNavPages() {
  const [pages, setPages] = useState(cache ?? EMPTY);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) {
      setPages(cache);
      setLoading(false);
      return undefined;
    }

    let alive = true;
    setLoading(true);

    load()
      .then((result) => {
        if (!alive) return;
        setPages(result);
        setLoading(false);
      })
      .catch((error) => {
        if (!alive || isCanceled(error)) return;
        setPages(EMPTY);
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  return { header: pages.header, footer: pages.footer, loading };
}
