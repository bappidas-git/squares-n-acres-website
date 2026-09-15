import styles from './Container.module.css';

/**
 * Horizontal page gutter and max width. The gutter is the `--container-padding`
 * token, which widens from 16px to 24px at 900px.
 *
 * @param {{ size?: 'default'|'narrow'|'wide'|'flush', as?: React.ElementType }} props
 */
export default function Container({
  size = 'default',
  as: Tag = 'div',
  className = '',
  children,
  ...rest
}) {
  return (
    <Tag
      className={[styles.container, styles[size] || styles.default, className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </Tag>
  );
}
