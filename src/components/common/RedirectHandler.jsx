import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';

import redirectService, { matchRedirect } from '../../services/redirectService';
import storage from '../../utils/storage';

/**
 * The redirects table, applied in the browser (§9.10, D30).
 *
 * A single-page app cannot answer 301 — the server answered 200 with the app
 * shell before any of this ran — so the closest honest equivalent is a
 * `<Navigate replace>`: the visitor lands where the rule says, and the URL they
 * typed is gone from their history rather than one back-button press away. The
 * real 301s belong in Nginx, which is why the SEO desk exports them as a server
 * snippet and the guidelines document it (prompt 47).
 *
 * The table is fetched **once** and cached for ten minutes — in this module for
 * the life of the tab, and in `sessionStorage` so a reload does not re-fetch —
 * because a request per navigation would put the redirect rules on the critical
 * path of every click on the site.
 *
 * Mounted in `App`, under the router and above the routes, so it sees every
 * navigation the app makes.
 */

/** §4.2 storage keys. */
export const CACHE_KEY = 'sna_redirects';

/** Ten minutes: long enough to be free, short enough that an editor's fix lands. */
export const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * How many redirects may be followed in a row before this stops.
 *
 * A rule that sends `/a` to `/b` and one that sends `/b` to `/a` is a mistake
 * an editor can make in thirty seconds, and without a counter the browser would
 * spin on it forever.
 */
export const MAX_HOPS = 5;

/** The table for the life of the tab, so a route change costs nothing. */
let memory = null;

/** The cached table, or `null` when there is none or it has gone stale. */
function readCache() {
  if (memory && Date.now() - memory.savedAt <= CACHE_TTL_MS) return memory.rules;

  const cached = storage.getItem(CACHE_KEY, null, { session: true });
  if (!cached?.savedAt || Date.now() - cached.savedAt > CACHE_TTL_MS) return null;

  memory = cached;
  return cached.rules ?? null;
}

function writeCache(rules) {
  memory = { savedAt: Date.now(), rules };
  storage.setItem(CACHE_KEY, memory, { session: true });
}

/** Forgets the table — what a test calls between cases. */
export function clearCache() {
  memory = null;
  storage.removeItem(CACHE_KEY, { session: true });
}

/** Whether a target leaves this site altogether. */
const isExternal = (target) => /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('//');

/** A path compares without its trailing slash, as the API stores it. */
const normalise = (path) => String(path ?? '').replace(/\/+$/, '') || '/';

export default function RedirectHandler() {
  const location = useLocation();
  const [rules, setRules] = useState(readCache);
  const hops = useRef(0);

  useEffect(() => {
    if (rules) return undefined;

    const controller = new AbortController();
    redirectService
      .list({ signal: controller.signal })
      .then((envelope) => {
        if (controller.signal.aborted) return;
        const list = Array.isArray(envelope?.data) ? envelope.data : [];
        writeCache(list);
        setRules(list);
      })
      .catch(() => {
        // A table we cannot read is an empty table: every URL keeps working,
        // and the ones that should have moved simply have not.
        if (!controller.signal.aborted) setRules([]);
      });

    return () => controller.abort();
  }, [rules]);

  const rule = useMemo(
    () => (rules ? matchRedirect(location.pathname, rules) : null),
    [rules, location.pathname]
  );

  // A rule that points at the page it is on is not a redirect, it is a loop of
  // one; a chain that has gone on too long is a loop of several.
  const target = String(rule?.toPath ?? '').trim();
  const external = Boolean(target) && isExternal(target);
  const circular =
    Boolean(target) && !external && normalise(target) === normalise(location.pathname);
  const follow = Boolean(target) && !circular && hops.current < MAX_HOPS;

  useEffect(() => {
    if (!target) {
      // Landing somewhere nothing redirects away from ends the chain.
      hops.current = 0;
      return;
    }
    if (circular || hops.current >= MAX_HOPS) {
      console.warn(
        `Redirect loop stopped at “${location.pathname}” after ${hops.current} hop(s). Check the rules in Admin → SEO → Redirects.`
      );
      return;
    }
    hops.current += 1;
    if (external) window.location.assign(target);
  }, [target, external, circular, location.pathname]);

  if (!follow || external) return null;

  // The visitor's query string travels with them, unless the rule wrote one of
  // its own — a rule that says `?utm_source=print` meant it.
  const search = target.includes('?') ? '' : location.search;
  return <Navigate to={`${target}${search}${location.hash}`} replace />;
}
