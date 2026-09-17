import { useState } from 'react';
import { Icon } from '@iconify/react';
import { Link, matchPath, useLocation } from 'react-router-dom';

import MobileDrawer from './MobileDrawer';
import styles from './BottomNav.module.css';
import useScrollDirection from '../../hooks/useScrollDirection';
import { buildBottomNav } from '../../config/navigation';
import { useLeadCapture } from '../../contexts/LeadCaptureContext';
import { useShortlist } from '../../contexts/ShortlistContext';

/**
 * The phone's bottom bar: Home · Search · Shortlist · Enquire · Menu.
 *
 * The five items are `buildBottomNav()`, so what the bar offers is described
 * in one place with the rest of the navigation. "Enquire" opens the
 * post-requirement modal and "Menu" opens the same `MobileDrawer` the header
 * button opens — one drawer component, two ways in.
 *
 * D52: this is the one piece of chrome that hides on scroll-down and comes
 * back on scroll-up.
 */

/**
 * The routes that carry a contact bar of their own.
 *
 * A property page's Call · WhatsApp · Enquire bar is about *this* listing and
 * sits where the bottom navigation sits; two stacked bars would take a third of
 * a phone screen, so this one stands down (prompt 23 §4.9). The admin panel has
 * no public chrome at all (D24).
 */
const OWN_BOTTOM_BAR = ['/properties/:slug', '/admin/*'];

const ITEMS = buildBottomNav();

export default function BottomNav() {
  const location = useLocation();
  const { direction } = useScrollDirection();
  const { count } = useShortlist();
  const { openLeadModal } = useLeadCapture();

  const [drawerOpen, setDrawerOpen] = useState(false);

  const standsDown = OWN_BOTTOM_BAR.some((pattern) => matchPath(pattern, location.pathname));
  if (standsDown) return null;

  const isActive = (item) => {
    const path = item.match ?? item.to;
    if (!path) return false;
    if (item.exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const iconOf = (item, active) => (
    <span className={styles.icon}>
      <Icon icon={active ? item.activeIcon : item.icon} aria-hidden="true" />
      {item.kind === 'shortlist' && count > 0 ? (
        <span className={styles.badge} aria-hidden="true">
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </span>
  );

  return (
    <>
      <nav
        className={[styles.bottomNav, direction === 'down' ? styles.hidden : '']
          .filter(Boolean)
          .join(' ')}
        aria-label="Quick navigation"
      >
        {ITEMS.map((item) => {
          const active = isActive(item);

          if (item.kind === 'lead' || item.kind === 'menu') {
            const onClick =
              item.kind === 'lead'
                ? () => openLeadModal({ entry: 'post-requirement' })
                : () => setDrawerOpen(true);
            return (
              <button
                key={item.key}
                type="button"
                className={styles.item}
                onClick={onClick}
                aria-expanded={item.kind === 'menu' ? drawerOpen : undefined}
              >
                {iconOf(item, false)}
                <span className={styles.label}>{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.key}
              to={item.to}
              className={[styles.item, active ? styles.active : ''].filter(Boolean).join(' ')}
              aria-label={
                item.kind === 'shortlist' && count > 0 ? `${item.label} (${count})` : undefined
              }
              aria-current={active ? 'page' : undefined}
            >
              {iconOf(item, active)}
              <span className={styles.label}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
