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
import { EMPTY, ERRORS, PROPERTY, fill } from '../../config/copy';
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
      added.length === 0
        ? PROPERTY.shortlist.allSaved
        : added.length === 1
          ? PROPERTY.shortlist.savedOne
          : fill(PROPERTY.shortlist.savedMany, { count: added.length })
    );
  };

  const clearAll = () => {
    shortlist.clear();
    setConfirmClear(false);
    toast.success(PROPERTY.shortlist.cleared);
  };

  const crumbs = breadcrumbsFor('shortlist');

  return (
    <>
      <Seo
        type="shortlist"
        title={shared ? PROPERTY.shortlist.sharedTitle : PROPERTY.shortlist.title}
      />

      <Container className={styles.page}>
        <Breadcrumbs items={crumbs} className={styles.breadcrumbs} />

        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>
              {shared ? PROPERTY.shortlist.sharedTitle : PROPERTY.shortlist.title}
            </h1>
            <p className={styles.subtitle}>
              {shared ? PROPERTY.shortlist.sharedSubtitle : PROPERTY.shortlist.subtitle}
            </p>
          </div>

          {ids.length > 0 ? (
            <div className={styles.actions}>
              {shared ? (
                <Button
                  onClick={saveAll}
                  icon={<Icon icon="mdi:heart-plus-outline" width="18" height="18" />}
                >
                  {PROPERTY.shortlist.saveAll}
                </Button>
              ) : (
                <>
                  <ShareButton
                    variant="button"
                    url={shareUrl}
                    title={PROPERTY.shortlist.shareTitle}
                    text={PROPERTY.shortlist.shareText}
                    context="shortlist"
                  />
                  <Button variant="ghost" onClick={() => setConfirmClear(true)}>
                    {PROPERTY.shortlist.clear}
                  </Button>
                </>
              )}
            </div>
          ) : null}
        </header>

        {loading && properties.length === 0 && ids.length > 0 ? (
          <PropertyGridSkeleton count={Math.min(ids.length, 6)} />
        ) : error ? (
          <ErrorState title={ERRORS.shortlist} text={error.message} onRetry={refetch} />
        ) : properties.length === 0 ? (
          <EmptyState
            icon={<Icon icon="mdi:heart-outline" width="40" height="40" />}
            title={shared ? EMPTY.shortlist.sharedTitle : EMPTY.shortlist.title}
            text={shared ? EMPTY.shortlist.sharedText : EMPTY.shortlist.text}
            action={
              <Button to={PATHS.properties} variant="primary">
                {EMPTY.shortlist.action}
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
                  {shortlist.has(property.id) ? PROPERTY.remove : PROPERTY.save}
                  <span className={styles.srOnly}> — {property.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {properties.length > 0 && properties.length < ids.length ? (
          <p className={styles.note}>
            {ids.length - properties.length === 1
              ? PROPERTY.shortlist.goneOne
              : fill(PROPERTY.shortlist.goneMany, { count: ids.length - properties.length })}
          </p>
        ) : null}
      </Container>

      <ConfirmDialog
        open={confirmClear}
        title={PROPERTY.shortlist.clearTitle}
        message={
          ids.length === 1
            ? PROPERTY.shortlist.clearMessageOne
            : fill(PROPERTY.shortlist.clearMessageMany, { count: ids.length })
        }
        confirmLabel={PROPERTY.shortlist.clear}
        danger
        onConfirm={clearAll}
        onClose={() => setConfirmClear(false)}
      />
    </>
  );
}
