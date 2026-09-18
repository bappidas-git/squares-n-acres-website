import { useCallback, useEffect, useRef, useState } from 'react';

import { prefersReducedMotion } from '../../../utils/motion';

import styles from './SectionNav.module.css';

/** `#section-amenities` — the id the page gives each section wrapper. */
export const sectionElementId = (key) => `section-${key}`;

/** The breathing space between the sticky chips and the section they scroll to. */
const SCROLL_GAP = 12;

/**
 * How far below the landing position the scroll-spy's band begins.
 *
 * A clicked section lands its top edge at `offset + SCROLL_GAP`. If the band
 * started there too, the section *above* would still be clipping it by a pixel
 * and would win the "topmost visible" rule, so the chip would light up one
 * section behind the click. Starting the band below the landing point puts the
 * previous section out of it for good.
 */
const SPY_GAP = SCROLL_GAP + 20;

/**
 * The property page's own navigation: one chip per section the listing
 * actually shows.
 *
 * It is built from `getVisibleSections()`, which is the same rule the admin's
 * section-visibility tab reads, so a chip can never point at a section the
 * editor switched off or at one the listing has no data for (BUG-06 — the
 * boilerplate's `StickyNav` carried a hardcoded list and one broken anchor).
 *
 * The highlighted chip follows an `IntersectionObserver` over the section
 * elements rather than a scroll handler, and a click scrolls with the header's
 * height as the offset — smoothly, unless the visitor asked for less motion.
 *
 * @param {object} props
 * @param {Array<{key: string, label: string}>} props.sections a memoised array
 *   — a new identity re-subscribes the observer
 * @param {number} [props.offset] the height of the chrome above the strip, for
 *   the scroll arithmetic; the strip itself sticks to `--header-height`, so a
 *   resize across the 900px switch cannot leave it in the wrong place
 */
export default function SectionNav({ sections = [], offset = 0 }) {
  const [active, setActive] = useState(sections[0]?.key ?? null);
  const listRef = useRef(null);

  useEffect(() => {
    if (sections.length === 0) return undefined;
    if (typeof IntersectionObserver === 'undefined') return undefined;

    const elements = sections
      .map((section) => document.getElementById(sectionElementId(section.key)))
      .filter(Boolean);
    if (elements.length === 0) return undefined;

    const visible = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.intersectionRatio);
          else visible.delete(entry.target.id);
        });

        // The topmost section still on screen wins, so scrolling past a short
        // section does not make the chip jump back and forth.
        const first = elements.find((element) => visible.has(element.id));
        if (first) setActive(first.id.replace(/^section-/, ''));
      },
      { rootMargin: `-${Math.round(offset) + SPY_GAP}px 0px -55% 0px`, threshold: [0, 0.01, 0.25] }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [sections, offset]);

  // Keep the active chip inside the scrollable strip on a phone.
  //
  // By moving the strip's own `scrollLeft`, never `chip.scrollIntoView()`:
  // `scrollIntoView` scrolls *every* scrollable ancestor including the
  // document, so on load — when the strip is still below the fold and the
  // effect runs once for the first section — it jumped the visitor 1 300px
  // down the page, past the gallery, the price and the `<h1>` (found by
  // `npm run a11y:audit`, which reported the heading as scrolled out of view).
  useEffect(() => {
    const list = listRef.current;
    if (!active || !list) return;
    const chip = list.querySelector(`[data-section="${active}"]`);
    if (!chip || typeof list.scrollTo !== 'function') return;

    const centred = chip.offsetLeft - (list.clientWidth - chip.offsetWidth) / 2;
    const furthest = Math.max(0, list.scrollWidth - list.clientWidth);
    list.scrollTo({
      left: Math.min(Math.max(centred, 0), furthest),
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }, [active]);

  const onClick = useCallback(
    (event, key) => {
      const target = document.getElementById(sectionElementId(key));
      if (!target) return;

      event.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - offset - SCROLL_GAP;
      window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      setActive(key);
      // The anchor stays in the address bar so the position is shareable.
      window.history.replaceState(null, '', `#${sectionElementId(key)}`);
    },
    [offset]
  );

  if (sections.length === 0) return null;

  return (
    <nav className={styles.nav} aria-label="Sections of this property">
      <ul className={styles.list} ref={listRef}>
        {sections.map((section) => (
          <li key={section.key}>
            <a
              href={`#${sectionElementId(section.key)}`}
              data-section={section.key}
              className={`${styles.chip} ${active === section.key ? styles.active : ''}`}
              aria-current={active === section.key ? 'true' : undefined}
              onClick={(event) => onClick(event, section.key)}
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
