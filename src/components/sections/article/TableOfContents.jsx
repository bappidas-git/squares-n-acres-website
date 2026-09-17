import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';

import { tocIds } from '../../../utils/toc';

import styles from './TableOfContents.module.css';

/**
 * How much of the viewport counts as "being read": the band the observer
 * watches runs from just under the sticky header down to the middle of the
 * screen, so the highlight moves to a heading as it reaches reading position
 * rather than the moment its first pixel appears.
 */
const OBSERVER_MARGIN = '-96px 0px -60% 0px';

/**
 * Which of a body's headings the reader is currently on.
 *
 * `IntersectionObserver` reports the headings in view; the one furthest down
 * the document order wins, so scrolling past a heading hands the highlight to
 * the next rather than back to the first. A browser without the API — and
 * jsdom, which has none — simply never highlights anything.
 *
 * @param {string[]} ids in document order
 * @returns {string} the active id, or `''`
 */
export function useActiveHeading(ids) {
  const key = ids.join('|');
  const [active, setActive] = useState('');

  useEffect(() => {
    const order = key ? key.split('|') : [];
    if (order.length === 0 || typeof IntersectionObserver === 'undefined') return undefined;

    const visible = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        });

        const inView = order.filter((id) => visible.has(id));
        if (inView.length > 0) setActive(inView[inView.length - 1]);
      },
      { rootMargin: OBSERVER_MARGIN, threshold: 0 }
    );

    order
      .map((id) => document.getElementById(id))
      .filter(Boolean)
      .forEach((heading) => observer.observe(heading));

    return () => observer.disconnect();
  }, [key]);

  return active;
}

/**
 * "In this article" — the H2/H3 outline of the body, built by `utils/toc` from
 * the same id rule `SafeHtml` writes the anchors with.
 *
 * One element serves both layouts. From 1200 px it is the sticky rail beside
 * the body and the list is always open; below that the page puts it above the
 * article and the heading becomes the button that opens it, because a
 * fifteen-item list between the headline and the first paragraph is a wall.
 * The breakpoint is the stylesheet's, so nothing here measures the window.
 *
 * @param {object} props
 * @param {Array<{id: string, text: string, children?: Array<object>}>} props.items
 * @param {string} [props.activeId] the heading being read
 * @param {string} [props.title]
 */
export default function TableOfContents({
  items = [],
  activeId = '',
  title = 'In this article',
  className = '',
}) {
  const [open, setOpen] = useState(false);

  if (items.length === 0) return null;

  const count = tocIds(items).length;

  const link = (entry, nested) => (
    <li key={entry.id} className={nested ? styles.childItem : styles.item}>
      <a
        href={`#${entry.id}`}
        className={[styles.link, activeId === entry.id ? styles.active : '']
          .filter(Boolean)
          .join(' ')}
        aria-current={activeId === entry.id ? 'true' : undefined}
        onClick={() => setOpen(false)}
      >
        {entry.text}
      </a>
      {entry.children?.length ? (
        <ul className={styles.childList}>{entry.children.map((child) => link(child, true))}</ul>
      ) : null}
    </li>
  );

  return (
    <nav className={[styles.toc, className].filter(Boolean).join(' ')} aria-label={title}>
      <p className={styles.heading}>
        <span className={styles.headingText}>{title}</span>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <span className={styles.srOnly}>
            {open ? 'Hide' : 'Show'} the {count} sections of this article
          </span>
          <Icon
            icon={open ? 'mdi:chevron-up' : 'mdi:chevron-down'}
            width="20"
            height="20"
            aria-hidden="true"
          />
        </button>
      </p>

      <ol className={[styles.list, open ? styles.listOpen : ''].filter(Boolean).join(' ')}>
        {items.map((entry) => link(entry, false))}
      </ol>
    </nav>
  );
}
