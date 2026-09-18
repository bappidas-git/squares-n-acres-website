import { useState } from 'react';
import { Icon } from '@iconify/react';

import HeroSearch from './HeroSearch';
import Picture from '../../ui/Picture';
import styles from './HeroSection.module.css';
import useCountUp from '../../../hooks/useCountUp';
import useInView from '../../../hooks/useInView';
import { HERO } from '../../../config/copy';
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
 *
 * The plate itself is a `<picture>`: a wide 21:9 photograph on a desktop and
 * `hero.mobileImageUrl` on a phone, chosen by the browser from a media query
 * rather than by JavaScript after the first paint. It is the page's LCP image,
 * so it loads eagerly and at high priority, and — when it is a Cloudinary
 * file — at the width of the screen it is being shown on rather than at 2400px
 * (§8.6).
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
  const [mediaError, setMediaError] = useState(false);
  const { ref: statsRef, inView: statsInView } = useInView({ threshold: 0.3 });

  const hero = settings?.hero ?? {};
  const title = hero.title || HERO.title;
  const subtitle = hero.subtitle || '';
  const badges = Array.isArray(hero.badges) ? hero.badges.filter(Boolean) : [];
  const stats = Array.isArray(hero.stats) ? hero.stats.filter((stat) => stat?.label) : [];

  const imageUrl = hero.backgroundImageUrl || hero.mobileImageUrl || '';
  const mobileImageUrl = hero.mobileImageUrl || '';
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
        ) : imageUrl ? (
          <Picture
            src={imageUrl}
            sources={
              mobileImageUrl && mobileImageUrl !== imageUrl
                ? [{ media: '(max-width: 599px)', src: mobileImageUrl, ratio: '4/5' }]
                : []
            }
            alt=""
            ratio="auto"
            sizes="100vw"
            priority
            className={styles.heroImage}
          />
        ) : (
          <div className={styles.mediaLayer} />
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
