import { Icon } from '@iconify/react';

import DeveloperCard from '../../components/sections/developer/DeveloperCard';
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
import { breadcrumbsFor } from '../../seo/breadcrumbs';

import styles from './Builders.module.css';

/** §8.6 caps a page at 24 items; the whole set fits in one. */
const PER_PAGE = 24;

const LIST_DEFAULTS = { page: 1, perPage: PER_PAGE, q: '', sort: 'order' };
const LIST_PARAM_KEYS = { page: 'int', q: 'string', sort: 'string' };

/** The API hears the last keystroke, not every one (§5.6). */
const SEARCH_DEBOUNCE_MS = 300;

/** The orders the grid can be read in; `order` is the one the API sorts by. */
const SORT_OPTIONS = [
  { value: 'order', label: 'Recommended' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'propertyCount', label: 'Most projects' },
];

/**
 * `/builders` — every builder whose projects we list.
 *
 * The search and the sort live in the query string (`?q=nandi&sort=name`), so
 * a shared link reproduces the view and the back button walks it back (§5.6).
 *
 * Every active builder is listed, including the ones with nothing on the site
 * at the moment: the card says "0 projects" rather than hiding the company
 * whose page the rest of the site links to (§7).
 *
 * The `<title>` is a temporary Helmet tag; prompt 38 replaces it with `<Seo>`.
 */
export default function Builders() {
  const { items, meta, loading, error, params, setFilters, setPage, refetch } = useApiList(
    (listParams, options) => masterDataService.developers.list(listParams, options),
    {
      syncToUrl: true,
      paramKeys: LIST_PARAM_KEYS,
      defaults: LIST_DEFAULTS,
      debounceMs: SEARCH_DEBOUNCE_MS,
    }
  );

  const q = params.q ?? '';
  const sort = params.sort ?? 'order';
  const totalPages = meta?.totalPages ?? 1;
  const total = meta?.total ?? items.length;
  const crumbs = breadcrumbsFor('builders');

  return (
    <>
      <Seo
        type="builders"
        breadcrumbs={crumbs}
        variables={{ count: total, page: params.page ?? 1 }}
        items={items.map((developer) => ({
          name: developer.name,
          url: PATHS.builder(developer.slug),
        }))}
      />

      <div className={styles.page}>
        <header className={styles.header}>
          <Container>
            <Breadcrumbs items={crumbs} className={styles.crumbs} />
            <h1 className={styles.title}>Builders and developers in Bengaluru</h1>
            <p className={styles.intro}>
              Every project on this site is built by one of these companies. Open a builder to see
              how long they have been building, what they have completed, what is under construction
              and which of their projects we are listing right now.
            </p>
          </Container>
        </header>

        <Container className={styles.main}>
          <div className={styles.toolbar}>
            <div className={styles.search}>
              <label className={styles.srOnly} htmlFor="builder-search">
                Search builders
              </label>
              <Icon
                icon="mdi:magnify"
                width="20"
                height="20"
                className={styles.searchIcon}
                aria-hidden="true"
              />
              <input
                id="builder-search"
                type="search"
                className={styles.searchInput}
                placeholder="Search by name or city"
                value={q}
                onChange={(event) => setFilters({ q: event.target.value })}
              />
            </div>

            <div className={styles.sort}>
              <label className={styles.sortLabel} htmlFor="builder-sort">
                Sort by
              </label>
              <select
                id="builder-sort"
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
            <ErrorState
              title="We could not load the builders"
              text={error.message}
              onRetry={refetch}
            />
          ) : loading ? (
            <BuilderGridSkeleton />
          ) : items.length === 0 ? (
            <EmptyState
              title="No builders match that search"
              text={
                q
                  ? `Nothing here is called “${q}”. Try part of the name, or clear the search.`
                  : 'Builders will appear here as soon as they are published.'
              }
              action={
                q ? (
                  <Button variant="outline" onClick={() => setFilters({ q: '' })}>
                    Clear the search
                  </Button>
                ) : null
              }
            />
          ) : (
            <>
              <p className={styles.count} aria-live="polite">
                {total} {total === 1 ? 'builder' : 'builders'}
              </p>

              <div className={styles.grid}>
                {items.map((developer) => (
                  <DeveloperCard key={developer.id} developer={developer} />
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
function BuilderGridSkeleton({ count = 8 }) {
  return (
    <div className={styles.grid} aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={styles.skeletonCard}>
          <Skeleton variant="rounded" width={120} height={60} />
          <Skeleton variant="text" width="65%" height={26} />
          <Skeleton variant="text" width="35%" height={20} />
          <Skeleton variant="text" width="100%" height={18} />
          <Skeleton variant="text" width="80%" height={18} />
        </div>
      ))}
    </div>
  );
}
