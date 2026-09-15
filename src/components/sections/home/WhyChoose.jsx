import React from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useInView } from 'react-intersection-observer';
import styles from './WhyChoose.module.css';

const features = [
  {
    icon: 'mdi:compass-outline',
    title: 'Expert Guidance',
    description:
      'Professional real estate advisors with deep market knowledge.',
  },
  {
    icon: 'mdi:star-outline',
    title: 'Premium Listings',
    description: 'Exclusive access to luxury and high-end properties.',
  },
  {
    icon: 'mdi:shield-check-outline',
    title: 'Secure Transactions',
    description: 'Safe and transparent property buying process.',
  },
  {
    icon: 'mdi:headset',
    title: 'Dedicated Support',
    description: 'Personalized assistance throughout your journey.',
  },
];

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.12, ease: 'easeOut' },
  }),
};

const WhyChoose = () => {
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
          <h2 className={styles.title}>Why Choose H.O.M Advisory</h2>
          <p className={styles.subtitle}>
            Your trusted partner in finding the perfect property
          </p>
        </motion.div>

        <div className={styles.grid}>
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className={styles.featureItem}
              custom={i}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
              variants={itemVariants}
            >
              <div className={styles.iconCircle}>
                <Icon icon={feature.icon} className={styles.icon} />
              </div>
              <h4 className={styles.featureTitle}>{feature.title}</h4>
              <p className={styles.featureDesc}>{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChoose;
