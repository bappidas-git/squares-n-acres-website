import { Suspense, lazy, useMemo, useState } from 'react';

import { LazyImage } from '../../ui';
import SectionShell from './SectionShell';
import { track } from '../../../utils/analytics';

import styles from './GallerySection.module.css';

const PropertyLightbox = lazy(() => import('./PropertyLightbox'));

/**
 * The photographs in the order the editor set, cover first.
 *
 * Exported for the unit test.
 *
 * @param {Array<{url: string, alt?: string, caption?: string, order?: number, isCover?: boolean}>} images
 * @returns {Array<object>}
 */
export function orderedImages(images) {
  return (Array.isArray(images) ? images : [])
    .filter((image) => image && String(image.url ?? '').trim() !== '')
    .map((image, index) => ({ image, index }))
    .sort((a, b) => {
      if (a.image.isCover !== b.image.isCover) return a.image.isCover ? -1 : 1;
      const order = (entry) =>
        entry.image.order === null || entry.image.order === undefined
          ? null
          : Number(entry.image.order);
      if (order(a) !== null && order(b) !== null && order(a) !== order(b)) {
        return order(a) - order(b);
      }
      return a.index - b.index;
    })
    .map((entry) => entry.image);
}

/**
 * Every photograph of the listing as a grid, further down the page than the
 * gallery at the top.
 *
 * The cover appears here too, deliberately: this is the contact sheet — "here
 * is everything we have" — and a grid that silently skips the first picture
 * makes a visitor count photographs to work out why (hero/gallery duplication
 * decision, `docs/DECISIONS.md`).
 *
 * @param {object} props
 * @param {object} props.property a record of §6.1
 * @param {'bg'|'surface'} [props.background]
 */
export default function GallerySection({ property, background = 'bg' }) {
  const [index, setIndex] = useState(null);

  const images = useMemo(() => orderedImages(property?.images), [property]);

  if (images.length === 0) return null;

  const slides = images.map((image) => ({
    src: image.url,
    alt: image.alt || property?.title || '',
    description: image.caption || undefined,
  }));

  const open = (at) => {
    setIndex(at);
    track('gallery_open', { propertyId: property?.id ?? null });
  };

  return (
    <SectionShell
      id="gallery"
      title="Gallery"
      subtitle={`${images.length} ${images.length === 1 ? 'photo' : 'photos'}`}
      background={background}
    >
      <ul className={styles.grid}>
        {images.map((image, at) => (
          <li key={image.id ?? image.url} className={styles.cell}>
            <button
              type="button"
              className={styles.tile}
              onClick={() => open(at)}
              aria-label={`View photograph ${at + 1} of ${images.length} full screen`}
            >
              <LazyImage
                src={image.url}
                alt={image.alt || property?.title || ''}
                ratio="4/3"
                sizes="(min-width: 900px) 320px, 45vw"
                className={styles.image}
              />
            </button>
            {image.caption ? <p className={styles.caption}>{image.caption}</p> : null}
          </li>
        ))}
      </ul>

      {index !== null ? (
        <Suspense fallback={null}>
          <PropertyLightbox
            open
            index={index}
            slides={slides}
            onClose={() => setIndex(null)}
            onIndexChange={setIndex}
          />
        </Suspense>
      ) : null}
    </SectionShell>
  );
}
