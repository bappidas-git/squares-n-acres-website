import { Icon } from '@iconify/react';

import DeveloperLogo from './DeveloperLogo';
import { Breadcrumbs, Container, LazyImage } from '../../ui';

import styles from './DeveloperSections.module.css';

/**
 * The top of a builder page: the cover photograph, the logo in its white box,
 * the page's one `<h1>`, where the company sits and where its own site is.
 *
 * Without a cover the band keeps its height on `--color-charcoal` — the logo
 * box is the point of the hero, and it reads on charcoal as well as on a
 * photograph (§7).
 *
 * The website is a link out: `nofollow` because a builder's own site is not
 * something we vouch for, and `noopener noreferrer` because nothing we link to
 * needs a handle on this window — the pair is what the rest of the site's
 * outbound links carry, and `noopener` alone is a lint warning `build:ci`
 * treats as an error.
 *
 * @param {object} props
 * @param {object} props.developer a §6.5 record
 * @param {{label: string, to?: string}[]} [props.breadcrumbs]
 */
export default function DeveloperHero({ developer, breadcrumbs = [] }) {
  const { name, logoUrl, coverImageUrl, headquarters, website } = developer;

  return (
    <header className={styles.hero}>
      {coverImageUrl ? (
        <>
          <LazyImage
            src={coverImageUrl}
            alt=""
            ratio="auto"
            sizes="100vw"
            priority
            className={styles.heroImage}
          />
          <span className={styles.heroScrim} aria-hidden="true" />
        </>
      ) : null}

      <Container className={styles.heroContent}>
        {breadcrumbs.length > 0 ? (
          <Breadcrumbs items={breadcrumbs} onDark className={styles.heroCrumbs} />
        ) : null}

        <div className={styles.heroIdentity}>
          <DeveloperLogo name={name} logoUrl={logoUrl} size="lg" loading="eager" />

          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>{name}</h1>

            {headquarters || website ? (
              <p className={styles.heroMeta}>
                {headquarters ? (
                  <span className={styles.heroMetaItem}>
                    <Icon icon="mdi:map-marker-outline" width="16" height="16" aria-hidden="true" />
                    {headquarters}
                  </span>
                ) : null}
                {website ? (
                  <a
                    className={styles.heroLink}
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                  >
                    Visit website
                    <Icon icon="mdi:open-in-new" width="16" height="16" aria-hidden="true" />
                  </a>
                ) : null}
              </p>
            ) : null}
          </div>
        </div>
      </Container>
    </header>
  );
}
