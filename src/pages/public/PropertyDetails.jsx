import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Icon } from '@iconify/react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { Breadcrumbs, Container, ErrorState } from '../../components/ui';
import { LISTING_TYPES } from '../../config/enums';
import { PropertyDetailSkeleton } from '../../components/common/SkeletonLoaders';
import { SITE } from '../../config/site';
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
import FaqsSection from '../../components/sections/property/FaqsSection';
import FinanceSection from '../../components/sections/property/finance/FinanceSection';
import FloorPlansSection from '../../components/sections/property/FloorPlansSection';
import GallerySection from '../../components/sections/property/GallerySection';
import HighlightsSection from '../../components/sections/property/HighlightsSection';
import KeyFacts from '../../components/sections/property/KeyFacts';
import LeadModalTemp from '../../components/sections/property/LeadModalTemp';
import LocationSection, { NearbySection } from '../../components/sections/property/LocationSection';
import MobileCtaBar from '../../components/sections/property/MobileCtaBar';
import OverviewSection from '../../components/sections/property/OverviewSection';
import PATHS from '../../routes/paths';
import PriceCard from '../../components/sections/property/PriceCard';
import PropertyGallery from '../../components/sections/property/PropertyGallery';
import RecentlyViewedSection from '../../components/sections/property/RecentlyViewedSection';
import SectionNav, { sectionElementId } from '../../components/sections/property/SectionNav';
import SimilarSection from '../../components/sections/property/SimilarSection';
import SpecificationsSection from '../../components/sections/property/SpecificationsSection';
import TitleBlock from '../../components/sections/property/TitleBlock';
import UnitConfigurationsSection from '../../components/sections/property/UnitConfigurationsSection';
import propertyService from '../../services/propertyService';
import recentlyViewed from '../../utils/recentlyViewed';
import useApi from '../../hooks/useApi';
import viewTracker from '../../utils/viewTracker';

import styles from './PropertyDetails.module.css';

/** `?preview=admin` — what the property form's "Preview" link appends (§5.10). */
const PREVIEW_TOKEN = 'admin';

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

/** The listing index a property belongs to: `/buy`, `/rent` or `/lease`. */
const LISTING_PATH = { sale: PATHS.buy, rent: PATHS.rent, lease: PATHS.lease };

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

  const [lead, setLead] = useState({ open: false, source: 'property-enquiry' });

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

  const openLead = useCallback((source) => setLead({ open: true, source }), []);
  const closeLead = useCallback(() => setLead((current) => ({ ...current, open: false })), []);

  const id = property?.id;
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
      property
        ? getVisibleSections(property, {
            banksAvailable: banks.length > 0,
            similarAvailable: similarProperties.length > 0,
          })
        : [],
    [property, banks.length, similarProperties.length]
  );

  if (loading) return <PropertyDetailSkeleton />;

  if (error?.status === 404) {
    return (
      <NotFound
        title="Property not found"
        subtitle="This listing is no longer available, or the address has changed. Browse what is on the market instead."
      />
    );
  }

  if (error || !property) {
    return (
      <Container className={styles.stateWrap}>
        <ErrorState
          title="We could not load this property"
          text="Something went wrong on the way. Please try again."
          onRetry={refetch}
        />
      </Container>
    );
  }

  const listingLabel = LISTING_TYPES.labelOf(property.listingType);
  const locality = property.location?.locality ?? null;
  const path = PATHS.propertyDetails(property.slug);
  const seo = property.seo ?? {};
  const unpublished = property.isActive === false;

  const crumbs = [
    { label: 'Home', to: PATHS.home },
    ...(listingLabel
      ? [{ label: listingLabel, to: LISTING_PATH[property.listingType] ?? PATHS.properties }]
      : []),
    ...(locality?.slug ? [{ label: locality.name, to: PATHS.locality(locality.slug) }] : []),
    { label: property.title },
  ];

  const visibility = property.sectionVisibility ?? {};

  return (
    <>
      {/* TEMPORARY — `<Seo>` replaces this Helmet in prompt 38 with the §9.5
          templates and the JSON-LD graph. */}
      <Helmet>
        <title>{`${seo.title || property.title} | ${SITE.name}`}</title>
        <meta
          name="description"
          content={seo.description || property.shortDescription || property.title}
        />
        <link rel="canonical" href={`${SITE.url}${path}`} />
        <meta
          name="robots"
          content={
            preview || unpublished
              ? 'noindex, nofollow'
              : 'index, follow, max-image-preview:large, max-snippet:-1'
          }
        />
      </Helmet>

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
              ) : (
                <Section key={section.key} property={property} background={background} />
              );
            })}

            <RecentlyViewedSection
              exclude={property.id}
              background={visibleSections.length % 2 === 1 ? 'surface' : 'bg'}
            />
          </div>

          <div className={styles.aside}>
            <PriceCard property={property} banks={banks} onRequest={openLead} />
          </div>
        </div>
      </Container>

      <MobileCtaBar property={property} onEnquire={openLead} />

      <LeadModalTemp
        open={lead.open}
        onClose={closeLead}
        source={lead.source}
        propertyId={property.id}
        propertyTitle={property.title}
        agent={property.agent?.showOnListing ? property.agent : null}
      />
    </>
  );
};

export default PropertyDetails;
