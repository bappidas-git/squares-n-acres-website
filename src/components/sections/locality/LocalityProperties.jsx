import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

import PATHS from '../../../routes/paths';
import PropertyCard from '../../common/PropertyCard';
import propertyService from '../../../services/propertyService';
import useApi from '../../../hooks/useApi';
import { PropertyGridSkeleton } from '../../common/SkeletonLoaders';
import { formatNumber } from '../../../utils/format';

import styles from './LocalitySections.module.css';

/** How many listings the guide shows before sending the visitor to the search. */
const PREVIEW_COUNT = 6;

/**
 * TEMPORARY — the listings of one locality, as a row of six cards.
 *
 * Prompt 26 replaces this with the tabbed listing engine (Buy / Rent / Plots,
 * server-driven, D94); until then the section asks for one page of six sorted
 * by relevance and links to the full search. It is registered under "Pending
 * rewrites" in `docs/PROJECT_STATE.md`.
 *
 * A locality with no active listings renders nothing at all — an empty row
 * under "Properties in Whitefield" reads as a fault (§7 of prompt 14).
 *
 * @param {object} props
 * @param {object} props.locality a §6.2 record
 */
export default function LocalityProperties({ locality }) {
  const { id, name } = locality;

  const { data, meta, loading, error } = useApi(
    (signal) =>
      propertyService.list(
        { localityId: id, perPage: PREVIEW_COUNT, sort: 'relevance' },
        { signal }
      ),
    [id],
    { initialData: [] }
  );

  const properties = Array.isArray(data) ? data : [];
  const total = meta?.total ?? properties.length;

  if (loading) {
    return (
      <section className={styles.block} aria-busy="true">
        <h2 className={styles.blockTitle}>Properties in {name}</h2>
        <PropertyGridSkeleton count={3} />
      </section>
    );
  }

  // A failed fetch leaves the guide intact: the rest of the page is worth
  // reading, and the listing search is one click away in the header.
  if (error || properties.length === 0) return null;

  return (
    <section className={styles.block} aria-labelledby="locality-properties">
      <div className={styles.blockHeader}>
        <h2 className={styles.blockTitle} id="locality-properties">
          Properties in {name}
        </h2>
        <Link to={`${PATHS.properties}?localityId=${id}`} className={styles.blockLink}>
          View all {formatNumber(total)} {total === 1 ? 'property' : 'properties'}
          <Icon icon="mdi:arrow-right" width="18" height="18" aria-hidden="true" />
        </Link>
      </div>

      <div className={styles.propertyGrid}>
        {properties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>
    </section>
  );
}
