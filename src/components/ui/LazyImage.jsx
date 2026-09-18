import { useEffect, useMemo, useState } from 'react';

import { BRAND } from '../../config/site';
import { SRCSET_WIDTHS, blurThumb, cloudinaryUrl, responsiveImage } from '../../utils/cloudinary';

import styles from './LazyImage.module.css';

/** The monogram a failed image leaves behind, at the size it is drawn at. */
const FALLBACK_MARK = cloudinaryUrl(BRAND.iconUrl, { w: 144, merge: true });

/**
 * What a picture is worth downloading at, when its caller says nothing.
 *
 * One column on a phone, three on a desktop grid — the shape of every card
 * grid in the product (§8.6). A hero, a gallery slide or a logo is a different
 * shape and passes its own `sizes`; this is only the answer for the common
 * case, and a wrong-but-close `sizes` still beats none at all, because without
 * it the browser assumes `100vw` and downloads the 1600px variant for a
 * 320px card.
 */
export const DEFAULT_SIZES = '(max-width: 899px) 100vw, 33vw';

/**
 * An image inside a fixed-ratio box, so the layout never shifts (CLS) whatever
 * the image does.
 *
 * For a Cloudinary picture it builds the whole responsive set itself (§8.6):
 * six `f_auto,q_auto` widths in `srcSet`, the box's ratio as a `c_fill` crop so
 * the bytes that arrive are the bytes that are shown, and a 24-pixel blur of
 * the same picture behind it that the real one fades in over. A URL from
 * anywhere else — `picsum.photos` in the seed, a client's own CDN — is used
 * exactly as given, with no `srcset` at all, because there are no variants of
 * it to offer.
 *
 * `priority` is for the one image that is the page's LCP — the property hero,
 * an article's featured image, the home hero. It loads eagerly and asks the
 * browser to fetch it first; everything else stays lazy.
 *
 * @param {object} props
 * @param {string} props.src
 * @param {string} props.alt `''` for decorative images
 * @param {string} [props.ratio] any CSS aspect-ratio, e.g. `'4/3'`, `'16/9'`, `'1'`
 * @param {'cover'|'contain'} [props.fit]
 * @param {string} [props.sizes] the CSS width of the box at each breakpoint
 * @param {number[]} [props.widths] overrides the §8.6 widths
 * @param {string} [props.srcSet] an explicit set, which wins over the built one
 * @param {Array<{media?: string, srcSet?: string, sizes?: string, type?: string}>} [props.sources]
 *   art-directed alternatives — see `Picture`
 * @param {boolean} [props.priority] this is the LCP image: eager + high priority
 * @param {'lazy'|'eager'} [props.loading]
 * @param {React.ReactNode} [props.onErrorFallback] replaces the monogram placeholder
 */
export default function LazyImage({
  src,
  alt = '',
  ratio = '4/3',
  fit = 'cover',
  sizes,
  widths = SRCSET_WIDTHS,
  srcSet,
  sources,
  priority = false,
  loading,
  fetchPriority,
  onErrorFallback,
  className = '',
  imageClassName = '',
  style,
  ...rest
}) {
  const [status, setStatus] = useState('loading');

  useEffect(() => setStatus('loading'), [src]);

  const responsive = useMemo(() => {
    // `responsiveImage` owns the rule that a box the picture is cropped into is
    // a box whose ratio the crop should respect, while a box it is fitted
    // *inside* (a logo, a floor plan) must never be cropped to it — §2.2
    // forbids cropping the wordmark, and a plan is unreadable with its edges
    // cut off. `<Seo preloadImage>` reads the same helper, so a preload and
    // this `<img>` always name the same candidates.
    const built = responsiveImage(src, { ratio, fit, widths });
    if (!built.srcSet) return { srcSet: null, src, blur: null };

    return { srcSet: built.srcSet, src: built.src, blur: blurThumb(src) };
  }, [src, widths, ratio, fit]);

  const failed = status === 'error' || !src;
  const loaded = status === 'loaded';
  const finalSrcSet = srcSet ?? responsive.srcSet ?? undefined;
  // `sizes` only means something beside a `srcset`; on a picture with no
  // variants to choose between it is noise in the markup.
  const finalSizes = finalSrcSet ? (sizes ?? DEFAULT_SIZES) : undefined;

  const image = src ? (
    <img
      src={responsive.src}
      srcSet={finalSrcSet}
      sizes={finalSizes}
      alt={alt}
      loading={loading ?? (priority ? 'eager' : 'lazy')}
      decoding="async"
      fetchpriority={fetchPriority ?? (priority ? 'high' : undefined)}
      onLoad={() => setStatus('loaded')}
      onError={() => setStatus('error')}
      className={[styles.image, styles[fit], loaded ? styles.loaded : '', imageClassName]
        .filter(Boolean)
        .join(' ')}
    />
  ) : null;

  return (
    <span
      data-testid="lazy-image"
      className={[styles.wrapper, responsive.blur && !loaded ? styles.blurred : '', className]
        .filter(Boolean)
        .join(' ')}
      style={{
        '--ratio': ratio,
        ...(responsive.blur ? { '--blur': `url("${responsive.blur}")` } : null),
        ...style,
      }}
      {...rest}
    >
      {image && sources?.length ? (
        <picture className={styles.picture}>
          {sources.map((source, index) => (
            <source
              key={source.media ?? source.type ?? index}
              media={source.media}
              type={source.type}
              srcSet={source.srcSet}
              sizes={source.sizes ?? finalSizes}
            />
          ))}
          {image}
        </picture>
      ) : (
        image
      )}
      {failed ? (
        <span className={styles.fallback} data-testid="lazy-image-placeholder">
          {onErrorFallback ?? (
            <img
              src={FALLBACK_MARK}
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
