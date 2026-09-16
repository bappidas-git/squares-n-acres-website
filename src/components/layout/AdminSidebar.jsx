import { useCallback, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { NavLink } from 'react-router-dom';

import { BRAND } from '../../config/site';
import { Logo } from '../ui';
import { getItem, setItem } from '../../utils/storage';
import { getNavItemsForRole } from '../../config/rbac';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useLeadNotifications } from '../../contexts/LeadNotificationsContext';

import styles from './AdminSidebar.module.css';

/**
 * The admin navigation (§7, guard 2).
 *
 * Its items come from `config/rbac.js` filtered by the signed-in role, so a
 * role never sees a link to a screen its `RoleRoute` would refuse. Groups
 * remember whether they are open (`sna_admin_nav_open`) and the rail remembers
 * whether it is collapsed (`sna_admin_sidebar_collapsed`), both per browser.
 *
 * Group headers are real buttons, so Enter and Space work without a keydown
 * handler of their own, and `NavLink` marks the current item with
 * `aria-current="page"`.
 *
 * @param {object} props
 * @param {boolean} props.collapsed 72px rail instead of the 264px sidebar
 * @param {boolean} [props.mobile] rendered inside the drawer
 * @param {() => void} [props.onNavigate] closes the drawer after a tap
 * @param {() => void} [props.onExpand] un-collapses the rail
 */

/** Persisted open/closed state of the collapsible groups (§4.2). */
export const NAV_OPEN_STORAGE_KEY = 'sna_admin_nav_open';

export default function AdminSidebar({ collapsed = false, mobile = false, onNavigate, onExpand }) {
  const { role } = useAdminAuth();
  const { newLeadCount } = useLeadNotifications();

  const navItems = useMemo(() => getNavItemsForRole(role), [role]);
  const [openGroups, setOpenGroups] = useState(() => getItem(NAV_OPEN_STORAGE_KEY, {}) || {});

  // The rail shows icons only; inside the drawer everything is always labelled.
  const compact = collapsed && !mobile;

  const toggleGroup = useCallback(
    (label) => {
      if (compact) {
        onExpand?.();
        setOpenGroups((previous) => {
          const next = { ...previous, [label]: true };
          setItem(NAV_OPEN_STORAGE_KEY, next);
          return next;
        });
        return;
      }
      setOpenGroups((previous) => {
        const next = { ...previous, [label]: !previous[label] };
        setItem(NAV_OPEN_STORAGE_KEY, next);
        return next;
      });
    },
    [compact, onExpand]
  );

  const itemClass = ({ isActive }) =>
    [styles.navItem, isActive ? styles.navItemActive : ''].filter(Boolean).join(' ');

  const subItemClass = ({ isActive }) =>
    [styles.navSubItem, isActive ? styles.navSubItemActive : ''].filter(Boolean).join(' ');

  return (
    <div className={[styles.sidebar, compact ? styles.collapsed : ''].filter(Boolean).join(' ')}>
      <div className={styles.brand}>
        <Logo variant="monogram" height={compact ? 28 : 32} onDark alt={BRAND.name} />
        {!compact ? (
          <span className={styles.brandText}>
            <span className={styles.brandName}>{BRAND.name}</span>
            <span className={styles.brandCaption}>Admin</span>
          </span>
        ) : null}
      </div>

      <nav className={styles.nav} aria-label="Admin sections">
        {navItems.map((item) => {
          if (!item.children) {
            return (
              <NavLink
                key={item.label}
                to={item.path}
                className={itemClass}
                onClick={onNavigate}
                title={compact ? item.label : undefined}
              >
                <span className={styles.icon} aria-hidden="true">
                  <Icon icon={item.icon} />
                </span>
                {!compact ? <span className={styles.label}>{item.label}</span> : null}
                {item.badge && newLeadCount > 0 ? (
                  <span className={styles.badge}>
                    {newLeadCount > 99 ? '99+' : newLeadCount}
                    <span className={styles.srOnly}> new leads</span>
                  </span>
                ) : null}
              </NavLink>
            );
          }

          const groupId = `admin-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`;
          const open = Boolean(openGroups[item.label]) && !compact;

          return (
            <div key={item.label} className={styles.group}>
              <button
                type="button"
                className={styles.navItem}
                aria-expanded={open}
                aria-controls={groupId}
                onClick={() => toggleGroup(item.label)}
                title={compact ? item.label : undefined}
              >
                <span className={styles.icon} aria-hidden="true">
                  <Icon icon={item.icon} />
                </span>
                {!compact ? (
                  <>
                    <span className={styles.label}>{item.label}</span>
                    <span
                      className={[styles.chevron, open ? styles.chevronOpen : '']
                        .filter(Boolean)
                        .join(' ')}
                      aria-hidden="true"
                    >
                      <Icon icon="mdi:chevron-down" />
                    </span>
                  </>
                ) : null}
              </button>
              <div id={groupId} className={styles.subItems} hidden={!open}>
                {item.children.map((child) => (
                  <NavLink
                    key={child.path}
                    to={child.path}
                    className={subItemClass}
                    onClick={onNavigate}
                    end
                  >
                    {child.label}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
