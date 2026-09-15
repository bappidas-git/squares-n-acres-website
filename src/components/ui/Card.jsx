import { forwardRef } from 'react';

import styles from './Card.module.css';

/**
 * @param {object} props
 * @param {'none'|'sm'|'md'|'lg'} [props.padding]
 * @param {boolean} [props.hoverable] lifts the shadow on hover and focus-within
 * @param {boolean} [props.flat] no resting shadow
 * @param {boolean} [props.surface] tinted background instead of white
 * @param {React.ElementType} [props.as]
 */
const Card = forwardRef(function Card(
  {
    padding = 'md',
    hoverable = false,
    flat = false,
    surface = false,
    as: Tag = 'div',
    className = '',
    children,
    ...rest
  },
  ref
) {
  return (
    <Tag
      ref={ref}
      className={[
        styles.card,
        styles[`padding-${padding}`] || styles['padding-md'],
        hoverable ? styles.hoverable : '',
        flat ? styles.flat : '',
        surface ? styles.surface : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </Tag>
  );
});

export default Card;
