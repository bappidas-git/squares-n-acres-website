import { useEffect, useRef, useState } from 'react';

/**
 * One passive, rAF-throttled scroll listener shared by every element that has
 * to react to scrolling — it replaces the three copies the boilerplate carried
 * in `Header`, `MobileHeader` and `BottomNav`.
 *
 * @param {{ threshold?: number, offset?: number }} options
 *   `threshold` — pixels of movement before the direction flips (anti-jitter).
 *   `offset`    — scroll position below which the direction is always `'up'`,
 *                 so nothing hides while the visitor is still near the top.
 * @returns {{ direction: 'up' | 'down', scrolled: boolean, atTop: boolean, scrollY: number }}
 */
export default function useScrollDirection({ threshold = 8, offset = 80 } = {}) {
  const [state, setState] = useState({
    direction: 'up',
    scrolled: false,
    atTop: true,
    scrollY: 0,
  });
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const read = () => {
      const y = Math.max(window.scrollY || window.pageYOffset || 0, 0);
      const delta = y - lastY.current;

      setState((previous) => {
        const direction =
          y <= offset || Math.abs(delta) < threshold
            ? y <= offset
              ? 'up'
              : previous.direction
            : delta > 0
              ? 'down'
              : 'up';
        const next = { direction, scrolled: y > 10, atTop: y <= 0, scrollY: y };
        return next.direction === previous.direction &&
          next.scrolled === previous.scrolled &&
          next.atTop === previous.atTop &&
          next.scrollY === previous.scrollY
          ? previous
          : next;
      });

      if (Math.abs(delta) >= threshold) lastY.current = y;
      ticking.current = false;
    };

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(read);
    };

    lastY.current = window.scrollY || 0;
    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold, offset]);

  return state;
}
