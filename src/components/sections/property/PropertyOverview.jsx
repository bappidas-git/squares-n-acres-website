import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useInView } from 'react-intersection-observer';
import styles from './PropertyOverview.module.css';

const formatPrice = (price, unit) => {
  if (price == null || isNaN(Number(price))) return 'Price on Request';
  const numPrice = Number(price);
  if (unit === 'per month') return `₹${numPrice.toLocaleString('en-IN')}/mo`;
  if (numPrice >= 10000000) return `₹${(numPrice / 10000000).toFixed(2)} Cr`;
  if (numPrice >= 100000) return `₹${(numPrice / 100000).toFixed(2)} L`;
  return `₹${numPrice.toLocaleString('en-IN')}`;
};

const INITIAL_VISIBLE_COUNT = 2;

const PropertyOverview = ({ property }) => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const [showAllHighlights, setShowAllHighlights] = useState(false);

  const details = [
    {
      icon: 'mdi:floor-plan',
      label: 'Configuration',
      value: property.configuration?.join(', ') || '—',
    },
    {
      icon: 'mdi:ruler-square',
      label: 'Area Range',
      value: property.dimensionRange
        ? `${property.dimensionRange.min} - ${property.dimensionRange.max} ${property.dimensionRange.unit}`
        : '—',
    },
    {
      icon: 'mdi:currency-inr',
      label: 'Price Range',
      value: property.floorPlans?.length
        ? `${formatPrice(property.floorPlans[0].price, property.priceUnit)} - ${formatPrice(property.floorPlans[property.floorPlans.length - 1].price, property.priceUnit)}`
        : formatPrice(property.price, property.priceUnit),
    },
    {
      icon: 'mdi:calendar-check',
      label: 'Possession Date',
      value: property.possession || '—',
    },
  ];

  const highlights = property.highlights || [];
  const totalHighlights = highlights.length;
  const visibleHighlights = showAllHighlights
    ? highlights
    : highlights.slice(0, INITIAL_VISIBLE_COUNT);
  const remainingCount = totalHighlights - INITIAL_VISIBLE_COUNT;

  return (
    <section className={styles.section} ref={ref} id="overview">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <h2 className={styles.title}>Project Overview</h2>

        {property.description && (
          <p className={styles.description}>{property.description}</p>
        )}

        <div className={styles.detailsGrid}>
          {details.map((detail, idx) => (
            <div key={idx} className={styles.detailCard}>
              <Icon icon={detail.icon} className={styles.detailIcon} />
              <span className={styles.detailLabel}>{detail.label}</span>
              <span className={styles.detailValue}>{detail.value}</span>
            </div>
          ))}
        </div>

        <div className={styles.developer}>
          <Icon icon="mdi:domain" className={styles.devIcon} />
          <span className={styles.devLabel}>Developer:</span>
          <span className={styles.devName}>{property.developer || '—'}</span>
        </div>

        {totalHighlights > 0 && (
          <div className={styles.highlights}>
            <h3 className={styles.highlightsTitle}>
              <Icon icon="mdi:star-four-points" className={styles.highlightIcon} />
              {totalHighlights} Big Reasons This Project Stands Out
            </h3>
            <ul className={styles.highlightsList}>
              {visibleHighlights.map((item, idx) => (
                <li key={idx} className={styles.highlightItem}>
                  <span className={styles.highlightNumber}>{idx + 1}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            {remainingCount > 0 && !showAllHighlights && (
              <button
                className={styles.viewMoreBtn}
                onClick={() => setShowAllHighlights(true)}
              >
                <Icon icon="mdi:chevron-down" className={styles.viewMoreIcon} />
                View {remainingCount} More Reason{remainingCount > 1 ? 's' : ''}
              </button>
            )}
            {showAllHighlights && totalHighlights > INITIAL_VISIBLE_COUNT && (
              <button
                className={styles.viewMoreBtn}
                onClick={() => setShowAllHighlights(false)}
              >
                <Icon icon="mdi:chevron-up" className={styles.viewMoreIcon} />
                Show Less
              </button>
            )}
          </div>
        )}
      </motion.div>
    </section>
  );
};

export default PropertyOverview;
