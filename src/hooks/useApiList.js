import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import useApi from './useApi';
import useDebounce from './useDebounce';

/**
 * A paginated, filtered list — the shape every listing screen uses (§5.6).
 *
 *   const { items, meta, loading, error, params, setPage, setFilters } = useApiList(
 *     (params, opts) => articleService.list(params, opts),
 *     { syncToUrl: true, paramKeys: { page: 'int', categorySlug: 'string' }, defaults: { page: 1 } }
 *   );
 *
 * With `syncToUrl` the query string is the single source of truth, so the back
 * button, a reload and a shared link all reproduce the same view. Values are
 * serialised the way the API reads them (§5.6): arrays as comma-separated
 * lists, booleans as `true`/`false`, and a parameter that equals its default
 * stays out of the URL.
 *
 * @param {(params: object, opts: {signal: AbortSignal}) => Promise<object>} fetcher
 * @param {object} [options]
 * @param {object} [options.initialParams] merged over `defaults` on first render
 * @param {boolean} [options.syncToUrl]
 * @param {Record<string, 'int'|'number'|'bool'|'csv'|'string'>|string[]} [options.paramKeys]
 * @param {object} [options.defaults] values that never appear in the URL
 * @param {object} [options.fixedParams] merged into every request and never
 *   written to the URL — a route's or an embed's own filters, which the
 *   visitor cannot remove
 * @param {number} [options.debounceMs] delay applied to `q` before fetching
 */
export default function useApiList(fetcher, options = {}) {
  const {
    initialParams,
    syncToUrl = false,
    paramKeys,
    defaults,
    fixedParams,
    debounceMs = 0,
    keepPreviousData = true,
  } = options;

  const base = useMemo(() => ({ ...defaults, ...initialParams }), [defaults, initialParams]);
  const spec = useMemo(() => buildSpec(paramKeys, base), [paramKeys, base]);
  const defaultValues = useMemo(() => ({ ...defaults }), [defaults]);

  const [searchParams, setSearchParams] = useSearchParams();

  const urlParams = useMemo(
    () => (syncToUrl ? readParams(searchParams, spec, base) : null),
    [syncToUrl, searchParams, spec, base]
  );

  // Without URL sync the params live in the query string of nothing: the base
  // is all there is until `setParams` writes a new one.
  const localState = useLocalParams(base, syncToUrl);
  const params = syncToUrl ? urlParams : localState.value;

  const setParams = useCallback(
    (patch) => {
      const touchesFilter = Object.keys(patch || {}).some((key) => key !== 'page');
      const next = { ...params, ...patch, ...(touchesFilter ? { page: 1 } : {}) };
      if (syncToUrl) setSearchParams(writeParams(next, spec, defaultValues), { replace: false });
      else localState.set(next);
    },
    [params, spec, defaultValues, syncToUrl, setSearchParams, localState]
  );

  const setPage = useCallback((page) => setParams({ page: Number(page) || 1 }), [setParams]);
  const setSort = useCallback((sort, order) => setParams({ sort, order }), [setParams]);
  const setFilters = useCallback((patch) => setParams(patch), [setParams]);

  // "Reset" clears what narrows the list, not how the reader chose to look at
  // it: the sort and the page size survive, the page goes back to the first.
  const resetFilters = useCallback(() => {
    const kept = Object.fromEntries(
      KEPT_ON_RESET.filter((key) => key in params && params[key] !== undefined).map((key) => [
        key,
        params[key],
      ])
    );
    const next = { ...base, ...kept, page: base.page };
    if (syncToUrl) setSearchParams(writeParams(next, spec, defaultValues), { replace: false });
    else localState.set(next);
  }, [base, params, spec, defaultValues, syncToUrl, setSearchParams, localState]);

  // The search box updates on every keystroke; the API hears the last one.
  const debouncedQ = useDebounce(params.q ?? '', debounceMs);

  // The fixed params are applied last: a route that says `listingType: 'rent'`
  // means it, whatever the query string was edited to say.
  const requestParams = useMemo(() => {
    const searched =
      debounceMs > 0 && 'q' in params ? { ...params, q: debouncedQ || undefined } : params;
    return fixedParams ? { ...searched, ...fixedParams } : searched;
  }, [params, debouncedQ, debounceMs, fixedParams]);

  const requestKey = useMemo(() => canonical(requestParams), [requestParams]);

  const { data, meta, loading, fetching, error, refetch } = useApi(
    (signal) => fetcher(requestParams, { signal }),
    [requestKey],
    { initialData: [], keepPreviousData }
  );

  const items = Array.isArray(data) ? data : [];

  return {
    items,
    meta,
    loading,
    // The page on screen is the previous answer and the next one is on its way.
    refreshing: fetching && !loading,
    error,
    params,
    setParams,
    setPage,
    setSort,
    setFilters,
    resetFilters,
    refetch,
  };
}

/** The parameters that say how a list is viewed rather than what it holds. */
const KEPT_ON_RESET = ['sort', 'order', 'perPage'];

/* ------------------------------------------------------------------ *
 * Parameter serialisation (§5.6)
 * ------------------------------------------------------------------ */

const typeOfDefault = (value) => {
  if (Array.isArray(value)) return 'csv';
  if (typeof value === 'number') return 'int';
  if (typeof value === 'boolean') return 'bool';
  return 'string';
};

/** `{ key: type }` from either an explicit map, a list of keys, or the base. */
function buildSpec(paramKeys, base) {
  if (paramKeys && !Array.isArray(paramKeys)) return { ...paramKeys };
  const keys = Array.isArray(paramKeys) ? paramKeys : Object.keys(base);
  return Object.fromEntries(keys.map((key) => [key, typeOfDefault(base[key])]));
}

/** Reads one value out of the query string, falling back to its default. */
function readValue(raw, type, fallback) {
  if (raw === null || raw === '') return fallback;

  if (type === 'csv') {
    const items = raw.split(',').filter(Boolean);
    return items.length > 0 ? items : fallback;
  }
  if (type === 'int' || type === 'number') {
    const parsed = type === 'int' ? parseInt(raw, 10) : Number(raw);
    // `?page=abc` is not a page: fall back rather than request NaN.
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  if (type === 'bool') {
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return fallback;
  }
  return raw;
}

/** The params a URL describes, with every missing one taken from the base. */
function readParams(searchParams, spec, base) {
  const params = { ...base };
  for (const [key, type] of Object.entries(spec)) {
    params[key] = readValue(searchParams.get(key), type, base[key]);
  }
  if ('page' in params) {
    const page = Number(params.page);
    params.page = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
  }
  return params;
}

const sameValue = (left, right) => {
  if (Array.isArray(left) || Array.isArray(right)) {
    return String(left ?? '') === String(right ?? '');
  }
  return left === right;
};

/** The query string for a set of params: defaults and empties stay out. */
function writeParams(params, spec, defaults) {
  const search = {};
  for (const key of Object.keys(spec)) {
    const value = params[key];
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (sameValue(value, defaults[key])) continue;
    search[key] = Array.isArray(value) ? value.join(',') : String(value);
  }
  return search;
}

/** A stable string for a params object, whatever order its keys arrived in. */
function canonical(params) {
  return JSON.stringify(
    Object.keys(params || {})
      .sort()
      .map((key) => [key, params[key]])
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

/* ------------------------------------------------------------------ *
 * Local params (no URL sync)
 * ------------------------------------------------------------------ */
function useLocalParams(base, syncToUrl) {
  const [value, set] = useState(base);
  return useMemo(() => ({ value: syncToUrl ? base : value, set }), [value, base, syncToUrl]);
}
