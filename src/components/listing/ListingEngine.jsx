import { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';

import ActiveFilters from './ActiveFilters';
import FilterRail from './FilterRail';
import FilterSheet from './FilterSheet';
import ListingEmpty from './ListingEmpty';
import ListingGrid from './ListingGrid';
import RecentlyViewed from '../common/RecentlyViewed';
import ResultsHeader from './ResultsHeader';
import styles from './ListingEngine.module.css';
import useBreakpoint from '../../hooks/useBreakpoint';
import useListingParams from './useListingParams';
import { ErrorState, Pagination } from '../ui';
import { buildListingSeo } from './listingSeo';
import { useListingView } from './ViewToggle';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';

/**
 * One listing, serving every listing URL (D94, BUG-19).
 *
 * The engine holds no listings of its own: `GET /properties` filters, sorts,
 * paginates and counts, and the only thing computed in the browser is how the
 * facets are drawn. That is the whole of the fix — the page this replaces
 * asked for a hundred records and then filtered, sorted and paginated them in
 * the browser, so page 9 of a search was a page the visitor's own machine had
 * invented.
 *
 * Routes differ only in their fixed filters and their words (`listingRoutes`),
 * and the locality and builder pages mount the same component with `embedded`,
 * which trades the query string for local state and `?p=`.
 *
 * @param {object} props
 * @param {object} props.routeConfig a resolved entry of `listingRoutes.js`
 * @param {object} [props.fixedParams] an embed's own filters
 * @param {boolean} [props.embedded]
 * @param {string} [props.initialSort]
 * @param {'h1'|'h2'|null} [props.headingLevel] `null` leaves the heading to
 *   the section the embed sits in
 */
export default function ListingEngine({
  routeConfig,
  fixedParams,
  embedded = false,
  initialSort,
  headingLevel = embedded ? 'h2' : 'h1',
}) {
  const listing = useListingParams({ routeConfig, fixedParams, embedded, initialSort });
  const { params, meta, items, loading, error, fixed, activeCount } = listing;

  const master = useMasterData();
  const { seoSettings, siteName } = useSiteSettings();
  const { isDesktop } = useBreakpoint();
  const [view, setView] = useListingView();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const filtersParam = searchParams.get('filters');

  // The bottom navigation's Search lands here with the sheet already asked for
  // (`?filters=open`). The parameter is consumed on arrival so it never travels
  // on in a shared link.
  useEffect(() => {
    if (embedded || filtersParam !== 'open') return;
    setSheetOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('filters');
    setSearchParams(next, { replace: true });
  }, [embedded, filtersParam, searchParams, setSearchParams]);

  // The heading, the canonical and the locked chips all read the same set of
  // fixed filters, so an embed's `localityId` narrows the title exactly as a
  // route's own would.
  const seoRoute = useMemo(() => ({ ...routeConfig, fixed }), [routeConfig, fixed]);

  const seo = useMemo(
    () =>
      buildListingSeo({
        routeConfig: seoRoute,
        params,
        meta,
        masterData: master,
        seoSettings,
        siteName,
      }),
    [seoRoute, params, meta, master, seoSettings, siteName]
  );

  // Turning a page must land on the results, not on wherever the previous page
  // had been scrolled to.
  const resultsRef = useRef(null);
  const firstPaint = useRef(true);
  useEffect(() => {
    if (firstPaint.current) {
      firstPaint.current = false;
      return;
    }
    // jsdom and older browsers have no `scrollIntoView`; the page still turns.
    if (typeof resultsRef.current?.scrollIntoView === 'function') {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [params.page]);

  const total = Number.isFinite(meta?.total) ? meta.total : null;
  const totalPages = Number.isFinite(meta?.totalPages) ? meta.totalPages : 1;
  const facets = meta?.facets ?? null;

  return (
    <div className={[styles.engine, embedded ? styles.embedded : ''].filter(Boolean).join(' ')}>
      {embedded ? null : (
        <Helmet>
          <title>{seo.title}</title>
          <meta name="description" content={seo.description} />
          <link rel="canonical" href={seo.canonicalUrl} />
          {seo.noindex ? <meta name="robots" content="noindex, follow" /> : null}
        </Helmet>
      )}

      <div className={styles.layout}>
        {isDesktop ? (
          <FilterRail
            params={params}
            fixed={fixed}
            facets={facets}
            activeCount={activeCount}
            onApply={listing.setFilters}
            onReset={listing.clearFilters}
          />
        ) : null}

        <div className={styles.results} ref={resultsRef}>
          <ResultsHeader
            title={seo.h1}
            intro={headingLevel ? seo.intro : undefined}
            total={total}
            loading={loading}
            headingLevel={headingLevel}
            sort={params.sort}
            onSortChange={listing.setSort}
            view={view}
            onViewChange={setView}
            activeCount={activeCount}
            onOpenFilters={() => setSheetOpen(true)}
            showSearch={!embedded}
            searchValue={params.q ?? ''}
            onSearch={(q) => listing.setFilters({ q: q || undefined })}
          />

          <ActiveFilters
            params={params}
            fixed={fixed}
            onRemove={listing.setFilters}
            onClear={listing.clearFilters}
          />

          {error ? (
            <ErrorState
              title="We could not load these properties"
              text={error.message}
              onRetry={listing.refetch}
            />
          ) : items.length === 0 && !loading ? (
            <ListingEmpty
              params={params}
              fixed={fixed}
              onWiden={listing.setFilters}
              onClear={listing.clearFilters}
            />
          ) : (
            <>
              <ListingGrid
                items={items}
                view={view}
                loading={loading}
                skeletonCount={params.perPage}
              />
              <Pagination
                className={styles.pagination}
                page={params.page}
                totalPages={totalPages}
                onChange={listing.setPage}
                prevHref={embedded ? undefined : seo.pagination.prev}
                nextHref={embedded ? undefined : seo.pagination.next}
                label="Property results"
              />
            </>
          )}
        </div>
      </div>

      {embedded ? null : <RecentlyViewed heading="Recently viewed" />}

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        params={params}
        fixed={fixed}
        facets={facets}
        activeCount={activeCount}
        onApply={listing.setFilters}
        onReset={listing.clearFilters}
      />
    </div>
  );
}
