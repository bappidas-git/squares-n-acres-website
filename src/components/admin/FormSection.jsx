import styles from './FormSection.module.css';

/**
 * A titled group of form fields.
 *
 * The grid is two columns from 900 px and one below it; a field marked `half`
 * takes one column, everything else spans both (§6 of prompt 13). A `<fieldset>`
 * with a `<legend>` is what tells a screen reader where the group starts.
 *
 * @param {object} props
 * @param {React.ReactNode} [props.title]
 * @param {React.ReactNode} [props.description]
 * @param {React.ReactNode} [props.action] rendered next to the title
 * @param {boolean} [props.plain] drop the card chrome (a dialog supplies its own)
 */
export default function FormSection({
  title,
  description,
  action,
  plain = false,
  className = '',
  children,
  ...rest
}) {
  return (
    <fieldset
      className={[styles.section, plain ? styles.plain : '', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {title ? (
        <legend className={styles.legend}>
          <span className={styles.title}>{title}</span>
        </legend>
      ) : null}
      {description ? <p className={styles.description}>{description}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
      <div className={styles.grid}>{children}</div>
    </fieldset>
  );
}

/** The wrapper that makes one field take half the grid. */
export function FormColumn({ half = false, className = '', children, ...rest }) {
  return (
    <div
      className={[half ? styles.half : styles.full, className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
