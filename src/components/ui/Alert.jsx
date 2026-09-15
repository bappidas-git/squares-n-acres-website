import { toneStyles } from './tones';

import IconButton from './IconButton';
import styles from './Alert.module.css';

const ROLE = { error: 'alert', warning: 'alert' };

/**
 * An inline message block. Error and warning tones announce themselves with
 * `role="alert"`; the rest are polite.
 *
 * @param {object} props
 * @param {'neutral'|'primary'|'success'|'warning'|'error'|'info'} [props.tone]
 * @param {React.ReactNode} [props.title]
 * @param {React.ReactNode} [props.icon]
 * @param {() => void} [props.onClose]
 */
export default function Alert({
  tone = 'info',
  title,
  icon,
  onClose,
  closeLabel = 'Dismiss',
  className = '',
  children,
  ...rest
}) {
  const palette = toneStyles(tone);

  return (
    <div
      className={[styles.alert, className].filter(Boolean).join(' ')}
      style={{ background: palette.background, borderColor: palette.border, color: palette.color }}
      role={ROLE[tone] || 'status'}
      {...rest}
    >
      {icon ? (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <div className={styles.content}>
        {title ? <p className={styles.title}>{title}</p> : null}
        <div className={styles.message}>{children}</div>
      </div>
      {onClose ? (
        <IconButton label={closeLabel} size="sm" className={styles.close} onClick={onClose}>
          &times;
        </IconButton>
      ) : null}
    </div>
  );
}
