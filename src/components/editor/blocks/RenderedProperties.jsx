import PropertyCard from '../../common/PropertyCard';
import Skeleton from '../../ui/Skeleton';
import propertyService from '../../../services/propertyService';
import useApi from '../../../hooks/useApi';

import styles from './rendered.module.css';

/**
 * The `data-sna-block="properties"` placeholder, as the reader sees it.
 *
 * The block stores ids, so the cards are fetched when the page is read: an
 * article written in March shows March's listings at March's prices only if
 * nobody has changed them since. A listing that has been unpublished simply
 * does not come back, and a block whose listings have all gone renders nothing
 * rather than an empty band.
 *
 * @param {object} props
 * @param {Array<string|number>} props.ids
 */
export default function RenderedProperties({ ids = [] }) {
  const key = ids.join(',');

  const { data, loading } = useApi(
    (signal) => propertyService.list({ ids: key, perPage: ids.length }, { signal }),
    [key],
    { enabled: ids.length > 0 }
  );

  if (ids.length === 0) return null;

  if (loading) {
    return (
      <div className={styles.properties} aria-busy="true">
        {ids.slice(0, 3).map((id) => (
          <Skeleton key={id} variant="rounded" height={320} />
        ))}
      </div>
    );
  }

  const properties = Array.isArray(data) ? data : [];
  if (properties.length === 0) return null;

  return (
    <div className={styles.properties}>
      {properties.map((property) => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  );
}
