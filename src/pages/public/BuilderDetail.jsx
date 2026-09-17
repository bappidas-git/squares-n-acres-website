import { Helmet } from 'react-helmet-async';
import { Icon } from '@iconify/react';
import { useParams } from 'react-router-dom';

import SafeHtml from '../../components/editor/SafeHtml';
import NotFound from './NotFound';
import PATHS from '../../routes/paths';
import masterDataService from '../../services/masterDataService';
import useApi from '../../hooks/useApi';
import { Container, ErrorState, Skeleton } from '../../components/ui';
import {
  DeveloperCta,
  DeveloperHero,
  DeveloperListings,
  DeveloperStats,
} from '../../components/sections/developer';
import { SITE } from '../../config/site';

import styles from './BuilderDetail.module.css';

/**
 * `/builders/:slug` — one builder's profile.
 *
 * An unknown or inactive slug answers 404 (§5.10) and the page renders the
 * site's own 404: from the visitor's side there is no difference between a
 * builder that never existed and one that is no longer published.
 *
 * Every section renders only when the record carries what it needs, so a
 * builder created from a name alone is a short page rather than a page of
 * empty headings (§8.2). The enquiry form is the exception — a lead must
 * always be possible.
 *
 * The `<title>` is a temporary Helmet tag following the §9.5 developer
 * template; prompt 38 replaces it with `<Seo>`.
 */
export default function BuilderDetail() {
  const { slug } = useParams();

  const {
    data: developer,
    loading,
    error,
    refetch,
  } = useApi((signal) => masterDataService.developers.bySlug(slug, { signal }), [slug]);

  if (error?.status === 404) return <NotFound />;

  if (loading) return <BuilderDetailSkeleton />;

  if (error || !developer) {
    return (
      <Container className={styles.stateWrap}>
        <ErrorState
          title="We could not load this builder"
          text={error?.message}
          onRetry={refetch}
        />
      </Container>
    );
  }

  const { name, description, shortDescription, highlights, seo } = developer;
  const items = Array.isArray(highlights) ? highlights.filter(Boolean) : [];
  const metaDescription = seo?.description || shortDescription || undefined;

  return (
    <>
      <Helmet>
        <title>{`${name} – Projects in Bengaluru | ${SITE.name}`}</title>
        {metaDescription ? <meta name="description" content={metaDescription} /> : null}
      </Helmet>

      <article className={styles.page}>
        <DeveloperHero
          developer={developer}
          breadcrumbs={[
            { label: 'Home', to: PATHS.home },
            { label: 'Builders', to: PATHS.builders },
            { label: name },
          ]}
        />

        <Container className={styles.body}>
          {shortDescription ? <p className={styles.lede}>{shortDescription}</p> : null}

          <DeveloperStats developer={developer} />

          {description || items.length > 0 ? (
            <section className={styles.about} aria-labelledby="developer-about">
              <h2 className={styles.aboutTitle} id="developer-about">
                About {name}
              </h2>

              <div className={styles.aboutLayout}>
                {description ? (
                  <SafeHtml html={description} className={styles.profileBody} />
                ) : null}

                {items.length > 0 ? (
                  <div className={styles.highlights}>
                    <h3 className={styles.highlightsTitle}>What they are known for</h3>
                    <ul className={styles.highlightList}>
                      {items.map((item) => (
                        <li key={item} className={styles.highlightItem}>
                          <Icon
                            icon="mdi:check-circle-outline"
                            width="20"
                            height="20"
                            className={styles.highlightIcon}
                            aria-hidden="true"
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          <DeveloperListings developer={developer} />

          <DeveloperCta developer={developer} />
        </Container>
      </article>
    </>
  );
}

/** The page's own shape, while the record is on its way (§8.2). */
function BuilderDetailSkeleton() {
  return (
    <div className={styles.page} aria-busy="true" aria-live="polite">
      <Skeleton variant="rectangular" width="100%" height={280} />
      <Container className={styles.body}>
        <Skeleton variant="text" width="70%" height={22} />
        <Skeleton variant="rectangular" width="100%" height={120} sx={{ marginTop: 3 }} />
        <Skeleton variant="text" width="40%" height={36} sx={{ marginTop: 4 }} />
        <Skeleton variant="text" width="100%" height={20} />
        <Skeleton variant="text" width="95%" height={20} />
        <Skeleton variant="text" width="88%" height={20} />
      </Container>
    </div>
  );
}
