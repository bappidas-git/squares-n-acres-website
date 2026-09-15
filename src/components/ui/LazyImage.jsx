import { useEffect, useState } from 'react';

import { BRAND } from '../../config/site';

import styles from './LazyImage.module.css';

/**
 * An image inside a fixed-ratio box, so the layout never shifts (CLS) whatever
 * the image does. It lazy-loads, decodes off the main thread and fades in over
 * the surface tint; a failed load leaves the box in place and shows the
 * monogram instead.
 *
 * `srcSet`/`sizes` are passed straight through — the Cloudinary variants that
 * fill them arrive with the media library (prompt 39).
 *
 * @param {object} props
 * @param {string} props.src
 * @param {string} props.alt `''` for decorative images
 * @param {string} [props.ratio] any CSS aspect-ratio, e.g. `'4/3'`, `'16/9'`, `'1'`
 * @param {'cover'|'contain'} [props.fit]
 * @param {string} [props.srcSet]
 * @param {string} [props.sizes]
 * @param {'lazy'|'eager'} [props.loading]
 * @param {React.ReactNode} [props.onErrorFallback] replaces the monogram placeholder
 */
export default function LazyImage({
  src,
  alt = '',
  ratio = '4/3',
  fit = 'cover',
  srcSet,
  sizes,
  loading = 'lazy',
  fetchPriority,
  onErrorFallback,
  className = '',
  imageClassName = '',
  style,
  ...rest
}) {
  const [status, setStatus] = useState('loading');

  useEffect(() => setStatus('loading'), [src]);

  const failed = status === 'error' || !src;

  return (
    <span
      data-testid="lazy-image"
      className={[styles.wrapper, className].filter(Boolean).join(' ')}
      style={{ '--ratio': ratio, ...style }}
      {...rest}
    >
      {src ? (
        <img
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          loading={loading}
          decoding="async"
          fetchpriority={fetchPriority}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          className={[
            styles.image,
            styles[fit],
            status === 'loaded' ? styles.loaded : '',
            imageClassName,
          ]
            .filter(Boolean)
            .join(' ')}
        />
      ) : null}
      {failed ? (
        <span className={styles.fallback} data-testid="lazy-image-placeholder">
          {onErrorFallback ?? (
            <img
              src={BRAND.iconUrl}
              alt=""
              className={styles.fallbackMark}
              loading="lazy"
              data-testid="lazy-image-monogram"
            />
          )}
        </span>
      ) : null}
    </span>
  );
}
