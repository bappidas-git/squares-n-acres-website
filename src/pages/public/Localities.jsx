import LocalityCard from '../../components/sections/locality/LocalityCard';
import PATHS from '../../routes/paths';
import Seo from '../../components/seo/Seo';
import masterDataService from '../../services/masterDataService';
import useApiList from '../../hooks/useApiList';
import {
  Breadcrumbs,
  Button,
  Container,
  EmptyState,
  ErrorState,
  Pagination,
  Skeleton,
} from '../../components/ui';
import { LOCALITY_ZONES } from '../../config/enums';
import { breadcrumbsFor } from '../../seo/breadcrumbs';

import styles from './Localities.module.css';
import usePrerenderReady from '../../hooks/usePrerenderReady';
import { EMPTY, ERRORS } from '../../config/copy';

/** §8.6 caps a page at 24 items; the whole Bengaluru set fits in one. */
const PER_PAGE = 24;

const LIST_DEFAULTS = { page: 1, perPage: PER_PAGE, zone: '', sort: 'order' };
const LIST_PARAM_KEYS = { page: 'int', zone: 'string', sort: 'string' };

/** The order the grid can be read in; `order` is the curated one the API sorts by. */
const SORT_OPTIONS = [
  { value: 'order', label: 'Recommended' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'propertyCount', label: 'Most properties' },
];

/** A zone the contract knows, or `''` — an unknown one filters nothing (§7). */
const knownZone = (value) => (LOCALITY_ZONES.values.includes(value) ? value : '');

/**
 * `/localities` — every neighbourhood we cover, filtered by zone.
 *
 * The zone chips and the sort live in the query string (`?zone=east&sort=name`),
 * so a shared link reproduces the view and the back button walks it back
 * (§5.6). A `?zone=` the contract does not know is treated as no filter rather
 * than as a filter matching nothing.
 *
 * The head is `<Seo type="localities">`: the fixed words come from
 * `components/seo/seoDefaults.js` and the `ItemList` is whatever this page of
 * the grid is actually showing (§9.3).
 */
export default function Localities() {
  const { items, meta, loading, error, params, setFilters, setPage, refetch } = useApiList(
    (listParams, options) =>
      masterDataService.localities.list(
        { ...listParams, zone: knownZone(listParams.zone) },
        options
      ),
    { syncToUrl: true, paramKeys: LIST_PARAM_KEYS, defaults: LIST_DEFAULTS }
  );

  // The prerender crawler saves this page once its primary query has settled
  // (§9.9) — settling on an error state counts, so a crawl never hangs on a
  // URL the API cannot answer.
  usePrerenderReady(loading);

  const zone = knownZone(params.zone);
  const sort = params.sort ?? 'order';
  const totalPages = meta?.totalPages ?? 1;
  const crumbs = breadcrumbsFor('localities');

  return (
    <>
      <Seo
        type="localities"
        breadcrumbs={crumbs}
        variables={{ count: meta?.total ?? items.length, page: params.page ?? 1 }}
        items={items.map((locality) => ({
          name: locality.name,
          url: PATHS.locality(locality.slug),
        }))}
      />

      <div className={styles.page}>
        <header className={styles.header}>
          <Container>
            <Breadcrumbs items={crumbs} className={styles.crumbs} />
            <h1 className={styles.title}>Localities in Bengaluru</h1>
            <p className={styles.intro}>
              Explore neighbourhoods across Bengaluru: connectivity, prices and lifestyle at a
              glance.
            </p>
          </Container>
        </header>

        <Container className={styles.main}>
          <div className={styles.toolbar}>
            <div className={styles.chips} role="group" aria-label="Filter by zone">
              <button
                type="button"
                className={`${styles.chip} ${zone === '' ? styles.chipActive : ''}`}
                aria-pressed={zone === ''}
                onClick={() => setFilters({ zone: '' })}
              >
                All zones
              </button>
              {LOCALITY_ZONES.options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.chip} ${zone === option.value ? styles.chipActive : ''}`}
                  aria-pressed={zone === option.value}
                  onClick={() => setFilters({ zone: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className={styles.sort}>
              <label className={styles.sortLabel} htmlFor="locality-sort">
                Sort by
              </label>
              <select
                id="locality-sort"
                className={styles.sortSelect}
                value={sort}
                onChange={(event) => setFilters({ sort: event.target.value })}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error ? (
            <ErrorState title={ERRORS.localities} text={error.message} onRetry={refetch} />
          ) : loading ? (
            <LocalityGridSkeleton />
          ) : items.length === 0 ? (
            <EmptyState
              title={EMPTY.localities.title}
              text={zone ? EMPTY.localities.filtered : EMPTY.localities.text}
              action={
                zone ? (
                  <Button variant="outline" onClick={() => setFilters({ zone: '' })}>
                    {EMPTY.localities.action}
                  </Button>
                ) : null
              }
            />
          ) : (
            <>
              <p className={styles.count} aria-live="polite">
                {meta?.total ?? items.length}{' '}
                {(meta?.total ?? items.length) === 1 ? 'locality' : 'localities'}
              </p>

              <div className={styles.grid}>
                {items.map((locality) => (
                  <LocalityCard key={locality.id} locality={locality} />
                ))}
              </div>

              {totalPages > 1 ? (
                <Pagination
                  page={params.page ?? 1}
                  totalPages={totalPages}
                  onChange={setPage}
                  className={styles.pagination}
                />
              ) : null}
            </>
          )}
        </Container>
      </div>
    </>
  );
}

/** The grid, at the size it will be, while the answer is on its way (§8.2). */
function LocalityGridSkeleton({ count = 8 }) {
  return (
    <div className={styles.grid} aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={styles.skeletonCard}>
          <Skeleton variant="rectangular" width="100%" sx={{ aspectRatio: '4/3' }} />
          <div className={styles.skeletonBody}>
            <Skeleton variant="text" width="60%" height={26} />
            <Skeleton variant="text" width="40%" height={22} />
            <Skeleton variant="text" width="80%" height={20} />
          </div>
        </div>
      ))}
    </div>
  );
}
