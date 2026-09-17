/**
 * The two ways the SEO desk reads `GET /admin/seo/overview` (§5.14, §9.1).
 *
 * **One page** (`useSeoOverview`) is the table: the type, the band, the index
 * state, the search, the sort and the page are query parameters the API
 * answers and the URL carries, so a desk of four thousand records costs one
 * page of rows and a filtered view is a link somebody can send (§5.6, BUG-19).
 *
 * **The whole site** (`useSeoOverviewAll`) is everything else on the screen:
 * six cards that average a score, a duplicates tab that groups by value and an
 * issues tab that walks every stored analysis. None of those can be computed
 * from twenty rows, so they read `perPage=all` — once a minute at most, cached
 * in the module, and thrown away the moment anything in the admin saves a `seo`
 * branch.
 *
 * The cache is deliberately **not** the SEO panel's (`useSiteSeoIndex`): that
 * one lives for the whole admin session because three analyser tests need a
 * list to compare against and a slightly stale list still answers them, while
 * this one is the screen an editor is watching and has to be re-read after a
 * bulk run. The cost of the two is one extra request per admin session.
 *
 * The site-wide reader is exported under its own name rather than hung off the
 * table hook as `useSeoOverview.all`: `react-hooks/rules-of-hooks` recognises a
 * hook by the name at the **call site**, and `useSeoOverview.all()` reads as an
 * ordinary method call, which would quietly switch the checks off.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import seoService from '../../../services/seoService';
import useApiList from '../../../hooks/useApiList';
import { DEFAULT_PER_PAGE } from '../../../components/admin/DataTable';
import { EVENTS, on } from '../../../utils/events';
import { SEO_SCORE_BANDS } from '../../../config/enums';
import { isCanceled } from '../../../services/apiError';

/** How long a site-wide read stands before it is asked for again. */
export const OVERVIEW_TTL_MS = 60_000;

/** What the table asks for before anybody touches a control (D23, D47). */
export const SEO_OVERVIEW_DEFAULTS = {
  page: 1,
  perPage: DEFAULT_PER_PAGE,
  sort: 'updatedAt',
  order: 'desc',
};

/** The query parameters that live in the URL, and how each is serialised (§5.6). */
export const SEO_OVERVIEW_PARAM_KEYS = {
  q: 'string',
  type: 'csv',
  scoreBand: 'csv',
  index: 'string',
  sort: 'string',
  order: 'string',
  page: 'int',
  perPage: 'int',
};

/** The keys that narrow the list, as opposed to paging or ordering it. */
export const SEO_FILTER_KEYS = ['q', 'type', 'scoreBand', 'index'];

/* ------------------------------------------------------------------ *
 * One page
 * ------------------------------------------------------------------ */

/**
 * The overview rows for the table, paged and filtered on the server.
 *
 * @param {{syncToUrl?: boolean, initialParams?: object}} [options]
 * @returns {ReturnType<typeof useApiList>}
 */
export default function useSeoOverview({ syncToUrl = true, initialParams } = {}) {
  return useApiList((params, opts) => seoService.overview(params, opts), {
    syncToUrl,
    initialParams,
    paramKeys: SEO_OVERVIEW_PARAM_KEYS,
    defaults: SEO_OVERVIEW_DEFAULTS,
  });
}

/* ------------------------------------------------------------------ *
 * The whole site
 * ------------------------------------------------------------------ */

/** @type {{rows: Array<object>, at: number}|null} */
let cache = null;
/** @type {Promise<Array<object>>|null} */
let inFlight = null;

/** Throws the cached rows away. The `seo:changed` listener and the tests call it. */
export function invalidateSeoOverview() {
  cache = null;
  inFlight = null;
}

const fresh = () => cache !== null && Date.now() - cache.at < OVERVIEW_TTL_MS;

