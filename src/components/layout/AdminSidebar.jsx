import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link, NavLink, useLocation } from 'react-router-dom';

import { BRAND } from '../../config/site';
import { Logo } from '../ui';
import { findAdminRoute } from '../../routes/adminRouteConfig';
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

/** Whether `pathname` is `path` or a page beneath it — segment by segment. */
const within = (pathname, path) => pathname === path || pathname.startsWith(`${path}/`);

/**
 * The child of a group the current page belongs to: the longest path that
 * contains it. `/admin/properties/edit/20` belongs to "All properties" (it is
 * one of them) and `/admin/properties/add` to "Add property", although both
 * start with `/admin/properties`.
 *
 * @param {Array<{path: string}>} children
 * @param {string} pathname
 * @returns {string|null} the winning child's path
 */
export function activeChildPath(children = [], pathname = '') {
  const path = String(pathname).replace(/\/+$/, '') || '/';
  return (
    children
      .filter((child) => within(path, child.path))
      .sort((left, right) => right.path.length - left.path.length)[0]?.path ?? null
  );
}

export default function AdminSidebar({ collapsed = false, mobile = false, onNavigate, onExpand }) {
  const { role } = useAdminAuth();
  const { newLeadCount } = useLeadNotifications();
  const { pathname } = useLocation();

  const navItems = useMemo(() => getNavItemsForRole(role), [role]);
  const [openGroups, setOpenGroups] = useState(() => getItem(NAV_OPEN_STORAGE_KEY, {}) || {});

  // The rail shows icons only; inside the drawer everything is always labelled.
  const compact = collapsed && !mobile;

  // An address the panel has no screen for is the admin's 404, and no item of
  // the navigation is that page: /admin/profile/extra said "There is no such
  // screen" under a sidebar marking "Profile" as the current page (QA-65).
  const known = Boolean(findAdminRoute(pathname));

  // The group the page belongs to opens on the way in. Arriving on
  // /admin/properties from a bookmark used to leave "Properties" folded, with
  // nothing in the sidebar saying where the reader was; it can still be
  // folded by hand afterwards.
  const currentGroup = useMemo(
    () =>
      (known &&
        navItems.find((item) => item.children && activeChildPath(item.children, pathname))
          ?.label) ||
      null,
    [navItems, pathname, known]
  );

  useEffect(() => {
    if (!currentGroup) return;
    setOpenGroups((previous) => {
      if (previous[currentGroup]) return previous;
      const next = { ...previous, [currentGroup]: true };
      setItem(NAV_OPEN_STORAGE_KEY, next);
      return next;
    });
  }, [currentGroup]);

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
    [styles.navItem, isActive && known ? styles.navItemActive : ''].filter(Boolean).join(' ');

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
                aria-current={known ? 'page' : false}
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
          const activePath = known ? activeChildPath(item.children, pathname) : null;

          return (
            <div key={item.label} className={styles.group}>
              <button
                type="button"
                className={[styles.navItem, activePath ? styles.navItemParentActive : '']
                  .filter(Boolean)
                  .join(' ')}
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
                {/* The current child is worked out once for the group rather
                    than by each `NavLink`: with `end` the edit screen of a
                    property matched nothing, and without it every screen
                    under /admin/properties matched both children. */}
                {item.children.map((child) => {
                  const active = child.path === activePath;
                  return (
                    <Link
                      key={child.path}
                      to={child.path}
                      className={subItemClass({ isActive: active })}
                      aria-current={active ? 'page' : undefined}
                      onClick={onNavigate}
                    >
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
