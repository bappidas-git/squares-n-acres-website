import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useInView } from 'react-intersection-observer';
import styles from './QuickActions.module.css';

const actions = [
  {
    icon: 'mdi:home-search',
    title: 'Buy a home',
    description:
      'Find your place with an immersive photo experience and the most listings.',
    link: '/properties?type=sale',
  },
  {
    icon: 'mdi:key-variant',
    title: 'Rent a home',
    description:
      'Find rental properties with flexible terms and premium amenities for your comfort.',
    link: '/properties?type=rent',
  },
  {
    icon: 'mdi:office-building',
    title: 'Lease Office Space',
    description:
      'Discover premium commercial spaces perfect for your business needs.',
    link: '/properties?type=lease',
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.15, ease: 'easeOut' },
  }),
};

const QuickActions = () => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.2 });

  return (
    <section className={styles.section} ref={ref}>
      <div className={styles.container}>
        <div className={styles.grid}>
          {actions.map((action, i) => (
            <motion.div
              key={action.title}
              className={styles.card}
              custom={i}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
              variants={cardVariants}
            >
              <div className={styles.iconWrap}>
                <Icon icon={action.icon} className={styles.icon} />
              </div>
              <h3 className={styles.cardTitle}>{action.title}</h3>
              <p className={styles.cardDesc}>{action.description}</p>
              <Link to={action.link} className={styles.cardLink}>
                Learn more <Icon icon="mdi:arrow-right" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default QuickActions;
