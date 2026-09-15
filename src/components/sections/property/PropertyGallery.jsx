import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import styles from './PropertyGallery.module.css';

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov'];

const isVideoUrl = (url) => {
  if (!url) return false;
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return VIDEO_EXTENSIONS.some((ext) => pathname.endsWith(ext));
  } catch {
    return VIDEO_EXTENSIONS.some((ext) => url.toLowerCase().includes(ext));
  }
};

const GalleryMedia = ({ src, alt, className, ...motionProps }) => {
  if (isVideoUrl(src)) {
    return (
      <motion.video
        {...motionProps}
        className={className}
        src={src}
        controls
        playsInline
        muted
        preload="metadata"
        style={{ objectFit: 'cover', width: '100%', height: '100%' }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }
  return (
    <motion.img
      {...motionProps}
      src={src}
      alt={alt}
      className={className}
    />
  );
};

const ThumbnailMedia = ({ src, alt, ...props }) => {
  if (isVideoUrl(src)) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <video src={src} muted preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <Icon icon="mdi:play-circle" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 20, color: '#fff', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
      </div>
    );
  }
  return <img src={src} alt={alt} {...props} />;
};

const PropertyGallery = ({ images = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [direction, setDirection] = useState(0);

  const gallery = images;
  const imageCount = gallery.length;

  const currentIsVideo = isVideoUrl(gallery[currentIndex]);

  const goTo = useCallback((index) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  }, [currentIndex]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev === 0 ? imageCount - 1 : prev - 1));
  }, [imageCount]);

  const goNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev === imageCount - 1 ? 0 : prev + 1));
  }, [imageCount]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') setLightboxOpen(false);
    if (e.key === 'ArrowLeft') goPrev();
    if (e.key === 'ArrowRight') goNext();
  }, [goPrev, goNext]);

  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

  // Render nothing when no images exist — no placeholder fallback
  if (!imageCount) return null;

  return (
    <>
      <div className={styles.gallery}>
        <div
          className={styles.mainImage}
          onClick={() => !currentIsVideo && setLightboxOpen(true)}
          style={currentIsVideo ? { cursor: 'default' } : undefined}
        >
          <AnimatePresence custom={direction} mode="wait">
            <GalleryMedia
              key={currentIndex}
              src={gallery[currentIndex]}
              alt={`Property view ${currentIndex + 1}`}
              className={styles.image}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            />
          </AnimatePresence>

          <div className={styles.counter}>
            {currentIndex + 1} / {gallery.length}
          </div>

          {!currentIsVideo && (
            <button className={styles.expandBtn} aria-label="View fullscreen">
              <Icon icon="mdi:fullscreen" />
            </button>
          )}

          {gallery.length > 1 && (
            <>
              <button
                className={`${styles.navBtn} ${styles.navPrev}`}
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                aria-label="Previous image"
              >
                <Icon icon="mdi:chevron-left" />
              </button>
              <button
                className={`${styles.navBtn} ${styles.navNext}`}
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                aria-label="Next image"
              >
                <Icon icon="mdi:chevron-right" />
              </button>
            </>
          )}
        </div>

        {gallery.length > 1 && (
          <div className={styles.thumbnails}>
            {gallery.map((img, idx) => (
              <button
                key={idx}
                className={`${styles.thumb} ${idx === currentIndex ? styles.thumbActive : ''}`}
                onClick={() => goTo(idx)}
                aria-label={`View ${isVideoUrl(img) ? 'video' : 'image'} ${idx + 1}`}
              >
                <ThumbnailMedia src={img} alt={`Thumbnail ${idx + 1}`} loading="lazy" />
              </button>
            ))}
          </div>
        )}

        {/* Mobile dots */}
        {gallery.length > 1 && (
          <div className={styles.dots}>
            {gallery.map((_, idx) => (
              <span
                key={idx}
                className={`${styles.dot} ${idx === currentIndex ? styles.dotActive : ''}`}
                onClick={() => goTo(idx)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            className={styles.lightbox}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxOpen(false)}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="dialog"
            aria-label="Image gallery"
          >
            <button
              className={styles.lightboxClose}
              onClick={() => setLightboxOpen(false)}
              aria-label="Close gallery"
            >
              <Icon icon="mdi:close" />
            </button>

            <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
              <AnimatePresence custom={direction} mode="wait">
                <GalleryMedia
                  key={currentIndex}
                  src={gallery[currentIndex]}
                  alt={`Property view ${currentIndex + 1}`}
                  className={styles.lightboxImage}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                />
              </AnimatePresence>

              <div className={styles.lightboxCounter}>
                {currentIndex + 1} / {gallery.length}
              </div>

              {gallery.length > 1 && (
                <>
                  <button
                    className={`${styles.lightboxNav} ${styles.lightboxPrev}`}
                    onClick={goPrev}
                    aria-label="Previous"
                  >
                    <Icon icon="mdi:chevron-left" />
                  </button>
                  <button
                    className={`${styles.lightboxNav} ${styles.lightboxNext}`}
                    onClick={goNext}
                    aria-label="Next"
                  >
                    <Icon icon="mdi:chevron-right" />
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PropertyGallery;
