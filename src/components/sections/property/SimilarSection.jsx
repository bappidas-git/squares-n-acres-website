import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';

import { Carousel } from '../../ui';
import PATHS from '../../../routes/paths';
import PropertyCard from '../../common/PropertyCard';
import SectionShell from './SectionShell';

import styles from './SimilarSection.module.css';

/**
 * The listings the editor chose, then the ones the API found.
 *
 * `GET /properties/:id/similar` answers with `similarPropertyIds` in the
 * editor's own order and tops the list up to six by locality and type (§5.14);
 * the boilerplate ignored the editor's picks entirely and refetched everything
 * of the same listing type (BUG-07). The page fetches the row so that the
 * section navigation can know whether there is anything to scroll to before it
 * offers the item, which is why the properties arrive as a prop.
 *
 * @param {object} props
 * @param {object} props.property the listing being viewed
 * @param {Array<object>} props.properties what the API answered with
 * @param {'bg'|'surface'} [props.background]
 */
export default function SimilarSection({ property, properties = [], background = 'bg' }) {
  if (!Array.isArray(properties) || properties.length === 0) return null;

  const locality = property?.location?.locality?.name ?? '';

  return (
    <SectionShell
      id="similar"
      title="Similar properties"
      subtitle={
        locality ? `Other listings in and around ${locality}.` : 'Other listings you may like.'
      }
      background={background}
      action={
        <Link to={PATHS.properties} className={styles.viewAll}>
          View all <Icon icon="mdi:arrow-right" aria-hidden="true" />
        </Link>
      }
    >
      <Carousel
        label="Similar properties"
        itemsPerView={{ xs: 1.15, sm: 2, md: 3, lg: 3 }}
        className={styles.carousel}
      >
        {properties.map((entry) => (
          <PropertyCard key={entry.id} property={entry} />
        ))}
      </Carousel>
    </SectionShell>
  );
}
