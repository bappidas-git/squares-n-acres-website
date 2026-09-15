import styles from './Rating.module.css';

const STAR = '★';

/**
 * A read-only star rating. The stars are decorative; the accessible name is the
 * numeric value, so screen readers hear "4.5 out of 5" once.
 *
 * @param {object} props
 * @param {number} props.value
 * @param {number} [props.max]
 * @param {number} [props.count] number of reviews, shown in brackets
 * @param {boolean} [props.showValue]
 */
export default function Rating({
  value = 0,
  max = 5,
  count,
  showValue = true,
  className = '',
  ...rest
}) {
  const clamped = Math.min(Math.max(Number(value) || 0, 0), max);
  const percent = (clamped / max) * 100;

  return (
    <span
      className={[styles.rating, className].filter(Boolean).join(' ')}
      role="img"
      aria-label={`${clamped} out of ${max}${count ? `, ${count} reviews` : ''}`}
      {...rest}
    >
      <span className={styles.stars} aria-hidden="true">
        {STAR.repeat(max)}
        <span className={styles.fill} style={{ width: `${percent}%` }}>
          {STAR.repeat(max)}
        </span>
      </span>
      {showValue ? <span className={styles.value}>{clamped.toFixed(1)}</span> : null}
      {count ? <span>({count})</span> : null}
    </span>
  );
}
