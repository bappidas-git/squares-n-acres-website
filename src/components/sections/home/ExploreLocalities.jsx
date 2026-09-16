import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

import LocalityCard from '../locality/LocalityCard';
import PATHS from '../../../routes/paths';
import styles from './ExploreLocalities.module.css';
import useInView from '../../../hooks/useInView';
import { useMasterData } from '../../../contexts/MasterDataContext';

/**
 * The featured-localities strip. Reads `MasterDataContext` (D93) rather than
 * fetching, so the home page asks for the locality list once no matter how
 * many sections need it.
 *
 * The card is `LocalityCard` in its compact variant — the same component the
 * `/localities` grid uses — so a change to how a locality is presented happens
 * once (prompt 14).
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
              <LocalityCard locality={locality} variant="compact" />
            </motion.div>
          ))}
        </div>

        <div className={styles.footer}>
          <Link to={PATHS.localities} className={styles.allLink}>
            View all localities
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ExploreLocalities;
