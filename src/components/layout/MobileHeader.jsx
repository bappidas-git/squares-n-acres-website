import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Drawer, IconButton } from '@mui/material';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';
import logo from '../../assets/images/logo.png';
import styles from './MobileHeader.module.css';

const navItems = [
  {
    label: 'Buy',
    path: '/buy',
    children: [
      { label: 'Pre-Launch', path: '/buy/pre-launch' },
      { label: 'Under-construction', path: '/buy/under-construction' },
      { label: 'Ready to Move', path: '/buy/ready-to-move' },
    ],
  },
  {
    label: 'Rent',
    path: '/rent',
    children: [
      { label: 'Apartments', path: '/rent/apartments' },
      { label: 'Villas', path: '/rent/villas' },
    ],
  },
  {
    label: 'Buyer Assistance',
    path: '/buyer-assistance',
    children: [
      { label: 'Home Loan', path: '/buyer-assistance/home-loan' },
      { label: 'Legal Assistance', path: '/buyer-assistance/legal-assistance' },
      { label: 'Interior Designing', path: '/buyer-assistance/interior-designing' },
    ],
  },
  {
    label: 'Real Estate Insights',
    path: '/insights',
    children: [
      { label: 'Articles', path: '/insights/articles' },
      { label: "FAQ's", path: '/insights/faqs' },
      { label: 'Real Estate Awareness', path: '/insights/real-estate-awareness' },
    ],
  },
  {
    label: 'Contact',
    path: '/contact',
  },
];

const sideMenuItems = [
  { label: 'View Properties', path: '/properties', icon: 'mdi:home-city-outline' },
  { label: 'Sign In', path: '/admin/login', icon: 'mdi:login-variant' },
  { label: 'About Us', path: '/about', icon: 'mdi:information-outline' },
  { label: 'Sell/Let Apartment', path: '/sell-let', icon: 'mdi:tag-outline' },
  { label: 'Careers', path: '/careers', icon: 'mdi:briefcase-outline' },
  { label: 'Partnership', path: '/partnership', icon: 'mdi:handshake-outline' },
];

const accordionVariants = {
  collapsed: { height: 0, opacity: 0 },
  expanded: { height: 'auto', opacity: 1, transition: { duration: 0.25, ease: 'easeInOut' } },
};

const MobileHeader = () => {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedItem, setExpandedItem] = useState(null);
  const lastScrollY = useRef(0);

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    setScrolled(currentScrollY > 10);

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

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
    setExpandedItem(null);
  }, [location.pathname]);

  const toggleAccordion = (label) => {
    setExpandedItem(expandedItem === label ? null : label);
  };

  return (
    <header
      className={`${styles.mobileHeader} ${scrolled ? styles.scrolled : ''} ${hidden ? styles.hidden : ''}`}
    >
      <div className={styles.headerInner}>
        <Link to="/" className={styles.logo}>
          <img src={logo} alt="H.O.M Advisory" />
        </Link>

        <button
          className={styles.hamburger}
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
        >
          <div className={styles.hamburgerIcon}>
            <span className={styles.hamburgerLine} />
            <span className={styles.hamburgerLine} />
            <span className={styles.hamburgerLine} />
          </div>
        </button>
      </div>

      {/* Full-screen Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          className: styles.fullDrawer,
          sx: { backdropFilter: 'blur(4px)' },
        }}
      >
        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
        >
          {/* Drawer Header */}
          <div className={styles.drawerHeader}>
            <Link to="/" onClick={() => setDrawerOpen(false)}>
              <img src={logo} alt="H.O.M Advisory" />
            </Link>
            <IconButton onClick={() => setDrawerOpen(false)} aria-label="Close menu">
              <Icon icon="mdi:close" width={24} />
            </IconButton>
          </div>

          {/* Navigation Items */}
          <div className={styles.drawerContent}>
            {navItems.map((item) =>
              item.children ? (
                <div key={item.label} className={styles.accordionItem}>
                  <button
                    className={styles.accordionHeader}
                    onClick={() => toggleAccordion(item.label)}
                    aria-expanded={expandedItem === item.label}
                  >
                    {item.label}
                    <span
                      className={`${styles.accordionChevron} ${expandedItem === item.label ? styles.open : ''}`}
                    >
                      <Icon icon="mdi:chevron-down" />
                    </span>
                  </button>
                  <AnimatePresence>
                    {expandedItem === item.label && (
                      <motion.div
                        className={styles.accordionBody}
                        variants={accordionVariants}
                        initial="collapsed"
                        animate="expanded"
                        exit="collapsed"
                      >
                        {item.children.map((child) => (
                          <Link
                            key={child.path}
                            to={child.path}
                            className={styles.accordionLink}
                            onClick={() => setDrawerOpen(false)}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  key={item.label}
                  to={item.path}
                  className={styles.simpleLink}
                  onClick={() => setDrawerOpen(false)}
                >
                  {item.label}
                </Link>
              )
            )}

            {/* Divider */}
            <div className={styles.drawerDivider} />

            {/* Bottom Section */}
            <div className={styles.drawerBottomSection}>
              {sideMenuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={styles.bottomLink}
                  onClick={() => setDrawerOpen(false)}
                >
                  <span className={styles.bottomLinkIcon}>
                    <Icon icon={item.icon} />
                  </span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      </Drawer>
    </header>
  );
};

export default MobileHeader;
