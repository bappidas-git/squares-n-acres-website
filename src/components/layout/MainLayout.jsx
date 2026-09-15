import React from 'react';
import { useLocation } from 'react-router-dom';
import { useMediaQuery, useTheme } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './Header';
import MobileHeader from './MobileHeader';
import Footer from './Footer';
import BottomNav from './BottomNav';
import NewsletterSection from '../common/NewsletterSection';
import ScrollToTop from '../common/ScrollToTop';
import BackToTop from '../common/BackToTop';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2 } },
};

const MainLayout = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); // below 960px
  const location = useLocation();

  return (
    <>
      {/* Scroll to top on route change */}
      <ScrollToTop />

      {/* Skip to main content — accessibility */}
      <a
        href="#main-content"
        className="skip-to-main"
      >
        Skip to main content
      </a>

      {/* Header */}
      {isMobile ? <MobileHeader /> : <Header />}

      {/* Main Content */}
      <main
        id="main-content"
        role="main"
        style={{
          paddingTop: isMobile ? 60 : 72,
          paddingBottom: isMobile ? 56 : 0,
          minHeight: '100vh',
          overflowX: 'clip',
        }}
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

      {/* Newsletter + Footer */}
      <NewsletterSection />
      <Footer />

      {/* Back to Top button */}
      <BackToTop />

      {/* Mobile Bottom Nav */}
      {isMobile && <BottomNav />}
    </>
  );
};

export default MainLayout;
