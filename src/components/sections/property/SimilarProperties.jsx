import React from 'react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

import PATHS from '../../../routes/paths';
import PropertyCard from '../../common/PropertyCard';
import propertyService from '../../../services/propertyService';
import styles from './SimilarProperties.module.css';
import useApi from '../../../hooks/useApi';
import useInView from '../../../hooks/useInView';
import { Carousel } from '../../ui';

/**
 * The similar row. `GET /properties/:id/similar` answers with the editor's own
 * `similarPropertyIds` first and tops the list up to six by locality and type
 * (§5.14) — the old component ignored the editor's picks and simply refetched
 * everything of the same listing type (BUG-07).
 */
const SimilarProperties = ({ currentProperty }) => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const id = currentProperty?.id ?? null;

  const { data, loading } = useApi(
    (signal) => propertyService.similar(id, undefined, { signal }),
    [id],
    { enabled: Boolean(id), initialData: [] }
  );

  const properties = Array.isArray(data) ? data : [];
  if (!id || loading || properties.length === 0) return null;

  return (
    <section className={styles.section} ref={ref} id="similar">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Similar properties nearby</h2>
          <Link to={PATHS.properties} className={styles.viewAll}>
            View all <Icon icon="mdi:arrow-right" />
          </Link>
        </div>

        <Carousel
          label="Similar properties"
          itemsPerView={{ xs: 1.15, sm: 2, md: 3, lg: 3 }}
          className={styles.carousel}
        >
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </Carousel>
      </motion.div>
    </section>
  );
};

export default SimilarProperties;
