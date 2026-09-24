/**
 * The form's values → the body of `POST`/`PUT /admin/properties`
 * (00_MASTER_CONTEXT.md §5.8, §6.1).
 *
 * A `PUT` replaces the whole record, so this returns the **complete** write
 * shape every time — nothing is left out because a tab has not been opened.
 * On the way it:
 *
 *   - drops the read-only and embedded keys (`propertyType`, `amenities`,
 *     `location.locality`, `viewCount`, `publishedAt`, the timestamps…);
 *   - drops the `tmp-` ids this browser invented and keeps the numeric ones,
 *     so the API assigns ids to new rows and leaves existing rows alone (§5.5);
 *   - drops rows the editor added and never filled in;
 *   - trims strings, turns `''` into `null` for every nullable field, and
 *     keeps `''` where the contract asks for a string;
 *   - renumbers each ordered list `1..n` and guarantees exactly one cover image;
 *   - computes `pricing.pricePerSqft` when it is empty and can be derived (D33);
 *   - mirrors `seo.slug` onto the entity slug (D34).
 *
 * `seo.score` / `seo.analysis` and their companions are computed, not edited:
 * they are passed through exactly as they arrived, so a save from this form
 * never discards what the SEO panel (prompt 36) wrote.
 */

import { derivedPricePerSqft, isRentOrLease, showsAge, showsPossessionDate } from './fieldRules';
import { isTmpId } from './initialState';
import { tidyPhone } from '../../../../utils/validators';

/** A trimmed string, `''` when there is nothing. */
const str = (value) => (value === null || value === undefined ? '' : String(value).trim());

/** A trimmed string or `null` — for every nullable string of §6.1. */
const strOrNull = (value) => str(value) || null;

/** A finite number or `null`; `''` is nothing, not zero. */
const num = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/** A whole number or `null`. */
const int = (value) => {
  const parsed = num(value);
  return parsed === null ? null : Math.trunc(parsed);
};

const bool = (value) => value === true;

const list = (value) => (Array.isArray(value) ? value : []);

/** An id the API can use: a numeric id survives, a `tmp-` one is left out. */
const keepId = (id) => {
  if (isTmpId(id)) return {};
  const parsed = int(id);
  return parsed === null ? {} : { id: parsed };
};

/** `1..n`, in the order the rows are already in. */
const ordered = (rows) => rows.map((entry, index) => ({ ...entry, order: index + 1 }));

/**
 * Exactly one cover image — the marked one, else the first (§6.1).
 * The same rule the API applies, applied here so the form and the record agree.
 */
const withCover = (images) => {
  if (images.length === 0) return images;
  const marked = images.findIndex((image) => image.isCover);
  const cover = marked === -1 ? 0 : marked;
  return images.map((image, index) => ({ ...image, isCover: index === cover }));
};

/* ------------------------------------------------------------------ *
 * "Empty" per list — a row nobody filled in is not saved
 * ------------------------------------------------------------------ */

const filled = (...values) => values.some((value) => str(value) !== '');
const anyNumber = (...values) => values.some((value) => num(value) !== null);

const KEEP_ROW = {
  images: (r) => filled(r.url),
  unitConfigurations: (r) => filled(r.name) || anyNumber(r.superBuiltUpArea, r.carpetArea, r.price),
  floorPlans: (r) => filled(r.title, r.imageUrl),
  documents: (r) => filled(r.title, r.url),
  nearbyPlaces: (r) => filled(r.name),
  // A specification needs **both** halves: the shared schema requires a value
  // (`src/services/schemas/property.js`), so a row that only carries a label —
  // what "Add standard rows" lays out — is scaffolding inside the form, not a
  // record. The repeater says so under the list.
  specifications: (r) => filled(r.label) && filled(r.value),
  constructionSpecs: (r) => filled(r.label) && filled(r.value),
  constructionTimeline: (r) => filled(r.milestone),
  faqs: (r) => filled(r.question, r.answer),
  otherCharges: (r) => filled(r.label) || anyNumber(r.amount),
};

/** One list of `source`, without the rows nobody filled in. */
const rowsOf = (source, key) => list(source?.[key]).filter((row) => KEEP_ROW[key](row));

/** Where each list lives in the form values. */
const LIST_SOURCES = {
  images: (values) => values,
  unitConfigurations: (values) => values,
  floorPlans: (values) => values,
  documents: (values) => values,
  nearbyPlaces: (values) => values,
  specifications: (values) => values,
  constructionSpecs: (values) => values,
  constructionTimeline: (values) => values,
  faqs: (values) => values,
  'pricing.otherCharges': (values) => values.pricing,
};

