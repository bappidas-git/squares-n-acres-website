import { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';

import CategoryTiles from '../../components/sections/home/CategoryTiles';
import CtaBand from '../../components/sections/home/CtaBand';
import ExploreLocalities from '../../components/sections/home/ExploreLocalities';
import FaqSection from '../../components/sections/home/FaqSection';
import HeroSection from '../../components/sections/home/HeroSection';
import HomeFeatures from '../../components/sections/home/HomeFeatures';
import HomeSteps from '../../components/sections/home/HomeSteps';
import LatestInsights from '../../components/sections/home/LatestInsights';
import PATHS from '../../routes/paths';
import PartnersSection from '../../components/sections/home/PartnersSection';
import PropertyRow from '../../components/sections/home/PropertyRow';
import PropertyTypeGrid from '../../components/sections/home/PropertyTypeGrid';
import TestimonialsSection from '../../components/sections/shared/TestimonialsSection';
import TopBuilders from '../../components/sections/home/TopBuilders';
import masterDataService from '../../services/masterDataService';
import pageService from '../../services/pageService';
import styles from './Home.module.css';
import useApi from '../../hooks/useApi';
import { Container, Section } from '../../components/ui';
import { HOME } from '../../config/copy';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';

/**
 * The home page.
 *
 * Every band on it is data: the hero and its search tabs are `siteSettings`,
 * the tiles and rows are `GET /properties` with different filters, the
 * localities, types and builders are master data, "Why choose us" and "How it
 * works" are the `features` and `steps` blocks of the `home` CMS page (D81),
 * and the testimonials, insights, FAQs and partners are their own collections.
 * Nothing on this page is a sentence a component made up, which is what closes
 * the home half of BUG-11.
 *
 * A section with nothing behind it renders nothing at all — no heading, no
 * empty state, no gap. A visitor cannot tell the difference between a section
 * that is absent and one that was never planned, but they can very much tell
 * the difference between a section and an apology.
 *
 * The `<Helmet>` here is temporary: prompt 38 replaces it with
 * `<Seo type="home">`, which reads the same CMS page's `seo` branch.
 */

/** The four listing rows, in the order the page shows them. */
const ROWS = [
  {
    key: 'featured',
    featured: true,
    title: HOME.featured.title,
    subtitle: HOME.featured.subtitle,
    viewAllHref: `${PATHS.properties}?isFeatured=true`,
  },
  {
    key: 'new-launches',
    params: { constructionStatus: 'pre-launch,under-construction', sort: 'newest' },
    title: HOME.newLaunches.title,
    subtitle: HOME.newLaunches.subtitle,
    viewAllHref: PATHS.buyStatus('pre-launch'),
  },
  {
    key: 'ready-to-move',
    params: { constructionStatus: 'ready-to-move', listingType: 'sale' },
    title: HOME.readyToMove.title,
    subtitle: HOME.readyToMove.subtitle,
    viewAllHref: PATHS.buyStatus('ready-to-move'),
  },
  {
    key: 'rentals',
    params: { listingType: 'rent' },
    title: HOME.rentals.title,
    subtitle: HOME.rentals.subtitle,
    viewAllHref: PATHS.rent,
  },
];

const TESTIMONIAL_PARAMS = { isFeatured: true, perPage: 9 };

export default function Home() {
  const { siteName, tagline, settings } = useSiteSettings();

  // The CMS page behind the home page. A 404 — an editor unpublished it —
  // leaves `features` and `steps` empty, and both sections stand down (§7).
  const { data: page } = useApi(
    (signal) => pageService.getBySlug('home', undefined, { signal }),
    []
  );

  const { data: testimonialData } = useApi(
    (signal) => masterDataService.testimonials.list(TESTIMONIAL_PARAMS, { signal }),
    [],
    { initialData: [] }
  );

  const blocks = useMemo(() => {
    const list = Array.isArray(page?.blocks) ? page.blocks : [];
    return {
      features: list.find((block) => block.type === 'features')?.data ?? null,
      steps: list.find((block) => block.type === 'steps')?.data ?? null,
    };
  }, [page]);

  const testimonials = Array.isArray(testimonialData) ? testimonialData : [];

  // The CMS page owns the title; with no page published, the site's own
  // tagline is the next honest thing to say about it.
  const subject = page?.seo?.title || tagline;
  const title = subject ? `${subject} | ${siteName}` : siteName;
  const description =
    page?.seo?.description ||
    settings?.hero?.subtitle ||
    `Verified apartments, villas, plots and commercial space across Bengaluru, with ${siteName}.`;

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Helmet>

      <div className={styles.home}>
        <HeroSection />
        <CategoryTiles />

        {ROWS.map((row) => (
          <PropertyRow
            key={row.key}
            title={row.title}
            subtitle={row.subtitle}
            params={row.params}
            featured={row.featured}
            viewAllHref={row.viewAllHref}
          />
        ))}

        <ExploreLocalities />
        <PropertyTypeGrid />
        <TopBuilders />

        <HomeFeatures data={blocks.features} />
        <HomeSteps data={blocks.steps} />

        {testimonials.length > 0 ? (
          <Section background="surface" spacing="lg">
            <Container>
              <TestimonialsSection items={testimonials} title={HOME.testimonials.title} />
            </Container>
          </Section>
        ) : null}

        <LatestInsights />
        <FaqSection />
        <PartnersSection />
        <CtaBand />
      </div>
    </>
  );
}
