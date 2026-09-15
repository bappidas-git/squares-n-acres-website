import { useId, useRef, useState } from 'react';

import styles from './Tabs.module.css';

/**
 * A tab strip with roving tabindex: one stop in the tab order, arrow keys
 * (plus Home/End) move between tabs, and each panel is labelled by its tab.
 *
 * Controlled when `value`/`onChange` are given, uncontrolled otherwise.
 *
 * @param {object} props
 * @param {{ value: string, label: React.ReactNode, content?: React.ReactNode }[]} props.items
 * @param {string} [props.value]
 * @param {(value: string) => void} [props.onChange]
 * @param {'underline'|'pills'} [props.variant]
 * @param {string} props.label accessible name of the tab list
 */
export default function Tabs({
  items = [],
  value,
  onChange,
  defaultValue,
  variant = 'underline',
  label = 'Tabs',
  className = '',
  children,
}) {
  const baseId = useId();
  const refs = useRef([]);
  const [internal, setInternal] = useState(defaultValue ?? items[0]?.value);
  const active = value ?? internal;
  const activeIndex = Math.max(
    items.findIndex((item) => item.value === active),
    0
  );

  const select = (next) => {
    if (value === undefined) setInternal(next);
    onChange?.(next);
  };

  const onKeyDown = (event) => {
    const last = items.length - 1;
    let next = null;
    if (event.key === 'ArrowRight') next = activeIndex === last ? 0 : activeIndex + 1;
    else if (event.key === 'ArrowLeft') next = activeIndex === 0 ? last : activeIndex - 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    if (next === null) return;
    event.preventDefault();
    select(items[next].value);
    refs.current[next]?.focus();
  };

  if (!items.length) return null;

  const current = items[activeIndex];

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        className={[styles.tablist, variant === 'pills' ? styles.pills : '']
          .filter(Boolean)
          .join(' ')}
        onKeyDown={onKeyDown}
      >
        {items.map((item, index) => (
          <button
            key={item.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${item.value}`}
            aria-selected={index === activeIndex}
            aria-controls={`${baseId}-panel-${item.value}`}
            tabIndex={index === activeIndex ? 0 : -1}
            className={[styles.tab, index === activeIndex ? styles.tabActive : '']
              .filter(Boolean)
              .join(' ')}
            onClick={() => select(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel-${current.value}`}
        aria-labelledby={`${baseId}-tab-${current.value}`}
        tabIndex={0}
        className={styles.panel}
      >
        {current.content ?? children}
      </div>
    </div>
  );
}
