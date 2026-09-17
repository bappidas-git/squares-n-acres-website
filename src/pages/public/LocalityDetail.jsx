import { Helmet } from 'react-helmet-async';
import { Icon } from '@iconify/react';
import { useParams } from 'react-router-dom';

import MapEmbed, { hasCoordinates } from '../../components/common/MapEmbed';
import NotFound from './NotFound';
import PATHS from '../../routes/paths';
import masterDataService from '../../services/masterDataService';
import useApi from '../../hooks/useApi';
import { Container, ErrorState, Skeleton } from '../../components/ui';
import {
  LocalityConnectivity,
  LocalityCta,
  LocalityGuide,
  LocalityHero,
  LocalityListings,
} from '../../components/sections/locality';
import { SITE } from '../../config/site';

import styles from './LocalityDetail.module.css';

/**
 * `/localities/:slug` — the guide to one neighbourhood.
 *
 * An unknown or inactive slug answers 404 (§5.10), and the page renders the
 * site's own 404 rather than an error box: from the visitor's side there is no
 * difference between a locality that never existed and one that is no longer
 * published.
 *
 * Every section renders only when the record carries what it needs, so a thin
 * locality is a short page rather than a page of empty headings (§8.2).
 *
 * The `<title>` is a temporary Helmet tag following the §9.5 locality template;
 * prompt 38 replaces it with `<Seo>`.
 */
export default function LocalityDetail() {
  const { slug } = useParams();

  const {
    data: locality,
    loading,
    error,
    refetch,
  } = useApi((signal) => masterDataService.localities.bySlug(slug, { signal }), [slug]);

  if (error?.status === 404) return <NotFound />;

  if (loading) return <LocalityDetailSkeleton />;

  if (error || !locality) {
    return (
      <Container className={styles.stateWrap}>
        <ErrorState
          title="We could not load this locality"
          text={error?.message}
          onRetry={refetch}
        />
      </Container>
    );
  }

  const { name, shortDescription, seo, latitude, longitude, priceTrendNote, city } = locality;
  const cityName = city?.name ?? 'Bengaluru';
  const description = seo?.description || shortDescription || undefined;

  return (
    <>
      <Helmet>
        <title>{`Properties in ${name}, ${cityName} – Buy, Rent & Invest | ${SITE.name}`}</title>
        {description ? <meta name="description" content={description} /> : null}
      </Helmet>

      <article className={styles.page}>
        <LocalityHero
          locality={locality}
          breadcrumbs={[
            { label: 'Home', to: PATHS.home },
            { label: 'Localities', to: PATHS.localities },
            { label: name },
          ]}
        />

        <Container className={styles.body}>
          <LocalityGuide locality={locality} />

          <LocalityConnectivity items={locality.connectivity} />

          {priceTrendNote ? (
            <aside className={styles.trend}>
              <Icon
                icon="mdi:chart-line"
                width="24"
                height="24"
                className={styles.trendIcon}
                aria-hidden="true"
              />
              <div>
                <h2 className={styles.trendTitle}>Price trend</h2>
                <p className={styles.trendText}>{priceTrendNote}</p>
              </div>
            </aside>
          ) : null}

          {hasCoordinates(latitude, longitude) ? (
            <section className={styles.mapBlock} aria-labelledby="locality-map">
              <h2 className={styles.mapTitle} id="locality-map">
                {name} on the map
              </h2>
              <MapEmbed
                latitude={latitude}
                longitude={longitude}
                title={`Map of ${name}, ${cityName}`}
                className={styles.map}
              />
            </section>
          ) : null}

          <LocalityListings locality={locality} />
        </Container>

        <div className={styles.ctaBand}>
          <Container>
            <LocalityCta locality={locality} />
          </Container>
        </div>
      </article>
    </>
  );
}

/** The page's own shape, while the record is on its way (§8.2). */
function LocalityDetailSkeleton() {
  return (
    <div className={styles.page} aria-busy="true" aria-live="polite">
      <Skeleton variant="rectangular" width="100%" height={320} />
      <Container className={styles.body}>
        <Skeleton variant="text" width="40%" height={40} />
        <Skeleton variant="text" width="100%" height={20} />
        <Skeleton variant="text" width="95%" height={20} />
        <Skeleton variant="text" width="90%" height={20} />
        <Skeleton variant="rectangular" width="100%" height={200} sx={{ marginTop: 3 }} />
      </Container>
    </div>
  );
}
