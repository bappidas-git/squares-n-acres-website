import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

// `NotFound` is imported ahead of the engine on purpose: every other page that
// can answer 404 does the same, and webpack orders the extracted stylesheets by
// the order the modules are pulled in.
import NotFound from './NotFound';
import ListingEngine from '../../components/listing/ListingEngine';
import styles from './PropertyListing.module.css';
import { Breadcrumbs, Container, Skeleton } from '../../components/ui';
import { resolveListingRoute } from '../../components/listing/listingRoutes';
import { ERRORS } from '../../config/copy';
import { useMasterData } from '../../contexts/MasterDataContext';

/**
 * Every listing URL: `/properties`, `/buy`, `/rent`, `/lease`, `/commercial`,
 * `/plots` and the category pages under them.
 *
 * The page itself does almost nothing — it looks its route up in
 * `listingRoutes`, resolves a `:propertyTypeSlug` against master data (D25) and
 * hands the answer to the one engine (D94). An unknown slug is a 404, not an
 * empty search: `/buy/unknown` never existed, and saying "no properties match"
 * would invite the visitor to widen filters they never set (§7).
 *
 * @param {object} props
 * @param {string} props.routeKey a key of `listingRoutes.js`
 */
export default function PropertyListing({ routeKey = 'properties' }) {
  const { propertyTypeSlug } = useParams();
  const masterData = useMasterData();

  const { state, config } = useMemo(
    () => resolveListingRoute({ routeKey, slug: propertyTypeSlug, masterData }),
    [routeKey, propertyTypeSlug, masterData]
  );

  if (state === 'not-found') {
    return <NotFound {...ERRORS.notFound.pages.listing} />;
  }

  return (
    <Container className={styles.page}>
      <Breadcrumbs items={config.breadcrumbs} className={styles.breadcrumbs} />

      {state === 'pending' ? <ListingRouteSkeleton /> : <ListingEngine routeConfig={config} />}
    </Container>
  );
}

/** Held while master data decides whether the slug is a type or a 404. */
function ListingRouteSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <Skeleton variant="text" width="45%" height={44} />
      <Skeleton variant="text" width="30%" height={20} />
    </div>
  );
}
