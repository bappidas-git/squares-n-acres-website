import Card from './Card';
import styles from './StatCard.module.css';

/**
 * One number with its label — dashboard tiles, "why choose us" figures.
 *
 * @param {object} props
 * @param {React.ReactNode} props.value already formatted (use `utils/format`)
 * @param {React.ReactNode} props.label
 * @param {React.ReactNode} [props.icon]
 * @param {React.ReactNode} [props.hint] small line under the label
 * @param {{ direction: 'up'|'down', label: React.ReactNode }} [props.trend]
 */
export default function StatCard({ value, label, icon, hint, trend, className = '', ...rest }) {
  return (
    <Card className={[styles.card, className].filter(Boolean).join(' ')} {...rest}>
      {icon ? (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className={styles.body}>
        <span className={styles.value}>{value}</span>
        <span className={styles.label}>{label}</span>
        {trend ? (
          <span className={styles.hint}>
            <span className={trend.direction === 'down' ? styles.trendDown : styles.trendUp}>
              {trend.direction === 'down' ? '↓' : '↑'} {trend.label}
            </span>
          </span>
        ) : null}
        {hint ? <span className={styles.hint}>{hint}</span> : null}
      </span>
    </Card>
  );
}
