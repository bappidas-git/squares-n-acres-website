import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';

import { toneStyles } from '../ui/tones';

import styles from './ToastProvider.module.css';

/**
 * The one toast system of the app, public and admin alike (D54).
 *
 * At most three toasts are visible at a time — older ones drop off the top, so
 * a burst of API errors cannot cover the screen. The region is `aria-live`
 * polite, which announces each toast without stealing focus (§8.3), and it is
 * portalled to `document.body`: a `position: fixed` element inside a
 * transformed ancestor — the page transition of `MainLayout`, a sticky column
 * — is positioned against that ancestor rather than the viewport, and its
 * `--z-toast` means nothing outside its stacking context.
 */

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

const MAX_VISIBLE = 3;
const DEFAULT_DURATION = 4000;

/** `severity` keeps the MUI vocabulary the call sites already use. */
const TONE_BY_SEVERITY = {
  success: 'success',
  error: 'error',
  warning: 'warning',
  info: 'info',
};

let nextId = 0;

const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  const reducedMotion = useReducedMotion();

  const removeToast = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (message, severity = 'info', duration = DEFAULT_DURATION) => {
      const id = (nextId += 1);
      setToasts((previous) => [...previous, { id, message, severity }].slice(-MAX_VISIBLE));
      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => removeToast(id), duration)
        );
      }
      return id;
    },
    [removeToast]
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  const value = useMemo(
    () => ({
      addToast,
      removeToast,
      success: (message, duration) => addToast(message, 'success', duration),
      error: (message, duration) => addToast(message, 'error', duration),
      warning: (message, duration) => addToast(message, 'warning', duration),
      info: (message, duration) => addToast(message, 'info', duration),
    }),
    [addToast, removeToast]
  );

  const offscreen = reducedMotion ? {} : { opacity: 0, y: 12, scale: 0.97 };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document === 'undefined'
        ? null
        : createPortal(
            <div className={styles.region} role="status" aria-live="polite" aria-atomic="false">
              <AnimatePresence initial={false}>
                {toasts.map((toast) => {
                  const palette = toneStyles(TONE_BY_SEVERITY[toast.severity] || 'info');
                  return (
                    <m.div
                      key={toast.id}
                      layout={!reducedMotion}
                      initial={offscreen}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={offscreen}
                      transition={{ duration: reducedMotion ? 0 : 0.2 }}
                      className={styles.toast}
                      style={{
                        background: palette.background,
                        borderColor: palette.border,
                        color: palette.color,
                      }}
                    >
                      <span className={styles.message}>{toast.message}</span>
                      <button
                        type="button"
                        className={styles.close}
                        onClick={() => removeToast(toast.id)}
                        aria-label="Dismiss notification"
                      >
                        &times;
                      </button>
                    </m.div>
                  );
                })}
              </AnimatePresence>
            </div>,
            document.body
          )}
    </ToastContext.Provider>
  );
};

export default ToastProvider;
