import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import useInView from '../../../hooks/useInView';
import { propertyService } from '../../../services/api';
import PropertyCard from '../../common/PropertyCard';
import { Carousel } from '../../ui';
import styles from './SimilarProperties.module.css';

const SimilarProperties = ({ currentProperty }) => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  useEffect(() => {
    if (!currentProperty?.type) {
      setLoading(false);
      return;
    }
    const fetchSimilar = async () => {
      try {
        const data = await propertyService.getAll({
          type: currentProperty.type,
          is_active: true,
          per_page: 6,
        });
        const filtered = Array.isArray(data) ? data : [];
        setProperties(
          filtered
            .filter(
              (p) => p.id !== currentProperty.id && !!p.isActive && p.publishStatus !== 'draft'
            )
            .slice(0, 4)
        );
      } catch {
        setProperties([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSimilar();
  }, [currentProperty]);

  if (!currentProperty || loading || properties.length === 0) return null;

  return (
    <section className={styles.section} ref={ref} id="similar">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Similar Properties Near You</h2>
          <Link to="/properties" className={styles.viewAll}>
            View All <Icon icon="mdi:arrow-right" />
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
