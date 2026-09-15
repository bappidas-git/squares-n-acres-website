import React from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useInView } from 'react-intersection-observer';
import styles from './ConstructionStatus.module.css';

const ConstructionStatus = ({ status, constructionTimeline }) => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  // Require constructionTimeline data from API — no static fallback
  const milestones = Array.isArray(constructionTimeline) && constructionTimeline.length > 0
    ? constructionTimeline
    : null;

  if (!milestones) return null;

  // Determine progress from milestone statuses
  const getProgress = () => {
    if (status === 'ready-to-move') return milestones.length;
    // Count completed milestones from API data
    const completedCount = milestones.filter(
      (m) => m.status === 'completed'
    ).length;
    return completedCount;
  };

  const progress = getProgress();

  const getStatusLabel = () => {
    if (status === 'ready-to-move') return 'Completed — Ready to Move';
    if (status === 'under-construction') return 'Under Construction';
    if (status === 'pre-launch') return 'Pre-Launch — Coming Soon';
    return status;
  };

  const getStatusColor = () => {
    if (status === 'ready-to-move') return '#059669';
    if (status === 'under-construction') return '#D97706';
    if (status === 'pre-launch') return '#2563EB';
    return '#6B7280';
  };

  return (
    <section className={styles.section} ref={ref} id="construction">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Construction Status</h2>
          <div className={styles.statusBadge} style={{ '--status-color': getStatusColor() }}>
            <Icon
              icon={status === 'ready-to-move' ? 'mdi:check-circle' : 'mdi:progress-clock'}
              className={styles.statusIcon}
            />
            <span>{getStatusLabel()}</span>
          </div>
        </div>

        <div className={styles.timeline}>
          {/* Progress connector line */}
          <div className={styles.connector}>
            <motion.div
              className={styles.connectorFill}
              initial={{ width: 0 }}
              animate={inView ? { width: `${(Math.max(0, progress - 1) / (milestones.length - 1)) * 100}%` } : {}}
              transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
            />
          </div>

          <div className={styles.milestones}>
            {milestones.map((milestone, idx) => {
              const isCompleted = milestone.status === 'completed' || idx < progress;
              const isCurrent = milestone.status === 'in-progress' || (idx === progress && progress < milestones.length);
              return (
                <motion.div
                  key={milestone.label || idx}
                  className={`${styles.milestone} ${isCompleted ? styles.completed : ''} ${isCurrent ? styles.current : ''}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.2 + idx * 0.15 }}
                >
                  <div className={styles.milestoneNode}>
                    {isCompleted ? (
                      <Icon icon="mdi:check" className={styles.nodeIcon} />
                    ) : (
                      <Icon icon={milestone.icon || 'mdi:circle-outline'} className={styles.nodeIcon} />
                    )}
                  </div>
                  <div className={styles.milestoneInfo}>
                    <span className={styles.milestoneLabel}>{milestone.label}</span>
                    {milestone.description && (
                      <span className={styles.milestoneDesc}>{milestone.description}</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default ConstructionStatus;
