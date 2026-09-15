import { toneStyles } from './tones';

import styles from './Chip.module.css';

/**
 * A compact label or filter pill. `variant` chooses how the tone is painted:
 * `soft` (tinted background), `filled` (solid) or `outline` (border only).
 *
 * @param {object} props
 * @param {'neutral'|'primary'|'success'|'warning'|'error'|'info'} [props.tone]
 * @param {'soft'|'filled'|'outline'} [props.variant]
 * @param {'sm'|'md'} [props.size]
 * @param {boolean} [props.selected]
 * @param {() => void} [props.onClick] renders a `<button>`
 * @param {() => void} [props.onDelete] renders a remove control
 */
export default function Chip({
  tone = 'neutral',
  variant = 'soft',
  size = 'sm',
  selected = false,
  icon,
  onClick,
  onDelete,
  deleteLabel = 'Remove',
  className = '',
  children,
  ...rest
}) {
  const palette = toneStyles(tone);

  const style =
    variant === 'filled'
      ? {
          background: palette.border,
          color: 'var(--color-text-inverse)',
          borderColor: palette.border,
        }
      : variant === 'outline'
        ? { background: 'transparent', color: palette.color, borderColor: palette.border }
        : {
            background: palette.background,
            color: palette.color,
            borderColor: selected ? palette.border : 'transparent',
          };

  const classes = [
    styles.chip,
    size === 'md' ? styles.md : '',
    onClick ? styles.clickable : '',
    selected ? styles.selected : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      <span className={styles.label}>{children}</span>
      {onDelete ? (
        <button
          type="button"
          className={styles.remove}
          onClick={(event) => {
            event.stopPropagation();
            onDelete(event);
          }}
          aria-label={deleteLabel}
        >
          &times;
        </button>
      ) : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={classes}
        style={style}
        onClick={onClick}
        aria-pressed={selected}
        {...rest}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={classes} style={style} {...rest}>
      {content}
    </span>
  );
}
