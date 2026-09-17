import { Icon } from '@iconify/react';

import { useSeoPanel } from '../SeoPanelContext';

import styles from '../SeoPanel.module.css';

const hostOf = (url) =>
  String(url ?? '')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .toUpperCase();

/**
 * The two cards a share produces.
 *
 * Facebook and LinkedIn draw the same card — a 500 × 261 image with the domain,
 * the title and the description under it — so one frame stands for both. X
 * draws a `summary_large_image` card, which is the same picture with rounded
 * corners and no description on a narrow screen; the card shown is the one
 * `twitter:card` asks for, because an editor who chooses `summary` should see
 * `summary`.
 */
export default function SocialPreview() {
  const { resolved, siteUrl } = useSeoPanel();
  const domain = hostOf(siteUrl);
  const large = resolved.twitter.card !== 'summary';

  return (
    <div className={styles.socialGrid}>
      <section aria-label="Facebook and LinkedIn preview">
        <p className={styles.socialLabel}>
          <Icon
            icon="mdi:facebook"
            width="16"
            height="16"
            className={styles.iconFacebook}
            aria-hidden="true"
          />
          <Icon
            icon="mdi:linkedin"
            width="16"
            height="16"
            className={styles.iconLinkedin}
            aria-hidden="true"
          />
          Facebook &amp; LinkedIn
        </p>
        <div className={styles.socialCard}>
          <Image url={resolved.og.imageUrl} alt="" />
          <div className={styles.socialBody}>
            <span className={styles.socialDomain}>{domain}</span>
            <p className={styles.socialTitle}>{resolved.og.title || 'No title yet'}</p>
            <p className={styles.socialText}>{resolved.og.description || 'No description yet.'}</p>
          </div>
        </div>
      </section>

      <section aria-label="X preview">
        <p className={styles.socialLabel}>
          <Icon
            icon="mdi:alpha-x-box"
            width="16"
            height="16"
            className={styles.iconX}
            aria-hidden="true"
          />
          X — {resolved.twitter.card}
        </p>
        <div className={[styles.socialCard, styles.socialCardRound].join(' ')}>
          {large ? <Image url={resolved.twitter.imageUrl} alt="" /> : null}
          <div className={styles.socialBody}>
            <p className={styles.socialTitle}>{resolved.twitter.title || 'No title yet'}</p>
            <p className={styles.socialText}>
              {resolved.twitter.description || 'No description yet.'}
            </p>
            <span className={styles.socialDomain}>{domain}</span>
          </div>
        </div>
      </section>
    </div>
  );
}

/** The image area, or what stands in its place while there is no image. */
function Image({ url, alt }) {
  if (!url) {
    return (
      <span className={[styles.socialImage, styles.socialImageEmpty].join(' ')}>
        No share image — 1200 × 630 px is the size to aim for.
      </span>
    );
  }
  return <img className={styles.socialImage} src={url} alt={alt} loading="lazy" />;
}
