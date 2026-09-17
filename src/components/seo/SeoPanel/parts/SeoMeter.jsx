import { DESCRIPTION_CHARS, DESCRIPTION_MAX_PX, TITLE_CHARS, TITLE_MAX_PX } from '../../../../seo';

import styles from '../SeoPanel.module.css';

/** The two things a snippet field is measured in, and where each one is cut. */
export const METER_LIMITS = {
  title: { chars: TITLE_CHARS, maxPx: TITLE_MAX_PX },
  description: { chars: DESCRIPTION_CHARS, maxPx: DESCRIPTION_MAX_PX },
};

const TONE_CLASS = {
  muted: styles.toneMuted,
  success: styles.toneSuccess,
  warning: styles.toneWarning,
  error: styles.toneError,
};

/**
 * What the counter says about a length, in one word.
 *
 * Empty is not an error — the site-wide template fills an empty title and the
 * default description fills an empty description (§9.3) — so it is `muted`. The
 * guide is `success`, the two shoulders either side of it are `warning`, and
 * anything further out is `error`. Pixels can only ever warn: Google cuts a
 * long title, it does not refuse it.
 *
 * @param {number} length in characters
 * @param {number} pixels
 * @param {{chars: {min: number, max: number, warnMin: number, warnMax: number}, maxPx: number}} limits
 * @returns {{tone: 'muted'|'success'|'warning'|'error', verdict: string}}
 */
export function meterState(length, pixels, limits) {
  const { chars, maxPx } = limits;

  if (length === 0) return { tone: 'muted', verdict: 'Empty' };
  if (pixels > maxPx) return { tone: 'warning', verdict: 'Cut in the result' };
  if (length >= chars.min && length <= chars.max) return { tone: 'success', verdict: 'Good' };
  if (length >= chars.warnMin && length <= chars.warnMax) {
    return { tone: 'warning', verdict: length < chars.min ? 'A little short' : 'A little long' };
  }
  return { tone: 'error', verdict: length < chars.min ? 'Too short' : 'Too long' };
}

/**
 * "52 chars · 480 px · Good" — a thin bar and a line under a snippet field.
 *
 * The bar fills against the **pixel** limit rather than the character guide,
 * because pixels are what decides whether a result is cut: sixty characters of
 * "Whitefield" and sixty of "MMM" are not the same headline.
 *
 * @param {object} props
 * @param {number} props.length characters
 * @param {number} props.pixels
 * @param {'title'|'description'} props.kind
 * @param {string} [props.label] the accessible name, e.g. "Title length"
 */
export default function SeoMeter({ length, pixels, kind, label }) {
  const limits = METER_LIMITS[kind] ?? METER_LIMITS.title;
  const { tone, verdict } = meterState(length, pixels, limits);
  const percent = Math.min(100, Math.round((pixels / limits.maxPx) * 100));

  return (
    <div className={[styles.meter, TONE_CLASS[tone]].filter(Boolean).join(' ')}>
      <span
        className={styles.meterTrack}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Length'}
      >
        <span className={styles.meterFill} style={{ width: `${percent}%` }} />
      </span>
      <span className={styles.meterLabel} aria-live="polite">
        <span className={styles.meterValue}>{length} chars</span>
        <span aria-hidden="true">·</span>
        <span className={styles.meterValue}>
          {Math.round(pixels)} px of {limits.maxPx}
        </span>
        <span aria-hidden="true">·</span>
        <span className={styles.meterVerdict}>{verdict}</span>
      </span>
    </div>
  );
}
