import { toneStyles } from './tones';

import styles from './Badge.module.css';

/**
 * A status marker — property badges, lead statuses, publication states.
 * Unlike `Chip` it is never interactive.
 *
 * @param {object} props
 * @param {'neutral'|'primary'|'success'|'warning'|'error'|'info'} [props.tone]
 * @param {'soft'|'solid'} [props.variant]
 * @param {boolean} [props.dot] leading status dot
 */
export default function Badge({
  tone = 'neutral',
  variant = 'soft',
  dot = false,
  icon,
  className = '',
  children,
  ...rest
}) {
  const palette = toneStyles(tone);
  const style =
    variant === 'solid'
      ? { background: palette.border, color: 'var(--color-text-inverse)' }
      : { background: palette.background, color: palette.color };

  return (
    <span className={[styles.badge, className].filter(Boolean).join(' ')} style={style} {...rest}>
      {dot ? <span className={styles.dot} aria-hidden="true" /> : null}
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {children}
    </span>
  );
}
