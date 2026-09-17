import PropertyCard from '../../common/PropertyCard';
import propertyService from '../../../services/propertyService';
import useApi from '../../../hooks/useApi';
import { Skeleton } from '../../ui';

import styles from './RelatedProperties.module.css';

/**
 * The listings an editor attached to an article (§6.8 `relatedPropertyIds`).
 *
 * The ids are stored and the cards are fetched when the article is read, so a
 * guide written in March shows March's prices only if nobody has changed them
 * since, and a listing that has been taken down simply stops appearing — the
 * same rule the `properties` block inside a body follows.
 *
 * @param {object} props
 * @param {Array<number|string>} props.ids
 * @param {string} [props.title]
 */
export default function RelatedProperties({
  ids = [],
  title = 'Listings mentioned in this article',
  className = '',
}) {
  const key = ids.filter(Boolean).join(',');

  const { data, loading } = useApi(
    (signal) => propertyService.list({ ids: key, perPage: ids.length }, { signal }),
    [key],
    { enabled: key.length > 0, initialData: [] }
  );

  if (!key) return null;

  if (loading) {
    return (
      <section className={[styles.section, className].filter(Boolean).join(' ')} aria-busy="true">
        <h2 className={styles.title}>{title}</h2>
        <div className={styles.grid}>
          {ids.slice(0, 3).map((id) => (
            <Skeleton key={id} variant="rounded" height={320} />
          ))}
        </div>
      </section>
    );
  }

  const properties = Array.isArray(data) ? data : [];
  if (properties.length === 0) return null;

  return (
    <section className={[styles.section, className].filter(Boolean).join(' ')}>
      <h2 className={styles.title}>{title}</h2>
      <ul className={styles.grid}>
        {properties.map((property) => (
          <li key={property.id}>
            <PropertyCard property={property} />
          </li>
        ))}
      </ul>
    </section>
  );
}
