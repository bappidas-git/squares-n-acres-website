import { Suspense, lazy, useCallback, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

import { LazyImage, Tabs, VideoEmbed } from '../../ui';
import { track } from '../../../utils/analytics';
import useBreakpoint from '../../../hooks/useBreakpoint';

import styles from './PropertyGallery.module.css';

const PropertyLightbox = lazy(() => import('./PropertyLightbox'));

/** How far a finger has to travel before it counts as a swipe. */
const SWIPE_THRESHOLD = 48;

/**
 * The embeddable form of a walkthrough address, or `null` when it is neither a
 * YouTube page, a Vimeo page nor a file a browser can play (§7: a video the
 * page cannot show is a tab that is not offered).
 *
 * @param {string|null} url
 * @returns {{kind: 'iframe'|'file', src: string}|null}
 */
export function videoSource(url) {
  const raw = String(url ?? '').trim();
  if (!raw) return null;

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, '');

  if (host === 'youtu.be') {
    const id = parsed.pathname.slice(1);
    return id ? { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}` } : null;
  }

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    const id = parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).pop();
    if (!id) return null;
    return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}` };
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = parsed.pathname.split('/').filter(Boolean).pop();
    return /^\d+$/.test(id ?? '')
      ? { kind: 'iframe', src: `https://player.vimeo.com/video/${id}` }
      : null;
  }

  if (/\.(mp4|webm|ogv)$/i.test(parsed.pathname)) return { kind: 'file', src: raw };

  return null;
}

/** The images in the order the page shows them: the cover first, then `order`. */
export function orderedImages(images) {
  const rows = (Array.isArray(images) ? images : []).filter((image) => image?.url);
  return [...rows].sort((left, right) => {
    if (Boolean(left.isCover) !== Boolean(right.isCover)) return left.isCover ? -1 : 1;
    return (left.order ?? 0) - (right.order ?? 0);
  });
}

/**
 * The photographs, the walkthrough and the tour of one listing.
 *
 * Photographs are a cover with a thumbnail strip beside it (below it on a
 * phone); the arrow keys move between them and `Enter` opens the full-screen
 * lightbox, which is a separate chunk (D7). The video and the tour are offered
 * as tabs only when the listing carries one **and** its section is switched on
 * — a tab that opens on nothing is worse than no tab.
 *
 * A listing with no photograph at all gets the monogram placeholder rather than
 * a blank box, so the page never has a hole where the gallery should be.
 *
 * @param {object} props
 * @param {Array<{id: number, url: string, alt?: string, caption?: string, order?: number,
 *   isCover?: boolean}>} props.images
 * @param {string} props.title the listing's title — the alt text falls back to it
 * @param {string|null} [props.videoUrl]
 * @param {string|null} [props.virtualTourUrl]
 * @param {boolean} [props.showVideo] the `video` section's visibility
 * @param {boolean} [props.showVirtualTour] the `virtualTour` section's visibility
 * @param {number|string} [props.propertyId] carried by the `gallery_open` event
 */
