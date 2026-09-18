import { useMemo } from 'react';

// The two CMS blocks lead the imports, before any section that pulls a
// stylesheet `components/cms/blocks/index.js` also pulls: that barrel registers
// `blocks.module.css` first, and two chunks disagreeing about the order of the
// extracted CSS is what `build:ci` treats as an error.
import FeaturesBlock from '../../components/cms/blocks/FeaturesBlock';
import StepsBlock from '../../components/cms/blocks/StepsBlock';
import CategoryTiles from '../../components/sections/home/CategoryTiles';
import CtaBand from '../../components/sections/home/CtaBand';
import ExploreLocalities from '../../components/sections/home/ExploreLocalities';
import FaqSection from '../../components/sections/home/FaqSection';
import HeroSection from '../../components/sections/home/HeroSection';
import LatestInsights from '../../components/sections/home/LatestInsights';
import PATHS from '../../routes/paths';
import PartnersSection from '../../components/sections/home/PartnersSection';
import PropertyRow from '../../components/sections/home/PropertyRow';
import PropertyTypeGrid from '../../components/sections/home/PropertyTypeGrid';
import Seo from '../../components/seo/Seo';
import TestimonialsSection from '../../components/sections/shared/TestimonialsSection';
import TopBuilders from '../../components/sections/home/TopBuilders';
import masterDataService from '../../services/masterDataService';
import pageService from '../../services/pageService';
import styles from './Home.module.css';
import useApi from '../../hooks/useApi';
import useDeferredSection from '../../hooks/useDeferredSection';
import usePrerenderReady from '../../hooks/usePrerenderReady';
import { Container, ErrorState, Section } from '../../components/ui';
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
 * The two CMS bands are rendered by `components/cms/blocks` — the very
 * components every other page uses for the same two block types (prompt 30), so
 * the home page and `/about` cannot drift apart.
 *
 * A section with nothing behind it renders nothing at all — no heading, no
 * empty state, no gap. A visitor cannot tell the difference between a section
 * that is absent and one that was never planned, but they can very much tell
 * the difference between a section and an apology.
 *
 * The head is `<Seo type="home">`, which reads the same CMS page's `seo`
 * branch: the home page is a record like any other, and the one node only it
 * publishes is the `WebSite` with its search box (§9.3).
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
  const {
    data: page,
    loading: pageLoading,
    error: pageError,
    refetch: refetchPage,
  } = useApi((signal) => pageService.getBySlug('home', undefined, { signal }), []);

  // The testimonials band is eight bands down, so its request waits for the
  // scroll to get near it (§8.6) — the same deal every other lower band got.
  const { ref: testimonialsRef, ready: testimonialsReady } = useDeferredSection();

  const { data: testimonialData } = useApi(
    (signal) => masterDataService.testimonials.list(TESTIMONIAL_PARAMS, { signal }),
    [],
    { enabled: testimonialsReady, initialData: [] }
  );

  // The CMS record is this page's primary query: once it has answered (or
  // failed), the prerender may save the HTML (§9.9).
  usePrerenderReady(pageLoading);

  const blocks = useMemo(() => {
    const list = Array.isArray(page?.blocks) ? page.blocks : [];
    return {
      features: list.find((block) => block.type === 'features')?.data ?? null,
      steps: list.find((block) => block.type === 'steps')?.data ?? null,
    };
  }, [page]);

  const testimonials = Array.isArray(testimonialData) ? testimonialData : [];

  /** The API is unreachable, rather than the page being unpublished (§7). */
  const outage = Boolean(pageError) && pageError.status !== 404;

  // What `HeroSection` will draw, so the head can preload it. The mobile
  // plate is the fallback for a hero configured with only that one, which is
  // the same order the section itself reads them in.
  const heroImageUrl = settings?.hero?.backgroundVideoUrl
    ? ''
    : settings?.hero?.backgroundImageUrl || settings?.hero?.mobileImageUrl || '';

  // The CMS page owns the words; with no page published, the site's own
  // tagline is the next honest thing to say about it. The `home` template
  // (§9.5) decides what the tab actually reads.
  const description =
    page?.seo?.description ||
    settings?.hero?.subtitle ||
    `Verified apartments, villas, plots and commercial space across Bengaluru, with ${siteName}.`;

  return (
    <>
      <Seo
        type="home"
        entity={page ?? undefined}
        title={page?.seo?.title || tagline || siteName}
        description={description}
        testimonials={testimonials}
        // The hero plate is the home page's LCP and `HeroSection` is inside
        // the route's lazy chunk, so the head names the file first (§8.6).
        // A hero that is a video has a poster rather than a picture, and a
        // video is not preloaded at all.
        preloadImage={
          heroImageUrl ? { src: heroImageUrl, ratio: 'auto', sizes: '100vw' } : undefined
        }
      />

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

        {/* Every band on this page hides itself when it has nothing to show,
            which is right for a section an editor emptied and wrong for a
            server nobody can reach: with the API down the page would be a hero
            and a footer, and no way to ask for it again. A failure that is not
            a 404 therefore gets one error band with a Retry, and refetching it
            re-renders the whole page (prompt 43 §4.1). */}
        {outage ? (
          <Section background="surface" spacing="lg">
            <Container>
              <ErrorState text={pageError.message} onRetry={refetchPage} />
            </Container>
          </Section>
        ) : (
          <>
            <FeaturesBlock data={blocks.features ?? {}} background="surface" />
            <StepsBlock data={blocks.steps ?? {}} background="bg" />
          </>
        )}

        {testimonials.length > 0 ? (
          <Section background="surface" spacing="lg" ref={testimonialsRef}>
            <Container>
              <TestimonialsSection items={testimonials} title={HOME.testimonials.title} />
            </Container>
          </Section>
        ) : (
          <div ref={testimonialsRef} aria-hidden="true" />
        )}

        <LatestInsights />
        <FaqSection />
        <PartnersSection />
        <CtaBand />
      </div>
    </>
  );
}