/**
 * For each list, the form index of every row the payload keeps, in order.
 *
 * A 422 counts rows in the **payload**, which has dropped the rows nobody
 * filled in: `unitConfigurations.0.name` is the first row sent, which may be
 * the form's second. This is what maps it back onto the row it is about.
 *
 * @param {object} values
 * @returns {Record<string, number[]>}
 */
export function keptRowIndexes(values = {}) {
  const map = {};
  for (const [path, sourceOf] of Object.entries(LIST_SOURCES)) {
    const key = path.split('.').pop();
    map[path] = list(sourceOf(values)?.[key])
      .map((row, index) => (KEEP_ROW[key](row) ? index : null))
      .filter((index) => index !== null);
  }
  map.highlights = list(values.highlights)
    .map((entry, index) => (str(entry) ? index : null))
    .filter((index) => index !== null);
  return map;
}

/**
 * A 422 key rewritten from payload rows to form rows — `unitConfigurations.0.name`
 * → `unitConfigurations.1.name` when the form's first row was blank.
 *
 * @param {string} path
 * @param {Record<string, number[]>} kept `keptRowIndexes(values)`
 * @returns {string}
 */
export function formPathOf(path, kept) {
  for (const listPath of Object.keys(kept)) {
    const match = new RegExp(`^${listPath.replace('.', '\\.')}\\.(\\d+)(\\..*)?$`).exec(path);
    if (!match) continue;
    const formIndex = kept[listPath][Number(match[1])];
    return formIndex === undefined ? path : `${listPath}.${formIndex}${match[2] ?? ''}`;
  }
  return path;
}

/**
 * @param {object} values the form's values
 * @returns {object} the request body
 */
