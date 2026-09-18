import { useMemo } from 'react';

import ListingEngine from '../../listing/ListingEngine';
import PATHS from '../../../routes/paths';
import propertyService from '../../../services/propertyService';
import useApi from '../../../hooks/useApi';
import { PropertyGridSkeleton } from '../../common/SkeletonLoaders';

import styles from './DeveloperSections.module.css';

/**
 * This builder's projects, as the listing engine renders them (D94).
 *
 * Embedded: filters, facets, sort and pagination all work, the builder is a
 * locked chip, and the page number travels as `?p=` so the second page of a
 * long portfolio is a shareable address — rather than a fixed grid of cards
 * that could only link away to `/properties?developerId=…`.
 *
 * A builder with nothing listed renders nothing at all — the index card
 * already says the count is zero.
 *
 * @param {object} props
 * @param {object} props.developer a §6.5 record
 * @param {(items: Array<object>) => void} [props.onItems] the cards this strip is
 *   showing, so the page above can publish them as its `ItemList` (§9.3)
 */
export default function DeveloperListings({ developer, onItems }) {
  const { id, name, slug } = developer;

  const { meta, loading, error } = useApi(
    (signal) => propertyService.list({ developerId: id, perPage: 1 }, { signal }),
    [id],
    { initialData: [] }
  );

  const routeConfig = useMemo(
    () => ({
      key: `developer-${slug}`,
      path: PATHS.builder(slug),
      fixed: {},
      noun: `Projects by ${name}`,
      breadcrumbs: [],
    }),
    [slug, name]
  );

  const fixedParams = useMemo(() => ({ developerId: String(id) }), [id]);

  if (loading) {
    return (
      <section className={styles.block} aria-busy="true">
        <h2 className={styles.blockTitle}>Projects by {name}</h2>
        <PropertyGridSkeleton count={3} />
      </section>
    );
  }

  if (error || (meta?.total ?? 0) === 0) return null;

  return (
    <section className={styles.block} aria-labelledby="developer-projects">
      <h2 className={styles.blockTitle} id="developer-projects">
        Projects by {name}
      </h2>
      <ListingEngine
        embedded
        routeConfig={routeConfig}
        fixedParams={fixedParams}
        headingLevel={null}
        onItems={onItems}
      />
    </section>
  );
}
