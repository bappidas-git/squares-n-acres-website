import { Icon } from '@iconify/react';

import Card from '../../../components/ui/Card';
import Skeleton from '../../../components/ui/Skeleton';
import { SEO_SCORE_BANDS } from '../../../config/enums';
import { formatNumber } from '../../../utils/format';

import styles from './SeoDashboardPage.module.css';

/**
 * The six numbers the SEO desk opens on (§4.1 of prompt 37).
 *
 * Every one of them is also a way into the table: a card is a filter an editor
 * would otherwise have to assemble from three controls. "Poor" is the day's
 * work, "Missing description" is the hour's, and both are one click rather than
 * a band select plus a search plus a guess.
 *
 * The average is over the records that have been analysed. A site where nobody
 * has opened the panel yet shows "—", not `0`: "not measured" and "measured and
 * bad" are different answers and the desk must not confuse them.
 *
 * @param {object} props
 * @param {ReturnType<typeof import('./useSeoOverview').summarise>} props.summary
 * @param {boolean} [props.loading]
 * @param {(patch: object) => void} props.onFilter applies a table filter
 * @param {(tab: string) => void} props.onOpenTab switches to Duplicates / Issues
 */
export default function SeoOverviewCards({ summary, loading = false, onFilter, onOpenTab }) {
  if (loading) {
    return (
      <div className={styles.cards}>
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} variant="rounded" height={104} />
        ))}
      </div>
    );
  }

  const analysedHint =
    summary.analysed > 0
      ? `${formatNumber(summary.analysed)} of ${formatNumber(summary.total)} analysed`
      : 'Run “Re-analyse all” to measure the site';

  return (
    <div className={styles.cards}>
      <Card className={styles.card}>
        <span className={styles.cardLabel}>
          <Icon icon="mdi:speedometer" width="18" height="18" aria-hidden="true" />
          Average score
        </span>
        <span className={styles.cardValue}>
          {summary.averageScore === null ? '—' : summary.averageScore}
          {summary.averageScore === null ? null : <small>/100</small>}
        </span>
        <span className={styles.cardHint}>{analysedHint}</span>
      </Card>

      <Card className={styles.card}>
        <span className={styles.cardLabel}>
          <Icon icon="mdi:chart-donut" width="18" height="18" aria-hidden="true" />
          Score bands
        </span>
        <ul className={styles.bandList}>
          {SEO_SCORE_BANDS.entries.map((band) => (
            <li key={band.value}>
              <button
                type="button"
                className={styles.bandButton}
                onClick={() => onFilter?.({ scoreBand: [band.value] })}
              >
                <span className={styles[`dot-${band.tone}`]} aria-hidden="true" />
                <span className={styles.bandLabel}>{band.label}</span>
                <span className={styles.bandCount}>
                  {formatNumber(summary.bands[band.value] ?? 0)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <CountCard
        icon="mdi:key-outline"
        label="No focus keyword"
        value={summary.missingKeyword}
        hint="Nothing to measure the page against"
        tone={summary.missingKeyword > 0 ? 'warning' : 'success'}
        onClick={() => onFilter?.({ missing: ['focusKeyword'] })}
        actionLabel="Filter the table to records without a focus keyword"
      />
      <CountCard
        icon="mdi:text-box-remove-outline"
        label="No meta description"
        value={summary.missingDescription}
        hint="The site-wide sentence is used instead"
        tone={summary.missingDescription > 0 ? 'warning' : 'success'}
        onClick={() => onFilter?.({ missing: ['description'] })}
        actionLabel="Filter the table to records without a meta description"
      />
      <CountCard
        icon="mdi:eye-off-outline"
        label="Noindexed"
        value={summary.noindexed}
        hint="Deliberately kept out of search"
        tone="neutral"
        onClick={() => onFilter?.({ index: 'noindex' })}
        actionLabel="Filter the table to noindexed records"
      />
      <CountCard
        icon="mdi:content-duplicate"
        label="Duplicated values"
        value={summary.duplicates}
        hint="Same title, description or keyword"
        tone={summary.duplicates > 0 ? 'error' : 'success'}
        onClick={() => onOpenTab?.('duplicates')}
        actionLabel="Open the duplicates list"
      />
    </div>
  );
}

/** One counted card that is also a filter. */
function CountCard({ icon, label, value, hint, tone, onClick, actionLabel }) {
  return (
    <Card className={styles.card}>
      <button type="button" className={styles.cardButton} onClick={onClick} title={actionLabel}>
        <span className={styles.cardLabel}>
          <Icon icon={icon} width="18" height="18" aria-hidden="true" />
          {label}
        </span>
        <span className={[styles.cardValue, styles[`value-${tone}`]].filter(Boolean).join(' ')}>
          {formatNumber(value)}
        </span>
        <span className={styles.cardHint}>{hint}</span>
      </button>
    </Card>
  );
}
