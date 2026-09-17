import { Icon } from '@iconify/react';

import { formatNumber, formatTime } from '../../../utils/format';

import styles from './ArticleFormPage.module.css';

/**
 * The rail's "Content checks" card: the body's own numbers, and the seven
 * things an editor can fix from this form (§4.4 of this prompt).
 *
 * It is deliberately not an SEO score. The full analysis — the keyword
 * distribution, the readability, the snippet preview — is prompt 36's panel;
 * these are the rules a publish is refused over plus the two recommendations it
 * is not, so that "why will it not publish" is answered on the screen where the
 * answer can be acted on rather than in a toast.
 *
 * @param {object} props
 * @param {ReturnType<import('./useArticleForm').default>} props.form
 */
export default function ArticleChecksCard({ form }) {
  const { checks, stats, draftSavedAt, dirty } = form;
  const done = checks.filter((check) => check.done).length;

  return (
    <aside className={styles.card} aria-labelledby="article-checks">
      <h2 className={styles.cardTitle} id="article-checks">
        Content checks
      </h2>

      <dl className={styles.stats}>
        <div className={styles.stat}>
          <dt>Words</dt>
          <dd>{formatNumber(stats.words)}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Characters</dt>
          <dd>{formatNumber(stats.characters)}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Reading time</dt>
          <dd>{stats.readingTime > 0 ? `${stats.readingTime} min` : '—'}</dd>
        </div>
      </dl>

      <p className={styles.cardNote} aria-live="polite">
        {`${done} of ${checks.length} checks pass`}
      </p>

      <ul className={styles.checks}>
        {checks.map((check) => (
          <li
            key={check.id}
            className={[
              styles.check,
              check.done
                ? styles.checkDone
                : check.required
                  ? styles.checkBlocked
                  : styles.checkTodo,
            ].join(' ')}
          >
            <Icon
              icon={
                check.done
                  ? 'mdi:check-circle'
                  : check.required
                    ? 'mdi:alert-circle-outline'
                    : 'mdi:circle-outline'
              }
              width="16"
              height="16"
              aria-hidden="true"
            />
            <span>
              {check.label}
              <span className={styles.srOnly}>
                {check.done
                  ? ' — done'
                  : check.required
                    ? ' — required before this article goes live'
                    : ' — recommended'}
              </span>
              {check.hint ? <span className={styles.checkHint}>{check.hint}</span> : null}
            </span>
          </li>
        ))}
      </ul>

      {draftSavedAt ? (
        <p className={styles.cardNote} aria-live="polite">
          Draft saved {formatTime(draftSavedAt)} in this browser
          {dirty ? ' — with changes since' : ''}.
        </p>
      ) : null}
    </aside>
  );
}
