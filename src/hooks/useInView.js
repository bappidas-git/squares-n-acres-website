import { useCallback, useEffect, useRef, useState } from 'react';

import { isPrerendering } from '../utils/prerender';
import { prefersReducedMotion } from '../utils/motion';

/**
 * Drop-in replacement for `react-intersection-observer`'s `useInView`, with the
 * same option names.
 *
 * `inView` starts (and stays) `true` when there is nothing to observe with —
 * jsdom and SSR have no `IntersectionObserver` — when the visitor asked for
 * reduced motion, so a fade-up never hides content that will not be animated
 * in, and during the prerender crawl, which never scrolls and would otherwise
 * save a page whose lower half had neither faded in nor asked for its data
 * (`utils/prerender.js`).
 *
 * That last case is what makes the hook safe to gate a fetch on and not only
 * an animation: a section that defers its request until it is near the viewport
 * (`rootMargin: '200px'`, §8.6) still has its data in the prerendered HTML.
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
  const unobserved =
    skip ||
    typeof IntersectionObserver === 'undefined' ||
    prefersReducedMotion() ||
    isPrerendering();

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
