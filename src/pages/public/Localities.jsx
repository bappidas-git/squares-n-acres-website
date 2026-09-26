import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

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
import { localitiesIndex } from '../../seo/localitiesIndex';
import { useMasterData } from '../../contexts/MasterDataContext';

import styles from './Localities.module.css';
import usePrerenderReady from '../../hooks/usePrerenderReady';
import { EMPTY, ERRORS } from '../../config/copy';

/** §8.6 caps a page at 24 items; the seeded set fits in one. */
const PER_PAGE = 24;

const LIST_DEFAULTS = { page: 1, perPage: PER_PAGE, city: '', zone: '', sort: 'order' };
const LIST_PARAM_KEYS = { page: 'int', city: 'string', zone: 'string', sort: 'string' };

/** The order the grid can be read in; `order` is the curated one the API sorts by. */
const SORT_OPTIONS = [
  { value: 'order', label: 'Recommended' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'propertyCount', label: 'Most properties' },
];

/** A zone the contract knows, or `''` — an unknown one filters nothing (§7). */
const knownZone = (value) => (LOCALITY_ZONES.values.includes(value) ? value : '');

/**
 * Whether the master data has arrived at least once. A refresh in the
 * background — a tab back in focus after ten minutes — reloads with the old
 * lists still in hand, so it does not send the page back to its skeleton.
 */
const hasArrived = ({ loading, localities, cities }) =>
  !loading || (localities ?? []).length > 0 || (cities ?? []).length > 0;

/**
 * `/localities` — every neighbourhood we cover, by city and by zone.
 *
 * The chips and the sort live in the query string
 * (`?city=bengaluru&zone=east&sort=name`), so a shared link reproduces the
 * view and the back button walks it back (§5.6). A `?zone=` the contract does
 * not know, or a `?city=` the index does not cover, is treated as no filter
 * rather than as a filter matching nothing.
 *
 * The page names the cities its localities are in (`seo/localitiesIndex.js`):
 * with one it reads "Localities in Bengaluru" and its zones "North Bengaluru";
 * with several the heading names them, city chips narrow the grid to one, and
 * the zones are sides alone until a city is chosen. Those words come from the
 * master data, so they wait for it — a skeleton, never a guessed city — and so
 * does the prerender (§9.9).
 *
 * The head is `<Seo type="localities">` with the same words, and the
 * `ItemList` is whatever this page of the grid is actually showing (§9.3).
 */
export default function Localities() {
  const [search] = useSearchParams();
  const arrived = hasArrived(useMasterData());

  // `?city=` names a city by its slug and the API filters by id, which only
  // the master data knows: until it has arrived the page waits as a whole,
  // rather than asking for every city's localities first and one city's after.
  if (search.get('city') && !arrived) return <LocalitiesPlaceholder />;
  return <LocalitiesIndex />;
}

function LocalitiesIndex() {
  const masterData = useMasterData();
  const { localities, cities } = masterData;
  const arrived = hasArrived(masterData);

  const { items, meta, loading, error, params, setFilters, setPage, refetch } = useApiList(
    (listParams, options) => {
      const { city, ...rest } = listParams;
      const chosen = localitiesIndex({ localities, cities, citySlug: city }).city;
      return masterDataService.localities.list(
        { ...rest, zone: knownZone(rest.zone), cityId: chosen?.id },
        options
      );
    },
    { syncToUrl: true, paramKeys: LIST_PARAM_KEYS, defaults: LIST_DEFAULTS }
  );

  // The prerender crawler saves this page once its query and the master data
  // its words are read from have both settled (§9.9) — settling on an error
  // state counts, so a crawl never hangs on a URL the API cannot answer.
  usePrerenderReady(loading || !arrived);

  const words = useMemo(
    () => localitiesIndex({ localities, cities, citySlug: params.city }),
    [localities, cities, params.city]
  );

  const zone = knownZone(params.zone);
  const sort = params.sort ?? 'order';
  const totalPages = meta?.totalPages ?? 1;
  const crumbs = breadcrumbsFor('localities');

  return (
    <>
      <Seo
        type="localities"
        title={words.title}
        description={words.description}
        breadcrumbs={crumbs}
        variables={{ count: meta?.total ?? items.length, page: params.page ?? 1 }}
        items={items.map((locality) => ({
          name: locality.name,
          url: PATHS.locality(locality.slug),
        }))}
      />

      <div className={styles.page}>
        <IndexHeader crumbs={crumbs} words={arrived ? words : null} />

        <Container className={styles.main}>
          {arrived && words.cities.length > 1 ? (
            <div className={styles.cities}>
              <ChipRow
                label="Filter by city"
                allLabel="All cities"
                options={words.cities.map((city) => ({ value: city.slug, label: city.name }))}
                value={words.city?.slug ?? ''}
                onChange={(city) => setFilters({ city })}
              />
            </div>
          ) : null}

          <div className={styles.toolbar}>
            {arrived ? (
              <ChipRow
                label="Filter by zone"
                allLabel="All zones"
                options={LOCALITY_ZONES.optionsIn(words.zoneCity)}
                value={zone}
                onChange={(value) => setFilters({ zone: value })}
              />
            ) : (
              <ChipRowSkeleton />
            )}

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
                  <LocalityCard key={locality.id} locality={locality} headingLevel={2} />
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

/** The page while a `?city=` waits for the master data to say which city it is. */
function LocalitiesPlaceholder() {
  return (
    <div className={styles.page}>
      <IndexHeader crumbs={breadcrumbsFor('localities')} words={null} />
      <Container className={styles.main}>
        <div className={styles.toolbar}>
          <ChipRowSkeleton />
        </div>
        <LocalityGridSkeleton />
      </Container>
    </div>
  );
}

/** The trail, the heading and the sentence under it — or their skeleton, until the words are known. */
function IndexHeader({ crumbs, words }) {
  return (
    <header className={styles.header}>
      <Container>
        <Breadcrumbs items={crumbs} className={styles.crumbs} />
        {words ? (
          <>
            <h1 className={styles.title}>{words.title}</h1>
            <p className={styles.intro}>{words.description}</p>
          </>
        ) : (
          <div aria-busy="true" aria-live="polite">
            <Skeleton variant="text" width="min(26rem, 80%)" height={48} />
            <Skeleton variant="text" width="min(36rem, 95%)" height={28} />
          </div>
        )}
      </Container>
    </header>
  );
}

/** A row of filter chips: "All …" first, then one per option; the chosen one is pressed. */
function ChipRow({ label, allLabel, options, value, onChange }) {
  return (
    <div className={styles.chips} role="group" aria-label={label}>
      {[{ value: '', label: allLabel }, ...options].map((option) => (
        <button
          key={option.value || 'all'}
          type="button"
          className={`${styles.chip} ${value === option.value ? styles.chipActive : ''}`}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** The zone chips at their size, while the words they carry are on their way. */
function ChipRowSkeleton({ count = 6 }) {
  return (
    <div className={styles.chips} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton
          key={index}
          variant="rounded"
          width={index === 0 ? 96 : 120}
          height={44}
          sx={{ flex: '0 0 auto', borderRadius: 'var(--radius-full)' }}
        />
      ))}
    </div>
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
