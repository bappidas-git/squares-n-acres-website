import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';

import PATHS from '../../../routes/paths';
import PropertyCard from '../../common/PropertyCard';
import propertyService from '../../../services/propertyService';
import useApi from '../../../hooks/useApi';
import { PropertyGridSkeleton } from '../../common/SkeletonLoaders';
import { formatNumber } from '../../../utils/format';

import styles from './DeveloperSections.module.css';

/** One page of a builder's listings before the visitor is sent to the search. */
const PREVIEW_COUNT = 12;

/**
 * TEMPORARY — the active listings of one builder, as a grid of twelve cards.
 *
 * Prompt 26 replaces this with the listing engine; until then the section asks
 * for one page sorted by relevance and links to the full search. It is
 * registered under "Pending rewrites" in `docs/PROJECT_STATE.md`.
 *
 * A builder with nothing listed renders nothing at all — an empty row under
 * "Projects by Aurelia Estates" reads as a fault, and the index card already
 * says the count is zero (§7).
 *
 * @param {object} props
 * @param {object} props.developer a §6.5 record
 */
export default function DeveloperProperties({ developer }) {
  const { id, name } = developer;

  const { data, meta, loading, error } = useApi(
    (signal) =>
      propertyService.list(
        { developerId: id, perPage: PREVIEW_COUNT, sort: 'relevance' },
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
        <h2 className={styles.blockTitle}>Projects by {name}</h2>
        <PropertyGridSkeleton count={3} />
      </section>
    );
  }

  // A failed fetch leaves the rest of the page intact: the profile is worth
  // reading, and the listing search is one click away in the header.
  if (error || properties.length === 0) return null;

  return (
    <section className={styles.block} aria-labelledby="developer-projects">
      <div className={styles.blockHeader}>
        <h2 className={styles.blockTitle} id="developer-projects">
          Projects by {name}
        </h2>
        <Link to={`${PATHS.properties}?developerId=${id}`} className={styles.blockLink}>
          View all {formatNumber(total)} {total === 1 ? 'project' : 'projects'}
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
