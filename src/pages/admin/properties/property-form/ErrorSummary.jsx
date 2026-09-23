import { Icon } from '@iconify/react';

import TABS, { tabOfPath } from './tabs';

import styles from './ErrorSummary.module.css';

/**
 * What is wrong on the tab that is open, as a list of links to it.
 *
 * The badge on a tab counts every message the tab owns, but some of them
 * belong to no single control — "choose the cover", "this locality has no
 * city" — and the rest can sit a long scroll below the fold of a tab like
 * Basics. The summary prints each one once, and a click puts the cursor in
 * the control it is about (or brings the message into view when there is
 * none). The other tabs that hold messages are named underneath, so a failed
 * save never leaves an editor guessing where to go next.
 *
 * @param {object} props
 * @param {Record<string, string>} props.errors dotted path → message
 * @param {string} props.activeTab
 * @param {Record<string, number>} props.errorsByTab
 * @param {(path: string) => void} props.onFocusField
 * @param {(key: string) => void} props.onOpenTab
 */
export default function ErrorSummary({
  errors = {},
  activeTab,
  errorsByTab = {},
  onFocusField,
  onOpenTab,
}) {
  const here = Object.entries(errors).filter(([path]) => tabOfPath(path) === activeTab);
  if (here.length === 0) return null;

  const elsewhere = TABS.filter((tab) => tab.key !== activeTab && (errorsByTab[tab.key] ?? 0) > 0);

  return (
    <section
      className={styles.summary}
      aria-labelledby="property-error-summary-title"
      data-error-summary
      tabIndex={-1}
    >
      <h2 className={styles.title} id="property-error-summary-title">
        <Icon icon="mdi:alert-circle-outline" width="20" height="20" aria-hidden="true" />
        {here.length === 1
          ? 'One thing to fix on this tab'
          : `${here.length} things to fix on this tab`}
      </h2>

      <ul className={styles.list}>
        {here.map(([path, message]) => (
          <li key={path}>
            <button type="button" className={styles.link} onClick={() => onFocusField?.(path)}>
              {message}
            </button>
          </li>
        ))}
      </ul>

      {elsewhere.length > 0 ? (
        <p className={styles.elsewhere}>
          <span>Also on</span>
          {elsewhere.map((tab, index) => (
            <span key={tab.key}>
              <button type="button" className={styles.link} onClick={() => onOpenTab?.(tab.key)}>
                {tab.label} ({errorsByTab[tab.key]})
              </button>
              {index < elsewhere.length - 1 ? ',' : null}
            </span>
          ))}
        </p>
      ) : null}
    </section>
  );
}
