import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { Icon } from '@iconify/react';
import { Link, useNavigate } from 'react-router-dom';

import PATHS from '../../../routes/paths';
import propertyService from '../../../services/propertyService';
import styles from './HeroSection.module.css';
import useBreakpoint from '../../../hooks/useBreakpoint';
import useDebounce from '../../../hooks/useDebounce';
import { formatPrice } from '../../../utils/format';
import { isCanceled } from '../../../services/apiError';
import { useSiteSettings } from '../../../contexts/SiteSettingsContext';

/**
 * The home hero: copy and media from `siteSettings.hero`, type-ahead from
 * `GET /properties/suggestions`.
 *
 * The suggestions endpoint answers four groups — localities, properties,
 * property types and developers (§5.14) — so the dropdown offers a locality
 * page or a type listing, not only individual properties as before (BUG-18).
 */

const FALLBACK_BG = 'var(--color-charcoal)';
const MIN_QUERY = 2;

/** The dropdown groups, in the order they are shown. */
const GROUPS = [
  {
    key: 'localities',
    label: 'Localities',
    icon: 'mdi:map-marker-outline',
    to: (row) => PATHS.locality(row.slug),
    primary: (row) => row.name,
    secondary: (row) =>
      row.propertyCount
        ? `${row.propertyCount} propert${row.propertyCount === 1 ? 'y' : 'ies'}`
        : '',
  },
  {
    key: 'properties',
    label: 'Properties',
    icon: 'mdi:home-outline',
    to: (row) => PATHS.propertyDetails(row.slug),
    primary: (row) => row.title,
    secondary: (row) => row.localityName || '',
    trailing: (row) => (row.price ? formatPrice(row.price) : ''),
  },
  {
    key: 'propertyTypes',
    label: 'Property types',
    icon: 'mdi:home-city-outline',
    to: (row) => `${PATHS.properties}?propertyTypeSlug=${encodeURIComponent(row.slug)}`,
    primary: (row) => row.name,
    secondary: () => '',
  },
  {
    key: 'developers',
    label: 'Developers',
    icon: 'mdi:domain',
    to: (row) => PATHS.builder(row.slug),
    primary: (row) => row.name,
    secondary: () => '',
  },
];

/** The groups that actually returned something, flattened for keyboard use. */
const flatten = (suggestions) =>
  GROUPS.flatMap((group) =>
    (suggestions?.[group.key] ?? []).map((row) => ({ group, row, to: group.to(row) }))
  );

