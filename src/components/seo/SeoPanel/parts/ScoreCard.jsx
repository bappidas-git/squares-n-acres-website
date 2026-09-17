import { Icon } from '@iconify/react';

import Button from '../../../ui/Button';
import Skeleton from '../../../ui/Skeleton';
import { SEO_SCORE_BANDS } from '../../../../config/enums';
import { generateDefaults } from '../../../../seo';
import { useSeoPanel } from '../SeoPanelContext';

import styles from '../SeoPanel.module.css';

const GAUGE_CLASS = {
  good: styles.gaugeGood,
  ok: styles.gaugeOk,
  poor: styles.gaugePoor,
  none: styles.gaugeNone,
};

/** The gauge is a 40 px-radius circle, so its circumference is this. */
const CIRCUMFERENCE = 2 * Math.PI * 40;

/**
 * The number, the band and the two buttons that change them.
 *
 * "Auto-fill missing" is `generateDefaults` without `overwrite`: it writes a
 * title, a description, a focus keyword and a share image **only where there is
 * none**. A generated value never replaces one a person wrote — which is the
 * bug the boilerplate had (ADD-27) and the reason the button can be pressed
 * without fear.
 */
export default function ScoreCard() {
  const {
    entityType,
    entity,
    seo,
    setSeo,
    analysis,
    analysing,
    reanalyse,
    seoSettings,
    context,
    disabled,
  } = useSeoPanel();

  if (analysing || !analysis) {
    return (
      <div className={styles.card}>
        <div className={styles.score}>
          <Skeleton variant="circular" width={92} height={92} />
          <div className={styles.scoreMeta}>
            <Skeleton variant="text" width={120} />
            <Skeleton variant="text" width={160} />
          </div>
        </div>
      </div>
    );
  }

  const band = analysis.band ?? 'none';
  const score = Number.isFinite(analysis.score) ? analysis.score : 0;
  const filled = (score / 100) * CIRCUMFERENCE;

  /** The four values a record can be given without losing anything it has. */
  const autoFill = () => {
    const made = generateDefaults(entityType, entity, seoSettings, { context });
    setSeo({
      title: seo.title || made.title,
      description: seo.description || made.description,
      focusKeyword: seo.focusKeyword || made.focusKeyword,
      og: { ...seo.og, imageUrl: seo.og?.imageUrl || made.og.imageUrl || '' },
    });
  };

  return (
    <div className={styles.card}>
      <div className={styles.score}>
        <svg
          className={styles.gauge}
          viewBox="0 0 100 100"
          role="img"
          aria-label={`SEO score ${score} of 100`}
        >
          <circle className={styles.gaugeTrack} cx="50" cy="50" r="40" />
          <circle
            className={[styles.gaugeValue, GAUGE_CLASS[band]].filter(Boolean).join(' ')}
            cx="50"
            cy="50"
            r="40"
            transform="rotate(-90 50 50)"
            strokeDasharray={`${filled} ${CIRCUMFERENCE}`}
          />
          <text className={styles.gaugeNumber} x="50" y="52" textAnchor="middle">
            {score}
          </text>
          <text className={styles.gaugeUnit} x="50" y="66" textAnchor="middle">
            / 100
          </text>
        </svg>

        <div className={styles.scoreMeta}>
          <span className={styles.scoreBand}>{SEO_SCORE_BANDS.labelOf(band)}</span>
          <span className={styles.summaryTests}>
            {analysis.testsPassed} of {analysis.testsTotal} tests passed
          </span>
          <span className={styles.note}>
            {band === 'good'
              ? 'This page says what it is about, and says it once.'
              : band === 'ok'
                ? 'Readable, but something below is costing it.'
                : 'Start with the failures in Basic SEO.'}
          </span>
        </div>
      </div>

      {disabled ? null : (
        <div className={styles.scoreActions}>
          <Button
            variant="outline"
            size="sm"
            icon={<Icon icon="mdi:refresh" width="16" height="16" />}
            onClick={reanalyse}
          >
            Re-analyse
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Icon icon="mdi:auto-fix" width="16" height="16" />}
            onClick={autoFill}
          >
            Auto-fill missing
          </Button>
        </div>
      )}
    </div>
  );
}
