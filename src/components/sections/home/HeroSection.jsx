import React, { useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

import GlobalSearch from '../../common/GlobalSearch';
import styles from './HeroSection.module.css';
import useBreakpoint from '../../../hooks/useBreakpoint';
import { useSiteSettings } from '../../../contexts/SiteSettingsContext';

/**
 * The home hero: copy and media from `siteSettings.hero`, and the site's own
 * search box.
 *
 * The type-ahead used to live here, in three hundred lines this component
 * shared with nobody — so the header had no search at all and the listing had
 * a different one. It is now `common/GlobalSearch`, which the header modal and
 * the results header mount too. Prompt 27 puts the tabbed Buy / Rent / Lease /
 * Commercial / Plots strip above it.
 */

const FALLBACK_BG = 'var(--color-charcoal)';

const HeroSection = () => {
  const { settings } = useSiteSettings();
  const { isMobile } = useBreakpoint();
  const [mediaError, setMediaError] = useState(false);

  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 600], [0, 150]);

  const hero = settings?.hero ?? {};
  const title = hero.title || 'Find your next home in Bengaluru';
  const subtitle = hero.subtitle || '';
  const imageUrl =
    (isMobile ? hero.mobileImageUrl : hero.backgroundImageUrl) || hero.backgroundImageUrl || '';
  const videoUrl = hero.backgroundVideoUrl || '';

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
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: 'easeOut' }}
        >
          <GlobalSearch variant="hero" placeholder="Search by locality, project or builder" />
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
