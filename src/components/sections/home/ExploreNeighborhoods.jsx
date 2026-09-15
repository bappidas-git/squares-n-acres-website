import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useInView } from 'react-intersection-observer';
import { neighborhoodService } from '../../../services/api';
import styles from './ExploreNeighborhoods.module.css';

// No external placeholder — neighborhoods without images use a CSS gradient via onError

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.15, ease: 'easeOut' },
  }),
};

const ExploreNeighborhoods = () => {
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imgErrors, setImgErrors] = useState({});
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.15 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await neighborhoodService.getActive();
        setNeighborhoods(Array.isArray(data) ? data : []);
      } catch {
        setNeighborhoods([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleImgError = (id) => {
    setImgErrors((prev) => ({ ...prev, [id]: true }));
  };

  // Don't render the section if loading or no neighborhoods
  if (loading) return null;
  if (!neighborhoods.length) return null;

  return (
    <section className={styles.section} ref={ref}>
      <div className={styles.container}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <h2 className={styles.title}>Explore Neighborhoods</h2>
          <p className={styles.subtitle}>
            Discover the best locations in Bangalore
          </p>
        </motion.div>

        <div className={styles.grid}>
          {neighborhoods.map((item, i) => (
            <motion.div
              key={item.id}
              custom={i}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
              variants={cardVariants}
            >
              <Link
                to={`/properties?area=${encodeURIComponent(item.name)}`}
                className={styles.card}
              >
                <img
                  src={item.image || ''}
                  style={imgErrors[item.id] || !item.image ? { display: 'none' } : undefined}
                  alt={item.name}
                  className={styles.cardImage}
                  loading="lazy"
                  onError={() => handleImgError(item.id)}
                />
                <div className={styles.cardOverlay} />
                <div className={styles.cardContent}>
                  <h3 className={styles.cardName}>{item.name}</h3>
                  {item.propertyCount != null && (
                    <span className={styles.cardCount}>
                      <Icon icon="mdi:home-group" className={styles.countIcon} />
                      {item.propertyCount} Properties
                    </span>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ExploreNeighborhoods;
