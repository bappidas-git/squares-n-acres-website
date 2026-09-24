import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { Breadcrumbs, Container, ErrorState } from '../../components/ui';
import { breadcrumbsFor } from '../../seo/breadcrumbs';
import { ERRORS } from '../../config/copy';
import { PropertyDetailSkeleton } from '../../components/common/SkeletonLoaders';
import { getVisibleSections } from '../../utils/propertySections';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useBanks } from '../../hooks/useMasterData';
import { useCssVar } from '../../hooks/useCssVar';
// `NotFound` leads the component imports because `BuilderDetail` imports it
// before the developer sections too, and `mini-css-extract-plugin` refuses to
// emit a stylesheet whose modules two chunks disagree about the order of.
import NotFound from './NotFound';
import AmenitiesSection from '../../components/sections/property/AmenitiesSection';
import BuilderSection from '../../components/sections/property/BuilderSection';
import ConstructionSection from '../../components/sections/property/ConstructionSection';
import DocumentsSection from '../../components/sections/property/DocumentsSection';
import EnquirySection from '../../components/sections/property/EnquirySection';
import FaqsSection, { withTypeFaqs } from '../../components/sections/property/FaqsSection';
import FinanceSection from '../../components/sections/property/finance/FinanceSection';
import FloorPlansSection from '../../components/sections/property/FloorPlansSection';
import GallerySection from '../../components/sections/property/GallerySection';
import HighlightsSection from '../../components/sections/property/HighlightsSection';
import KeyFacts from '../../components/sections/property/KeyFacts';
import LocationSection, { NearbySection } from '../../components/sections/property/LocationSection';
import MobileCtaBar from '../../components/sections/property/MobileCtaBar';
import OverviewSection from '../../components/sections/property/OverviewSection';
import PATHS from '../../routes/paths';
import Seo from '../../components/seo/Seo';
import PriceCard from '../../components/sections/property/PriceCard';
import PropertyGallery from '../../components/sections/property/PropertyGallery';
import RecentlyViewedSection from '../../components/sections/property/RecentlyViewedSection';
import SectionNav, { sectionElementId } from '../../components/sections/property/SectionNav';
import SimilarSection from '../../components/sections/property/SimilarSection';
import SpecificationsSection from '../../components/sections/property/SpecificationsSection';
import TitleBlock from '../../components/sections/property/TitleBlock';
import UnitConfigurationsSection from '../../components/sections/property/UnitConfigurationsSection';
import masterDataService from '../../services/masterDataService';
import propertyService from '../../services/propertyService';
import recentlyViewed from '../../utils/recentlyViewed';
import useApi from '../../hooks/useApi';
import viewTracker from '../../utils/viewTracker';
import { useLeadCapture } from '../../contexts/LeadCaptureContext';

import styles from './PropertyDetails.module.css';
import usePrerenderReady from '../../hooks/usePrerenderReady';

/** `?preview=admin` — what the property form's "Preview" link appends (§5.10). */
const PREVIEW_TOKEN = 'admin';

/** How many of its type's library questions a listing shows (QA-59). */
const TYPE_FAQ_LIMIT = 20;

/**
 * The component each `sectionVisibility` key is printed by.
 *
 * Sixteen of the eighteen keys of §6.1 are here; the other two are
 * `MEDIA_SECTION_KEYS`, whose content is the gallery at the top of the page.
 * Between the two lists every key a listing can switch on has somewhere to be,
 * which is what the section navigation promises when it offers the item.
 */
const SECTION_COMPONENTS = {
  overview: OverviewSection,
  highlights: HighlightsSection,
  unitConfigurations: UnitConfigurationsSection,
  specifications: SpecificationsSection,
  amenities: AmenitiesSection,
  floorPlans: FloorPlansSection,
  gallery: GallerySection,
  documents: DocumentsSection,
  construction: ConstructionSection,
  builder: BuilderSection,
  nearby: NearbySection,
  location: LocationSection,
  finance: FinanceSection,
  faqs: FaqsSection,
  similar: SimilarSection,
  enquiry: EnquirySection,
};

/**
 * The two keys whose section *is* the gallery at the top of the page: the
 * walkthrough and the 360° tour are tabs of `PropertyGallery`, not bands of
 * their own. Their navigation items scroll to the gallery, which is where the
 * thing they name actually is.
 */
const MEDIA_SECTION_KEYS = ['video', 'virtualTour'];

