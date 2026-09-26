import { Suspense, lazy, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { Divider, Menu, MenuItem } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';

import NotificationsMenu from './NotificationsMenu';
import PATHS from '../../routes/paths';
import { Avatar, Chip, IconButton } from '../ui';
import { ROLES as ROLE_LABELS } from '../../config/enums';
import { SITE } from '../../config/site';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useNavigationGuard } from '../../contexts/NavigationGuardContext';

import styles from './AdminTopbar.module.css';

/**
 * The quick search loads with the panel rather than with the public site: the
 * admin shell is part of the entry chunk every visitor downloads, and the
 * search is the largest thing in it no visitor uses (prompt 51, §8.6).
 */
const AdminSearch = lazy(() => import('./AdminSearch'));

/**
 * The admin topbar: where you are, what arrived, and who you are.
 *
 * The title comes from the route table (`routes/adminRouteConfig.js`), never
 * from a map maintained by hand, so a new route is titled the moment it is
 * declared. It is a `<span>`, not a heading — the page below owns the `<h1>`.
 *
 * @param {object} props
 * @param {string} props.title
 * @param {boolean} props.isMobile
 * @param {boolean} props.collapsed
 * @param {() => void} props.onToggleCollapse
 * @param {() => void} props.onOpenDrawer
 */
export default function AdminTopbar({
  title,
  isMobile,
  collapsed,
  onToggleCollapse,
  onOpenDrawer,
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, role, logout } = useAdminAuth();
  const { confirmDiscard } = useNavigationGuard();
  const [anchor, setAnchor] = useState(null);
  const triggerRef = useRef(null);

  const close = () => setAnchor(null);

  // Already there, it is the same page: a second entry for it made Back land
  // on "My profile" again — and with an edit in hand, leave without asking,
  // since the guard only stops a move to another page (QA-65). The sidebar's
  // links behave the same way on their own.
  const goToProfile = () => {
    close();
    navigate(PATHS.adminProfile, { replace: pathname === PATHS.adminProfile });
  };

  // Unsaved changes are asked about before the session ends, while there is
  // still a session to stay in (QA-62).
  const signOut = async () => {
    close();
    if (!(await confirmDiscard())) return;
    logout();
  };

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        {isMobile ? (
          <IconButton label="Open menu" onClick={onOpenDrawer}>
            <Icon icon="mdi:menu" width={22} height={22} />
          </IconButton>
        ) : (
          <IconButton
            label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={onToggleCollapse}
          >
            <Icon icon={collapsed ? 'mdi:menu' : 'mdi:menu-open'} width={22} height={22} />
          </IconButton>
        )}
        <span className={styles.title}>{title}</span>
      </div>

      {/* One box for the leads, the listings and the articles; `/` reaches it.
          Its place is kept while it loads, so the bar does not move. */}
      {isMobile ? null : (
        <Suspense fallback={<span className={styles.searchSlot} aria-hidden="true" />}>
          <AdminSearch />
        </Suspense>
      )}

      <div className={styles.right}>
        {isMobile ? (
          <Suspense fallback={null}>
            <AdminSearch compact />
          </Suspense>
        ) : null}
        <a
          className={styles.viewSite}
          href={SITE.url}
          target="_blank"
          rel="noopener noreferrer"
          title="Open the public site in a new tab"
        >
          <Icon icon="mdi:open-in-new" width={18} height={18} aria-hidden="true" />
          <span className={styles.viewSiteLabel}>View site</span>
        </a>

        <NotificationsMenu />

        <button
          ref={triggerRef}
          type="button"
          className={styles.profile}
          onClick={() => setAnchor(triggerRef.current)}
          aria-haspopup="menu"
          aria-expanded={Boolean(anchor)}
          // SC 2.5.3: the accessible name has to contain the words on the
          // button, or somebody driving the panel by voice says "Admin User"
          // and nothing happens. "Account menu" alone did not — and on a phone
          // the name is all there is, because the label is hidden there.
          aria-label={`${user?.name || 'Admin'} — account menu`}
        >
          {/* Decorative: the name is beside it on a desktop and in the
              button's own label everywhere, so announcing the initials as well
              only puts "AU" in front of it — and put the button outside
              SC 2.5.3, whose rule is that the name contains the visible text. */}
          <Avatar src={user?.avatarUrl} name={user?.name || 'Admin'} size={32} aria-hidden="true" />
          {!isMobile ? <span className={styles.profileName}>{user?.name || 'Admin'}</span> : null}
          <Icon icon="mdi:chevron-down" width={16} height={16} aria-hidden="true" />
        </button>

        <Menu
          anchorEl={anchor}
          open={Boolean(anchor)}
          onClose={close}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{ paper: { className: styles.menu } }}
        >
          <li className={styles.identity}>
            <Avatar src={user?.avatarUrl} name={user?.name || 'Admin'} size={40} />
            {/* One line each, the rest in the tooltip: a long name or address
                broke into four lines with an ellipsis on each (QA-65). */}
            <span className={styles.identityText}>
              <span className={styles.identityName} title={user?.name || 'Admin'}>
                {user?.name || 'Admin'}
              </span>
              <span className={styles.identityEmail} title={user?.email}>
                {user?.email}
              </span>
            </span>
            {role ? (
              <Chip tone="primary" size="sm">
                {ROLE_LABELS.labelOf(role) || role}
              </Chip>
            ) : null}
          </li>
          <Divider />
          <MenuItem className={styles.menuItem} onClick={goToProfile}>
            <Icon icon="mdi:account-circle-outline" width={18} height={18} aria-hidden="true" />
            My profile
          </MenuItem>
          <MenuItem className={styles.menuItem} onClick={signOut}>
            <Icon icon="mdi:logout" width={18} height={18} aria-hidden="true" />
            Logout
          </MenuItem>
        </Menu>
      </div>
    </header>
  );
}
