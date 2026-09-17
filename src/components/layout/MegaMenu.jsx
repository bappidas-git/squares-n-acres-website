import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link, useLocation } from 'react-router-dom';

import styles from './MegaMenu.module.css';

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
      <Link
        ref={triggerRef}
        to={menu.to}
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
      </Link>

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
                    <Link to={link.to} className={styles.link}>
                      {link.label}
                    </Link>
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