/** `64px` → `64`. */
const pixels = (value, fallback) => {
  const parsed = Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * One property, at `/properties/:slug`.
 *
 * The shell — the gallery and its lightbox, the title, the price card, the key
 * facts, the navigation over the sections this listing actually has and the
 * mobile contact bar — wraps the content sections, each of which renders only
 * when `getVisibleSections` says the listing both switched it on and has
 * something to put in it (BUG-06). Nothing on this page has a default value:
 * a section with no data is a section that is not here, and is not in the
 * navigation either (BUG-05).
 *
 * Under the eighteen sections comes "Recently viewed", which belongs to the
 * visitor rather than to the listing and therefore has no toggle and no
 * navigation item.
 *
 * An unpublished listing is readable at `?preview=admin` while somebody is
 * signed in to the admin, through the admin endpoint (prompt 21); the public
 * route answers 404, and so does this page.
 */
const PropertyDetails = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAdminAuth();
  const banks = useBanks();
  const headerHeight = pixels(useCssVar('--header-height', '64px'), 64);

  const preview = searchParams.get('preview') === PREVIEW_TOKEN && isAuthenticated;

  // The questions an editor dropped into the description are questions this
  // page answers, so they belong in its `FAQPage` beside the stored ones.
  const [blockFaqs, setBlockFaqs] = useState([]);

  const {
    data: property,
    loading,
    error,
    refetch,
  } = useApi(
    (signal) =>
      preview
        ? propertyService.adminGetBySlug(slug, { signal })
        : propertyService.getBySlug(slug, { signal }),
    [slug, preview]
  );

  // The prerender crawler saves this page once its primary query has settled
  // (§9.9) — settling on a 404 or an error state counts, so a crawl never
  // hangs on a URL the API cannot answer.
  usePrerenderReady(loading);

  const { openLeadModal, leadTriggerProps, setPageContext } = useLeadCapture();

  // The similar row is fetched here rather than inside its section because the
  // navigation may only offer the item once the API has answered with
  // something: the endpoint applies the editor's picks first and tops the list
  // up by locality and type, so only it knows whether there is a row (BUG-07).
  const { data: similar } = useApi(
    (signal) => propertyService.similar(property?.id, undefined, { signal }),
    [property?.id],
    { enabled: Boolean(property?.id), initialData: [] }
  );
  const similarProperties = Array.isArray(similar) ? similar : [];

  // The FAQ library's questions tied to this listing's type (QA-59): Admin →
  // FAQs offers the tie — "it also appears on those listings" — and until now
  // no page read it. Public, so only the live ones; in the library's order.
  const propertyTypeId = property?.propertyTypeId ?? property?.propertyType?.id ?? null;
  const { data: typeFaqs } = useApi(
    (signal) =>
      masterDataService.faqs.list(
        { propertyTypeId, sort: 'order', order: 'asc', perPage: TYPE_FAQ_LIMIT },
        { signal }
      ),
    [propertyTypeId],
    { enabled: Boolean(propertyTypeId), initialData: [] }
  );

  // The listing as its sections read it: its own questions, then its type's.
  const shown = useMemo(
    () => (property ? { ...property, faqs: withTypeFaqs(property.faqs, typeFaqs) } : property),
    [property, typeFaqs]
  );

  // Every CTA on the page goes through the one dialog of `LeadCaptureContext`;
  // the entry point decides the source, the heading and the boxes (§6.17).
  const openLead = useCallback(
    (entry) =>
      openLeadModal({
        entry,
        propertyId: property?.id ?? null,
        propertyTitle: property?.title ?? '',
        agent: property?.agent?.showOnListing ? property.agent : null,
      }),
    [openLeadModal, property]
  );

  const id = property?.id;

  // The floating WhatsApp button and the click-tracked call links sit outside
  // this page, so the page tells them which listing they are floating over.
  useEffect(() => {
    setPageContext({ propertyId: property?.id ?? null, propertyTitle: property?.title ?? '' });
    return () => setPageContext(null);
  }, [property?.id, property?.title, setPageContext]);

  const cover = useMemo(() => {
    const images = Array.isArray(property?.images) ? property.images : [];
    return images.find((image) => image?.isCover) ?? images[0] ?? null;
  }, [property]);

  // One view per property per session (D29), and the strip of what this visitor
  // has been looking at. A preview is the editor checking their own work, so it
  // counts as neither.
  useEffect(() => {
    if (!property || id === undefined || preview) return;

    if (viewTracker.recordView(id)) {
      propertyService.view(id).catch(() => {
        // A view that was not counted is not worth telling a visitor about.
      });
    }

    recentlyViewed.add({
      id,
      slug: property.slug,
      title: property.title,
      coverUrl: cover?.url ?? null,
      price:
        property.listingType === 'sale'
          ? (property.pricing?.price ?? null)
          : (property.pricing?.rentPerMonth ?? null),
      priceOnRequest: property.pricing?.priceOnRequest === true,
      listingType: property.listingType,
      locality: property.location?.locality?.name ?? '',
      bedrooms: property.configuration?.bedrooms ?? null,
    });
  }, [property, id, preview, cover]);

  const visibleSections = useMemo(
    () =>
      shown
        ? getVisibleSections(shown, {
            banksAvailable: banks.length > 0,
            similarAvailable: similarProperties.length > 0,
          })
        : [],
    [shown, banks.length, similarProperties.length]
  );

  if (loading) return <PropertyDetailSkeleton />;

  if (error?.status === 404) {
    return <NotFound {...ERRORS.notFound.pages.property} />;
  }

  if (error || !property) {
    return (
      <Container className={styles.stateWrap}>
        {/* The `ApiError`'s own message, so an outage reads "unable to reach
            the server" and a 500 reads what the server said (§8.2). */}
        <ErrorState title={ERRORS.property} text={error?.message} onRetry={refetch} />
      </Container>
    );
  }

  const unpublished = property.isActive === false;
  const crumbs = breadcrumbsFor('property', property);
  const faqs = [...shown.faqs, ...blockFaqs];

  const visibility = property.sectionVisibility ?? {};

  return (
    <>
      <Seo
        type="property"
        entity={property}
        description={property.seo?.description || property.shortDescription || property.title}
        breadcrumbs={crumbs}
        faqs={faqs}
        overrides={unpublished ? { noindex: true } : undefined}
        // The gallery's cover is this page's LCP, and the gallery is inside
        // the route's lazy chunk. Naming it in the head starts the download
        // a second earlier than the `<img>` can (§8.6). The ratio and the
        // `sizes` are `PropertyGallery`'s own, so the preload and the element
        // ask for one file between them — 4/3 is the phone's stage, which is
        // the device the budget is measured on.
        preloadImage={
          cover?.url
            ? { src: cover.url, ratio: '4/3', sizes: '(min-width: 900px) 60vw, 100vw' }
            : undefined
        }
      />

      {preview ? (
        <div className={styles.previewBanner} role="status">
          <Icon icon="mdi:eye-outline" aria-hidden="true" />
          <span>
            {unpublished
              ? 'Admin preview — this property is not published. Visitors see a 404 at this address.'
              : 'Admin preview — this property is published; visitors see the same page.'}
          </span>
          <Link to={PATHS.adminPropertyEdit(property.id)} className={styles.previewLink}>
            Back to the form
          </Link>
        </div>
      ) : null}

      <Container className={styles.page}>
        <Breadcrumbs items={crumbs} className={styles.crumbs} />

        <div className={styles.media}>
          {/* The navigation items for the walkthrough and the tour land here:
              both are tabs of the gallery rather than bands of their own. */}
          {visibleSections
            .filter((section) => MEDIA_SECTION_KEYS.includes(section.key))
            .map((section) => (
              <span
                key={section.key}
                id={sectionElementId(section.key)}
                className={styles.anchor}
                aria-hidden="true"
              />
            ))}

          <PropertyGallery
            images={property.images}
            title={property.title}
            videoUrl={property.videoUrl}
            virtualTourUrl={property.virtualTourUrl}
            showVideo={visibility.video !== false}
            showVirtualTour={visibility.virtualTour !== false}
            propertyId={property.id}
          />
        </div>

        <TitleBlock property={property} />

        <div className={styles.layout}>
          <div className={styles.main}>
            <KeyFacts property={property} />

            <SectionNav sections={visibleSections} offset={headerHeight} />

            {visibleSections.map((section, index) => {
              const Section = SECTION_COMPONENTS[section.key];
              if (!Section) return null;

              // Bands alternate so two long lists of facts never run together.
              const background = index % 2 === 1 ? 'surface' : 'bg';

              return section.key === 'similar' ? (
                <Section
                  key={section.key}
                  property={property}
                  properties={similarProperties}
                  background={background}
                />
              ) : section.key === 'overview' ? (
                <Section
                  key={section.key}
                  property={property}
                  background={background}
                  onFaqItems={setBlockFaqs}
                />
              ) : (
                <Section key={section.key} property={shown} background={background} />
              );
            })}

            <RecentlyViewedSection
              exclude={property.id}
              background={visibleSections.length % 2 === 1 ? 'surface' : 'bg'}
            />
          </div>

          <div className={styles.aside}>
            <PriceCard
              property={property}
              banks={banks}
              onRequest={openLead}
              triggerProps={leadTriggerProps}
            />
          </div>
        </div>
      </Container>

      <MobileCtaBar property={property} onEnquire={openLead} triggerProps={leadTriggerProps} />
    </>
  );
};

export default PropertyDetails;
