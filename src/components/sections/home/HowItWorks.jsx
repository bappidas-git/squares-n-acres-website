import React from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useInView } from 'react-intersection-observer';
import styles from './HowItWorks.module.css';

const steps = [
  {
    number: 1,
    icon: 'mdi:magnify',
    title: 'Search Properties',
    description:
      'Browse our extensive collection of premium properties.',
  },
  {
    number: 2,
    icon: 'mdi:calendar-check',
    title: 'Schedule a Tour',
    description:
      'Visit your favourite properties with our expert agents.',
  },
  {
    number: 3,
    icon: 'mdi:file-document-edit-outline',
    title: 'Make an Offer',
    description:
      'Get guidance on making competitive offers.',
  },
  {
    number: 4,
    icon: 'mdi:handshake-outline',
    title: 'Close the Deal',
    description:
      'Complete your purchase with our support.',
  },
];

const stepVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.2, ease: 'easeOut' },
  }),
};

const lineVariants = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: 1.2, ease: 'easeOut', delay: 0.3 },
  },
};

const HowItWorks = () => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.15 });

  return (
    <section className={styles.section} ref={ref}>
      <div className={styles.container}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <h2 className={styles.title}>How It Works</h2>
          <p className={styles.subtitle}>
            Your journey to homeownership in four simple steps
          </p>
        </motion.div>

        <div className={styles.stepsWrapper}>
          <motion.div
            className={styles.connectingLine}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            variants={lineVariants}
          />

          <div className={styles.stepsGrid}>
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                className={styles.stepCard}
                custom={i}
                initial="hidden"
                animate={inView ? 'visible' : 'hidden'}
                variants={stepVariants}
              >
                <div className={styles.numberBadge}>{step.number}</div>
                <div className={styles.stepIconWrap}>
                  <Icon icon={step.icon} className={styles.stepIcon} />
                </div>
                <h4 className={styles.stepTitle}>{step.title}</h4>
                <p className={styles.stepDesc}>{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
