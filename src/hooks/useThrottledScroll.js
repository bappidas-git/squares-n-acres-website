import { useEffect, useRef } from 'react';

/**
 * Throttled scroll event listener.
 * Calls the callback at most once per `delay` ms.
 */
const useThrottledScroll = (callback, delay = 100) => {
  const lastRun = useRef(0);
  const rafId = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      const now = Date.now();
      if (now - lastRun.current >= delay) {
        lastRun.current = now;
        callback();
      } else if (!rafId.current) {
        rafId.current = setTimeout(() => {
          lastRun.current = Date.now();
          callback();
          rafId.current = null;
        }, delay - (now - lastRun.current));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId.current) clearTimeout(rafId.current);
    };
  }, [callback, delay]);
};

export default useThrottledScroll;
