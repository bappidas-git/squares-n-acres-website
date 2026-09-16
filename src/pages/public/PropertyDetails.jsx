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
import KeyFacts from '../../components/sections/property/KeyFacts';
import LeadModalTemp from '../../components/sections/property/LeadModalTemp';
import MobileCtaBar from '../../components/sections/property/MobileCtaBar';
import NotFound from './NotFound';
import PATHS from '../../routes/paths';
import PriceCard from '../../components/sections/property/PriceCard';
import PropertyGallery from '../../components/sections/property/PropertyGallery';
import SectionNav, { sectionElementId } from '../../components/sections/property/SectionNav';
import SectionPlaceholder from '../../components/sections/property/SectionPlaceholder';
import TitleBlock from '../../components/sections/property/TitleBlock';
import propertyService from '../../services/propertyService';
import recentlyViewed from '../../utils/recentlyViewed';
import useApi from '../../hooks/useApi';
import viewTracker from '../../utils/viewTracker';

import styles from './PropertyDetails.module.css';

/** `?preview=admin` — what the property form's "Preview" link appends (§5.10). */
const PREVIEW_TOKEN = 'admin';

/** Which prompt writes each section's content; the placeholder says so. */
const SECTION_OWNER = { documents: 25, finance: 25, similar: 25, enquiry: 25 };

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
 * This is the page's **shell**: the gallery and its lightbox, the title, the
 * price card, the key facts, the navigation over the sections the listing
 * actually has, and the mobile contact bar. The sections themselves are filled
 * in by prompts 24 and 25 — until then each visible section is an empty
 * wrapper with a development-only note inside it, so the navigation has
 * something to scroll to and a visitor is never shown an empty card.
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
            similarAvailable: true,
          })
        : [],
    [property, banks.length]
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

        <PropertyGallery
          images={property.images}
          title={property.title}
          videoUrl={property.videoUrl}
          virtualTourUrl={property.virtualTourUrl}
          showVideo={visibility.video !== false}
          showVirtualTour={visibility.virtualTour !== false}
          propertyId={property.id}
        />

        <TitleBlock property={property} />

        <div className={styles.layout}>
          <div className={styles.main}>
            <KeyFacts property={property} />

            <SectionNav sections={visibleSections} offset={headerHeight} />

            {visibleSections.map((section) => (
              <section
                key={section.key}
                id={sectionElementId(section.key)}
                className={styles.section}
                aria-label={section.label}
              >
                <SectionPlaceholder
                  label={section.label}
                  prompt={SECTION_OWNER[section.key] ?? 24}
                />
              </section>
            ))}
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
