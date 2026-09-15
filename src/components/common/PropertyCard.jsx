import React, { useState, useCallback, useRef, memo } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { useMediaQuery, useTheme } from '@mui/material';
import styles from './PropertyCard.module.css';
import { TAG_OPTIONS } from '../../pages/admin/property-tabs/constants';

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov'];

const isVideoUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return VIDEO_EXTENSIONS.some((ext) => pathname.endsWith(ext));
  } catch {
    return VIDEO_EXTENSIONS.some((ext) => url.toLowerCase().includes(ext));
  }
};

const tagMap = TAG_OPTIONS.reduce((acc, t) => {
  acc[t.value] = t;
  return acc;
}, {});

const formatPrice = (price, unit) => {
  if (price == null || isNaN(Number(price))) return 'Price on Request';
  const numPrice = Number(price);
  if (unit === 'per month') {
    return `₹${numPrice.toLocaleString('en-IN')}/mo`;
  }
  if (numPrice >= 10000000) {
    return `₹${(numPrice / 10000000).toFixed(2)} Cr`;
  }
  if (numPrice >= 100000) {
    return `₹${(numPrice / 100000).toFixed(2)} L`;
  }
  return `₹${numPrice.toLocaleString('en-IN')}`;
};

const SWIPE_THRESHOLD = 80;

