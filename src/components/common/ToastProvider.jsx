import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert, Slide, useMediaQuery, useTheme } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

const ToastContext = createContext(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

let toastId = 0;

const SlideTransition = (props) => <Slide {...props} direction="down" />;

const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const addToast = useCallback((message, severity = 'info', duration = 4000) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, severity, duration }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((msg, dur) => addToast(msg, 'success', dur), [addToast]);
  const error = useCallback((msg, dur) => addToast(msg, 'error', dur), [addToast]);
  const warning = useCallback((msg, dur) => addToast(msg, 'warning', dur), [addToast]);
  const info = useCallback((msg, dur) => addToast(msg, 'info', dur), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, warning, info }}>
      {children}
      <div
        style={{
          position: 'fixed',
          top: 16,
          right: isMobile ? '50%' : 16,
          transform: isMobile ? 'translateX(50%)' : 'none',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
          maxWidth: isMobile ? 'calc(100vw - 32px)' : 400,
          width: isMobile ? 'calc(100vw - 32px)' : 'auto',
        }}
      >
        <AnimatePresence>
          {toasts.map((toast, index) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{ pointerEvents: 'auto' }}
            >
              <Snackbar
                open
                autoHideDuration={toast.duration}
                onClose={() => removeToast(toast.id)}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: isMobile ? 'center' : 'right',
                }}
                sx={{
                  position: 'relative',
                  top: 'auto !important',
                  right: 'auto !important',
                  left: 'auto !important',
                  bottom: 'auto !important',
                  transform: 'none !important',
                }}
                TransitionComponent={SlideTransition}
              >
                <Alert
                  onClose={() => removeToast(toast.id)}
                  severity={toast.severity}
                  variant="filled"
                  sx={{
                    width: '100%',
                    minWidth: isMobile ? 'auto' : 320,
                    borderRadius: '10px',
                    fontFamily: '"DM Sans", sans-serif',
                    fontWeight: 500,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  }}
                >
                  {toast.message}
                </Alert>
              </Snackbar>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