/** Every row, from the cache or from the API — one request however many callers ask. */
function loadAll() {
  if (fresh()) return Promise.resolve(cache.rows);
  if (inFlight) return inFlight;

  inFlight = seoService
    .overview({ perPage: 'all' })
    .then(({ data }) => {
      cache = { rows: Array.isArray(data) ? data : [], at: Date.now() };
      return cache.rows;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/**
 * Every optimisable record on the site.
 *
 * @returns {{rows: Array<object>, loading: boolean, error: Error|null,
 *   refresh: () => Promise<Array<object>>}}
 */
export function useSeoOverviewAll() {
  const [rows, setRows] = useState(() => cache?.rows ?? []);
  const [loading, setLoading] = useState(() => !fresh());
  const [error, setError] = useState(null);
  const alive = useRef(true);

  const load = useCallback(() => {
    setLoading(!fresh());
    return loadAll()
      .then((loaded) => {
        if (alive.current) {
          setRows(loaded);
          setError(null);
          setLoading(false);
        }
        return loaded;
      })
      .catch((thrown) => {
        if (!isCanceled(thrown) && alive.current) {
          setError(thrown);
          setLoading(false);
        }
        return [];
      });
  }, []);

  const refresh = useCallback(() => {
    invalidateSeoOverview();
    return load();
  }, [load]);

  useEffect(() => {
    alive.current = true;
    load();

    // Anything in the admin that saves a `seo` branch — this screen's dialog,
    // its bulk tools, or the panel inside a property form in another tab —
    // makes every number on the cards a lie until the list is read again.
    const stop = on(EVENTS.seoChanged, () => {
      invalidateSeoOverview();
      load();
    });

    return () => {
      alive.current = false;
      stop();
    };
  }, [load]);

  return { rows, loading, error, refresh };
}

/* ------------------------------------------------------------------ *
 * What the cards say
 * ------------------------------------------------------------------ */

/** A record is noindexed when it says so itself — the default is to be indexed. */
export const isNoindexed = (row) => row?.seo?.robots?.index === false;

/** Whether a row collides with another on any of the three compared fields. */
export const hasDuplicate = (row) =>
  Object.values(row?.duplicateOf ?? {}).some((keys) => Array.isArray(keys) && keys.length > 0);

const blank = (value) => String(value ?? '').trim() === '';

/**
 * The six numbers above the table.
 *
 * The average is over the records that have actually been analysed: a site
 * where nobody has opened the SEO panel yet has no average, and printing `0`
 * would read as "every page is bad" rather than "nothing has been measured".
 *
 * @param {Array<object>} rows every row of the site
 * @returns {{total: number, analysed: number, averageScore: number|null,
 *   bands: Record<string, number>, missingKeyword: number,
 *   missingDescription: number, noindexed: number, duplicates: number}}
 */
export function summarise(rows = []) {
  const bands = Object.fromEntries(SEO_SCORE_BANDS.values.map((band) => [band, 0]));
  let analysed = 0;
  let total = 0;
  let missingKeyword = 0;
  let missingDescription = 0;
  let noindexed = 0;
  let duplicates = 0;

  for (const row of rows) {
    const score = row?.seo?.score;
    const band = Number.isFinite(score) ? SEO_SCORE_BANDS.bandOf(score) : 'none';

    bands[band] = (bands[band] ?? 0) + 1;
    if (Number.isFinite(score)) {
      analysed += 1;
      total += score;
    }
    if (blank(row?.seo?.focusKeyword)) missingKeyword += 1;
    if (blank(row?.seo?.description)) missingDescription += 1;
    if (isNoindexed(row)) noindexed += 1;
    if (hasDuplicate(row)) duplicates += 1;
  }

  return {
    total: rows.length,
    analysed,
    averageScore: analysed > 0 ? Math.round(total / analysed) : null,
    bands,
    missingKeyword,
    missingDescription,
    noindexed,
    duplicates,
  };
}

/**
 * The summary of a set of rows, recomputed only when the rows change.
 *
 * @param {Array<object>} rows
 */
export const useSeoSummary = (rows) => useMemo(() => summarise(rows), [rows]);
