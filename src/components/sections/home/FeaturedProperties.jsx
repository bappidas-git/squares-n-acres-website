import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Icon } from '@iconify/react';
import { propertyService } from '../../../services/api';
import PropertyCard from '../../common/PropertyCard';
import styles from './FeaturedProperties.module.css';

const AUTO_SCROLL_SPEED = 0.5;
const PAUSE_AFTER_MANUAL = 3000;
const SCROLL_STEP_FACTOR = 0.85; // fraction of viewport to scroll per arrow click

const FeaturedProperties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const rafRef = useRef(null);
  const offsetRef = useRef(0);
  const isPausedRef = useRef(false);
  const pauseTimerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, scrollLeft: 0 });

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const data = await propertyService.getFeatured();
        // Safety filter: ensure only active, published properties are displayed
        setProperties(
          (Array.isArray(data) ? data : []).filter((p) => !!p.isActive && p.publishStatus !== 'draft')
        );
      } catch {
        setProperties([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, []);

  // Determine if auto-scroll is needed based on content vs viewport width
  const evaluateScrollNeed = useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    // In auto-scroll mode, track has duplicated items, so use half width
    // In static mode, track has original items only
    const contentWidth = shouldAutoScroll
      ? track.scrollWidth / 2
      : track.scrollWidth;
    const viewportWidth = viewport.clientWidth;

    const needsScroll = contentWidth > viewportWidth + 10; // 10px tolerance
    setShouldAutoScroll(needsScroll);

    // Update arrow visibility for non-auto-scroll mode
    if (!needsScroll) {
      setCanScrollLeft(viewport.scrollLeft > 5);
      setCanScrollRight(
        viewport.scrollLeft < viewport.scrollWidth - viewport.clientWidth - 5
      );
    }
  }, [shouldAutoScroll]);

  // Re-evaluate on resize
  useEffect(() => {
    if (properties.length === 0 || loading) return;

    // Initial evaluation after render
    const timer = setTimeout(evaluateScrollNeed, 50);

    const handleResize = () => evaluateScrollNeed();
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [properties, loading, evaluateScrollNeed]);

  // Auto-scroll animation loop (only when shouldAutoScroll is true)
  const startAutoScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const animate = () => {
      if (!isPausedRef.current) {
        offsetRef.current += AUTO_SCROLL_SPEED;
        const halfWidth = track.scrollWidth / 2;
        if (halfWidth > 0 && offsetRef.current >= halfWidth) {
          offsetRef.current -= halfWidth;
        }
        track.style.transform = `translateX(-${offsetRef.current}px)`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (properties.length > 0 && !loading && shouldAutoScroll) {
      offsetRef.current = 0;
      startAutoScroll();
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, [properties, loading, shouldAutoScroll, startAutoScroll]);

  // Scroll position tracking for manual mode arrows
  const updateScrollArrows = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || shouldAutoScroll) return;
    setCanScrollLeft(viewport.scrollLeft > 5);
    setCanScrollRight(
      viewport.scrollLeft < viewport.scrollWidth - viewport.clientWidth - 5
    );
  }, [shouldAutoScroll]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || shouldAutoScroll) return;

    viewport.addEventListener('scroll', updateScrollArrows, { passive: true });
    // initial check
    updateScrollArrows();

    return () => viewport.removeEventListener('scroll', updateScrollArrows);
  }, [shouldAutoScroll, updateScrollArrows, properties]);

  // === Interaction handlers ===

  const handleMouseEnter = () => {
    isPausedRef.current = true;
  };

  const handleMouseLeave = () => {
    if (!isDraggingRef.current) {
      isPausedRef.current = false;
    }
  };

  const handleTouchStart = () => {
    isPausedRef.current = true;
  };

  const handleTouchEnd = () => {
    if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => {
      isPausedRef.current = false;
    }, PAUSE_AFTER_MANUAL);
  };

  // Mouse drag for manual scrolling (non-auto-scroll mode)
  const handlePointerDown = (e) => {
    if (shouldAutoScroll) return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      scrollLeft: viewport.scrollLeft,
    };
    viewport.style.cursor = 'grabbing';
    viewport.style.scrollBehavior = 'auto';
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current || shouldAutoScroll) return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    const dx = e.clientX - dragStartRef.current.x;
    viewport.scrollLeft = dragStartRef.current.scrollLeft - dx;
  };

  const handlePointerUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.style.cursor = '';
      viewport.style.scrollBehavior = 'smooth';
    }
    isPausedRef.current = false;
  };

  // Arrow navigation
  const scrollByArrow = (direction) => {
    if (shouldAutoScroll) {
      // In auto-scroll mode, jump the offset
      isPausedRef.current = true;
      const viewport = viewportRef.current;
      if (!viewport) return;
      const step = viewport.clientWidth * SCROLL_STEP_FACTOR;
      offsetRef.current += direction === 'left' ? -step : step;

      // Keep within bounds for seamless loop
      const track = trackRef.current;
      if (track) {
        const halfWidth = track.scrollWidth / 2;
        if (offsetRef.current < 0) offsetRef.current += halfWidth;
        if (offsetRef.current >= halfWidth) offsetRef.current -= halfWidth;
        track.style.transform = `translateX(-${offsetRef.current}px)`;
      }

      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = setTimeout(() => {
        isPausedRef.current = false;
      }, PAUSE_AFTER_MANUAL);
    } else {
      // In static mode, scroll the viewport
      const viewport = viewportRef.current;
      if (!viewport) return;
      const step = viewport.clientWidth * SCROLL_STEP_FACTOR;
      viewport.scrollBy({
        left: direction === 'left' ? -step : step,
        behavior: 'smooth',
      });
    }
  };

  // Build display items
  const displayItems = shouldAutoScroll
    ? [...properties, ...properties]
    : properties;

  const showArrows = properties.length > 0 && !loading;
  const showLeftArrow = shouldAutoScroll || canScrollLeft;
  const showRightArrow = shouldAutoScroll || canScrollRight;

  return (
    <section className={styles.section} ref={ref}>
      <div className={styles.container}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <h2 className={styles.title}>Featured Properties</h2>
          <p className={styles.subtitle}>
            Explore our handpicked selection of premium properties
          </p>
        </motion.div>

        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
          </div>
        ) : properties.length > 0 ? (
          <motion.div
            className={styles.carouselWrapper}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Left Arrow */}
            {showArrows && showLeftArrow && (
              <button
                className={`${styles.arrowBtn} ${styles.arrowLeft}`}
                onClick={() => scrollByArrow('left')}
                aria-label="Scroll left"
              >
                <Icon icon="mdi:chevron-left" />
              </button>
            )}

            <div
              className={`${styles.carouselViewport} ${
                shouldAutoScroll ? styles.carouselViewportAuto : styles.carouselViewportManual
              }`}
              ref={viewportRef}
              onMouseEnter={shouldAutoScroll ? handleMouseEnter : undefined}
              onMouseLeave={shouldAutoScroll ? handleMouseLeave : undefined}
              onTouchStart={shouldAutoScroll ? handleTouchStart : undefined}
              onTouchEnd={shouldAutoScroll ? handleTouchEnd : undefined}
              onPointerDown={!shouldAutoScroll ? handlePointerDown : undefined}
              onPointerMove={!shouldAutoScroll ? handlePointerMove : undefined}
              onPointerUp={!shouldAutoScroll ? handlePointerUp : undefined}
              onPointerLeave={!shouldAutoScroll ? handlePointerUp : undefined}
            >
              <div className={styles.carouselTrack} ref={trackRef}>
                {displayItems.map((property, index) => (
                  <div
                    key={`${property.id}-${index}`}
                    className={styles.scrollItem}
                  >
                    <PropertyCard property={property} />
                  </div>
                ))}
              </div>
            </div>

            {/* Right Arrow */}
            {showArrows && showRightArrow && (
              <button
                className={`${styles.arrowBtn} ${styles.arrowRight}`}
                onClick={() => scrollByArrow('right')}
                aria-label="Scroll right"
              >
                <Icon icon="mdi:chevron-right" />
              </button>
            )}
          </motion.div>
        ) : (
          <div className={styles.emptyState}>
            <Icon icon="mdi:home-search-outline" className={styles.emptyIcon} />
            <p className={styles.emptyText}>
              No featured properties available at this time.
            </p>
          </div>
        )}

        <div className={styles.cta}>
          <Link to="/properties" className={styles.ctaBtn}>
            View All Properties
            <Icon icon="mdi:arrow-right" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProperties;
