/**
 * Semantic "tones" replace the colour literals that used to live in data
 * constants (the boilerplate's tag options, role maps, score bands…) and the
 * hex values a badge used to carry. A record stores a tone name; the component
 * asks for its styles.
 */

export const TONES = ['neutral', 'primary', 'success', 'warning', 'error', 'info'];

const STYLES = {
  neutral: {
    color: 'var(--color-text-muted)',
    background: 'var(--color-surface-2)',
    border: 'var(--color-border-strong)',
  },
  primary: {
    color: 'var(--color-primary-dark)',
    background: 'var(--color-primary-light)',
    border: 'var(--color-primary)',
  },
  success: {
    color: 'var(--color-success-dark)',
    background: 'var(--color-success-bg)',
    border: 'var(--color-success)',
  },
  warning: {
    color: 'var(--color-warning-dark)',
    background: 'var(--color-warning-bg)',
    border: 'var(--color-warning)',
  },
  error: {
    color: 'var(--color-error-dark)',
    background: 'var(--color-error-bg)',
    border: 'var(--color-error)',
  },
  info: {
    color: 'var(--color-info-dark)',
    background: 'var(--color-info-bg)',
    border: 'var(--color-info)',
  },
};

/**
 * @param {string} tone one of `TONES`
 * @returns {{ color: string, background: string, border: string }} `var()` references
 */
export function toneStyles(tone) {
  return STYLES[tone] || STYLES.neutral;
}

/** The solid colour of a tone — for charts, dots and icon fills. */
export function toneColor(tone) {
  return toneStyles(tone).border;
}

export default toneStyles;
