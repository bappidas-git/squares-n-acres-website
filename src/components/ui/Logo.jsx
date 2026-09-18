import { BRAND } from '../../config/site';
import { buildSrcSet, cloudinaryUrl } from '../../utils/cloudinary';

import styles from './Logo.module.css';

/** Intrinsic aspect ratios of the two brand assets (§2.1). */
const RATIO = { wordmark: 540 / 231, monogram: 1 };

/**
 * The brand mark, always with explicit dimensions so nothing shifts while the
 * image loads, and never recoloured.
 *
 * It is a plain `<img>` rather than a `LazyImage`: the mark is a fixed size in
 * the header, it is wanted immediately, and a ratio box and a fade-in would be
 * the wrong treatment for it. What it does share is §8.6 — a Cloudinary asset
 * is asked for at the size it is drawn at and at two and three times that, so a
 * 103-pixel-wide wordmark is not a 540-pixel PNG on every page. Scaling is by
 * width only, so the mark is never stretched or cropped (§2.2). A logo a client
 * hosts elsewhere is used exactly as given.
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
  const srcSet = buildSrcSet(source, [width, width * 2, width * 3]);

  return (
    <span
      className={[styles.logo, onDark ? styles.onDark : '', className].filter(Boolean).join(' ')}
      {...rest}
    >
      <img
        src={srcSet ? cloudinaryUrl(source, { w: width * 2, merge: true }) : source}
        srcSet={srcSet ?? undefined}
        sizes={srcSet ? `${width}px` : undefined}
        alt={alt}
        width={width}
        height={height}
        className={styles.image}
        style={{ height: `${height}px` }}
      />
    </span>
  );
}
