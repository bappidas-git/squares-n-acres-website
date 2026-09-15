import styles from './EmptyState.module.css';

/**
 * "Nothing here" with a way forward. Every data-driven view renders one when
 * its list comes back empty (§8.2).
 *
 * @param {object} props
 * @param {React.ReactNode} [props.icon]
 * @param {React.ReactNode} props.title
 * @param {React.ReactNode} [props.text]
 * @param {React.ReactNode} [props.action] a `Button`, usually
 * @param {boolean} [props.compact]
 */
export default function EmptyState({
  icon,
  title,
  text,
  action,
  compact = false,
  className = '',
  ...rest
}) {
  return (
    <div
      className={[styles.empty, compact ? styles.compact : '', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {icon ? (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {title ? <p className={styles.title}>{title}</p> : null}
      {text ? <p className={styles.text}>{text}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
