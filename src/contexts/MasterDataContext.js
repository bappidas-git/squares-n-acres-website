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
import { setKnownSegments } from '../config/segments';

/**
 * Localities, cities, segments, property types, amenities, badges, developers
 * and banks — the eight lists half the app needs and none of it should fetch
 * twice (D93).
 *
 * All eight load in parallel and independently: one list that fails leaves the
 * other seven usable, which matters because a missing amenity list must not take
 * the filter panel down with it. The answer is cached in `sessionStorage` for
 * ten minutes, so moving between pages costs nothing.
 *
 * `refresh(collection)` reloads one of them and rewrites the cache — what an
 * admin screen calls after a write, so the badge it just created appears on
 * `/properties` in the same session without a reload. `refresh()` with no
 * argument reloads all eight.
 *
 * Every segment list it receives is also handed to `config/segments.js`, whose
 * registry is how the property form's rules and the SEO engine learn the kind
 * of a segment an editor added (QA-52).
 *
 * Other tabs hear about a refresh (prompt 51): the property form told an editor
 * to "add it in Master data — it opens in a new tab, so nothing here is lost",
 * and the amenity added there never reached the form, whose cache was ten
 * minutes old at most and per tab. A refresh now leaves a mark in
 * `localStorage` that every other tab's provider answers by reading that
 * collection again; a window coming back into focus reads again whatever has
 * gone past the cache's age.
 */

const CACHE_KEY = 'sna_master_data_cache';
const CACHE_TTL_MS = 10 * 60 * 1000;
/** Written by a refresh, read by the `storage` event of every other tab. */
const CHANGED_KEY = 'sna_master_data_changed';

/** The whole of each collection: every one is comfortably under the 100 cap. */
const LIST_PARAMS = { perPage: 100 };

const COLLECTIONS = [
  [
    'localities',
    (opts) => masterDataService.localities.list({ ...LIST_PARAMS, sort: 'name' }, opts),
  ],
  ['cities', (opts) => masterDataService.cities.list(LIST_PARAMS, opts)],
  // Every segment, the inactive ones included: `GET /segments` answers them
  // all, because a listing filed under a retired one still needs its layout.
  ['segments', (opts) => masterDataService.segments.list(LIST_PARAMS, opts)],
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

/**
 * The cached collections, or `null` when there is nothing usable. A cache
 * written before a collection joined the list — `segments` did (QA-52) — is as
 * good as none: it would hold the new collection as missing for ten minutes.
 */
const readCache = () => {
  const cached = storage.getItem(CACHE_KEY, null, { session: true });
  if (!cached?.savedAt || Date.now() - cached.savedAt > CACHE_TTL_MS) return null;
  const data = cached.data ?? null;
  if (!data || !MASTER_DATA_COLLECTIONS.every((name) => Array.isArray(data[name]))) return null;
  return data;
};

export const MasterDataProvider = ({ children }) => {
  const cached = useMemo(() => {
    const data = readCache();
    if (data) setKnownSegments(data.segments);
    return data;
  }, []);
  const [data, setData] = useState(cached ?? EMPTY);
  const [loading, setLoading] = useState(!cached);
  // When the lists were last read in full — what "stale on focus" measures.
  const loadedAt = useRef(cached ? Date.now() : 0);

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
    // `async`, so a fetcher that throws before it returns a promise fails its
    // own collection rather than the whole load.
    const results = await Promise.allSettled(
      wanted.map(async ([, fetcher]) => fetcher({ signal }))
    );
    if (signal?.aborted) return;

    const fetched = {};
    results.forEach((result, index) => {
      const [name] = wanted[index];
      fetched[name] =
        result.status === 'fulfilled' && Array.isArray(result.value?.data) ? result.value.data : [];
    });

    // A refresh of one collection keeps the other seven; a full load starts
    // from `EMPTY`, so a collection that has genuinely emptied really empties.
    const next = only ? { ...latest.current, ...fetched } : { ...EMPTY, ...fetched };
    latest.current = next;
    // Before the render that shows it, so a rule reading the registry during
    // that render already knows the segment that just arrived.
    setKnownSegments(next.segments);
    setData(next);
    if (!only) {
      setLoading(false);
      loadedAt.current = Date.now();
    }
    storage.setItem(CACHE_KEY, { savedAt: Date.now(), data: next }, { session: true });
  }, []);

  useEffect(() => {
    if (cached) return undefined;
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [cached, load]);

  // A refresh in another tab — Master data → Amenities, opened from the form —
  // reads the same collection here; a window back in focus after the cache's
  // age reads everything again.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== CHANGED_KEY) return;
      let changed = null;
      try {
        changed = JSON.parse(event.newValue ?? 'null');
      } catch {
        changed = null;
      }
      load(undefined, changed?.collection ?? undefined);
    };
    const onFocus = () => {
      if (document.visibilityState === 'hidden') return;
      if (Date.now() - loadedAt.current > CACHE_TTL_MS) load();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [load]);

  /** Reads one collection (or all) again, and tells the other tabs to. */
  const refresh = useCallback(
    async (collection) => {
      await load(undefined, collection);
      storage.setItem(CHANGED_KEY, { collection: collection ?? null, at: Date.now() });
    },
    [load]
  );

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

/** The eight lists plus `byId` / `bySlug`; safe outside a provider. */
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

export { MasterDataContext, CACHE_KEY, CACHE_TTL_MS, CHANGED_KEY };
export default MasterDataContext;
