import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import useThrottledScroll from '../../hooks/useThrottledScroll';

const BackToTop = () => {
  const [visible, setVisible] = useState(false);

  const handleScroll = useCallback(() => {
    setVisible(window.scrollY > 400);
  }, []);

  useThrottledScroll(handleScroll, 150);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          onClick={scrollToTop}
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          aria-label="Back to top"
          style={{
            position: 'fixed',
            bottom: 80,
            right: 20,
            zIndex: 1100,
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: 'none',
            background: '#1B2A4A',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(27, 42, 74, 0.3)',
            fontSize: 22,
          }}
        >
          <Icon icon="mdi:chevron-up" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default BackToTop;
