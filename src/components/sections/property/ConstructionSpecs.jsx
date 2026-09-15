import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useInView } from 'react-intersection-observer';
import styles from './ConstructionSpecs.module.css';

const categoryConfig = {
  flooring: { label: 'Flooring', icon: 'mdi:floor-plan' },
  doors: { label: 'Doors', icon: 'mdi:door' },
  structure: { label: 'Structure', icon: 'mdi:pillar' },
  electrical: { label: 'Electrical', icon: 'mdi:lightning-bolt' },
  plumbing: { label: 'Plumbing', icon: 'mdi:water-pump' },
  others: { label: 'Others', icon: 'mdi:dots-horizontal' },
};

const ConstructionSpecs = ({ constructionSpecs = {} }) => {
  const categories = Object.keys(constructionSpecs).filter(
    (key) => Array.isArray(constructionSpecs[key]) && constructionSpecs[key].length > 0
  );
  const [activeTab, setActiveTab] = useState(categories[0] || '');
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  if (categories.length === 0) return null;

  const activeSpecs = constructionSpecs[activeTab] || [];

  return (
    <section className={styles.section} ref={ref} id="construction-specs">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <h2 className={styles.title}>Construction Specifications</h2>

        <div className={styles.tabs}>
          {categories.map((cat) => {
            const config = categoryConfig[cat] || { label: cat, icon: 'mdi:cog' };
            return (
              <button
                key={cat}
                className={`${styles.tab} ${activeTab === cat ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(cat)}
              >
                <Icon icon={config.icon} className={styles.tabIcon} />
                <span>{config.label}</span>
              </button>
            );
          })}
        </div>

        <div className={styles.specsGrid}>
          {activeSpecs.map((spec, idx) => (
            <motion.div
              key={`${activeTab}-${idx}`}
              className={styles.specCard}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
            >
              <h4 className={styles.specArea}>{spec.area}</h4>
              <p className={styles.specDetail}>{spec.spec}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default ConstructionSpecs;
