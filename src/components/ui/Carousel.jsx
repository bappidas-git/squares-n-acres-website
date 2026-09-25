import { Children, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import useBreakpoint from '../../hooks/useBreakpoint';
import { prefersReducedMotion } from '../../utils/motion';

import IconButton from './IconButton';
import styles from './Carousel.module.css';

const DEFAULT_ITEMS_PER_VIEW = { xs: 1.15, sm: 2, md: 3, lg: 4 };

/**
 * The most dots a row holds at each width before a counter replaces it.
 *
 * Below 900 px a dot's hit area is 44 px (§8.1) and the row does not wrap, so
 * past eight on a phone the dots shrank to fit — a featured row of 24 cards
 * would have drawn 24 targets of 15 px, the active one wider than its own
 * button. "3 / 24" says the same thing in one line (QA-62).
 */
const MAX_DOTS = { xs: 8, sm: 12, md: 12, lg: 12 };

/**
 * A scroll-snap carousel — the replacement for `react-slick` (D2).
 *
 * Scrolling is native (touch, trackpad, scrollbar), so it keeps working without
 * JavaScript state; the arrows and dots drive `scrollTo`. Arrows and dots hide
 * when everything already fits, arrow keys move by one page, and autoplay
 * pauses on hover, on focus and under `prefers-reduced-motion`.
 *
 * An autoplaying carousel also offers a pause button, because hovering is not
 * a gesture every visitor has and WCAG 2.2.2 asks for a way to stop moving
 * content that a keyboard can reach.
 *
 * @param {object} props
 * @param {{ xs?: number, sm?: number, md?: number, lg?: number }} [props.itemsPerView]
 * @param {boolean} [props.autoplay]
 * @param {number} [props.interval] autoplay interval in ms
 * @param {boolean} [props.loop] autoplay wraps around at the end
 * @param {boolean} [props.dots]
 * @param {boolean} [props.arrows]
 * @param {string} [props.label] accessible name of the carousel region
 */
export default function Carousel({
  itemsPerView = DEFAULT_ITEMS_PER_VIEW,
  autoplay = false,
  interval = 5000,
  loop = true,
  dots = true,
  arrows = true,
  label = 'Carousel',
  gap,
  className = '',
  children,
  ...rest
}) {
  const viewportRef = useRef(null);
  const { width } = useBreakpoint();
  const items = useMemo(() => Children.toArray(children).filter(Boolean), [children]);

  const [page, setPage] = useState(0);
  const [scrollable, setScrollable] = useState(false);
  const [measuredPages, setMeasuredPages] = useState(null);
  const [paused, setPaused] = useState(false);
  // Hover and focus pause it while they last; this one is the visitor saying
  // "stop", and it outlives both.
  const [stopped, setStopped] = useState(false);

  const perView = itemsPerView[width] ?? itemsPerView.md ?? DEFAULT_ITEMS_PER_VIEW.md ?? 1;
  // The pages a scroll can actually reach, once the rail has been measured. A
  // phone shows 1.15 cards a page, so "one card, one page" counted pages past
  // the end of the rail: the last dot never lit, whatever the visitor did.
  const pages = measuredPages ?? Math.max(1, Math.ceil(items.length / Math.floor(perView || 1)));

  const measure = useCallback(() => {
    const node = viewportRef.current;
    if (!node) return;
    const overflow = node.scrollWidth - node.clientWidth;
    setScrollable(overflow > 4);
    if (node.clientWidth > 0) {
      setPage(Math.round(node.scrollLeft / node.clientWidth));
      setMeasuredPages(Math.round(Math.max(overflow, 0) / node.clientWidth) + 1);
    } else {
      setPage(0);
      setMeasuredPages(null);
    }
  }, []);

  useEffect(() => {
    measure();
    const node = viewportRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [measure, items.length]);

  const goTo = useCallback((index) => {
    const node = viewportRef.current;
    if (!node) return;
    node.scrollTo({
      left: index * node.clientWidth,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }, []);

  const move = useCallback(
    (delta) => {
      const node = viewportRef.current;
      if (!node) return;
      const next = Math.min(Math.max(page + delta, 0), pages - 1);
      goTo(next);
    },
    [goTo, page, pages]
  );

  useEffect(() => {
    if (!autoplay || paused || stopped || !scrollable || prefersReducedMotion()) return undefined;
    const timer = setInterval(() => {
      const next = page + 1;
      if (next >= pages) {
        if (!loop) return;
        goTo(0);
      } else {
        goTo(next);
      }
    }, interval);
    return () => clearInterval(timer);
  }, [autoplay, paused, stopped, scrollable, page, pages, loop, interval, goTo]);

  const onKeyDown = (event) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      move(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      move(-1);
    }
  };

  if (!items.length) return null;

  const showControls = scrollable && items.length > 1;
  const showPause = autoplay && showControls && !prefersReducedMotion();

  return (
    <div
      className={[styles.carousel, className].filter(Boolean).join(' ')}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      {...rest}
    >
      {arrows && showControls ? (
        <IconButton
          label="Previous"
          round
          className={[styles.arrow, styles.prev].join(' ')}
          onClick={() => move(-1)}
          disabled={page <= 0}
        >
          &lsaquo;
        </IconButton>
      ) : null}

      <div
        ref={viewportRef}
        className={styles.viewport}
        style={{
          '--item-width': `calc((100% - (${Math.max(Math.ceil(perView) - 1, 0)} * var(--gap, var(--space-5)))) / ${perView})`,
          ...(gap ? { '--gap': gap } : null),
        }}
        tabIndex={0}
        onScroll={measure}
        onKeyDown={onKeyDown}
      >
        {items.map((item, index) => (
          <div
            // `Children.toArray` has already given every child a stable key.
            key={item.key ?? index}
            className={styles.item}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${items.length}`}
          >
            {item}
          </div>
        ))}
      </div>

      {arrows && showControls ? (
        <IconButton
          label="Next"
          round
          className={[styles.arrow, styles.next].join(' ')}
          onClick={() => move(1)}
          disabled={page >= pages - 1}
        >
          &rsaquo;
        </IconButton>
      ) : null}

      {showPause ? (
        <button
          type="button"
          className={styles.pause}
          onClick={() => setStopped((previous) => !previous)}
        >
          {stopped ? 'Play' : 'Pause'}
        </button>
      ) : null}

      {dots && showControls && pages > (MAX_DOTS[width] ?? MAX_DOTS.md) ? (
        <p className={styles.counter} aria-hidden="true">
          {Math.min(page + 1, pages)} / {pages}
        </p>
      ) : dots && showControls && pages > 1 ? (
        <div className={styles.dots}>
          {Array.from({ length: pages }, (_, index) => (
            <button
              key={index}
              type="button"
              className={styles.dotHit}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === page ? 'true' : undefined}
              onClick={() => goTo(index)}
            >
              <span
                className={[styles.dot, index === page ? styles.dotActive : '']
                  .filter(Boolean)
                  .join(' ')}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
