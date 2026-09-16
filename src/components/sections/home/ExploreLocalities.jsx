import React from 'react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

import PATHS from '../../../routes/paths';
import styles from './ExploreLocalities.module.css';
import useInView from '../../../hooks/useInView';
import { useMasterData } from '../../../contexts/MasterDataContext';

/**
 * The featured-localities strip. Reads `MasterDataContext` (D93) rather than
 * fetching, so the home page asks for the locality list once no matter how
 * many sections need it.
 *
 * The cards link to `/localities/<slug>`; that route arrives in prompt 14.
 */

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (index) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: Math.min(index, 4) * 0.1, ease: 'easeOut' },
  }),
};

const ExploreLocalities = () => {
  const { localities, loading } = useMasterData();
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.15 });

  const featured = localities.filter((locality) => locality.isFeatured);

  if (loading || featured.length === 0) return null;

  return (
    <section className={styles.section} ref={ref}>
      <div className={styles.container}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <h2 className={styles.title}>Explore localities</h2>
          <p className={styles.subtitle}>Where we know the streets, not just the listings</p>
        </motion.div>

        <div className={styles.grid}>
          {featured.map((locality, index) => (
            <motion.div
              key={locality.id}
              custom={index}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
              variants={cardVariants}
            >
              <Link to={PATHS.locality(locality.slug)} className={styles.card}>
                {locality.heroImageUrl ? (
                  <img
                    src={locality.heroImageUrl}
                    alt=""
                    className={styles.cardImage}
                    loading="lazy"
                    aria-hidden="true"
                  />
                ) : null}
                <div className={styles.cardOverlay} />
                <div className={styles.cardContent}>
                  <h3 className={styles.cardName}>{locality.name}</h3>
                  {locality.propertyCount != null ? (
                    <span className={styles.cardCount}>
                      <Icon icon="mdi:home-group" className={styles.countIcon} />
                      {locality.propertyCount}{' '}
                      {locality.propertyCount === 1 ? 'property' : 'properties'}
                    </span>
                  ) : null}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ExploreLocalities;
