/**
 * An admin property record → the form's values (00_MASTER_CONTEXT.md §6.1).
 *
 * Three things happen here and nowhere else:
 *
 *   - every key of §6.1 is present afterwards, filled from `createInitialState`
 *     when the record leaves it out, so no control ever goes uncontrolled;
 *   - the embedded read-only objects the API sends (`location.locality`,
 *     `project.developer`, `propertyType`, `amenities`, `badges`, the counters)
 *     are dropped — the form edits ids (§5.5);
 *   - a `null` the user types into becomes `''`, and every list is sorted by
 *     `order` and given row ids.
 */

import createInitialState, {
  createSeo,
  createSectionVisibility,
  makeConstructionSpec,
  makeDocument,
  makeFaq,
  makeFloorPlan,
  makeImage,
  makeNearbyPlace,
  makeOtherCharge,
  makeSpecification,
  makeTimelineItem,
  makeUnitConfiguration,
} from './initialState';

/** A string the form can put in an input: `null` and `undefined` become `''`. */
const text = (value) => (value === null || value === undefined ? '' : String(value));

/** A number or `null` — never `NaN`, never `''`. */
const num = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const bool = (value, fallback = false) => (typeof value === 'boolean' ? value : fallback);

const list = (value) => (Array.isArray(value) ? value : []);

/** `order` first, then the position the API sent them in. */
const byOrder = (rows) =>
  rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const a = Number.isFinite(Number(left.row?.order)) ? Number(left.row.order) : left.index;
      const b = Number.isFinite(Number(right.row?.order)) ? Number(right.row.order) : right.index;
      return a - b || left.index - right.index;
    })
    .map(({ row }) => row);

/** A row factory applied to a record's row: the factory's id survives only when the row has none. */
const row = (factory, source, patch) => {
  const base = factory();
  return { ...base, ...patch, id: source?.id ?? base.id };
};

/** Merges a record's sub-object over the blank one, key by key. */
const merge = (blank, source, mappers = {}) => {
  const next = { ...blank };
  for (const key of Object.keys(blank)) {
    const mapper = mappers[key];
    if (mapper) {
      next[key] = mapper(source?.[key]);
      continue;
    }
    if (source?.[key] !== undefined) next[key] = source[key];
  }
  return next;
};

/**
 * @param {object|null} record an admin property as `GET /admin/properties/:id` sends it
 * @returns {object} the form values
 */
