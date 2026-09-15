import Eyebrow from './Eyebrow';
import styles from './SectionHeader.module.css';

/**
 * Eyebrow + H2 + subtitle, with an optional action on the right (a "View all"
 * link, a filter…). `align="center"` stacks everything centred.
 *
 * @param {object} props
 * @param {string} [props.eyebrow]
 * @param {React.ReactNode} props.title rendered as the section's `<h2>`
 * @param {React.ReactNode} [props.subtitle]
 * @param {React.ReactNode} [props.action]
 * @param {'left'|'center'} [props.align]
 * @param {boolean} [props.onDark]
 * @param {'h2'|'h3'} [props.as]
 */
export default function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
  align = 'left',
  onDark = false,
  as: Heading = 'h2',
  id,
  className = '',
}) {
  return (
    <div
      className={[
        styles.header,
        align === 'center' ? styles.center : '',
        onDark ? styles.onDark : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className={styles.text}>
        {eyebrow ? <Eyebrow onDark={onDark}>{eyebrow}</Eyebrow> : null}
        {title ? (
          <Heading id={id} className={styles.title}>
            {title}
          </Heading>
        ) : null}
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
