import { BRAND } from '../../config/site';

import styles from './Logo.module.css';

/** Intrinsic aspect ratios of the two brand assets (§2.1). */
const RATIO = { wordmark: 540 / 231, monogram: 1 };

/**
 * The brand mark, always with explicit dimensions so nothing shifts while the
 * image loads, and never recoloured.
 *
 * @param {object} props
 * @param {'wordmark'|'monogram'} [props.variant]
 * @param {number} [props.height] rendered height in px
 * @param {boolean} [props.onDark] wraps the mark in the white container (§2.2 rule 5)
 * @param {string} [props.src] overrides the asset (site settings win over `BRAND`)
 * @param {string} [props.alt] defaults to the brand name
 */
export default function Logo({
  variant = 'wordmark',
  height = 44,
  onDark = false,
  src,
  alt = BRAND.name,
  className = '',
  ...rest
}) {
  const source = src || (variant === 'monogram' ? BRAND.iconUrl : BRAND.logoUrl);
  const width = Math.round(height * RATIO[variant]);

  return (
    <span
      className={[styles.logo, onDark ? styles.onDark : '', className].filter(Boolean).join(' ')}
      {...rest}
    >
      <img
        src={source}
        alt={alt}
        width={width}
        height={height}
        className={styles.image}
        style={{ height: `${height}px` }}
      />
    </span>
  );
}