export default function fromRecord(record) {
  const blank = createInitialState();
  if (!record || typeof record !== 'object') return blank;

  const seo = merge(createSeo(), record.seo, {
    secondaryKeywords: (value) => list(value).map(text),
    canonicalUrl: text,
    title: text,
    description: text,
    focusKeyword: text,
    // D34: the entity slug and `seo.slug` are one URL; the entity's wins.
    slug: (value) => text(record.slug || value),
    breadcrumbTitle: text,
    robots: (value) => merge(createSeo().robots, value),
    og: (value) => merge(createSeo().og, value, { title: text, description: text, imageUrl: text }),
    twitter: (value) =>
      merge(createSeo().twitter, value, { title: text, description: text, imageUrl: text }),
    schema: (value) =>
      merge(createSeo().schema, value, {
        custom: text,
        disabledAutoTypes: (types) => list(types).map(text),
      }),
    sitemap: (value) => merge(createSeo().sitemap, value, { changefreq: text, priority: num }),
    redirect: (value) => merge(createSeo().redirect, value, { toPath: text }),
    analysis: (value) => ({
      basic: list(value?.basic),
      additional: list(value?.additional),
      titleReadability: list(value?.titleReadability),
      contentReadability: list(value?.contentReadability),
    }),
  });

  return {
    ...blank,
    title: text(record.title),
    slug: text(record.slug),
    projectName: text(record.projectName),
    listingType: record.listingType ?? blank.listingType,
    segment: record.segment ?? blank.segment,
    propertyTypeId: num(record.propertyTypeId),
    constructionStatus: record.constructionStatus ?? blank.constructionStatus,
    availability: record.availability ?? blank.availability,
    possessionDate: text(record.possessionDate),
    ageOfPropertyYears: num(record.ageOfPropertyYears),
    furnishing: text(record.furnishing),
    facing: text(record.facing),
    floorNumber: num(record.floorNumber),
    totalFloors: num(record.totalFloors),
    ownership: text(record.ownership),
    reraNumber: text(record.reraNumber),
    reraRegistered: bool(record.reraRegistered),
    description: text(record.description),
    shortDescription: text(record.shortDescription),
    highlights: list(record.highlights).map(text),
    amenityIds: list(record.amenityIds).map(num).filter(Number.isFinite),
    badgeIds: list(record.badgeIds).map(num).filter(Number.isFinite),

    specifications: list(record.specifications).map((entry) =>
      row(() => makeSpecification(entry?.group ?? 'other'), entry, {
        group: entry?.group ?? 'other',
        label: text(entry?.label),
        value: text(entry?.value),
        icon: text(entry?.icon),
      })
    ),
    constructionSpecs: list(record.constructionSpecs).map((entry) =>
      row(() => makeConstructionSpec(entry?.group ?? 'other'), entry, {
        group: entry?.group ?? 'other',
        label: text(entry?.label),
        value: text(entry?.value),
      })
    ),
    unitConfigurations: list(record.unitConfigurations).map((entry) =>
      row(makeUnitConfiguration, entry, {
        name: text(entry?.name),
        bedrooms: num(entry?.bedrooms),
        bathrooms: num(entry?.bathrooms),
        superBuiltUpArea: num(entry?.superBuiltUpArea),
        carpetArea: num(entry?.carpetArea),
        areaUnit: entry?.areaUnit ?? 'sqft',
        price: num(entry?.price),
        priceOnRequest: bool(entry?.priceOnRequest),
        floorPlanImageUrl: text(entry?.floorPlanImageUrl),
        floorPlanPdfUrl: text(entry?.floorPlanPdfUrl),
        availableUnits: num(entry?.availableUnits),
        isActive: bool(entry?.isActive, true),
      })
    ),
    floorPlans: byOrder(list(record.floorPlans)).map((entry, index) =>
      row(makeFloorPlan, entry, {
        title: text(entry?.title),
        imageUrl: text(entry?.imageUrl),
        pdfUrl: text(entry?.pdfUrl),
        area: num(entry?.area),
        areaUnit: entry?.areaUnit ?? 'sqft',
        bedrooms: num(entry?.bedrooms),
        price: num(entry?.price),
        order: index + 1,
      })
    ),
    images: byOrder(list(record.images)).map((entry, index) =>
      row(makeImage, entry, {
        url: text(entry?.url),
        alt: text(entry?.alt),
        caption: text(entry?.caption),
        order: index + 1,
        isCover: bool(entry?.isCover),
      })
    ),
    videoUrl: text(record.videoUrl),
    virtualTourUrl: text(record.virtualTourUrl),
    brochureUrl: text(record.brochureUrl),
    brochureLeadGated: bool(record.brochureLeadGated, true),
    documents: byOrder(list(record.documents)).map((entry, index) =>
      row(makeDocument, entry, {
        title: text(entry?.title),
        url: text(entry?.url),
        type: entry?.type ?? 'other',
        leadGated: bool(entry?.leadGated, true),
        order: index + 1,
      })
    ),

    location: merge(blank.location, record.location, {
      address: text,
      localityId: num,
      cityId: num,
      pincode: text,
      landmark: text,
      latitude: num,
      longitude: num,
      mapEmbedUrl: text,
      showExactLocation: (value) => bool(value),
    }),
    nearbyPlaces: byOrder(list(record.nearbyPlaces)).map((entry, index) =>
      row(makeNearbyPlace, entry, {
        name: text(entry?.name),
        category: entry?.category ?? 'other',
        distanceKm: num(entry?.distanceKm),
        travelTimeMin: num(entry?.travelTimeMin),
        order: index + 1,
      })
    ),

    pricing: merge(blank.pricing, record.pricing, {
      price: num,
      priceOnRequest: (value) => bool(value),
      priceRangeMin: num,
      priceRangeMax: num,
      pricePerSqft: num,
      priceNegotiable: (value) => bool(value),
      rentPerMonth: num,
      securityDeposit: num,
      maintenanceChargesMonthly: num,
      bookingAmount: num,
      currency: (value) => value ?? 'INR',
      otherCharges: (value) =>
        list(value).map((entry) =>
          row(makeOtherCharge, entry, {
            label: text(entry?.label),
            amount: num(entry?.amount),
            note: text(entry?.note),
          })
        ),
    }),
    area: merge(blank.area, record.area, {
      superBuiltUpArea: num,
      builtUpArea: num,
      carpetArea: num,
      plotArea: num,
      areaUnit: (value) => value ?? 'sqft',
      plotLength: num,
      plotWidth: num,
      plotDimensionUnit: (value) => value ?? null,
    }),
    configuration: merge(blank.configuration, record.configuration, {
      bedrooms: num,
      bathrooms: num,
      balconies: num,
      parkingCovered: num,
      parkingOpen: num,
      servantRoom: (value) => bool(value),
      studyRoom: (value) => bool(value),
      poojaRoom: (value) => bool(value),
      kitchenType: text,
    }),
    project: merge(blank.project, record.project, {
      developerId: num,
      totalUnits: num,
      totalTowers: num,
      totalFloors: num,
      projectAreaAcres: num,
      openAreaPercent: num,
      launchDate: text,
      approvals: (value) => list(value).map(text),
      landmarkProject: (value) => bool(value),
    }),
    constructionTimeline: byOrder(list(record.constructionTimeline)).map((entry, index) =>
      row(makeTimelineItem, entry, {
        milestone: text(entry?.milestone),
        date: text(entry?.date),
        status: entry?.status ?? 'upcoming',
        imageUrl: text(entry?.imageUrl),
        note: text(entry?.note),
        order: index + 1,
      })
    ),
    constructionProgressPercent: num(record.constructionProgressPercent),
    faqs: byOrder(list(record.faqs)).map((entry, index) =>
      row(makeFaq, entry, {
        question: text(entry?.question),
        answer: text(entry?.answer),
        order: index + 1,
      })
    ),
    similarPropertyIds: list(record.similarPropertyIds).map(num).filter(Number.isFinite),
    sectionVisibility: merge(createSectionVisibility(), record.sectionVisibility),
    agent: merge(blank.agent, record.agent, {
      teamMemberId: num,
      name: text,
      phone: text,
      whatsapp: text,
      email: text,
      photoUrl: text,
      showOnListing: (value) => bool(value),
    }),
    seo,
    isActive: bool(record.isActive),
    isFeatured: bool(record.isFeatured),
    isVerified: bool(record.isVerified),
    priorityOrder: num(record.priorityOrder) ?? 0,
  };
}
