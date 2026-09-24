import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link, useLocation } from 'react-router-dom';

import MenuLink, { isExternalHref } from './MenuLink';
import styles from './MegaMenu.module.css';

/** The room a panel keeps from either edge of the window, in px. */
export const PANEL_GUTTER = 16;

/**
 * How far a panel has to move sideways to sit inside the window.
 *
 * The mega panel is centred under its trigger, and the first menu's trigger is
 * a few hundred pixels from the left edge: on a 1 536 px screen the Buy panel
 * started 70 px off the page, and 198 px off at 1 280 (QA-56). A panel at its
 * natural position is measured and moved in by exactly what spills, never
 * more; one wider than the window keeps its left edge on the gutter and its
 * own `max-width` does the rest.
 *
 * Exported for the unit test: it is the whole of the rule.
 *
 * @param {{left: number, right: number, width: number}} rect the panel as drawn
 *   with no shift
 * @param {number} viewport the window's width
 * @param {number} [gutter]
 * @returns {number} px to add to the panel's `left` (negative moves it left)
 */
export function panelShift(rect, viewport, gutter = PANEL_GUTTER) {
  if (!rect || !Number.isFinite(viewport) || viewport <= 0) return 0;
  if (rect.width + gutter * 2 >= viewport || rect.left < gutter) {
    return Math.round(gutter - rect.left);
  }
  if (rect.right > viewport - gutter) return Math.round(viewport - gutter - rect.right);
  return 0;
}

/**
 * One header menu: a link that is also a trigger, and the panel under it.
 *
 * A menu with no columns is just a link. A menu with columns opens on hover,
 * on focus and on click, and is operable from the keyboard exactly as a menu
 * should be (§8.3): `Enter`/`Space`/`ArrowDown` open it and move to the first
 * item, the arrows walk the items, `Home`/`End` jump to the ends, `Escape`
 * closes it and returns focus to the trigger, and `Tab` out of the panel
 * closes it behind you. It closes on every route change, because the
 * destination is already on screen by then.
 *
 * The trigger stays a real `<Link>`: "Buy" goes to `/buy` whether or not the
 * visitor ever opens the panel.
 *
 * @param {object} props
 * @param {{key: string, label: string, to: string, columns?: Array<object>}} props.menu
 * @param {boolean} [props.transparent] drawn over the home hero (D52)
 */
export default function MegaMenu({ menu, transparent = false }) {
  const panelId = useId();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const hoverTimer = useRef(null);

  const columns = Array.isArray(menu.columns) ? menu.columns : [];
  const hasPanel = columns.length > 0;
  const wide = columns.length > 1;

  const close = useCallback(({ restoreFocus = false } = {}) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  // The panel is about where the visitor is going; once they are there it has
  // nothing left to say.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  // Keep the open panel inside the window (QA-56). Measured before paint with
  // the shift taken off, then written as a custom property the stylesheet adds
  // to the panel's own transform, so a panel is never drawn where it does not
  // fit. The panel grows when the webfont arrives and the window can be
  // resized under it, so both measure again.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return undefined;

    const place = () => {
      panel.style.setProperty('--panel-shift', '0px');
      const shift = panelShift(
        panel.getBoundingClientRect(),
        document.documentElement.clientWidth || window.innerWidth
      );
      panel.style.setProperty('--panel-shift', `${shift}px`);
    };

    place();
    window.addEventListener('resize', place);
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(place) : null;
    observer?.observe(panel);
    return () => {
      window.removeEventListener('resize', place);
      observer?.disconnect();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  /** Every link in the panel, in the order the arrows walk them. */
  const items = () => Array.from(panelRef.current?.querySelectorAll('a') ?? []);

  const focusItem = (index) => {
    const links = items();
    if (links.length === 0) return;
    const wrapped = ((index % links.length) + links.length) % links.length;
    links[wrapped].focus();
  };

  const openAndFocus = (index) => {
    setOpen(true);
    // The panel has to exist before it can take focus.
    window.requestAnimationFrame(() => focusItem(index));
  };

  const onTriggerKeyDown = (event) => {
    if (!hasPanel) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openAndFocus(event.key === 'ArrowDown' ? 0 : -1);
      return;
    }
    if (event.key === ' ') {
      // Enter follows the link; Space is the one that only opens the panel.
      event.preventDefault();
      openAndFocus(0);
      return;
    }
    if (event.key === 'Escape') close();
  };

  const onPanelKeyDown = (event) => {
    const links = items();
    const current = links.indexOf(document.activeElement);

    if (event.key === 'Escape') {
      event.preventDefault();
      close({ restoreFocus: true });
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      focusItem(current + 1);
      return;
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      focusItem(current - 1);
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      focusItem(0);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      focusItem(-1);
    }
  };

  const onBlurCapture = (event) => {
    if (!wrapperRef.current?.contains(event.relatedTarget)) setOpen(false);
  };

  // A menu's own address may be another site (QA-56), which a router `Link`
  // cannot reach; the trigger keeps its ref and its keyboard either way.
  const Trigger = isExternalHref(menu.to) ? 'a' : Link;
  const target = isExternalHref(menu.to) ? { href: menu.to } : { to: menu.to };

  return (
    <div
      className={styles.menu}
      ref={wrapperRef}
      onMouseEnter={() => {
        if (!hasPanel) return;
        clearTimeout(hoverTimer.current);
        setOpen(true);
      }}
      onMouseLeave={() => {
        if (!hasPanel) return;
        // A short grace period, so crossing the gap between the trigger and the
        // panel does not close it under the pointer.
        hoverTimer.current = setTimeout(() => setOpen(false), 140);
      }}
      onBlurCapture={onBlurCapture}
    >
      <Trigger
        ref={triggerRef}
        {...target}
        className={[styles.trigger, transparent ? styles.onDark : '', open ? styles.triggerOn : '']
          .filter(Boolean)
          .join(' ')}
        aria-expanded={hasPanel ? open : undefined}
        aria-controls={hasPanel ? panelId : undefined}
        aria-haspopup={hasPanel ? 'true' : undefined}
        onKeyDown={onTriggerKeyDown}
        onFocus={() => hasPanel && setOpen(true)}
      >
        {menu.label}
        {hasPanel ? (
          <Icon
            icon="mdi:chevron-down"
            className={[styles.chevron, open ? styles.chevronOn : ''].filter(Boolean).join(' ')}
            aria-hidden="true"
          />
        ) : null}
      </Trigger>

      {hasPanel && open ? (
        <div
          id={panelId}
          ref={panelRef}
          className={[styles.panel, wide ? styles.wide : ''].filter(Boolean).join(' ')}
          onKeyDown={onPanelKeyDown}
        >
          {columns.map((column) => (
            <div key={column.key} className={styles.column}>
              {wide ? <h3 className={styles.columnTitle}>{column.title}</h3> : null}
              <ul className={styles.list}>
                {column.links.map((link) => (
                  <li key={link.key}>
                    <MenuLink link={link} className={styles.link}>
                      {link.label}
                    </MenuLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
