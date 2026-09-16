import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

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

  const load = useCallback(async (signal) => {
    setLoading(true);
    const results = await Promise.allSettled(COLLECTIONS.map(([, fetcher]) => fetcher({ signal })));
    if (signal?.aborted) return;

    const next = { ...EMPTY };
    results.forEach((result, index) => {
      const [name] = COLLECTIONS[index];
      next[name] =
        result.status === 'fulfilled' && Array.isArray(result.value?.data) ? result.value.data : [];
    });

    setData(next);
    setLoading(false);
    storage.setItem(CACHE_KEY, { savedAt: Date.now(), data: next }, { session: true });
  }, []);

  useEffect(() => {
    if (cached) return undefined;
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [cached, load]);

  const refresh = useCallback(() => load(), [load]);

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
  refresh: () => {},
  byId: () => null,
  bySlug: () => null,
};

export { MasterDataContext, CACHE_KEY, CACHE_TTL_MS };
export default MasterDataContext;
