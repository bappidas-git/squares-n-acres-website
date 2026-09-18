import { Suspense, useCallback, useState } from 'react';
import { Drawer } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';

import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import ErrorBoundary from '../common/ErrorBoundary';
import Seo from '../seo/Seo';
import useBreakpoint from '../../hooks/useBreakpoint';
import { BRAND } from '../../config/site';
import { LeadNotificationsProvider } from '../../contexts/LeadNotificationsContext';
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
 * The canvas carries its own `ErrorBoundary` (§8.2). The route boundary in
 * `routes/index.js` would replace the whole viewport, which for an operator who
 * can simply open another screen is the wrong answer; this one fills the
 * content column and leaves the panel navigable.
 */

/** Persisted rail state (§4.2 storage keys). */
export const SIDEBAR_STORAGE_KEY = 'sna_admin_sidebar_collapsed';

/** The drawer width §6 asks for on phones and tablets. */
const DRAWER_WIDTH = 280;

const AdminShell = () => {
  const { isMobile } = useBreakpoint();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(() => getItem(SIDEBAR_STORAGE_KEY, false) === true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const title = getAdminPageTitle(location.pathname);

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

        <main id="admin-main" tabIndex={-1} className={styles.main}>
          <div className={styles.content}>
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
