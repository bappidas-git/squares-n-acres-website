import { useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';

import masterDataService from '../../../services/masterDataService';
import useApi from '../../../hooks/useApi';
import useDeferredSection from '../../../hooks/useDeferredSection';
import { Container, LazyImage, Section, SectionHeader } from '../../ui';

import styles from './PartnersSection.module.css';

/** The whole row fits in one page (§8.6 caps a request at 24 items). */
const PER_PAGE = 24;

/**
 * The partner logos.
 *
 * `GET /partners` returns the active partners in `order` (§5.14) and the
 * `category` prop narrows that to one kind — which is what a CMS `partners`
 * block passes (prompt 30). Logos are drawn as they are: a brand mark is not
 * ours to recolour, so there is no greyscale filter on them (§2.2).
 *
 * The marquee scrolls; under `prefers-reduced-motion` the same logos are laid
 * out as a static grid rather than a track that never moves, so nothing is
 * hidden off-screen (§8.3).
 *
 * @param {object} props
 * @param {string} [props.category] a `PARTNER_CATEGORIES` value
 * @param {string} [props.title]
 * @param {string} [props.subtitle]
 */
export default function PartnersSection({
  category,
  title = 'Our partners',
  subtitle = 'Developers, lenders and specialists we work with',
}) {
  const reduceMotion = useReducedMotion();
  const { ref, ready } = useDeferredSection();

  const params = useMemo(
    () => ({ perPage: PER_PAGE, sort: 'order', ...(category ? { category } : null) }),
    [category]
  );

  const { data, loading } = useApi(
    (signal) => masterDataService.partners.list(params, { signal }),
    [params],
    { enabled: ready, initialData: [] }
  );

  const partners = Array.isArray(data) ? data : [];

  // The last band but one on a long page: it asks for its logos when the
  // scroll reaches it (§8.6). The empty div is the observer's target.
  if (!ready || loading || partners.length === 0) {
    return <div ref={ref} aria-hidden="true" />;
  }

  return (
    <Section background="surface" spacing="lg">
      <Container>
        <SectionHeader title={title} subtitle={subtitle} align="center" />

        {reduceMotion ? (
          <ul className={styles.grid}>
            {partners.map((partner) => (
              <li key={partner.id}>
                <PartnerCard partner={partner} />
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.marqueeWrapper}>
            {/* The track is duplicated so the loop has no visible seam; the
                copy is hidden from assistive technology so every partner is
                announced once. */}
            <div className={styles.marqueeTrack}>
              <ul className={styles.run}>
                {partners.map((partner) => (
                  <li key={partner.id}>
                    <PartnerCard partner={partner} />
                  </li>
                ))}
              </ul>
              <ul className={styles.run} aria-hidden="true">
                {partners.map((partner) => (
                  <li key={`echo-${partner.id}`}>
                    <PartnerCard partner={partner} tabbable={false} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Container>
    </Section>
  );
}

/** One logo, linked to the partner's own site when there is one. */
function PartnerCard({ partner, tabbable = true }) {
  const logo = (
    <LazyImage
      src={partner.logoUrl}
      alt={partner.name}
      ratio="5/2"
      fit="contain"
      sizes="180px"
      className={styles.logo}
      onErrorFallback={<span className={styles.fallback}>{partner.name}</span>}
    />
  );

  if (!partner.websiteUrl) {
    return <div className={styles.card}>{logo}</div>;
  }

  return (
    <a
      className={styles.card}
      href={partner.websiteUrl}
      target="_blank"
      // A partner link is a courtesy, not an endorsement Google should weigh.
      rel="noopener noreferrer nofollow"
      tabIndex={tabbable ? undefined : -1}
    >
      {logo}
    </a>
  );
}
