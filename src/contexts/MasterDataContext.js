import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import masterDataService from '../services/masterDataService';
import storage from '../utils/storage';

/**
 * Localities, cities, property types, amenities, badges, developers and banks
 * — the seven lists half the app needs and none of it should fetch twice (D93).
 *
 * All seven load in parallel and independently: one list that fails leaves the
 * other six usable, which matters because a missing amenity list must not take
 * the filter panel down with it. The answer is cached in `sessionStorage` for
 * ten minutes, so moving between pages costs nothing.
 *
 * `refresh(collection)` reloads one of them and rewrites the cache — what an
 * admin screen calls after a write, so the badge it just created appears on
 * `/properties` in the same session without a reload. `refresh()` with no
 * argument reloads all seven.
 */

const CACHE_KEY = 'sna_master_data_cache';
const CACHE_TTL_MS = 10 * 60 * 1000;

/** The whole of each collection: every one is comfortably under the 100 cap. */
const LIST_PARAMS = { perPage: 100 };

const COLLECTIONS = [
  [
    'localities',
    (opts) => masterDataService.localities.list({ ...LIST_PARAMS, sort: 'name' }, opts),
  ],
  ['cities', (opts) => masterDataService.cities.list(LIST_PARAMS, opts)],
  ['propertyTypes', (opts) => masterDataService.propertyTypes.list(LIST_PARAMS, opts)],
  ['amenities', (opts) => masterDataService.amenities.list(LIST_PARAMS, opts)],
  ['badges', (opts) => masterDataService.badges.list(LIST_PARAMS, opts)],
  ['developers', (opts) => masterDataService.developers.list(LIST_PARAMS, opts)],
  ['banks', (opts) => masterDataService.banks.list(LIST_PARAMS, opts)],
];

const EMPTY = Object.fromEntries(COLLECTIONS.map(([name]) => [name, []]));

/** The collection names a `refresh(name)` can ask for. */
export const MASTER_DATA_COLLECTIONS = COLLECTIONS.map(([name]) => name);

const MasterDataContext = createContext(null);

const readCache = () => {
  const cached = storage.getItem(CACHE_KEY, null, { session: true });
  if (!cached?.savedAt || Date.now() - cached.savedAt > CACHE_TTL_MS) return null;
  return cached.data ?? null;
};

export const MasterDataProvider = ({ children }) => {
  const cached = useMemo(readCache, []);
  const [data, setData] = useState(cached ?? EMPTY);
  const [loading, setLoading] = useState(!cached);

  // What is currently held, readable after an `await` without making `load`
  // depend on the render that produced it.
  const latest = useRef(data);

  /**
   * Fetches every collection, or the one named, and writes what came back.
   *
   * @param {AbortSignal} [signal]
   * @param {string} [only] a member of {@link MASTER_DATA_COLLECTIONS}
   */
  const load = useCallback(async (signal, only) => {
    const wanted = only ? COLLECTIONS.filter(([name]) => name === only) : COLLECTIONS;
    // A collection this context does not hold — FAQs, users — has no cache to
    // invalidate, so asking for it is a no-op rather than a silent full reload.
    if (wanted.length === 0) return;

    if (!only) setLoading(true);
    const results = await Promise.allSettled(wanted.map(([, fetcher]) => fetcher({ signal })));
    if (signal?.aborted) return;

    const fetched = {};
    results.forEach((result, index) => {
      const [name] = wanted[index];
      fetched[name] =
        result.status === 'fulfilled' && Array.isArray(result.value?.data) ? result.value.data : [];
    });

    // A refresh of one collection keeps the other six; a full load starts from
    // `EMPTY`, so a collection that has genuinely emptied really empties.
    const next = only ? { ...latest.current, ...fetched } : { ...EMPTY, ...fetched };
    latest.current = next;
    setData(next);
    if (!only) setLoading(false);
    storage.setItem(CACHE_KEY, { savedAt: Date.now(), data: next }, { session: true });
  }, []);

  useEffect(() => {
    if (cached) return undefined;
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [cached, load]);

  const refresh = useCallback((collection) => load(undefined, collection), [load]);

  const value = useMemo(
    () => ({
      ...data,
      loading,
      refresh,
      /** One record of a collection by id, or `null`. */
      byId: (collection, id) =>
        (data[collection] ?? []).find((row) => String(row.id) === String(id)) ?? null,
      /** One record of a collection by slug, or `null`. */
      bySlug: (collection, slug) =>
        (data[collection] ?? []).find((row) => row.slug === slug) ?? null,
    }),
    [data, loading, refresh]
  );

  return <MasterDataContext.Provider value={value}>{children}</MasterDataContext.Provider>;
};

/** The seven lists plus `byId` / `bySlug`; safe outside a provider. */
export function useMasterData() {
  return useContext(MasterDataContext) ?? FALLBACK;
}

const FALLBACK = {
  ...EMPTY,
  loading: false,
  refresh: () => Promise.resolve(),
  byId: () => null,
  bySlug: () => null,
};

export { MasterDataContext, CACHE_KEY, CACHE_TTL_MS };
export default MasterDataContext;
