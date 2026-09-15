import { forwardRef } from 'react';
import { Link } from 'react-router-dom';

import styles from './Button.module.css';

/**
 * The one button of the design system.
 *
 * Renders a `<button>`, an `<a>` (when `href` is given) or a router `<Link>`
 * (when `to` is given) — the visual API is identical in all three cases.
 *
 * @param {object} props
 * @param {'primary'|'secondary'|'outline'|'ghost'|'danger'|'link'} [props.variant]
 * @param {'sm'|'md'|'lg'} [props.size]
 * @param {boolean} [props.loading] shows a spinner, sets `aria-busy` and blocks clicks
 * @param {React.ReactNode} [props.icon] leading icon
 * @param {React.ReactNode} [props.iconRight] trailing icon
 * @param {string} [props.href] renders an anchor
 * @param {string|object} [props.to] renders a router link
 */
const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon,
    iconRight,
    fullWidth = false,
    href,
    to,
    type = 'button',
    className = '',
    children,
    ...rest
  },
  ref
) {
  const classes = [
    styles.button,
    styles[variant] || styles.primary,
    styles[size] || styles.md,
    fullWidth ? styles.fullWidth : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
      {!loading && icon ? (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
      {iconRight ? (
        <span className={styles.icon} aria-hidden="true">
          {iconRight}
        </span>
      ) : null}
    </>
  );

  const inert = disabled || loading;

  if (to && !inert) {
    return (
      <Link ref={ref} to={to} className={classes} aria-busy={loading || undefined} {...rest}>
        {content}
      </Link>
    );
  }

  if (href && !inert) {
    return (
      <a ref={ref} href={href} className={classes} aria-busy={loading || undefined} {...rest}>
        {content}
      </a>
    );
  }

  if (to || href) {
    // A disabled link is not focusable and must not navigate.
    return (
      <span ref={ref} className={classes} role="link" aria-disabled="true" {...rest}>
        {content}
      </span>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={inert}
      aria-busy={loading || undefined}
      {...rest}
    >
      {content}
    </button>
  );
});

export default Button;
