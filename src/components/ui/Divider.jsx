import styles from './Divider.module.css';

/**
 * @param {{ orientation?: 'horizontal'|'vertical', flush?: boolean }} props
 */
export default function Divider({
  orientation = 'horizontal',
  flush = false,
  className = '',
  ...rest
}) {
  return (
    <hr
      className={[styles.divider, styles[orientation], flush ? styles.flush : '', className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  );
}
