import { useEffect, useRef, useState } from 'react';

import { prefersReducedMotion } from '../utils/motion';

const easeOutCubic = (t) => 1 - (1 - t) ** 3;

const roundTo = (value, decimals) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

/**
 * Animate a number from `start` to `end` with `requestAnimationFrame`.
 * Replaces `react-countup`.
 *
 * `enabled` gates the whole thing — the usual pattern is `enabled: inView`, so
 * the counter rests at `start` until its section is on screen. Once enabled,
 * `prefers-reduced-motion` (or a missing rAF) jumps straight to `end`.
 *
 * @param {number} end
 * @param {{ duration?: number, start?: number, enabled?: boolean, decimals?: number }} options
 * @returns {number}
 */
export default function useCountUp(
  end,
  { duration = 1200, start = 0, enabled = true, decimals = 0 } = {}
) {
  const target = Number.isFinite(Number(end)) ? Number(end) : 0;
  const [value, setValue] = useState(() => roundTo(Number(start) || 0, decimals));
  const frameRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;

    if (prefersReducedMotion() || typeof requestAnimationFrame === 'undefined' || duration <= 0) {
      setValue(roundTo(target, decimals));
      return undefined;
    }

    const from = Number(start) || 0;
    const startedAt = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      setValue(roundTo(from + (target - from) * easeOutCubic(progress), decimals));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, duration, start, enabled, decimals]);

  return value;
}
