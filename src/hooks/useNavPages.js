import { useEffect, useState } from 'react';

import headerMenuService from '../services/headerMenuService';
import pageService from '../services/pageService';

/**
 * What the header and the footer are built from: the CMS pages placed in them
 * (`GET /pages?showInHeader=true` and `?showInFooter=true`) and the header's
 * menus themselves (`GET /header-menus`, QA-56).
 *
 * Four components need the same answer — `Header`, `MobileDrawer`, `Footer`
 * and the bottom bar's drawer — and they are mounted on every public page, so
 * it is cached in memory for the page load the way `SiteSettingsContext`
 * caches the settings (D93). The first component to mount makes the requests;
 * the rest join the ones already in flight.
 *
 * Each list fails alone. A page list that cannot be read is empty, which is
 * exactly what the menus do with it: a menu with nothing behind it is not
 * rendered (§7). A menu list that cannot be read is `null`, not empty — the
 * header then draws the menus the site ships with (`config/headerMenus.js`)
 * rather than no header at all, where an empty list would be an editor having
 * hidden every menu. A partial answer is not cached, so the next page asks
 * again.
 */

/** `{ header, footer, menus }` once every request has answered. */
let cache = null;

/** The requests in flight, so three mounts in one tick make one set of calls. */
let pending = null;

const EMPTY = { header: [], footer: [], menus: null };

/** The rows of a settled request, or `null` when it failed. */
const rowsOf = (result) =>
  result.status === 'fulfilled' && Array.isArray(result.value?.data) ? result.value.data : null;

/** The three lists, fetched once per page load. */
function load() {
  if (cache) return Promise.resolve(cache);
  if (pending) return pending;

  pending = Promise.allSettled([
    pageService.list({ showInHeader: true }),
    pageService.list({ showInFooter: true }),
    headerMenuService.list(),
  ])
    .then((results) => {
      const [header, footer, menus] = results.map(rowsOf);
      const answer = { header: header ?? [], footer: footer ?? [], menus };
      if (results.every((result) => result.status === 'fulfilled')) cache = answer;
      return answer;
    })
    .finally(() => {
      pending = null;
    });

  return pending;
}

/**
 * Forgets the cached lists — for tests, and for an admin write that changes a
 * menu: a page published, placed or moved, a menu renamed.
 */
export function resetNavPagesCache() {
  cache = null;
  pending = null;
}

/**
 * @returns {{header: Array<object>, footer: Array<object>, menus: Array<object>|null,
 *   loading: boolean}} a page row is `{ slug, title, headerMenu, headerSubmenu,
 *   footerColumn, order }`; `menus` is `null` until the menus are read
 */
export default function useNavPages() {
  const [lists, setLists] = useState(cache ?? EMPTY);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) {
      setLists(cache);
      setLoading(false);
      return undefined;
    }

    let alive = true;
    setLoading(true);

    load().then((result) => {
      if (!alive) return;
      setLists(result);
      setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, []);

  return { header: lists.header, footer: lists.footer, menus: lists.menus, loading };
}
