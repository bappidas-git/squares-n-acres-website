import { useEffect, useMemo, useRef, useState } from 'react';

import propertyService from '../../../services/propertyService';
import { isCanceled } from '../../../services/apiError';

/**
 * How many listings a set of filters would return, for the tiles that promise
 * a number before the visitor clicks.
 *
 * The home page's tiles ask two questions of `GET /properties/counts` (prompt
 * 51) rather than one `GET /properties?perPage=1` a tile — twenty-three
 * requests became two:
 *
 *   - `by=segment,listingType,propertyTypeId` — the Plots, Rent and Commercial
 *     tiles and every property-type tile;
 *   - `by=constructionStatus&listingType=sale` — the three sale-status tiles.
 *
 * A filter set neither answers is still counted on its own, from `meta.total`
 * of `GET /properties?perPage=1` (§5.2) — and so is every tile when the API
 * answers the counts with 404 or 501: a backend that has not built the
 * endpoint gets the per-tile requests it always had, and the numbers are the
 * same either way. The answers are cached in memory for five minutes, and two
 * sections asking the same question share one request.
 *
 * A request that fails otherwise resolves to `null`, and a `null` count is
 * **not drawn**: "Ready to move" with nothing beside it is honest, "Ready to
 * move 0" is a claim the page cannot make (§7).
 */

/** Long enough that a visitor never waits twice, short enough to stay true. */
export const COUNT_TTL_MS = 5 * 60 * 1000;

/** The two questions the tiles ask of `GET /properties/counts`. */
export const COUNT_QUERIES = {
  totals: { by: 'segment,listingType,propertyTypeId' },
  saleStatus: { by: 'constructionStatus', listingType: 'sale' },
};

/** The dimensions the unfiltered question counts. */
const TOTALS = new Set(['segment', 'listingType', 'propertyTypeId']);

/** What an aggregate resolves to when the API has no counts endpoint. */
const UNSUPPORTED = Symbol('counts-unsupported');

/** `key → { total, expires }` — the per-tile counts. */
const cache = new Map();

/** `key → Promise`, so a filter asked for twice in one tick is fetched once. */
const pending = new Map();

/** `query name → { data, expires }` — the two aggregate answers. */
const aggregates = new Map();

/** `query name → Promise`. */
const aggregatesPending = new Map();

/** Set once the API has answered the counts with 404 or 501: ask per tile from then on. */
let countsUnsupported = false;

const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const present = (value) => value !== undefined && value !== null && value !== '';

/** Stable cache key: the same filters in any order are the same request. */
function cacheKey(params) {
  return JSON.stringify(
    Object.entries(params ?? {})
      .filter(([, value]) => present(value))
      .sort(([left], [right]) => left.localeCompare(right))
  );
}

/** Empties the caches — for tests, and for a route that must not show stale totals. */
export function resetCategoryCounts() {
  cache.clear();
  pending.clear();
  aggregates.clear();
  aggregatesPending.clear();
  countsUnsupported = false;
}

/**
 * Where a tile's count is in the two answers: which question, which
 * dimension, which value — or `null` for a filter set they cannot answer.
 *
 * @param {object} params a `GET /properties` filter set (§5.7)
 * @returns {{query: 'totals'|'saleStatus', dimension: string, value: string}|null}
 */
export function aggregateFor(params) {
  const entries = Object.entries(params ?? {}).filter(([, value]) => present(value));
  if (entries.some(([, value]) => Array.isArray(value))) return null;

  if (entries.length === 1 && TOTALS.has(entries[0][0])) {
    const [[dimension, value]] = entries;
    return { query: 'totals', dimension, value: String(value) };
  }

  const named = Object.fromEntries(entries);
  if (entries.length === 2 && named.listingType === 'sale' && present(named.constructionStatus)) {
    return {
      query: 'saleStatus',
      dimension: 'constructionStatus',
      value: String(named.constructionStatus),
    };
  }

  return null;
}

/**
 * `meta.total` for one filter set, from the cache when it is still warm — the
 * per-tile question, and the fallback for an API without the counts endpoint.
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
 * One of the two aggregate answers, from the cache while it is warm: its
 * `data`, `null` when the request failed, or {@link UNSUPPORTED} when the API
 * has no such endpoint.
 *
 * @param {'totals'|'saleStatus'} name
 * @returns {Promise<object|null|symbol>}
 */
function aggregate(name) {
  if (countsUnsupported) return Promise.resolve(UNSUPPORTED);
  const hit = aggregates.get(name);
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.data);
  if (aggregatesPending.has(name)) return aggregatesPending.get(name);

  const request = propertyService
    .counts(COUNT_QUERIES[name])
    .then((response) => {
      const data = isObject(response?.data) ? response.data : null;
      if (data) aggregates.set(name, { data, expires: Date.now() + COUNT_TTL_MS });
      return data;
    })
    .catch((error) => {
      if (error?.status === 404 || error?.status === 501) {
        countsUnsupported = true;
        return UNSUPPORTED;
      }
      return null;
    })
    .finally(() => aggregatesPending.delete(name));

  aggregatesPending.set(name, request);
  return request;
}

/**
 * The count for one filter set: read from the aggregate that answers it, or
 * asked on its own when none does — or when the API has no counts endpoint,
 * or answered without the dimension. A value no live listing carries is
 * absent from an answer, and counts 0.
 *
 * @param {object} params a `GET /properties` filter set (§5.7)
 * @returns {Promise<number|null>}
 */
export function countOf(params) {
  const source = aggregateFor(params);
  if (!source) return countFor(params);

  return aggregate(source.query).then((data) => {
    if (data === UNSUPPORTED) return countFor(params);
    if (!data) return null;
    const tally = data[source.dimension];
    if (!isObject(tally)) return countFor(params);
    const count = Number(tally[source.value] ?? 0);
    return Number.isFinite(count) ? count : null;
  });
}

/**
 * The counts for a list of named filter sets.
 *
 *   const { counts } = useCategoryCounts([
 *     { key: 'ready', params: { listingType: 'sale', constructionStatus: 'ready-to-move' } },
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

    Promise.all(entries.map((entry) => countOf(entry.params))).then((totals) => {
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
