/**
 * `prefers-reduced-motion` in plain JS, safe in jsdom and during prerendering
 * (where `matchMedia` may be missing).
 */
export function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
