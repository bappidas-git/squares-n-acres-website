import React from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PATHS from '../../routes/paths';
import useBreakpoint from '../../hooks/useBreakpoint';
import Header from './Header';
import MobileHeader from './MobileHeader';
import Footer from './Footer';
import BottomNav from './BottomNav';
import ScrollToTop from '../common/ScrollToTop';
import WhatsAppButton from '../common/WhatsAppButton';
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
      {/* D52: the header is transparent over the home hero, so the home page
          starts at the top of the viewport rather than below the bar. */}
      <main
        id="main-content"
        className={[styles.main, location.pathname === PATHS.home ? styles.flush : '']
          .filter(Boolean)
          .join(' ')}
      >
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

      {/* One tap to a conversation, on every public page. It renders nothing
          when no WhatsApp number is configured (§14) and never appears in the
          admin panel, which has its own layout. */}
      <WhatsAppButton variant="float" context="floating" />

      {/* Mobile Bottom Nav */}
      {isMobile && <BottomNav />}
    </>
  );
};

export default MainLayout;
