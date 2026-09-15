import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useInView } from 'react-intersection-observer';
import styles from './PropertySpecialities.module.css';

const DESKTOP_ROW_COUNT = 6;

const PropertySpecialities = ({ specialities = [] }) => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const [expanded, setExpanded] = useState(false);

  if (specialities.length === 0) return null;

  const remainingCount = Math.max(0, specialities.length - DESKTOP_ROW_COUNT);

  return (
    <section className={styles.section} ref={ref} id="specialities">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <h2 className={styles.title}>Property Highlights</h2>

        <div className={styles.grid}>
          {specialities.map((item, idx) => (
            <motion.div
              key={idx}
              className={`${styles.item} ${!expanded && idx >= DESKTOP_ROW_COUNT ? styles.hiddenDesktop : ''}`}
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              title={item.description || ''}
            >
              <div className={styles.iconWrap}>
                <Icon icon={item.icon || 'mdi:star'} className={styles.icon} />
              </div>
              <span className={styles.name}>{item.name || 'Feature'}</span>
            </motion.div>
          ))}
        </div>

        {remainingCount > 0 && (
          <button
            className={styles.showMoreBtn}
            onClick={() => setExpanded(!expanded)}
          >
            <Icon icon={expanded ? 'mdi:chevron-up' : 'mdi:chevron-down'} className={styles.showMoreIcon} />
            {expanded ? 'Show Less' : `Show ${remainingCount} More Highlight${remainingCount > 1 ? 's' : ''}`}
          </button>
        )}
      </motion.div>
    </section>
  );
};

export default PropertySpecialities;
