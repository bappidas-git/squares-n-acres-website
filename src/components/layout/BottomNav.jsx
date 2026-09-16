import React, { useState } from 'react';
import { Link, matchPath, useLocation } from 'react-router-dom';
import { SwipeableDrawer } from '@mui/material';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import PATHS from '../../routes/paths';
import useScrollDirection from '../../hooks/useScrollDirection';
import { useShortlist } from '../../contexts/ShortlistContext';
import styles from './BottomNav.module.css';

const navItems = [
  { label: 'Home', path: '/', icon: 'mdi:home-outline', activeIcon: 'mdi:home' },
  { label: 'Search', path: '/properties', icon: 'mdi:magnify', activeIcon: 'mdi:magnify' },
  { label: 'Assistance', path: null, icon: 'mdi:hand-heart-outline', activeIcon: 'mdi:hand-heart' },
  {
    label: 'Saved',
    path: PATHS.shortlist,
    icon: 'mdi:heart-outline',
    activeIcon: 'mdi:heart',
    badge: 'shortlist',
  },
  { label: 'Contact', path: '/contact', icon: 'mdi:phone-outline', activeIcon: 'mdi:phone' },
];

/**
 * The routes that carry a contact bar of their own.
 *
 * A property page's Call · WhatsApp · Enquire bar is about *this* listing and
 * sits where the bottom navigation sits; two stacked bars would take a third of
 * a phone screen, so this one stands down (prompt 23 §4.9).
 */
const OWN_BOTTOM_BAR = ['/properties/:slug'];

const assistanceItems = [
  { label: 'Home Loan', path: '/buyer-assistance/home-loan', icon: 'mdi:bank-outline' },
  {
    label: 'Legal Assistance',
    path: '/buyer-assistance/legal-assistance',
    icon: 'mdi:scale-balance',
  },
  {
    label: 'Interior Designing',
    path: '/buyer-assistance/interior-designing',
    icon: 'mdi:palette-outline',
  },
];

const BottomNav = () => {
  const location = useLocation();
  // D52: the bottom nav is the one chrome that hides on scroll-down.
  const { direction } = useScrollDirection();
  const { count } = useShortlist();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hidden = direction === 'down';

  const standsDown = OWN_BOTTOM_BAR.some((pattern) => matchPath(pattern, location.pathname));
  if (standsDown) return null;

  const isActive = (item) => {
    if (!item.path) return location.pathname.startsWith('/buyer-assistance');
    if (item.path === '/') return location.pathname === '/';
    return location.pathname.startsWith(item.path);
  };

  return (
    <>
      <nav className={`${styles.bottomNav} ${hidden ? styles.hidden : ''}`}>
        <div className={styles.navItems}>
          {navItems.map((item) => {
            const active = isActive(item);

            if (item.path === null) {
              // Buyer Assistance - opens drawer
              return (
                <motion.button
                  key={item.label}
                  className={`${styles.navButton} ${active ? styles.active : ''}`}
                  onClick={() => setDrawerOpen(true)}
                  whileTap={{ scale: 0.9 }}
                  aria-label={item.label}
                >
                  <span className={styles.navIcon}>
                    <Icon icon={active ? item.activeIcon : item.icon} />
                  </span>
                  <span className={styles.navLabel}>{item.label}</span>
                </motion.button>
              );
            }

            const badge = item.badge === 'shortlist' && count > 0 ? count : null;

            return (
              <motion.div key={item.label} whileTap={{ scale: 0.9 }}>
                <Link
                  to={item.path}
                  className={`${styles.navButton} ${active ? styles.active : ''}`}
                  aria-label={badge ? `${item.label} (${badge})` : item.label}
                >
                  <span className={styles.navIcon}>
                    <Icon icon={active ? item.activeIcon : item.icon} />
                    {badge ? (
                      <span className={styles.badge} aria-hidden="true">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    ) : null}
                  </span>
                  <span className={styles.navLabel}>{item.label}</span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </nav>

      {/* Buyer Assistance Drawer */}
      <SwipeableDrawer
        anchor="bottom"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpen={() => setDrawerOpen(true)}
        disableSwipeToOpen
        PaperProps={{ className: styles.drawerPaper }}
      >
        <div className={styles.drawerContent}>
          <div className={styles.drawerHandle} />
          <div className={styles.drawerTitle}>Buyer Assistance</div>
          <div className={styles.drawerOptions}>
            {assistanceItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={styles.drawerOption}
                onClick={() => setDrawerOpen(false)}
              >
                <span className={styles.drawerOptionIcon}>
                  <Icon icon={item.icon} />
                </span>
                <span className={styles.drawerOptionLabel}>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </SwipeableDrawer>
    </>
  );
};

export default BottomNav;