const PropertyCard = memo(({ property }) => {
  const [currentImg, setCurrentImg] = useState(0);
  const [liked, setLiked] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [swipeAction, setSwipeAction] = useState(null); // 'enquire' | 'share'
  const videoRef = useRef(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const dragX = useMotionValue(0);
  const swipeBgOpacity = useTransform(dragX, [-120, -60, 0, 60, 120], [1, 0.6, 0, 0.6, 1]);

  const handleShare = useCallback(() => {
    if (!property) return;
    if (navigator.share) {
      navigator.share({
        title: property.title,
        url: `${window.location.origin}/properties/${property.slug}`,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(
        `${window.location.origin}/properties/${property.slug}`
      );
    }
    setSwipeAction(null);
  }, [property]);

  const handleDragEnd = useCallback((_, info) => {
    if (info.offset.x < -SWIPE_THRESHOLD) {
      setSwipeAction('enquire');
      // Auto-dismiss after 2s
      setTimeout(() => setSwipeAction(null), 2000);
    } else if (info.offset.x > SWIPE_THRESHOLD) {
      handleShare();
    }
  }, [handleShare]);

  if (!property) return null;

  // Use API gallery images only — no external placeholder fallback
  const images = property.gallery?.length ? property.gallery : [];

  const badge = property.type === 'rent' ? 'For Rent' : 'For Sale';
  const badgeClass = property.type === 'rent' ? styles.badgeRent : styles.badgeSale;

  const handlePrev = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImg((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImg((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleLike = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setLiked(!liked);
  };

  const currentMediaUrl = images[currentImg];
  const currentIsVideo = isVideoUrl(currentMediaUrl);

  const cardContent = (
    <>
      <div className={styles.imageWrapper}>
        {/* Render video or image based on media type; gradient fallback when no gallery */}
        {!currentMediaUrl ? (
          <div className={styles.imagePlaceholder} style={{ background: 'linear-gradient(135deg, #1B2A4A 0%, #2D4470 100%)' }} />
        ) : currentIsVideo ? (
          <video
            ref={videoRef}
            src={currentMediaUrl}
            className={styles.image}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            onLoadedData={() => setImageLoaded(true)}
          />
        ) : (
          <img
            src={currentMediaUrl}
            alt={property.title}
            className={styles.image}
            loading="lazy"
            style={{
              opacity: imageLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
            onLoad={() => setImageLoaded(true)}
          />
        )}
        {!imageLoaded && !currentIsVideo && <div className={styles.imagePlaceholder} />}

        <span className={`${styles.badge} ${badgeClass}`}>{badge}</span>

        {property.tags?.length > 0 && (
          <div className={styles.tagStrip}>
            {property.tags.slice(0, 2).map((tagVal) => {
              const tag = tagMap[tagVal];
              if (!tag) return null;
              return (
                <span
                  key={tagVal}
                  className={styles.tag}
                  style={{ background: tag.bg, color: tag.color, borderColor: tag.color }}
                >
                  <Icon icon={tag.icon} style={{ fontSize: 12 }} />
                  {tag.label}
                </span>
              );
            })}
          </div>
        )}

        <button
          className={styles.heartBtn}
          onClick={handleLike}
          aria-label={liked ? 'Remove from favourites' : 'Add to favourites'}
        >
          <Icon
            icon={liked ? 'mdi:heart' : 'mdi:heart-outline'}
            className={liked ? styles.heartFilled : styles.heartEmpty}
          />
        </button>

        {images.length > 1 && (
          <>
            <button className={`${styles.navBtn} ${styles.navPrev}`} onClick={handlePrev} aria-label="Previous image">
              <Icon icon="mdi:chevron-left" />
            </button>
            <button className={`${styles.navBtn} ${styles.navNext}`} onClick={handleNext} aria-label="Next image">
              <Icon icon="mdi:chevron-right" />
            </button>
            <div className={styles.dots}>
              {images.map((_, idx) => (
                <span
                  key={idx}
                  className={`${styles.dot} ${idx === currentImg ? styles.dotActive : ''}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className={styles.body}>
        <Link to={`/properties/${property.slug}`} className={styles.name}>
          {property.title}
        </Link>

        <div className={styles.price}>
          {formatPrice(property.price, property.priceUnit || property.price_unit)}{' '}
          <span className={styles.priceUnit}>{property.priceUnit || property.price_unit}</span>
        </div>

        <div className={styles.location}>
          <Icon icon="mdi:map-marker-outline" className={styles.locIcon} />
          <span>{[property.location?.area || property.location_area, property.location?.city || property.location_city].filter(Boolean).join(', ') || '—'}</span>
        </div>

        <div className={styles.detailsGrid}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Configuration</span>
            <span className={styles.detailValue}>
              {property.configuration?.join(', ') || '—'}
            </span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Area</span>
            <span className={styles.detailValue}>
              {property.dimensionRange
                ? `${property.dimensionRange.min} - ${property.dimensionRange.max} ${property.dimensionRange.unit}`
                : (property.dimension_min ? `${property.dimension_min} - ${property.dimension_max} ${property.dimension_unit || 'sqft'}` : '—')}
            </span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Possession</span>
            <span className={styles.detailValue}>{property.possession || '—'}</span>
          </div>
        </div>
      </div>
    </>
  );

  // On mobile, wrap with swipe gesture support
  if (isMobile) {
    return (
      <div className={styles.swipeContainer}>
        {/* Swipe background indicators */}
        <motion.div className={styles.swipeBg} style={{ opacity: swipeBgOpacity }}>
          <div className={styles.swipeLeft}>
            <Icon icon="mdi:message-text-outline" />
            <span>Enquire</span>
          </div>
          <div className={styles.swipeRight}>
            <Icon icon="mdi:share-variant" />
            <span>Share</span>
          </div>
        </motion.div>

        <motion.div
          className={styles.card}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.3}
          onDragEnd={handleDragEnd}
          style={{ x: dragX }}
          whileTap={{ scale: 0.98 }}
        >
          {cardContent}
        </motion.div>

        {/* Swipe action toast */}
        <AnimatePresence>
          {swipeAction === 'enquire' && (
            <motion.div
              className={styles.swipeToast}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <Link
                to={`/properties/${property.slug}`}
                className={styles.swipeToastLink}
                onClick={() => setSwipeAction(null)}
              >
                <Icon icon="mdi:message-text-outline" /> Enquire Now
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return <div className={styles.card}>{cardContent}</div>;
});

PropertyCard.displayName = 'PropertyCard';

export default PropertyCard;
