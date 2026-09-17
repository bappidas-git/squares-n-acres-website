import { Fragment, useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Icon } from '@iconify/react';

import SafeHtml from '../../editor/SafeHtml';

import styles from './FaqAccordion.module.css';

/**
 * The one accordion every FAQ on the site is rendered by: the home section,
 * `/insights/faqs`, the FAQ block of a property page and the CMS `faq` block.
 *
 * Each question is a `<button>` carrying `aria-expanded` and `aria-controls`;
 * each answer is a region labelled by its question and hidden — not merely
 * collapsed — while it is closed, so a screen reader and a keyboard walk the
 * same list a mouse does (§8.3). The open/close animation is skipped entirely
 * under `prefers-reduced-motion`.
 *
 * Answers are CMS-authored HTML rendered through `SafeHtml`, which sanitises
 * against the editor's allow-list and dresses the markup in `.prose`. The
 * `FAQPage` structured data for these items arrives with the SEO wiring in
 * prompt 38.
 *
 * @param {object} props
 * @param {Array<{id: string|number, question: string, answer: string}>} props.items
 * @param {boolean} [props.single] one open at a time (the default)
 * @param {string|number} [props.defaultOpenId] open at mount
 * @param {2|3|4} [props.headingLevel] the level each question is a heading at
 * @param {(id: string|number, open: boolean) => void} [props.onToggle]
 * @param {string} [props.highlight] search term wrapped in `<mark>` in questions
 * @param {React.ReactNode} [props.emptyState] rendered instead of an empty list
 */
export default function FaqAccordion({
  items = [],
  single = true,
  defaultOpenId,
  headingLevel = 3,
  onToggle,
  highlight = '',
  emptyState = null,
  className = '',
}) {
  const baseId = useId();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(() =>
    defaultOpenId === undefined || defaultOpenId === null
      ? new Set()
      : new Set([String(defaultOpenId)])
  );

  if (items.length === 0) return emptyState;

  const Heading = `h${headingLevel}`;

  const toggle = (id) => {
    const key = String(id);
    const isOpen = open.has(key);
    setOpen((current) => {
      const next = new Set(single ? [] : current);
      if (isOpen) next.delete(key);
      else next.add(key);
      return next;
    });
    onToggle?.(id, !isOpen);
  };

  return (
    <div className={[styles.accordion, className].filter(Boolean).join(' ')}>
      {items.map((item) => {
        const key = String(item.id);
        const isOpen = open.has(key);
        const triggerId = `${baseId}-q-${key}`;
        const panelId = `${baseId}-a-${key}`;

        return (
          <div
            key={key}
            className={[styles.item, isOpen ? styles.itemOpen : ''].filter(Boolean).join(' ')}
          >
            <Heading className={styles.heading}>
              <button
                type="button"
                id={triggerId}
                className={styles.trigger}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
              >
                <span className={styles.question}>{mark(item.question, highlight)}</span>
                <span
                  className={[styles.chevron, isOpen ? styles.chevronOpen : '']
                    .filter(Boolean)
                    .join(' ')}
                  aria-hidden="true"
                >
                  <Icon icon="mdi:chevron-down" width="22" height="22" />
                </span>
              </button>
            </Heading>

            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  key="panel"
                  className={styles.panelWrapper}
                  initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                  animate={reduceMotion ? {} : { height: 'auto', opacity: 1 }}
                  exit={reduceMotion ? {} : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                >
                  <div id={panelId} role="region" aria-labelledby={triggerId}>
                    <SafeHtml className={styles.answer} html={item.answer} />
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

/**
 * The question with every occurrence of `term` wrapped in `<mark>`.
 *
 * Only the question is highlighted: the answer is HTML the site does not own
 * the inside of, and injecting elements into sanitised markup is not a search
 * box's business.
 *
 * @param {string} text
 * @param {string} term
 * @returns {React.ReactNode}
 */
function mark(text, term) {
  const needle = String(term ?? '').trim();
  const haystack = String(text ?? '');
  if (needle.length < 2) return haystack;

  const lower = haystack.toLowerCase();
  const target = needle.toLowerCase();
  const parts = [];
  let cursor = 0;

  for (let at = lower.indexOf(target); at !== -1; at = lower.indexOf(target, cursor)) {
    parts.push(
      <Fragment key={`t${cursor}`}>{haystack.slice(cursor, at)}</Fragment>,
      <mark key={`m${at}`}>{haystack.slice(at, at + needle.length)}</mark>
    );
    cursor = at + needle.length;
  }

  if (parts.length === 0) return haystack;
  parts.push(<Fragment key="rest">{haystack.slice(cursor)}</Fragment>);
  return parts;
}
