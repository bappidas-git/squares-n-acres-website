import { BRAND } from '../../config/site';

import styles from './Eyebrow.module.css';

/**
 * Small uppercase label above a section title, marked with the brand's red
 * square (a decorative crop of the monogram — `alt=""`).
 *
 * @param {{ mark?: boolean, onDark?: boolean }} props
 */
export default function Eyebrow({
  children,
  mark = true,
  onDark = false,
  className = '',
  ...rest
}) {
  if (!children) return null;
  return (
    <span
      className={[styles.eyebrow, onDark ? styles.onDark : '', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {mark ? (
        <img src={BRAND.iconSquareUrl} alt="" width="10" height="10" className={styles.mark} />
      ) : null}
      {children}
    </span>
  );
}
