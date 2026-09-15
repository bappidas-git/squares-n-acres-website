import { useId, useState } from 'react';

import styles from './Accordion.module.css';

/**
 * A disclosure list. `single` closes the other items when one opens;
 * otherwise several can stay open at once.
 *
 * Each trigger carries `aria-expanded` and `aria-controls`, and each panel is
 * labelled by its trigger.
 *
 * @param {object} props
 * @param {{ id?: string, title: React.ReactNode, content: React.ReactNode }[]} props.items
 * @param {boolean} [props.single]
 * @param {string[]} [props.defaultOpen] ids (or indices as strings) open at mount
 */
export default function Accordion({
  items = [],
  single = false,
  defaultOpen = [],
  className = '',
}) {
  const baseId = useId();
  const [open, setOpen] = useState(() => new Set(defaultOpen.map(String)));

  const toggle = (key) => {
    setOpen((previous) => {
      const next = new Set(single ? [] : previous);
      if (previous.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (!items.length) return null;

  return (
    <div className={[styles.accordion, className].filter(Boolean).join(' ')}>
      {items.map((item, index) => {
        const key = String(item.id ?? index);
        const isOpen = open.has(key);
        return (
          <div
            key={key}
            className={[styles.item, isOpen ? styles.itemOpen : ''].filter(Boolean).join(' ')}
          >
            <h3>
              <button
                type="button"
                className={styles.trigger}
                id={`${baseId}-trigger-${key}`}
                aria-expanded={isOpen}
                aria-controls={`${baseId}-panel-${key}`}
                onClick={() => toggle(key)}
              >
                <span>{item.title}</span>
                <span
                  className={[styles.marker, isOpen ? styles.markerOpen : '']
                    .filter(Boolean)
                    .join(' ')}
                  aria-hidden="true"
                >
                  +
                </span>
              </button>
            </h3>
            <div
              id={`${baseId}-panel-${key}`}
              role="region"
              aria-labelledby={`${baseId}-trigger-${key}`}
              className={styles.panel}
              hidden={!isOpen}
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
