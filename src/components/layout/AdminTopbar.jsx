import { useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { Divider, Menu, MenuItem } from '@mui/material';
import { useNavigate } from 'react-router-dom';

import NotificationsMenu from './NotificationsMenu';
import PATHS from '../../routes/paths';
import { Avatar, Chip, IconButton } from '../ui';
import { ROLES as ROLE_LABELS } from '../../config/enums';
import { SITE } from '../../config/site';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

import styles from './AdminTopbar.module.css';

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
  const { user, role, logout } = useAdminAuth();
  const [anchor, setAnchor] = useState(null);
  const triggerRef = useRef(null);

  const close = () => setAnchor(null);

  const goToProfile = () => {
    close();
    navigate(PATHS.adminProfile);
  };

  const signOut = () => {
    close();
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

      <div className={styles.right}>
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
          aria-label="Account menu"
        >
          <Avatar src={user?.avatarUrl} name={user?.name || 'Admin'} size={32} />
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
            <span className={styles.identityText}>
              <span className={styles.identityName}>{user?.name || 'Admin'}</span>
              <span className={styles.identityEmail}>{user?.email}</span>
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
