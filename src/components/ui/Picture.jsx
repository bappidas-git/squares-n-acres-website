import { useMemo } from 'react';

import LazyImage from './LazyImage';
import { SRCSET_WIDTHS, buildSrcSet } from '../../utils/cloudinary';

/**
 * Art direction: a different picture per breakpoint, not merely a different
 * size of the same one.
 *
 * `LazyImage` already picks the right *width* of one photograph. This is for
 * the case where the phone needs a different *crop* — the home hero is the
 * example the settings model has (`hero.backgroundImageUrl` beside
 * `hero.mobileImageUrl`, §6.13): a wide 21:9 plate on a desktop and a taller
 * one on a 390px screen, because the wide one shows nothing but sky and
 * tarmac once it is 390 pixels across.
 *
 * Each source is `{ media, src }` plus whatever it wants to override, and each
 * gets its own Cloudinary `srcSet`. A source whose `src` is not a Cloudinary
 * URL still works — it is offered as a single candidate — so a client who
 * pastes two `picsum.photos` links gets art direction without responsive
 * widths, rather than nothing.
 *
 * The last `src` is the fallback, and it is a real `LazyImage`: the ratio box,
 * the blur-up, the monogram on failure and `priority` all behave as they do
 * everywhere else.
 *
 * @param {object} props
 * @param {Array<{media: string, src: string, ratio?: string, widths?: number[],
 *                sizes?: string, type?: string}>} props.sources
 *   first match wins, so write them narrowest-first exactly as `<source>` is read
 * @param {string} props.src the fallback, used when no `media` matches
 * @param {string} props.alt
 * @param {string} [props.ratio] the box's ratio, and the crop of every source
 *   that does not override it
 * @param {string} [props.sizes]
 * @param {boolean} [props.priority]
 */
export default function Picture({
  sources = [],
  src,
  alt = '',
  ratio = '16/9',
  fit = 'cover',
  sizes,
  widths = SRCSET_WIDTHS,
  ...rest
}) {
  const resolved = useMemo(
    () =>
      sources
        .filter((source) => source && source.src)
        .map((source) => ({
          media: source.media,
          type: source.type,
          sizes: source.sizes ?? sizes,
          srcSet:
            buildSrcSet(source.src, source.widths ?? widths, {
              ratio: fit === 'cover' ? (source.ratio ?? ratio) : null,
            }) ?? source.src,
        })),
    [sources, sizes, widths, ratio, fit]
  );

  return (
    <LazyImage
      src={src}
      alt={alt}
      ratio={ratio}
      fit={fit}
      sizes={sizes}
      widths={widths}
      sources={resolved}
      {...rest}
    />
  );
}
