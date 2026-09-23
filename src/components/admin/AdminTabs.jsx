import { useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';

import styles from './AdminTabs.module.css';

/**
 * The tab strip of a long admin form (the property form's 16, an article's 4).
 *
 * `errorCount` is what makes a 16-tab form usable: a 422 on
 * `location.localityId` paints a red badge on the tab that holds it, so the
 * field that needs attention is findable without opening all of them (§7 of
 * prompt 13).
 *
 * Keyboard: a roving tabindex with ←/→/Home/End, as §8.3 requires of tabs.
 *
 * `wrap` lets a long strip break onto a second row on a wide screen instead of
 * scrolling: sixteen tabs in a scrolling strip hid half of them — and their
 * red badges — behind a four-pixel scrollbar. On a phone the strip still
 * scrolls, and whichever tab becomes active is scrolled into view, so a failed
 * save that opens tab 12 does not leave its tab off-screen.
 *
 * @param {object} props
 * @param {Array<{key: string, label: string, icon?: string, errorCount?: number}>} props.tabs
 * @param {string} props.value the active tab key
 * @param {(key: string) => void} props.onChange
 * @param {string} [props.label] the accessible name of the tab list
 * @param {boolean} [props.wrap] wrap onto more rows from 900 px up
 */
export default function AdminTabs({
  tabs = [],
  value,
  onChange,
  label = 'Sections',
  wrap = false,
}) {
  const listRef = useRef(null);

  // Sideways only: `scrollIntoView` would also scroll the page up to the strip,
  // and fight the field a failed save is scrolling down to.
  useEffect(() => {
    const list = listRef.current;
    const tab = list?.querySelector('[aria-selected="true"]');
    if (!list || !tab || list.scrollWidth <= list.clientWidth) return;

    const margin = 24;
    const start = tab.offsetLeft;
    const end = start + tab.offsetWidth;
    let left = null;
    if (start - margin < list.scrollLeft) left = Math.max(0, start - margin);
    else if (end + margin > list.scrollLeft + list.clientWidth) {
      left = end + margin - list.clientWidth;
    }
    if (left === null) return;
    if (typeof list.scrollTo === 'function') list.scrollTo({ left, behavior: 'smooth' });
    else list.scrollLeft = left;
  }, [value]);

  const move = (event) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();

    const index = tabs.findIndex((tab) => tab.key === value);
    const last = tabs.length - 1;
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? last
          : event.key === 'ArrowLeft'
            ? (index - 1 + tabs.length) % tabs.length
            : (index + 1) % tabs.length;

    onChange?.(tabs[next].key);
    listRef.current?.querySelectorAll('[role="tab"]')[next]?.focus();
  };

  return (
    <div className={styles.wrapper}>
      <div
        className={[styles.list, wrap ? styles.wrap : ''].filter(Boolean).join(' ')}
        role="tablist"
        aria-label={label}
        ref={listRef}
        onKeyDown={move}
      >
        {tabs.map((tab) => {
          const active = tab.key === value;
          const errors = tab.errorCount ?? 0;

          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`tab-${tab.key}`}
              aria-selected={active}
              aria-controls={`panel-${tab.key}`}
              tabIndex={active ? 0 : -1}
              className={[styles.tab, active ? styles.active : ''].filter(Boolean).join(' ')}
              onClick={() => onChange?.(tab.key)}
            >
              {tab.icon ? <Icon icon={tab.icon} width="18" height="18" aria-hidden="true" /> : null}
              {tab.label}
              {errors > 0 ? (
                <span className={styles.badge}>
                  {errors}
                  <span className={styles.srOnly}>
                    {errors === 1 ? ' error' : ' errors'} in this section
                  </span>
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** The panel a tab controls — wired to the same ids `AdminTabs` emits. */
export function AdminTabPanel({ tabKey, value, children }) {
  if (tabKey !== value) return null;
  return (
    <div role="tabpanel" id={`panel-${tabKey}`} aria-labelledby={`tab-${tabKey}`} tabIndex={0}>
      {children}
    </div>
  );
}
