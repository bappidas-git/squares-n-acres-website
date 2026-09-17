import { useSeoPanel } from '../SeoPanelContext';

import styles from '../SeoPanel.module.css';

const SOURCE_NOTE = {
  own: 'set on this record',
  template: 'from the site template',
  default: 'the site-wide default',
  auto: 'computed from the address',
  none: 'nothing yet',
};

/**
 * What this record actually publishes, after every override on every tab.
 *
 * Read-only on purpose: an editor with four tabs of overrides needs one place
 * that answers "so what does the page send?", and the answer comes from
 * `resolveSeoOutput` — the same function the public `<Seo>` component uses, so
 * this box and the page can never disagree (§9.3).
 */
export default function ResolvedValues() {
  const { resolved } = useSeoPanel();

  const rows = [
    { term: 'Title', value: resolved.title, note: SOURCE_NOTE[resolved.titleSource] },
    {
      term: 'Description',
      value: resolved.description,
      note: SOURCE_NOTE[resolved.descriptionSource],
    },
    {
      term: 'Canonical',
      value: resolved.canonical,
      note: SOURCE_NOTE[resolved.canonicalSource],
      mono: true,
    },
    { term: 'Robots', value: resolved.robots, mono: true },
    { term: 'og:type', value: resolved.ogType, mono: true },
    { term: 'og:title', value: resolved.og.title },
    { term: 'og:description', value: resolved.og.description },
    { term: 'og:image', value: resolved.og.imageUrl, mono: true },
    { term: 'twitter:card', value: resolved.twitter.card, mono: true },
  ];

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <h3 className={styles.heading}>Resolved values</h3>
        <span className={styles.note}>What the page sends, read-only</span>
      </div>

      <dl className={styles.resolvedList}>
        {rows.map((row) => (
          <div key={row.term} style={{ display: 'contents' }}>
            <dt className={styles.resolvedTerm}>{row.term}</dt>
            <dd
              className={[styles.resolvedDefinition, row.mono ? styles.resolvedMono : '']
                .filter(Boolean)
                .join(' ')}
            >
              {row.value || '—'}
              {row.note ? <span className={styles.note}> · {row.note}</span> : null}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
