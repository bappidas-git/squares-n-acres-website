import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SwipeableDrawer } from '@mui/material';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import styles from './BottomNav.module.css';

const navItems = [
  { label: 'Home', path: '/', icon: 'mdi:home-outline', activeIcon: 'mdi:home' },
  { label: 'Search', path: '/properties', icon: 'mdi:magnify', activeIcon: 'mdi:magnify' },
  { label: 'Assistance', path: null, icon: 'mdi:hand-heart-outline', activeIcon: 'mdi:hand-heart' },
  { label: 'Insights', path: '/insights/articles', icon: 'mdi:newspaper-variant-outline', activeIcon: 'mdi:newspaper-variant' },
  { label: 'Contact', path: '/contact', icon: 'mdi:phone-outline', activeIcon: 'mdi:phone' },
];

const assistanceItems = [
  { label: 'Home Loan', path: '/buyer-assistance/home-loan', icon: 'mdi:bank-outline' },
  { label: 'Legal Assistance', path: '/buyer-assistance/legal-assistance', icon: 'mdi:scale-balance' },
  { label: 'Interior Designing', path: '/buyer-assistance/interior-designing', icon: 'mdi:palette-outline' },
];

const BottomNav = () => {
  const location = useLocation();
  const [hidden, setHidden] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const lastScrollY = useRef(0);

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;

    if (currentScrollY > 80) {
      setHidden(currentScrollY > lastScrollY.current);
    } else {
      setHidden(false);
    }

    lastScrollY.current = currentScrollY;
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

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

            return (
              <motion.div key={item.label} whileTap={{ scale: 0.9 }}>
                <Link
                  to={item.path}
                  className={`${styles.navButton} ${active ? styles.active : ''}`}
                  aria-label={item.label}
                >
                  <span className={styles.navIcon}>
                    <Icon icon={active ? item.activeIcon : item.icon} />
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
        PaperProps={{
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          },
        }}
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
