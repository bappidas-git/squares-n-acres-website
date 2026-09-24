import { useLocation } from 'react-router-dom';

import ErrorBoundary from '../components/common/ErrorBoundary';
import PATHS, { isAdminPath } from './paths';
import Seo from '../components/seo/Seo';

/**
 * The route boundary: the `ErrorBoundary` every page renders below (§8.2).
 *
 * It sits inside the router, so a page that throws still gets a head that says
 * `noindex` rather than indexing a crash (§9.3), and its `resetKey` is the
 * pathname, so a crashed page recovers by being navigated away from, without
 * a full reload (§7).
 *
 * What it is **keyed** on differs by side, because a new key remounts
 * everything below it. A public page and its chrome are remounted on every
 * pathname, as they always were. The admin panel's screens share one key:
 * below the boundary is the admin shell, and remounting the shell on every
 * navigation threw away what it holds — the sidebar jumped back to its top
 * after a click on an item below the fold, and the lead poller started over,
 * blanking the sidebar badge until it answered. The shell keys its own inline
 * boundary on the pathname, so the screen inside it is still new each time.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 */
export default function RouteBoundary({ children }) {
  const { pathname } = useLocation();

  return (
    <ErrorBoundary
      key={isAdminPath(pathname) ? PATHS.adminRoot : pathname}
      resetKey={pathname}
      head={<Seo type="error" />}
    >
      {children}
    </ErrorBoundary>
  );
}
