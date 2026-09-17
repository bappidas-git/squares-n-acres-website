import { Icon } from '@iconify/react';

import Skeleton from '../../../ui/Skeleton';
import { useSeoPanel } from '../SeoPanelContext';

import styles from '../SeoPanel.module.css';

/** The four groups of §9.1, in the order the panel draws them. */
export const GROUPS = [
  { key: 'basic', label: 'Basic SEO' },
  { key: 'additional', label: 'Additional' },
  { key: 'titleReadability', label: 'Title readability' },
  { key: 'contentReadability', label: 'Content readability' },
];

const STATUS = {
  pass: { icon: 'mdi:check-circle', className: styles.statusPass, label: 'Passed' },
  warn: { icon: 'mdi:alert-circle', className: styles.statusWarn, label: 'Warning' },
  fail: { icon: 'mdi:close-circle', className: styles.statusFail, label: 'Failed' },
  skip: { icon: 'mdi:minus-circle-outline', className: styles.statusSkip, label: 'Not applicable' },
};

/** How many of each status a group holds. */
export function countByStatus(results = []) {
  return results.reduce(
    (counts, result) => ({ ...counts, [result.status]: (counts[result.status] ?? 0) + 1 }),
    { pass: 0, warn: 0, fail: 0, skip: 0 }
  );
}

/**
 * The fifty-odd tests, in four accordions.
 *
 * Every row says what was measured and — when something is wrong — what to do
 * about it, as a **link to the field that would fix it**. That link is the
 * whole point of the list: "the description does not carry the focus keyword"
 * is a sentence; a click that opens the tab holding the description and puts
 * the cursor in it is a fix.
 *
 * A skipped test is shown and never counted (§9.1): a property is not marked
 * down for having no article category, but an editor should still be able to
 * see that the question was asked.
 */
export default function TestList() {
  const { analysis, analysing, focusField } = useSeoPanel();

  if (analysing || !analysis) {
    return (
      <div className={styles.skeletonRows} role="status" aria-busy="true" aria-live="polite">
        <span className={styles.srOnly}>Analysing this page…</span>
        {GROUPS.map((group) => (
          <Skeleton key={group.key} variant="rounded" height={48} />
        ))}
      </div>
    );
  }

  return (
    <div className={styles.groups}>
      {GROUPS.map((group, index) => {
        const results = analysis.groups?.[group.key] ?? [];
        if (results.length === 0) return null;

        const counts = countByStatus(results);
        const shown = results.filter((result) => result.status !== 'skip');
        const skipped = counts.skip;

        return (
          <details key={group.key} className={styles.group} open={index === 0 || counts.fail > 0}>
            <summary className={styles.groupSummary}>
              {group.label}
              <span className={styles.groupCounts}>
                <span className={styles.countPass}>{counts.pass} passed</span>
                {counts.warn > 0 ? (
                  <span className={styles.countWarn}>{counts.warn} warning</span>
                ) : null}
                {counts.fail > 0 ? (
                  <span className={styles.countFail}>{counts.fail} failed</span>
                ) : null}
              </span>
              <Icon
                icon="mdi:chevron-down"
                width="18"
                height="18"
                className={styles.groupChevron}
                aria-hidden="true"
              />
            </summary>

            <ul className={styles.tests}>
              {shown.map((result) => (
                <TestRow key={result.id} result={result} onFix={focusField} />
              ))}
            </ul>

            {skipped > 0 ? (
              <p className={styles.tests}>
                <span className={styles.testHintPlain}>
                  {skipped} {skipped === 1 ? 'test does' : 'tests do'} not apply to this kind of
                  record and {skipped === 1 ? 'is' : 'are'} not counted.
                </span>
              </p>
            ) : null}
          </details>
        );
      })}
    </div>
  );
}

/** One result: an icon, what was measured, and the way to fix it. */
function TestRow({ result, onFix }) {
  const status = STATUS[result.status] ?? STATUS.skip;

  return (
    <li className={[styles.test, status.className].filter(Boolean).join(' ')}>
      <Icon
        icon={status.icon}
        width="18"
        height="18"
        className={styles.testIcon}
        aria-hidden="true"
      />
      <div className={styles.testBody}>
        <p className={styles.testMessage}>
          <span className={styles.srOnly}>{status.label}: </span>
          {result.message}
        </p>
        {result.hint ? (
          result.field ? (
            <button type="button" className={styles.testHint} onClick={() => onFix(result.field)}>
              {result.hint}
            </button>
          ) : (
            <p className={styles.testHintPlain}>{result.hint}</p>
          )
        ) : null}
      </div>
    </li>
  );
}
