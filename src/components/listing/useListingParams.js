import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import propertyService from '../../services/propertyService';
import useApiList from '../../hooks/useApiList';
import {
  LISTING_DEFAULTS,
  LISTING_PARAM_TYPES,
  clearAllFilters,
  countActiveFilters,
} from '../../utils/listingFilters';

/**
 * The listing's parameters: the query string on a listing page, local state in
 * an embed, and a `GET /properties` call either way.
 *
 * Everything the visitor chose lives in the URL under the contract's own names
 * (§5.7), so a shared link, a reload and the back button all reproduce the same
 * view. Everything the *route* chose — `/rent` is rent, `/localities/whitefield`
 * is Whitefield — is a fixed param: merged into every request, absent from the
 * URL, and drawn as a locked chip.
 *
 * An embed (a locality's Buy tab, a builder's projects) must not fight the page
 * it sits on for the query string, so it keeps its filters in memory and
 * publishes only its page number, as `?p=`, which is what makes the second page
 * of a builder's projects a shareable address.
 */

/** The page number an embedded engine publishes, so `?page=` stays the page's. */
export const EMBEDDED_PAGE_PARAM = 'p';

/**
 * @param {object} args
 * @param {object} args.routeConfig an entry of `listingRoutes.js`
 * @param {object} [args.fixedParams] filters the embed adds to the route's
 * @param {boolean} [args.embedded]
 * @param {string} [args.initialSort] a default sort other than `relevance`
 */
export default function useListingParams({
  routeConfig,
  fixedParams,
  embedded = false,
  initialSort,
} = {}) {
  const fixed = useMemo(
    () => ({ ...(routeConfig?.fixed ?? {}), ...(fixedParams ?? {}) }),
    [routeConfig, fixedParams]
  );

  const defaults = useMemo(
    () => (initialSort ? { ...LISTING_DEFAULTS, sort: initialSort } : LISTING_DEFAULTS),
    [initialSort]
  );

  const list = useApiList(propertyService.list, {
    syncToUrl: !embedded,
    paramKeys: LISTING_PARAM_TYPES,
    defaults,
    fixedParams: fixed,
  });

  // Read through a ref so the callbacks below never change identity with the
  // params — a rail that re-subscribes on every keystroke loses its debounce.
  const listRef = useRef(list);
  listRef.current = list;

  const [searchParams, setSearchParams] = useSearchParams();
  const urlPage = embedded
    ? Math.max(1, parseInt(searchParams.get(EMBEDDED_PAGE_PARAM), 10) || 1)
    : LISTING_DEFAULTS.page;

  const lastUrlPage = useRef(LISTING_DEFAULTS.page);

  // One direction only: `?p=` is written by `setPage` and read back here, so a
  // back button restores the page and no effect can chase its own write.
  useEffect(() => {
    if (!embedded || lastUrlPage.current === urlPage) return;
    lastUrlPage.current = urlPage;
    listRef.current.setPage(urlPage);
  }, [embedded, urlPage]);

  const writeEmbeddedPage = useCallback(
    (page) => {
      const search = new URLSearchParams(searchParams);
      if (page > 1) search.set(EMBEDDED_PAGE_PARAM, String(page));
      else search.delete(EMBEDDED_PAGE_PARAM);
      setSearchParams(search);
    },
    [searchParams, setSearchParams]
  );

  const setPage = useCallback(
    (next) => {
      const page = Math.max(1, Number(next) || 1);
      if (embedded) writeEmbeddedPage(page);
      else listRef.current.setPage(page);
    },
    [embedded, writeEmbeddedPage]
  );

  const setFilters = useCallback(
    (patch) => {
      const next = { ...patch };

      // A budget is read against the sale price or against the monthly rent,
      // and the buckets differ by two orders of magnitude (§6.17): carrying
      // "₹1 Cr – ₹1.5 Cr" into a rent search would return nothing.
      if ('listingType' in next && next.listingType !== listRef.current.params.listingType) {
        next.minPrice = undefined;
        next.maxPrice = undefined;
      }

      if (embedded) writeEmbeddedPage(1);
      listRef.current.setFilters(next);
    },
    [embedded, writeEmbeddedPage]
  );

  const setSort = useCallback((sort) => setFilters({ sort }), [setFilters]);

  const clearFilters = useCallback(() => setFilters(clearAllFilters()), [setFilters]);

  const activeCount = useMemo(
    () => countActiveFilters(list.params, { fixed }),
    [list.params, fixed]
  );

  return {
    ...list,
    fixed,
    setPage,
    setFilters,
    setSort,
    clearFilters,
    activeCount,
    /** What the API was actually asked, fixed params included. */
    requestParams: useMemo(() => ({ ...list.params, ...fixed }), [list.params, fixed]),
  };
}
