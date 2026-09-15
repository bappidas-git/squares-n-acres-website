import { useCallback, useEffect, useRef, useState } from 'react';

import { prefersReducedMotion } from '../utils/motion';

/**
 * Drop-in replacement for `react-intersection-observer`'s `useInView`, with the
 * same option names.
 *
 * `inView` starts (and stays) `true` when there is nothing to observe with —
 * jsdom, SSR and prerendering have no `IntersectionObserver` — and when the
 * visitor asked for reduced motion, so a fade-up never hides content that will
 * not be animated in.
 *
 * @param {{ threshold?: number, triggerOnce?: boolean, rootMargin?: string, skip?: boolean }} options
 * @returns {{ ref: (node: Element | null) => void, inView: boolean, entry: IntersectionObserverEntry | null }}
 */
export default function useInView({
  threshold = 0.1,
  triggerOnce = true,
  rootMargin = '0px',
  skip = false,
} = {}) {
  const unobserved = skip || typeof IntersectionObserver === 'undefined' || prefersReducedMotion();

  const [inView, setInView] = useState(unobserved);
  const [entry, setEntry] = useState(null);
  const [node, setNode] = useState(null);
  const observerRef = useRef(null);

  const ref = useCallback((next) => setNode(next), []);

  useEffect(() => {
    if (unobserved || !node) return undefined;

    observerRef.current = new IntersectionObserver(
      ([observerEntry]) => {
        setEntry(observerEntry);
        if (observerEntry.isIntersecting) {
          setInView(true);
          if (triggerOnce) observerRef.current?.disconnect();
        } else if (!triggerOnce) {
          setInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observerRef.current.observe(node);
    return () => observerRef.current?.disconnect();
  }, [node, threshold, rootMargin, triggerOnce, unobserved]);

  return { ref, inView, entry };
}
