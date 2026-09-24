import { Suspense, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Drawer } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';

import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import ErrorBoundary from '../common/ErrorBoundary';
import Seo from '../seo/Seo';
import useBreakpoint from '../../hooks/useBreakpoint';
import { BRAND } from '../../config/site';
import { LeadNotificationsProvider } from '../../contexts/LeadNotificationsContext';
import PATHS from '../../routes/paths';
import { PageLoader } from '../common/SkeletonLoaders';
import { getAdminPageTitle } from '../../routes/adminRouteConfig';
import { getItem, setItem } from '../../utils/storage';

import styles from './AdminLayout.module.css';

/**
 * The admin shell: sidebar, topbar and the scrolling page canvas.
 *
 * `LeadNotificationsProvider` lives here rather than in `App.js` so the lead
 * poller exists only while an admin screen is open — a visitor on the public
 * site never polls (D45).
 *
 * The canvas carries its own `ErrorBoundary` (§8.2). The route boundary
 * (`routes/RouteBoundary.jsx`) would replace the whole viewport, which for an
 * operator who can simply open another screen is the wrong answer; this one
 * fills the content column and leaves the panel navigable.
 *
 * The shell itself is mounted once for the whole panel, not once per screen:
 * `RouteBoundary` gives every admin path the same key.
 */

/** Persisted rail state (§4.2 storage keys). */
export const SIDEBAR_STORAGE_KEY = 'sna_admin_sidebar_collapsed';

/** The drawer width §6 asks for on phones and tablets. */
const DRAWER_WIDTH = 280;

/**
 * Screens whose table needs the whole canvas.
 *
 * The content column stops at 1,400 px for the sake of forms, whose lines
 * would otherwise run the width of a 27-inch monitor. The property list is a
 * table of a dozen columns, and at 1920 px it was scrolling sideways between
 * 256 px margins; on these paths the column may take 1,760 px. The lead list is
 * nine columns of chips and dates, and its Created column sat under the pinned
 * actions at 1,536 px (QA-53). The article list's Updated column — the order it
 * opens in — sat there too (QA-55).
 */
const WIDE_PATHS = new Set([PATHS.adminProperties, PATHS.adminLeads, PATHS.adminArticles]);

const isWide = (pathname) => WIDE_PATHS.has(String(pathname).replace(/\/+$/, ''));

const AdminShell = () => {
  const { isMobile } = useBreakpoint();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(() => getItem(SIDEBAR_STORAGE_KEY, false) === true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const mainRef = useRef(null);

  const title = getAdminPageTitle(location.pathname);

  // The shell stays mounted from one screen to the next (`RouteBoundary`), and
  // the sidebar keeps its scroll position with it. What a remount used to do
  // by the way is done here on purpose: the next screen starts at the top of
  // the canvas, and a drawer still open — after the back button, say — closes.
  // A new query string (a filter, the next page) is the same screen.
  useLayoutEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
    setDrawerOpen(false);
  }, [location.pathname]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((previous) => {
      setItem(SIDEBAR_STORAGE_KEY, !previous);
      return !previous;
    });
  }, []);

  const expand = useCallback(() => {
    setCollapsed(false);
    setItem(SIDEBAR_STORAGE_KEY, false);
  }, []);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <div className={styles.shell}>
      <Seo
        type="admin"
        title={`${title} — Admin`}
        description={`${title} — ${BRAND.name} admin panel.`}
      />

      {/* Thirty sidebar links stand between the topbar and the page: a
          keyboard reaches the content in one stop instead of thirty-one. */}
      <a href="#admin-main" className="skip-to-main">
        Skip to main content
      </a>

      {isMobile ? (
        <Drawer
          open={drawerOpen}
          onClose={closeDrawer}
          slotProps={{
            paper: {
              className: styles.drawerPaper,
              style: { width: DRAWER_WIDTH },
              role: 'dialog',
              'aria-modal': 'true',
              'aria-label': 'Admin menu',
            },
          }}
        >
          <AdminSidebar mobile onNavigate={closeDrawer} />
        </Drawer>
      ) : (
        <aside
          className={[styles.sidebar, collapsed ? styles.sidebarCollapsed : '']
            .filter(Boolean)
            .join(' ')}
        >
          <AdminSidebar collapsed={collapsed} onExpand={expand} />
        </aside>
      )}

      <div className={styles.column}>
        <AdminTopbar
          title={title}
          isMobile={isMobile}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
          onOpenDrawer={() => setDrawerOpen(true)}
        />

        <main ref={mainRef} id="admin-main" tabIndex={-1} className={styles.main}>
          <div
            className={[styles.content, isWide(location.pathname) ? styles.contentWide : '']
              .filter(Boolean)
              .join(' ')}
          >
            {/* The inline variant, keyed on the route: a screen that throws
                leaves the sidebar and the topbar usable, offers "Reload this
                page", and the next navigation clears it (§4.3). */}
            <ErrorBoundary key={location.pathname} variant="inline">
              <Suspense fallback={<PageLoader />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
};

const AdminLayout = () => (
  <LeadNotificationsProvider>
    <AdminShell />
  </LeadNotificationsProvider>
);

export default AdminLayout;
