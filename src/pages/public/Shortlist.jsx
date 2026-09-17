import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { useSearchParams } from 'react-router-dom';

import PATHS from '../../routes/paths';
import PropertyCard from '../../components/common/PropertyCard';
import Seo from '../../components/seo/Seo';
import ShareButton from '../../components/common/ShareButton';
import propertyService from '../../services/propertyService';
import styles from './Shortlist.module.css';
import useApi from '../../hooks/useApi';
import {
  Breadcrumbs,
  Button,
  ConfirmDialog,
  Container,
  EmptyState,
  ErrorState,
} from '../../components/ui';
import { PropertyGridSkeleton } from '../../components/common/SkeletonLoaders';
import { SITE } from '../../config/site';
import { breadcrumbsFor } from '../../seo/breadcrumbs';
import { useShortlist } from '../../contexts/ShortlistContext';
import { useToast } from '../../components/common/ToastProvider';

/**
 * `/shortlist` — the properties this visitor saved, and the ones somebody sent
 * them.
 *
 * The browser stores ids and nothing else (`ShortlistContext`), so the page
 * asks the API for the live records: a shortlist kept for a fortnight can never
 * show a price that changed last week, and a listing that has been taken down
 * simply stops appearing. `?ids=` makes the same page shareable — a link that
 * works in a private window, logged out, with a "Save all" for the person who
 * receives it.
 *
 * The page is `noindex` (§9.3): it is one visitor's list, not a page of the
 * site, and its head says so: `<Seo type="shortlist">` is `noindex, nofollow`
 * (§9.3).
 */

/** Everything a shortlist can hold; the ids are few and the cap generous. */
const PER_PAGE = 100;

const parseIds = (raw) =>
  String(raw ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

export default function Shortlist() {
  const [searchParams] = useSearchParams();
  const shortlist = useShortlist();
  const toast = useToast();
  const [confirmClear, setConfirmClear] = useState(false);

  const sharedIds = useMemo(() => parseIds(searchParams.get('ids')), [searchParams]);
  const shared = sharedIds.length > 0;
  const ids = shared ? sharedIds : shortlist.ids;
  const idsKey = ids.join(',');

  const { data, loading, error, refetch } = useApi(
    (signal) =>
      idsKey
        ? propertyService.list({ ids: idsKey.split(','), perPage: PER_PAGE }, { signal })
        : Promise.resolve({ data: [] }),
    [idsKey],
    { initialData: [], keepPreviousData: true }
  );

  const properties = Array.isArray(data) ? data : [];
  const shareUrl =
    typeof window === 'undefined'
      ? `${SITE.url}${PATHS.shortlist}?ids=${idsKey}`
      : `${window.location.origin}${PATHS.shortlist}?ids=${idsKey}`;

  const saveAll = () => {
    const added = ids.filter((id) => !shortlist.has(id));
    added.forEach((id) => shortlist.add(id));
    toast.success(
      added.length > 0
        ? `${added.length} propert${added.length === 1 ? 'y' : 'ies'} saved to your shortlist`
        : 'Everything here is already in your shortlist'
    );
  };

  const clearAll = () => {
    shortlist.clear();
    setConfirmClear(false);
    toast.success('Shortlist cleared');
  };

  const crumbs = breadcrumbsFor('shortlist');

  return (
    <>
      <Seo type="shortlist" title={shared ? 'A shared shortlist' : 'Your shortlist'} />

      <Container className={styles.page}>
        <Breadcrumbs items={crumbs} className={styles.breadcrumbs} />

        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>{shared ? 'A shared shortlist' : 'Your shortlist'}</h1>
            <p className={styles.subtitle}>
              {shared
                ? 'Somebody sent you these properties. Save them to keep them on this device.'
                : 'Saved on this device. Prices and availability are read live, so nothing here is out of date.'}
            </p>
          </div>

          {ids.length > 0 ? (
            <div className={styles.actions}>
              {shared ? (
                <Button
                  onClick={saveAll}
                  icon={<Icon icon="mdi:heart-plus-outline" width="18" height="18" />}
                >
                  Save all
                </Button>
              ) : (
                <>
                  <ShareButton
                    variant="button"
                    url={shareUrl}
                    title="My property shortlist"
                    text="Have a look at these properties"
                    context="shortlist"
                  />
                  <Button variant="ghost" onClick={() => setConfirmClear(true)}>
                    Clear shortlist
                  </Button>
                </>
              )}
            </div>
          ) : null}
        </header>

        {loading && properties.length === 0 && ids.length > 0 ? (
          <PropertyGridSkeleton count={Math.min(ids.length, 6)} />
        ) : error ? (
          <ErrorState
            title="We could not load your shortlist"
            text={error.message}
            onRetry={refetch}
          />
        ) : properties.length === 0 ? (
          <EmptyState
            icon={<Icon icon="mdi:heart-outline" width="40" height="40" />}
            title={shared ? 'These properties are no longer listed' : 'Your shortlist is empty'}
            text={
              shared
                ? 'The listings in this link have been taken down. Browse what is available now.'
                : 'Tap the heart on any property to keep it here and compare later.'
            }
            action={
              <Button to={PATHS.properties} variant="primary">
                Browse properties
              </Button>
            }
          />
        ) : (
          <ul className={styles.grid}>
            {properties.map((property) => (
              <li key={property.id} className={styles.item}>
                <PropertyCard property={property} />
                <button
                  type="button"
                  className={styles.remove}
                  onClick={() =>
                    shortlist.has(property.id)
                      ? shortlist.remove(property.id)
                      : shortlist.add(property.id)
                  }
                >
                  <Icon
                    icon={shortlist.has(property.id) ? 'mdi:close' : 'mdi:heart-outline'}
                    width="16"
                    height="16"
                    aria-hidden="true"
                  />
                  {shortlist.has(property.id) ? 'Remove' : 'Save'}
                  <span className={styles.srOnly}> — {property.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {properties.length > 0 && properties.length < ids.length ? (
          <p className={styles.note}>
            {ids.length - properties.length} saved{' '}
            {ids.length - properties.length === 1 ? 'property is' : 'properties are'} no longer
            listed and {ids.length - properties.length === 1 ? 'is' : 'are'} not shown.
          </p>
        ) : null}
      </Container>

      <ConfirmDialog
        open={confirmClear}
        title="Clear your shortlist?"
        message={`This removes all ${ids.length} saved propert${ids.length === 1 ? 'y' : 'ies'} from this device.`}
        confirmLabel="Clear shortlist"
        danger
        onConfirm={clearAll}
        onClose={() => setConfirmClear(false)}
      />
    </>
  );
}
