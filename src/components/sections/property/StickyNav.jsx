import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import styles from './StickyNav.module.css';

const ALL_NAV_ITEMS = [
  { label: 'Overview', targetId: 'overview' },
  { label: 'Details', targetId: 'specifications' },
  { label: 'Highlights', targetId: 'specialities' },
  { label: 'Amenities', targetId: 'amenities' },
  { label: 'Floor Plans & Pricing', targetId: 'floor-plans' },
  { label: 'Finance', targetId: 'finance' },
  { label: 'Location', targetId: 'nearby' },
  { label: 'Documents', targetId: 'documents' },
  { label: 'Construction', targetId: 'construction-specs' },
  { label: 'Developer', targetId: 'builder' },
  { label: 'FAQs', targetId: 'faqs' },
  { label: 'Similar', targetId: 'similar' },
];

const StickyNav = ({ visibleSections }) => {
  const navItems = useMemo(() => {
    if (!visibleSections) return ALL_NAV_ITEMS;
    return ALL_NAV_ITEMS.filter((item) => visibleSections.includes(item.targetId));
  }, [visibleSections]);
  const [visible, setVisible] = useState(false);
  const [activeId, setActiveId] = useState('');
  const listRef = useRef(null);
  const itemRefs = useRef({});

  // Combined scroll handler: show/hide + scroll spy
  useEffect(() => {
    const sectionIds = navItems.map((item) => item.targetId);
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const headerHeight = window.innerWidth <= 960 ? 60 : 72;
        const navHeight = 48;
        const offset = headerHeight + navHeight + 32;

        // Show/hide: visible when overview section top is at or above header bottom
        const overviewEl = document.getElementById('overview');
        if (overviewEl) {
          const overviewRect = overviewEl.getBoundingClientRect();
          setVisible(overviewRect.top <= headerHeight);
        }

        // Scroll spy: find the last section whose top is above the offset line
        let current = '';
        for (const id of sectionIds) {
          const el = document.getElementById(id);
          if (!el) continue;
          if (el.getBoundingClientRect().top <= offset) {
            current = id;
          }
        }
        if (current) setActiveId(current);

        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [navItems]);

  // Auto-scroll the nav list to keep active item visible
  useEffect(() => {
    const activeEl = itemRefs.current[activeId];
    if (activeEl && listRef.current) {
      const list = listRef.current;
      const listRect = list.getBoundingClientRect();
      const itemRect = activeEl.getBoundingClientRect();

      if (itemRect.left < listRect.left || itemRect.right > listRect.right) {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest',
        });
      }
    }
  }, [activeId]);

  const handleClick = useCallback((e, targetId) => {
    e.preventDefault();
    const el = document.getElementById(targetId);
    if (!el) return;

    const headerHeight = window.innerWidth <= 960 ? 60 : 72;
    const navHeight = 48;
    const gap = 16;
    const offset = headerHeight + navHeight + gap;

    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  }, []);

  const handleKeyDown = useCallback(
    (e) => {
      const items = navItems.map((item) => itemRefs.current[item.targetId]).filter(Boolean);
      const currentIndex = items.indexOf(e.currentTarget);
      let nextIndex;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        nextIndex = (currentIndex + 1) % items.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        nextIndex = (currentIndex - 1 + items.length) % items.length;
      } else if (e.key === 'Home') {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        nextIndex = items.length - 1;
      }

      if (nextIndex !== undefined && items[nextIndex]) {
        items[nextIndex].focus();
      }
    },
    []
  );

  return (
    <nav
      className={`${styles.stickyNav} ${visible ? styles.visible : ''}`}
      role="navigation"
      aria-label="Property sections"
    >
      <div className={styles.navInner}>
        <ul className={styles.navList} ref={listRef} role="tablist" aria-label="Sections">
          {navItems.map((item) => (
            <li key={item.targetId} role="presentation">
              <a
                href={`#${item.targetId}`}
                role="tab"
                aria-selected={activeId === item.targetId}
                className={`${styles.navItem} ${activeId === item.targetId ? styles.active : ''}`}
                onClick={(e) => handleClick(e, item.targetId)}
                onKeyDown={handleKeyDown}
                ref={(el) => {
                  itemRefs.current[item.targetId] = el;
                }}
                tabIndex={visible ? (activeId === item.targetId ? 0 : -1) : -1}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default StickyNav;
