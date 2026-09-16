import React from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useBreakpoint from '../../hooks/useBreakpoint';
import Header from './Header';
import MobileHeader from './MobileHeader';
import Footer from './Footer';
import BottomNav from './BottomNav';
import ScrollToTop from '../common/ScrollToTop';
import BackToTop from '../common/BackToTop';
import styles from './MainLayout.module.css';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2 } },
};

const MainLayout = ({ children }) => {
  // One breakpoint for JS and CSS: `md` = 900px (D51).
  const { isMobile } = useBreakpoint();
  const location = useLocation();

  return (
    <>
      {/* Scroll to top on route change */}
      <ScrollToTop />

      {/* Skip to main content — accessibility */}
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>

      {/* Header */}
      {isMobile ? <MobileHeader /> : <Header />}

      {/* Main Content */}
      <main id="main-content" className={styles.main}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer — it renders the newsletter band when settings enable it */}
      <Footer />

      {/* Back to Top button */}
      <BackToTop />

      {/* Mobile Bottom Nav */}
      {isMobile && <BottomNav />}
    </>
  );
};

export default MainLayout;
