import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useInView } from 'react-intersection-observer';
import styles from './PropertySpecs.module.css';

const DESKTOP_ROW_COUNT = 4;

const PropertySpecs = ({ specifications = {}, specificationsArray, propertyType }) => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const [expanded, setExpanded] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState(null);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  };

  // Support:
  // 1. specificationsArray prop (explicit array prop)
  // 2. specifications prop passed as an array (most common — API returns array)
  // 3. specifications prop as a legacy object (old format fallback)
  const specsSource = Array.isArray(specificationsArray) && specificationsArray.length > 0
    ? specificationsArray
    : Array.isArray(specifications) && specifications.length > 0
      ? specifications
      : null;

  let specs;
  if (specsSource) {
    specs = specsSource
      .filter((s) => s.key && s.value)
      .map((s) => ({
        icon: s.icon || 'mdi:information-outline',
        label: s.key,
        value: String(s.value),
      }));
  } else {
    specs = [
      { icon: 'mdi:land-plots', label: 'Project Area', value: specifications.projectArea || '—' },
      { icon: 'mdi:office-building', label: specifications.towers ? 'Towers' : 'Type', value: specifications.towers ? `${specifications.towers} Towers` : propertyType || '—' },
      { icon: 'mdi:home-group', label: 'Total Units', value: specifications.totalUnits ? `${specifications.totalUnits}+ ${propertyType === 'villa' ? 'Villas' : 'Apartments'}` : '—' },
      { icon: 'mdi:stairs', label: 'Floors', value: specifications.floors ? `Upto ${specifications.floors} Floors` : '—' },
      { icon: 'mdi:floor-plan', label: 'Unit Variants', value: specifications.constructionType || '—' },
      { icon: 'mdi:file-certificate', label: 'RERA ID', value: specifications.reraId || '—' },
      { icon: 'mdi:rocket-launch', label: 'Launch Date', value: formatDate(specifications.launchDate) },
      { icon: 'mdi:key-variant', label: 'Possession Date', value: formatDate(specifications.possessionDate) },
    ].filter((s) => s.value !== '—');
  }

  if (specs.length === 0) return null;

  const remainingCount = Math.max(0, specs.length - DESKTOP_ROW_COUNT);

  return (
    <section className={styles.section} ref={ref} id="specifications">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <h2 className={styles.title}>Property Details</h2>

        <div className={styles.grid}>
          {specs.map((spec, idx) => (
            <motion.div
              key={idx}
              className={`${styles.specItem} ${!expanded && idx >= DESKTOP_ROW_COUNT ? styles.hiddenDesktop : ''}`}
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              onMouseEnter={() => setActiveTooltip(idx)}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              <div className={styles.iconWrap}>
                <Icon icon={spec.icon} className={styles.icon} />
              </div>
              <div className={styles.specInfo}>
                <span className={styles.specLabel}>{spec.label}</span>
                <span className={styles.specValue}>{spec.value}</span>
                {activeTooltip === idx && spec.value.length > 18 && (
                  <div className={styles.tooltip}>{spec.value}</div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {remainingCount > 0 && (
          <button
            className={styles.showMoreBtn}
            onClick={() => setExpanded(!expanded)}
          >
            <Icon icon={expanded ? 'mdi:chevron-up' : 'mdi:chevron-down'} className={styles.showMoreIcon} />
            {expanded ? 'Show Less' : `Show ${remainingCount} More Specification${remainingCount > 1 ? 's' : ''}`}
          </button>
        )}
      </motion.div>
    </section>
  );
};

export default PropertySpecs;