export default function toPayload(values = {}) {
  const slug = str(values.slug);
  const area = values.area ?? {};
  const pricing = values.pricing ?? {};

  // Editable, so it is only ever derived when the editor left it empty (D33);
  // `fieldRules` owns the arithmetic, so the Pricing tab shows the same figure.
  // A rental has no rate: a monthly rent over the area is not a figure anybody
  // quotes, and one left over from a sale must not travel with it.
  const pricePerSqft = isRentOrLease(values)
    ? null
    : (num(pricing.pricePerSqft) ?? derivedPricePerSqft(values));

  const images = ordered(
    withCover(
      rowsOf(values, 'images').map((entry) => ({
        ...keepId(entry.id),
        url: str(entry.url),
        alt: str(entry.alt),
        caption: strOrNull(entry.caption),
        isCover: bool(entry.isCover),
      }))
    )
  );

  const seo = values.seo ?? {};

  return {
    slug,
    title: str(values.title),
    projectName: strOrNull(values.projectName),
    listingType: values.listingType,
    segment: values.segment,
    propertyTypeId: int(values.propertyTypeId),
    constructionStatus: values.constructionStatus,
    availability: values.availability,
    // Only the one the status shows: a listing moved from "under construction"
    // to "resale" kept its hidden possession date, and the details page printed
    // "Possession Jun 2027" over the age the editor had just typed.
    possessionDate: showsPossessionDate(values) ? strOrNull(values.possessionDate) : null,
    ageOfPropertyYears: showsAge(values) ? int(values.ageOfPropertyYears) : null,
    furnishing: strOrNull(values.furnishing),
    facing: strOrNull(values.facing),
    floorNumber: int(values.floorNumber),
    totalFloors: int(values.totalFloors),
    ownership: strOrNull(values.ownership),
    reraNumber: strOrNull(values.reraNumber),
    reraRegistered: bool(values.reraRegistered),
    description: str(values.description),
    shortDescription: str(values.shortDescription),
    highlights: list(values.highlights).map(str).filter(Boolean),
    amenityIds: list(values.amenityIds)
      .map(int)
      .filter((id) => id !== null),
    badgeIds: list(values.badgeIds)
      .map(int)
      .filter((id) => id !== null),

    specifications: rowsOf(values, 'specifications').map((entry) => ({
      group: entry.group || 'other',
      label: str(entry.label),
      value: str(entry.value),
      icon: strOrNull(entry.icon),
    })),
    constructionSpecs: rowsOf(values, 'constructionSpecs').map((entry) => ({
      group: entry.group || 'other',
      label: str(entry.label),
      value: str(entry.value),
    })),
    unitConfigurations: rowsOf(values, 'unitConfigurations').map((entry) => ({
      ...keepId(entry.id),
      name: str(entry.name),
      bedrooms: int(entry.bedrooms),
      bathrooms: int(entry.bathrooms),
      superBuiltUpArea: num(entry.superBuiltUpArea),
      carpetArea: num(entry.carpetArea),
      areaUnit: entry.areaUnit || 'sqft',
      price: num(entry.price),
      priceOnRequest: bool(entry.priceOnRequest),
      floorPlanImageUrl: strOrNull(entry.floorPlanImageUrl),
      floorPlanPdfUrl: strOrNull(entry.floorPlanPdfUrl),
      availableUnits: int(entry.availableUnits),
      isActive: entry.isActive !== false,
    })),
    floorPlans: ordered(
      rowsOf(values, 'floorPlans').map((entry) => ({
        ...keepId(entry.id),
        title: str(entry.title),
        imageUrl: str(entry.imageUrl),
        pdfUrl: strOrNull(entry.pdfUrl),
        area: num(entry.area),
        areaUnit: entry.areaUnit || 'sqft',
        bedrooms: int(entry.bedrooms),
        price: num(entry.price),
      }))
    ),
    images,
    videoUrl: strOrNull(values.videoUrl),
    virtualTourUrl: strOrNull(values.virtualTourUrl),
    brochureUrl: strOrNull(values.brochureUrl),
    brochureLeadGated: values.brochureLeadGated !== false,
    documents: ordered(
      rowsOf(values, 'documents').map((entry) => ({
        ...keepId(entry.id),
        title: str(entry.title),
        url: str(entry.url),
        type: entry.type || 'other',
        leadGated: entry.leadGated !== false,
      }))
    ),

    location: {
      address: str(values.location?.address),
      localityId: int(values.location?.localityId),
      cityId: int(values.location?.cityId),
      pincode: strOrNull(values.location?.pincode),
      landmark: strOrNull(values.location?.landmark),
      latitude: num(values.location?.latitude),
      longitude: num(values.location?.longitude),
      mapEmbedUrl: strOrNull(values.location?.mapEmbedUrl),
      showExactLocation: bool(values.location?.showExactLocation),
    },
    nearbyPlaces: ordered(
      rowsOf(values, 'nearbyPlaces').map((entry) => ({
        ...keepId(entry.id),
        name: str(entry.name),
        category: entry.category || 'other',
        distanceKm: num(entry.distanceKm),
        travelTimeMin: int(entry.travelTimeMin),
      }))
    ),

    pricing: {
      price: num(pricing.price),
      priceOnRequest: bool(pricing.priceOnRequest),
      priceRangeMin: num(pricing.priceRangeMin),
      priceRangeMax: num(pricing.priceRangeMax),
      pricePerSqft,
      priceNegotiable: bool(pricing.priceNegotiable),
      rentPerMonth: num(pricing.rentPerMonth),
      securityDeposit: num(pricing.securityDeposit),
      maintenanceChargesMonthly: num(pricing.maintenanceChargesMonthly),
      bookingAmount: num(pricing.bookingAmount),
      otherCharges: rowsOf(pricing, 'otherCharges').map((entry) => ({
        label: str(entry.label),
        amount: num(entry.amount) ?? 0,
        note: strOrNull(entry.note),
      })),
      currency: pricing.currency || 'INR',
    },
    area: {
      superBuiltUpArea: num(area.superBuiltUpArea),
      builtUpArea: num(area.builtUpArea),
      carpetArea: num(area.carpetArea),
      plotArea: num(area.plotArea),
      areaUnit: area.areaUnit || 'sqft',
      plotLength: num(area.plotLength),
      plotWidth: num(area.plotWidth),
      plotDimensionUnit: strOrNull(area.plotDimensionUnit),
    },
    configuration: {
      bedrooms: int(values.configuration?.bedrooms),
      bathrooms: int(values.configuration?.bathrooms),
      balconies: int(values.configuration?.balconies),
      parkingCovered: int(values.configuration?.parkingCovered),
      parkingOpen: int(values.configuration?.parkingOpen),
      servantRoom: bool(values.configuration?.servantRoom),
      studyRoom: bool(values.configuration?.studyRoom),
      poojaRoom: bool(values.configuration?.poojaRoom),
      kitchenType: strOrNull(values.configuration?.kitchenType),
    },
    project: {
      developerId: int(values.project?.developerId),
      totalUnits: int(values.project?.totalUnits),
      totalTowers: int(values.project?.totalTowers),
      totalFloors: int(values.project?.totalFloors),
      projectAreaAcres: num(values.project?.projectAreaAcres),
      openAreaPercent: int(values.project?.openAreaPercent),
      launchDate: strOrNull(values.project?.launchDate),
      approvals: list(values.project?.approvals).map(str).filter(Boolean),
      landmarkProject: bool(values.project?.landmarkProject),
    },
    constructionTimeline: ordered(
      rowsOf(values, 'constructionTimeline').map((entry) => ({
        ...keepId(entry.id),
        milestone: str(entry.milestone),
        date: strOrNull(entry.date),
        status: entry.status || 'upcoming',
        imageUrl: strOrNull(entry.imageUrl),
        note: strOrNull(entry.note),
      }))
    ),
    constructionProgressPercent: int(values.constructionProgressPercent),
    faqs: ordered(
      rowsOf(values, 'faqs').map((entry) => ({
        ...keepId(entry.id),
        question: str(entry.question),
        answer: str(entry.answer),
      }))
    ),
    // The contract caps the editor's picks at six, ordered (§6.1).
    similarPropertyIds: list(values.similarPropertyIds)
      .map(int)
      .filter((id) => id !== null)
      .slice(0, 6),
    sectionVisibility: { ...(values.sectionVisibility ?? {}) },
    agent: {
      teamMemberId: int(values.agent?.teamMemberId),
      name: strOrNull(values.agent?.name),
      // The ten digits every record stores, however the number was typed
      // ("+91 98450 12345", "98450-12345") — QA-61.
      phone: strOrNull(tidyPhone(str(values.agent?.phone))),
      whatsapp: strOrNull(tidyPhone(str(values.agent?.whatsapp))),
      email: strOrNull(values.agent?.email),
      photoUrl: strOrNull(values.agent?.photoUrl),
      showOnListing: bool(values.agent?.showOnListing),
    },
    seo: {
      focusKeyword: str(seo.focusKeyword),
      secondaryKeywords: list(seo.secondaryKeywords).map(str).filter(Boolean),
      title: str(seo.title),
      description: str(seo.description),
      // D34: one URL, so the panel never disagrees with the Basics tab.
      slug,
      canonicalUrl: strOrNull(seo.canonicalUrl),
      robots: { ...(seo.robots ?? {}) },
      og: {
        title: strOrNull(seo.og?.title),
        description: strOrNull(seo.og?.description),
        imageUrl: strOrNull(seo.og?.imageUrl),
      },
      twitter: {
        card: seo.twitter?.card || 'summary_large_image',
        title: strOrNull(seo.twitter?.title),
        description: strOrNull(seo.twitter?.description),
        imageUrl: strOrNull(seo.twitter?.imageUrl),
      },
      breadcrumbTitle: strOrNull(seo.breadcrumbTitle),
      schema: {
        type: seo.schema?.type || 'auto',
        custom: str(seo.schema?.custom),
        disabledAutoTypes: list(seo.schema?.disabledAutoTypes).map(str).filter(Boolean),
      },
      sitemap: {
        include: seo.sitemap?.include !== false,
        priority: num(seo.sitemap?.priority),
        changefreq: strOrNull(seo.sitemap?.changefreq),
      },
      redirect: {
        enabled: bool(seo.redirect?.enabled),
        toPath: str(seo.redirect?.toPath),
        statusCode: int(seo.redirect?.statusCode) ?? 301,
      },
      // Computed by `src/seo`, stored by the panel (prompt 36) — carried, never rewritten.
      score: int(seo.score),
      scoreBand: seo.scoreBand || 'none',
      testsPassed: int(seo.testsPassed) ?? 0,
      testsTotal: int(seo.testsTotal) ?? 0,
      analysis: {
        basic: list(seo.analysis?.basic),
        additional: list(seo.analysis?.additional),
        titleReadability: list(seo.analysis?.titleReadability),
        contentReadability: list(seo.analysis?.contentReadability),
      },
      lastAnalyzedAt: seo.lastAnalyzedAt ?? null,
    },
    isActive: bool(values.isActive),
    isFeatured: bool(values.isFeatured),
    isVerified: bool(values.isVerified),
    priorityOrder: int(values.priorityOrder) ?? 0,
  };
}
