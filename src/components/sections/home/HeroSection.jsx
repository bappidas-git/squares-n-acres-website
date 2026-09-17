import { useState } from 'react';
import { Icon } from '@iconify/react';

import HeroSearch from './HeroSearch';
import styles from './HeroSection.module.css';
import useBreakpoint from '../../../hooks/useBreakpoint';
import useCountUp from '../../../hooks/useCountUp';
import useInView from '../../../hooks/useInView';
import { formatNumber } from '../../../utils/format';
import { useSiteSettings } from '../../../contexts/SiteSettingsContext';

/**
 * The home hero: the media, the headline, the tabbed search and — when an
 * editor filled them in — a row of trust badges and a row of figures.
 *
 * Everything is `siteSettings.hero` (§6.13). The badges and the stats are
 * arrays that ship empty, and an empty array renders nothing at all: the site
 * does not claim "500+ happy families" until somebody who can stand behind the
 * number types it in (§14).
 *
 * The media box reserves its height in CSS before the image loads, so nothing
 * below it moves when it arrives (§6, CLS).
 */

/** One figure of the stats row, counted up once its row is on screen. */
function HeroStat({ label, value, suffix, active }) {
  const numeric = Number(String(value ?? '').replace(/[^0-9.]/g, ''));
  const countable = Number.isFinite(numeric) && numeric > 0;
  const counted = useCountUp(countable ? numeric : 0, { enabled: active && countable });

  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>
        {countable ? formatNumber(counted) : value}
        {suffix ? <span className={styles.statSuffix}>{suffix}</span> : null}
      </span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

export default function HeroSection() {
  const { settings } = useSiteSettings();
  const { isMobile } = useBreakpoint();
  const [mediaError, setMediaError] = useState(false);
  const { ref: statsRef, inView: statsInView } = useInView({ threshold: 0.3 });

  const hero = settings?.hero ?? {};
  const title = hero.title || 'Find your next home in Bengaluru';
  const subtitle = hero.subtitle || '';
  const badges = Array.isArray(hero.badges) ? hero.badges.filter(Boolean) : [];
  const stats = Array.isArray(hero.stats) ? hero.stats.filter((stat) => stat?.label) : [];

  const imageUrl =
    (isMobile ? hero.mobileImageUrl : hero.backgroundImageUrl) || hero.backgroundImageUrl || '';
  const videoUrl = hero.backgroundVideoUrl || '';

  return (
    <section className={styles.hero}>
      <div className={styles.media}>
        {videoUrl && !mediaError ? (
          <video
            className={styles.mediaLayer}
            src={videoUrl}
            poster={imageUrl || undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            onError={() => setMediaError(true)}
          />
        ) : (
          <div
            className={styles.mediaLayer}
            style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
          />
        )}
        <div className={styles.overlay} />
      </div>

      <div className={styles.content}>
        <h1 className={styles.heading}>{title}</h1>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}

        {badges.length > 0 ? (
          <ul className={styles.badges}>
            {badges.map((badge) => (
              <li key={badge} className={styles.badge}>
                <Icon icon="mdi:check-decagram-outline" aria-hidden="true" />
                {badge}
              </li>
            ))}
          </ul>
        ) : null}

        <div className={styles.searchWrap}>
          <HeroSearch tabs={hero.searchTabs} />
        </div>

        {stats.length > 0 ? (
          <div className={styles.stats} ref={statsRef}>
            {stats.map((stat) => (
              <HeroStat
                key={stat.label}
                label={stat.label}
                value={stat.value}
                suffix={stat.suffix}
                active={statsInView}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
