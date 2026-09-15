import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import { siteSettingsService, propertyService } from '../../../services/api';
import useDebounce from '../../../hooks/useDebounce';
import styles from './HeroSection.module.css';

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov'];

const isVideoUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    const pathname = new URL(url, window.location.origin).pathname.toLowerCase();
    return VIDEO_EXTENSIONS.some((ext) => pathname.endsWith(ext));
  } catch {
    const lower = url.toLowerCase();
    return VIDEO_EXTENSIONS.some((ext) => lower.includes(ext));
  }
};

const FALLBACK_BG = '#1B2A4A';
const MAX_SUGGESTIONS = 5;

const formatPrice = (price) => {
  if (price == null || isNaN(Number(price))) return '';
  const num = Number(price);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  return `₹${num.toLocaleString('en-IN')}`;
};

const HeroSection = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [heroData, setHeroData] = useState(null);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const videoRef = useRef(null);
  const searchWrapperRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const debouncedQuery = useDebounce(searchQuery, 300);

  // Subtle parallax on hero background
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 600], [0, 150]);

  useEffect(() => {
    const fetchHeroData = async () => {
      try {
        const settings = await siteSettingsService.get();
        setHeroData(settings?.heroText || null);
      } catch {
        setHeroData(null);
      }
    };
    fetchHeroData();
  }, []);

  // Fetch suggestions when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    let cancelled = false;

    const fetchSuggestions = async () => {
      setSuggestionsLoading(true);
      try {
        const data = await propertyService.search(debouncedQuery.trim());
        if (cancelled) return;

        const results = (Array.isArray(data) ? data : [])
          .filter((p) => !!p.isActive && p.publishStatus !== 'draft')
          .slice(0, MAX_SUGGESTIONS);

        setSuggestions(results);
        setShowSuggestions(true);
        setHighlightIndex(-1);
      } catch {
        if (!cancelled) {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    };

    fetchSuggestions();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = useCallback(
    (e) => {
      e.preventDefault();
      setShowSuggestions(false);

      const trimmed = searchQuery.trim();
      if (trimmed) {
        navigate(`/properties?q=${encodeURIComponent(trimmed)}`);
      } else {
        // No query — navigate to listing without filters
        navigate('/properties');
      }
    },
    [searchQuery, navigate]
  );

  const handleSuggestionClick = (property) => {
    setShowSuggestions(false);
    setSearchQuery('');
    navigate(`/properties/${property.slug}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      return;
    }

    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[highlightIndex]);
    }
  };

  const handleInputFocus = () => {
    if (searchQuery.trim().length >= 2 && !suggestionsLoading) {
      setShowSuggestions(true);
    }
  };

  // Determine media URL: prefer backgroundMedia, fall back to backgroundImage
  const mediaUrl = heroData?.backgroundMedia || heroData?.backgroundImage || '';
  const isVideo = isVideoUrl(mediaUrl);

  const title = heroData?.title || 'Find Your Dream Home';
  const subtitle =
    heroData?.subtitle ||
    'Discover the perfect property from our exclusive collection';

  const handleMediaLoad = () => setMediaLoaded(true);
  const handleMediaError = () => {
    setMediaError(true);
    setMediaLoaded(true);
  };

  return (
    <section className={styles.hero}>
      {/* Background clip wrapper — clips parallax overflow without hiding suggestions */}
      <div className={styles.bgClip}>
        {/* Background Media Layer */}
        {isVideo && mediaUrl && !mediaError ? (
          <motion.div className={styles.bgVideoWrapper} style={{ y: bgY }}>
            <video
              ref={videoRef}
              className={styles.bgVideo}
              src={mediaUrl}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              onLoadedData={handleMediaLoad}
              onError={handleMediaError}
            />
          </motion.div>
        ) : (
          <motion.div
            className={styles.bgImage}
            style={{
              y: bgY,
              backgroundImage:
                mediaUrl && !mediaError ? `url(${mediaUrl})` : 'none',
              backgroundColor: !mediaUrl || mediaError ? FALLBACK_BG : undefined,
            }}
          >
            {mediaUrl && !mediaError && !mediaLoaded && (
              <img
                src={mediaUrl}
                alt=""
                style={{ display: 'none' }}
                onLoad={handleMediaLoad}
                onError={handleMediaError}
              />
            )}
          </motion.div>
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

        <motion.p
          className={styles.subtitle}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
        >
          {subtitle}
        </motion.p>

        <motion.div
          className={styles.searchContainer}
          ref={searchWrapperRef}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: 'easeOut' }}
        >
          <form className={styles.searchBar} onSubmit={handleSearch}>
            <div className={styles.searchInputWrapper}>
              <Icon icon="mdi:magnify" className={styles.searchIcon} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search by property name, area, or city..."
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={handleInputFocus}
                onKeyDown={handleKeyDown}
                aria-label="Search properties"
                autoComplete="off"
                role="combobox"
                aria-expanded={showSuggestions}
                aria-haspopup="listbox"
              />
              {suggestionsLoading && (
                <div className={styles.searchSpinner} />
              )}
            </div>
            <button type="submit" className={styles.searchBtn}>
              <Icon icon="mdi:magnify" className={styles.searchBtnIcon} />
              Search
            </button>
          </form>

          {/* Suggestions Dropdown */}
          <AnimatePresence>
            {showSuggestions && searchQuery.trim().length >= 2 && (
              <motion.ul
                className={styles.suggestions}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                role="listbox"
              >
                {suggestions.map((property, idx) => (
                  <li
                    key={property.id}
                    className={`${styles.suggestionItem} ${
                      highlightIndex === idx ? styles.suggestionHighlight : ''
                    }`}
                    onClick={() => handleSuggestionClick(property)}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    role="option"
                    aria-selected={highlightIndex === idx}
                  >
                    <div className={styles.suggestionMain}>
                      <Icon
                        icon="mdi:home-outline"
                        className={styles.suggestionIcon}
                      />
                      <div className={styles.suggestionText}>
                        <span className={styles.suggestionTitle}>
                          {property.title}
                        </span>
                        <span className={styles.suggestionLocation}>
                          {[property.location?.area, property.location?.city]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </div>
                    </div>
                    {property.price && (
                      <span className={styles.suggestionPrice}>
                        {formatPrice(property.price)}
                      </span>
                    )}
                  </li>
                ))}
                <li className={styles.suggestionFooter}>
                  <Link
                    to={`/properties?q=${encodeURIComponent(searchQuery.trim())}`}
                    className={styles.suggestionViewAll}
                    onClick={() => setShowSuggestions(false)}
                  >
                    {suggestions.length > 0
                      ? 'View all results'
                      : `View all results for "${searchQuery.trim()}"`}
                    <Icon icon="mdi:arrow-right" />
                  </Link>
                </li>
              </motion.ul>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