export default function PropertyGallery({
  images,
  title = '',
  videoUrl = null,
  virtualTourUrl = null,
  showVideo = true,
  showVirtualTour = true,
  propertyId,
}) {
  const photos = useMemo(() => orderedImages(images), [images]);
  const { isMobile } = useBreakpoint();
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStart = useRef(null);
  const stageRef = useRef(null);

  const count = photos.length;
  const current = photos[Math.min(index, Math.max(count - 1, 0))] ?? null;

  // A phone is held upright: a 4/3 cover fills more of it than a 16/9 one (§6).
  const stageRatio = isMobile ? '4/3' : '16/9';
  const video = showVideo ? videoSource(videoUrl) : null;
  const tour = showVirtualTour && String(virtualTourUrl ?? '').trim() ? virtualTourUrl : null;

  const go = useCallback(
    (next) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count]
  );

  const openLightbox = useCallback(() => {
    if (count === 0) return;
    setLightboxOpen(true);
    track('gallery_open', { propertyId });
  }, [count, propertyId]);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    // The library restores focus to whatever opened it; the stage is what the
    // arrow keys then move, so it is where focus belongs.
    stageRef.current?.focus();
  }, []);

  const onStageKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(index + 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openLightbox();
    }
  };

  const onTouchStart = (event) => {
    touchStart.current = event.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (event) => {
    if (touchStart.current === null) return;
    const travelled = (event.changedTouches[0]?.clientX ?? 0) - touchStart.current;
    touchStart.current = null;
    if (Math.abs(travelled) < SWIPE_THRESHOLD) return;
    go(index + (travelled < 0 ? 1 : -1));
  };

  const slides = useMemo(
    () =>
      photos.map((photo) => ({
        src: photo.url,
        alt: photo.alt || title,
        description: photo.caption || undefined,
      })),
    [photos, title]
  );

  const photosPanel =
    count === 0 ? (
      <div className={styles.empty}>
        <LazyImage src="" alt="" ratio={stageRatio} className={styles.stageImage} />
        <p className={styles.emptyText}>Photographs of this property are on their way.</p>
      </div>
    ) : (
      <div className={styles.photos}>
        <div
          className={styles.stage}
          ref={stageRef}
          role="button"
          tabIndex={0}
          // The counter inside the stage is its visible label, so the name
          // begins with it (WCAG 2.5.3, NEW-45) and then says what it opens.
          aria-label={`${index + 1} / ${count} — ${title || 'Property'} photograph. Press Enter to view full screen.`}
          onClick={openLightbox}
          onKeyDown={onStageKeyDown}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <LazyImage
            src={current?.url}
            alt={current?.alt || title}
            ratio={stageRatio}
            sizes="(min-width: 900px) 60vw, 100vw"
            priority={index === 0}
            className={styles.stageImage}
          />

          <span className={styles.counter}>
            {index + 1} / {count}
          </span>

          {count > 1 ? (
            <>
              <button
                type="button"
                className={`${styles.arrow} ${styles.arrowPrev}`}
                aria-label="Previous photograph"
                onClick={(event) => {
                  event.stopPropagation();
                  go(index - 1);
                }}
              >
                <Icon icon="mdi:chevron-left" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`${styles.arrow} ${styles.arrowNext}`}
                aria-label="Next photograph"
                onClick={(event) => {
                  event.stopPropagation();
                  go(index + 1);
                }}
              >
                <Icon icon="mdi:chevron-right" aria-hidden="true" />
              </button>
            </>
          ) : null}

          <button
            type="button"
            className={styles.viewAll}
            onClick={(event) => {
              event.stopPropagation();
              openLightbox();
            }}
          >
            <Icon icon="mdi:image-multiple-outline" aria-hidden="true" />
            {count === 1 ? 'View photo' : `View all ${count} photos`}
          </button>
        </div>

        {count > 1 ? (
          <ul className={styles.thumbs} aria-label="Photographs">
            {photos.map((photo, position) => (
              <li key={photo.id ?? photo.url}>
                <button
                  type="button"
                  className={`${styles.thumb} ${position === index ? styles.thumbActive : ''}`}
                  aria-label={`Photograph ${position + 1}`}
                  aria-current={position === index ? 'true' : undefined}
                  onClick={() => go(position)}
                >
                  <LazyImage
                    src={photo.url}
                    alt=""
                    ratio="4/3"
                    sizes="120px"
                    className={styles.thumbImage}
                  />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );

  const items = [
    { value: 'photos', label: `Photos${count ? ` (${count})` : ''}`, content: photosPanel },
  ];

  if (video) {
    items.push({
      value: 'video',
      label: 'Video',
      content:
        video.kind === 'file' ? (
          <div className={styles.frame}>
            {/* `preload="none"` and a poster: a walkthrough behind a tab
                nobody has opened should cost one picture, not a video's
                first megabyte (§8.6). The cover is the poster, so the tab
                looks like the listing rather than like a black rectangle. */}
            <video
              className={styles.media}
              src={video.src}
              poster={current?.url || undefined}
              controls
              preload="none"
            >
              <track kind="captions" />
            </video>
          </div>
        ) : (
          // A YouTube embed is a megabyte of player; the facade is a
          // thumbnail until somebody presses play (§8.6).
          <VideoEmbed src={video.src} title={`${title} — video walkthrough`} />
        ),
    });
  }

  if (tour) {
    items.push({
      value: 'tour',
      label: 'Virtual tour',
      content: <VideoEmbed src={tour} title={`${title} — virtual tour`} />,
    });
  }

  return (
    <section className={styles.gallery} aria-label="Property media">
      {items.length > 1 ? (
        <Tabs items={items} label="Property media" variant="pills" />
      ) : (
        photosPanel
      )}

      {lightboxOpen ? (
        <Suspense
          fallback={
            <span className={styles.lightboxLoading} role="status" aria-label="Loading gallery" />
          }
        >
          <PropertyLightbox
            open={lightboxOpen}
            index={index}
            slides={slides}
            onClose={closeLightbox}
            onIndexChange={setIndex}
          />
        </Suspense>
      ) : null}
    </section>
  );
}
