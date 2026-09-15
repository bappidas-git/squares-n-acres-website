import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { prefersReducedMotion } from '../../utils/motion';

/**
 * Scrolls to the top of the page on every route change, or to the anchored
 * element when the URL carries a hash.
 *
 * The hash goes through `getElementById` rather than `querySelector`: a hash
 * like `#2bhk` is a valid fragment but an invalid CSS selector, and
 * `querySelector` throws on it (ADD-25).
 */
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    const behavior = prefersReducedMotion() ? 'auto' : 'smooth';

    if (hash) {
      const element = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (element) {
        element.scrollIntoView({ behavior });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;
