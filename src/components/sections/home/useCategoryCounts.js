import { useEffect, useMemo, useRef, useState } from 'react';

import propertyService from '../../../services/propertyService';
import { isCanceled } from '../../../services/apiError';

/**
 * How many listings a set of filters would return, for the tiles that promise
 * a number before the visitor clicks.
 *
 * There is no "count" endpoint and there does not need to be one: `GET
 * /properties?perPage=1` already answers `meta.total` for exactly those
 * filters (§5.2), so a tile costs one row of JSON rather than a page of
 * listings. The home page asks for a dozen of them at once, which is why the
 * answers are cached in memory for five minutes and why two sections asking
 * for the same filters share one request.
 *
 * A request that fails resolves to `null`, and a `null` count is **not drawn**:
 * "Ready to move" with nothing beside it is honest, "Ready to move 0" is a
 * claim the page cannot make (§7).
 */

/** Long enough that a visitor never waits twice, short enough to stay true. */
export const COUNT_TTL_MS = 5 * 60 * 1000;

/** `key → { total, expires }`. */
const cache = new Map();

/** `key → Promise`, so a filter asked for twice in one tick is fetched once. */
const pending = new Map();

/** Stable cache key: the same filters in any order are the same request. */
function cacheKey(params) {
  return JSON.stringify(
    Object.entries(params ?? {})
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .sort(([left], [right]) => left.localeCompare(right))
  );
}

/** Empties the cache — for tests, and for a route that must not show stale totals. */
export function resetCategoryCounts() {
  cache.clear();
  pending.clear();
}

/**
 * `meta.total` for one filter set, from the cache when it is still warm.
 *
 * @param {object} params a `GET /properties` filter set (§5.7)
 * @returns {Promise<number|null>}
 */
export function countFor(params) {
  const key = cacheKey(params);
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.total);
  if (pending.has(key)) return pending.get(key);

  const request = propertyService
    .list({ ...params, perPage: 1 })
    .then((response) => {
      const total = Number(response?.meta?.total);
      const value = Number.isFinite(total) ? total : null;
      if (value !== null) cache.set(key, { total: value, expires: Date.now() + COUNT_TTL_MS });
      return value;
    })
    .catch((error) => {
      if (!isCanceled(error)) cache.delete(key);
      return null;
    })
    .finally(() => pending.delete(key));

  pending.set(key, request);
  return request;
}

/**
 * The counts for a list of named filter sets.
 *
 *   const { counts } = useCategoryCounts([
 *     { key: 'ready', params: { constructionStatus: 'ready-to-move' } },
 *   ]);
 *   counts.ready // 14, or null while it is on its way / if it failed
 *
 * @param {Array<{key: string, params: object}>} requests
 * @returns {{counts: Record<string, number|null>, loading: boolean}}
 */
export default function useCategoryCounts(requests) {
  const list = useMemo(() => (Array.isArray(requests) ? requests : []), [requests]);
  // The effect keys on what was actually asked for, so a caller may rebuild
  // its array on every render without restarting the requests.
  const signature = useMemo(
    () => list.map((entry) => `${entry.key}:${cacheKey(entry.params)}`).join('|'),
    [list]
  );

  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(list.length > 0);

  // The effect reads the array through a ref and keys on the signature, so a
  // caller that rebuilds its list on every render never restarts the requests.
  const latest = useRef(list);
  latest.current = list;

  useEffect(() => {
    const entries = latest.current;

    if (entries.length === 0) {
      setCounts({});
      setLoading(false);
      return undefined;
    }

    let alive = true;
    setLoading(true);

    Promise.all(entries.map((entry) => countFor(entry.params))).then((totals) => {
      if (!alive) return;
      setCounts(Object.fromEntries(entries.map((entry, index) => [entry.key, totals[index]])));
      setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, [signature]);

  return { counts, loading };
}
