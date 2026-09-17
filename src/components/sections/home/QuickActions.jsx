import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import PATHS from '../../../routes/paths';
import useInView from '../../../hooks/useInView';
import styles from './QuickActions.module.css';

/**
 * The six ways into the listing (D92).
 *
 * Each tile is a real category route with its own heading and canonical, not a
 * `?type=` query the listing never read — `type=lease` in particular matched
 * nothing at all, so the "Lease Office Space" tile returned an empty search
 * (BUG-10).
 */
const actions = [
  {
    icon: 'mdi:home-search',
    title: 'Buy a home',
    description: 'Apartments, villas and plots for sale across Bengaluru.',
    link: PATHS.buy,
  },
  {
    icon: 'mdi:key-variant',
    title: 'Rent a home',
    description: 'Rental homes with the monthly rent, deposit and furnishing stated upfront.',
    link: PATHS.rent,
  },
  {
    icon: 'mdi:office-building',
    title: 'Lease office space',
    description: 'Offices, retail units and warehouses available on lease.',
    link: PATHS.lease,
  },
  {
    icon: 'mdi:storefront-outline',
    title: 'Commercial property',
    description:
      'Offices, shops and showrooms to buy or lease, with the floor plate on every listing.',
    link: PATHS.commercial,
  },
  {
    icon: 'mdi:map-outline',
    title: 'Plots & land',
    description: 'Residential plots and land around Bengaluru, with the approval and khata.',
    link: PATHS.plots,
  },
  {
    icon: 'mdi:home-clock-outline',
    title: 'Ready to move',
    description: 'Completed homes you can visit, register and move into now.',
    link: PATHS.buyStatus('ready-to-move'),
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: 'easeOut' },
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