const HeroSection = () => {
  const { settings } = useSiteSettings();
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [mediaError, setMediaError] = useState(false);

  const wrapperRef = useRef(null);
  const debounced = useDebounce(query.trim(), 300);

  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 600], [0, 150]);

  const hero = settings?.hero ?? {};
  const title = hero.title || 'Find your next home in Bengaluru';
  const subtitle = hero.subtitle || '';
  const imageUrl =
    (isMobile ? hero.mobileImageUrl : hero.backgroundImageUrl) || hero.backgroundImageUrl || '';
  const videoUrl = hero.backgroundVideoUrl || '';

  useEffect(() => {
    if (debounced.length < MIN_QUERY) {
      setSuggestions(null);
      setOpen(false);
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);

    propertyService
      .suggestions(debounced, { signal: controller.signal })
      .then(({ data }) => {
        setSuggestions(data ?? null);
        setOpen(true);
        setHighlight(-1);
        setLoading(false);
      })
      .catch((error) => {
        if (isCanceled(error)) return;
        setSuggestions(null);
        setLoading(false);
      });

    return () => controller.abort();
  }, [debounced]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const options = flatten(suggestions);

  const go = useCallback(
    (to) => {
      setOpen(false);
      setQuery('');
      navigate(to);
    },
    [navigate]
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    setOpen(false);
    const trimmed = query.trim();
    navigate(trimmed ? `${PATHS.properties}?q=${encodeURIComponent(trimmed)}` : PATHS.properties);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!open || options.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((index) => (index < options.length - 1 ? index + 1 : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((index) => (index > 0 ? index - 1 : options.length - 1));
    } else if (event.key === 'Enter' && highlight >= 0) {
      event.preventDefault();
      go(options[highlight].to);
    }
  };

  let optionIndex = -1;

  return (
    <section className={styles.hero}>
      <div className={styles.bgClip}>
        {videoUrl && !mediaError ? (
          <motion.div className={styles.bgVideoWrapper} style={{ y: bgY }}>
            <video
              className={styles.bgVideo}
              src={videoUrl}
              poster={imageUrl || undefined}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              onError={() => setMediaError(true)}
            />
          </motion.div>
        ) : (
          <motion.div
            className={styles.bgImage}
            style={{
              y: bgY,
              backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
              backgroundColor: imageUrl ? undefined : FALLBACK_BG,
            }}
          />
        )}

        <div className={styles.overlay} />
      </div>

      <div className={styles.content}>
        <motion.h1
          className={styles.heading}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          {title}
        </motion.h1>

        {subtitle ? (
          <motion.p
            className={styles.subtitle}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
          >
            {subtitle}
          </motion.p>
        ) : null}

        <motion.div
          className={styles.searchContainer}
          ref={wrapperRef}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: 'easeOut' }}
        >
          <form className={styles.searchBar} onSubmit={handleSubmit}>
            <div className={styles.searchInputWrapper}>
              <Icon icon="mdi:magnify" className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search by project, locality or developer"
                className={styles.searchInput}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => {
                  if (options.length > 0) setOpen(true);
                }}
                onKeyDown={handleKeyDown}
                aria-label="Search properties"
                autoComplete="off"
                role="combobox"
                aria-expanded={open}
                aria-controls="hero-search-suggestions"
                aria-haspopup="listbox"
              />
              {loading ? <div className={styles.searchSpinner} /> : null}
            </div>
            <button type="submit" className={styles.searchBtn}>
              <Icon icon="mdi:magnify" className={styles.searchBtnIcon} />
              Search
            </button>
          </form>

          <AnimatePresence>
            {open && debounced.length >= MIN_QUERY ? (
              <motion.ul
                id="hero-search-suggestions"
                className={styles.suggestions}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                role="listbox"
              >
                {GROUPS.map((group) => {
                  const rows = suggestions?.[group.key] ?? [];
                  if (rows.length === 0) return null;

                  return (
                    <React.Fragment key={group.key}>
                      <li className={styles.suggestionGroup} role="presentation">
                        {group.label}
                      </li>
                      {rows.map((row) => {
                        optionIndex += 1;
                        const index = optionIndex;
                        const trailing = group.trailing?.(row);
                        const secondary = group.secondary(row);

                        return (
                          <li
                            key={`${group.key}-${row.id}`}
                            className={`${styles.suggestionItem} ${
                              highlight === index ? styles.suggestionHighlight : ''
                            }`}
                            onClick={() => go(group.to(row))}
                            onMouseEnter={() => setHighlight(index)}
                            role="option"
                            aria-selected={highlight === index}
                          >
                            <div className={styles.suggestionMain}>
                              <Icon icon={group.icon} className={styles.suggestionIcon} />
                              <div className={styles.suggestionText}>
                                <span className={styles.suggestionTitle}>{group.primary(row)}</span>
                                {secondary ? (
                                  <span className={styles.suggestionLocation}>{secondary}</span>
                                ) : null}
                              </div>
                            </div>
                            {trailing ? (
                              <span className={styles.suggestionPrice}>{trailing}</span>
                            ) : null}
                          </li>
                        );
                      })}
                    </React.Fragment>
                  );
                })}

                <li className={styles.suggestionFooter}>
                  <Link
                    to={`${PATHS.properties}?q=${encodeURIComponent(debounced)}`}
                    className={styles.suggestionViewAll}
                    onClick={() => setOpen(false)}
                  >
                    {options.length > 0
                      ? 'View all results'
                      : `Search all properties for “${debounced}”`}
                    <Icon icon="mdi:arrow-right" />
                  </Link>
                </li>
              </motion.ul>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
