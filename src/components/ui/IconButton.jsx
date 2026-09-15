import { forwardRef } from 'react';
import { Link } from 'react-router-dom';

import styles from './IconButton.module.css';

/**
 * An icon-only control. `label` is required: it becomes the accessible name.
 *
 * @param {object} props
 * @param {string} props.label used as `aria-label` (and `title` unless one is given)
 * @param {'ghost'|'outline'|'solid'|'onDark'} [props.variant]
 * @param {'sm'|'md'|'lg'} [props.size]
 * @param {boolean} [props.round]
 * @param {string} [props.href] renders an anchor
 * @param {string|object} [props.to] renders a router link
 */
const IconButton = forwardRef(function IconButton(
  {
    label,
    variant = 'ghost',
    size = 'md',
    round = false,
    href,
    to,
    type = 'button',
    title,
    className = '',
    children,
    ...rest
  },
  ref
) {
  const classes = [
    styles.iconButton,
    styles[variant] || styles.ghost,
    styles[size] || '',
    round ? styles.round : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const shared = { className: classes, 'aria-label': label, title: title ?? label };

  if (to) {
    return (
      <Link ref={ref} to={to} {...shared} {...rest}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a ref={ref} href={href} {...shared} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <button ref={ref} type={type} {...shared} {...rest}>
      {children}
    </button>
  );
});

export default IconButton;
