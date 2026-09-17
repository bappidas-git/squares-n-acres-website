import { Suspense, lazy, useMemo, useState } from 'react';

import { Container, LazyImage, Section, SectionHeader } from '../../ui';

import styles from './blocks.module.css';

const PropertyLightbox = lazy(() => import('../../sections/property/PropertyLightbox'));

/**
 * A grid of photographs that open full screen (§6.10 `gallery`, D27).
 *
 * The lightbox is the same lazily-loaded chunk the property gallery uses (D7),
 * so the library and its three stylesheets stay out of the page's first load
 * until somebody actually opens a photograph.
 */
export default function GalleryBlock({ data = {}, background = 'bg' }) {
  const [index, setIndex] = useState(null);

  const items = useMemo(
    () => (Array.isArray(data.items) ? data.items : []).filter((item) => item?.url),
    [data.items]
  );

  const slides = useMemo(
    () =>
      items.map((item) => ({
        src: item.url,
        alt: item.alt || '',
        description: item.caption || undefined,
      })),
    [items]
  );

  if (items.length === 0) return null;

  return (
    <Section background={background} spacing="lg">
      <Container>
        {data.title ? <SectionHeader title={data.title} align="center" /> : null}

        <ul className={styles.gallery}>
          {items.map((item, at) => (
            <li key={`${item.url}-${at}`} className={styles.galleryCell}>
              <button
                type="button"
                className={styles.galleryButton}
                onClick={() => setIndex(at)}
                aria-label={`View ${item.alt || `image ${at + 1}`} full screen`}
              >
                <LazyImage
                  src={item.url}
                  alt={item.alt || ''}
                  ratio="4/3"
                  sizes="(min-width: 900px) 300px, 45vw"
                  className={styles.galleryImage}
                />
              </button>
              {item.caption ? <p className={styles.caption}>{item.caption}</p> : null}
            </li>
          ))}
        </ul>
      </Container>

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
    </Section>
  );
}

GalleryBlock.isEmpty = (data) =>
  !(Array.isArray(data?.items) ? data.items : []).some((item) => item?.url);
