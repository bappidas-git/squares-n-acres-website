import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useInView } from 'react-intersection-observer';
import styles from './FloorPlans.module.css';

const formatPrice = (price, unit) => {
  if (price == null || isNaN(Number(price))) return 'Price on Request';
  const numPrice = Number(price);
  if (unit === 'per month') return `₹${numPrice.toLocaleString('en-IN')}/mo`;
  if (numPrice >= 10000000) return `₹${(numPrice / 10000000).toFixed(2)} Cr`;
  if (numPrice >= 100000) return `₹${(numPrice / 100000).toFixed(2)} L`;
  return `₹${numPrice.toLocaleString('en-IN')}`;
};

const FloorPlans = ({
  floorPlans = [],
  priceUnit = 'onwards',
  onRequestDetails,
  onGetPricing,
  isLeadCaptured = false,
  onFloorPlanImageClick,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  if (floorPlans.length === 0) return null;

  const activePlan = floorPlans[activeTab] || floorPlans[0];
  if (!activePlan) return null;

  const handleFloorPlanImageClick = () => {
    if (!isLeadCaptured && onFloorPlanImageClick) {
      onFloorPlanImageClick();
    }
  };

  return (
    <section className={styles.section} ref={ref} id="floor-plans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <h2 className={styles.title}>Floor Plans & Pricing</h2>

        <div className={styles.tabs}>
          {floorPlans.map((plan, idx) => (
            <button
              key={idx}
              className={`${styles.tab} ${idx === activeTab ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(idx)}
            >
              {plan.config}
            </button>
          ))}
        </div>

        <div className={styles.content}>
          <div className={styles.planImageCol}>
            <div
              className={`${styles.planImage} ${!isLeadCaptured ? styles.planImageBlurred : ''}`}
              onClick={handleFloorPlanImageClick}
              role={!isLeadCaptured ? 'button' : undefined}
              tabIndex={!isLeadCaptured ? 0 : undefined}
              onKeyDown={!isLeadCaptured ? (e) => { if (e.key === 'Enter' || e.key === ' ') handleFloorPlanImageClick(); } : undefined}
            >
              <img
                src={activePlan.image}
                alt={`${activePlan.config} floor plan`}
                loading="lazy"
              />
              {!isLeadCaptured && (
                <div className={styles.blurOverlay}>
                  <div className={styles.blurOverlayContent}>
                    <Icon icon="mdi:lock-outline" className={styles.blurOverlayIcon} />
                    <span className={styles.blurOverlayText}>Click to View Floor Plan</span>
                    <span className={styles.blurOverlaySubtext}>Share your details to unlock</span>
                  </div>
                </div>
              )}
            </div>
            <button
              className={styles.getPricingBtn}
              onClick={() => onGetPricing && onGetPricing(activePlan.config)}
            >
              <Icon icon="mdi:currency-inr" />
              Get Detailed Pricing
            </button>
          </div>

          <div className={styles.planDetails}>
            <h3 className={styles.planConfig}>{activePlan.config} Configuration</h3>

            <div className={styles.planStats}>
              <div className={styles.planStat}>
                <Icon icon="mdi:ruler-square" className={styles.statIcon} />
                <span className={styles.statLabel}>Area</span>
                <span className={styles.statValue}>{activePlan.area || '—'}</span>
              </div>
              <div className={styles.planStat}>
                <Icon icon="mdi:currency-inr" className={styles.statIcon} />
                <span className={styles.statLabel}>Price</span>
                <span className={styles.statValue}>
                  {formatPrice(activePlan.price, priceUnit)}{' '}
                  <small>{priceUnit}</small>
                </span>
              </div>
              <div className={styles.planStat}>
                <Icon icon="mdi:bed-king-outline" className={styles.statIcon} />
                <span className={styles.statLabel}>Bedrooms</span>
                <span className={styles.statValue}>{activePlan.bedrooms || '—'}</span>
              </div>
              <div className={styles.planStat}>
                <Icon icon="mdi:shower" className={styles.statIcon} />
                <span className={styles.statLabel}>Bathrooms</span>
                <span className={styles.statValue}>{activePlan.bathrooms || '—'}</span>
              </div>
            </div>

            <button className={styles.requestBtn} onClick={onRequestDetails}>
              <Icon icon="mdi:file-document-outline" />
              Request Floor Plan Details
            </button>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default FloorPlans;
