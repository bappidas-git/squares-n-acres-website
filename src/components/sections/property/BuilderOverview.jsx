import React from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useInView } from 'react-intersection-observer';
import CountUp from 'react-countup';
import styles from './BuilderOverview.module.css';

const BuilderOverview = ({ developer, developerInfo }) => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.15 });

  // Return null if no developer data from API
  if (!developer && !developerInfo?.name) return null;

  const developerName = developerInfo?.name || developer;
  const description = developerInfo?.description || null;
  const logo = developerInfo?.logo || null;

  // Only show stats if API provides them — no fallback defaults
  const stats = (developerInfo?.stats && developerInfo.stats.length > 0)
    ? developerInfo.stats
      .filter((s) => s.value && s.label)
      .map((s) => ({
        value: Number(s.value) || 0,
        suffix: s.suffix || '',
        label: s.label || 'Metric',
        icon: s.icon || 'mdi:information',
      }))
    : [];

  return (
    <section className={styles.section} ref={ref} id="builder">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.badge}>
              <Icon icon="mdi:shield-star" /> Meet the Developer
            </span>
            <h2 className={styles.title}>{developerName}</h2>
          </div>
          <div className={styles.logoPlaceholder}>
            {logo ? (
              <img src={logo} alt={`${developerName} logo`} style={{ maxHeight: 48, maxWidth: 120, objectFit: 'contain' }} />
            ) : (
              <Icon icon="mdi:domain" className={styles.logoIcon} />
            )}
          </div>
        </div>

        {description && (
          <p className={styles.description}>{description}</p>
        )}

        {stats.length > 0 && (
          <div className={styles.statsGrid}>
            {stats.map((stat, idx) => (
              <motion.div
                key={idx}
                className={styles.statCard}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.2 + idx * 0.1 }}
              >
                <Icon icon={stat.icon} className={styles.statIcon} />
                <span className={styles.statValue}>
                  {inView ? (
                    <CountUp end={stat.value} duration={2} suffix={stat.suffix} />
                  ) : (
                    `0${stat.suffix}`
                  )}
                </span>
                <span className={styles.statLabel}>{stat.label}</span>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </section>
  );
};

export default BuilderOverview;
