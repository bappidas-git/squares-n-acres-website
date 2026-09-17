import PropertyCard from '../common/PropertyCard';
import styles from './ListingEngine.module.css';
import { PropertyCardSkeleton } from '../common/SkeletonLoaders';

/**
 * The results, as a grid of cards or a list of wide ones.
 *
 * The skeleton has the same count and the same columns as the answer it is
 * waiting for, so nothing jumps when the cards arrive (ADD-24).
 *
 * @param {object} props
 * @param {Array<object>} props.items
 * @param {'grid'|'list'} props.view
 * @param {boolean} props.loading
 * @param {number} [props.skeletonCount]
 */
export default function ListingGrid({ items, view = 'grid', loading, skeletonCount = 12 }) {
  const className = [styles.grid, view === 'list' ? styles.gridList : ''].filter(Boolean).join(' ');

  if (loading && items.length === 0) {
    return (
      <div className={className} aria-busy="true" aria-live="polite">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <PropertyCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  return (
    <ul className={className} aria-busy={loading ? 'true' : undefined}>
      {items.map((property) => (
        <li key={property.id} className={styles.gridItem}>
          <PropertyCard property={property} variant={view === 'list' ? 'list' : 'grid'} />
        </li>
      ))}
    </ul>
  );
}
