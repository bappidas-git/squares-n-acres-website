/**
 * A listing as search engines read it (§9.3).
 *
 * The node carries two types: `RealEstateListing`, which is what makes it a
 * listing, and the kind of dwelling it is — an `Apartment`, a `House`, a
 * `Place` for land and commercial space — which is what lets a result show the
 * right thing. Coordinates are published **only** when the record says the
 * exact location may be shown (§6.1 `showExactLocation`); an approximate pin
 * published as an exact one is worse than none. The street address follows the
 * same switch, for the same reason.
 *
 * Authored in CommonJS (D36b, extended in prompt 38) so that
 * `scripts/validate-jsonld.js` can `require` it from Node.
 */

const { AREA_UNITS } = require('../../config/enums');
const { segmentKind } = require('../../config/segments');
const { absolute, compact, isoDate, ref } = require('./graph');
const { organizationId } = require('./organization');
const { stripHtml } = require('../text');

/** schema.org's word for each of our property-type slugs (prompt 38 §4.2). */
const RESIDENCE_TYPES = {
  apartments: 'Apartment',
  studios: 'Apartment',
  'builder-floors': 'Apartment',
  penthouses: 'Apartment',
  'pg-co-living': 'Apartment',
  villas: 'House',
  'independent-houses': 'House',
  'row-houses': 'House',
  duplexes: 'House',
};

/** `available` → schema.org availability. */
const AVAILABILITY = {
  available: 'https://schema.org/InStock',
  sold: 'https://schema.org/SoldOut',
  rented: 'https://schema.org/SoldOut',
  reserved: 'https://schema.org/LimitedAvailability',
};

/** UN/CEFACT codes: square feet, square metres, and a month of rent. */
const AREA_UNIT_CODES = { sqft: 'FTK', sqm: 'MTK', sqyd: 'YDK' };

/** At most this many images per listing — Google reads the first few anyway. */
const MAX_IMAGES = 10;

/** A description a rich result can show: no markup, no essay (§9.3). */
const MAX_DESCRIPTION = 300;

/**
 * The second `@type` of the listing: what kind of place it is. Land and
 * commercial space are a `Place` by their segment's kind, so a segment an
 * editor added of either kind is one too (QA-52).
 */
function residenceTypeOf(property, propertyType, segments) {
  const slug = propertyType?.slug ?? property?.propertyType?.slug ?? '';
  if (RESIDENCE_TYPES[slug]) return RESIDENCE_TYPES[slug];
  const kind = segmentKind(property?.segment, segments);
  if (kind === 'land' || kind === 'commercial') return 'Place';
  return 'Residence';
}

/** The plain-text description, clipped at a sentence rather than mid-word. */
function shortDescription(input) {
  const source = stripHtml(input.description || input.summary || input.contentHtml || '');
  if (source.length <= MAX_DESCRIPTION) return source;

  const clipped = source.slice(0, MAX_DESCRIPTION);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${(lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped).replace(/[\s,;:.-]+$/, '')}…`;
}

/**
 * What the listing is offered at.
 *
 * A rent is a price *per month*, and an `Offer` that says `45000` without
 * saying so reads as a flat asking price — so rent carries a
 * `UnitPriceSpecification` with `unitCode: 'MON'` rather than a bare number.
 */
function offerOf(property, canonical) {
  const pricing = property.pricing ?? {};
  const isSale = property.listingType === 'sale';
  const price = Number(isSale ? pricing.price : pricing.rentPerMonth);

  if (pricing.priceOnRequest || !Number.isFinite(price) || price <= 0) return undefined;
  const currency = pricing.currency || 'INR';

  return compact({
    '@type': 'Offer',
    price,
    priceCurrency: currency,
    availability: AVAILABILITY[property.availability] ?? AVAILABILITY.available,
    url: canonical,
    priceSpecification: isSale
      ? undefined
      : {
          '@type': 'UnitPriceSpecification',
          price,
          priceCurrency: currency,
          unitCode: 'MON',
        },
  });
}

/**
 * @param {object} input the normalised record (`entityAdapters.toSeoInput`) of a property
 * @param {{seoSettings?: object, siteUrl?: string, propertyTypes?: Array<object>,
 *   amenities?: Array<object>, segments?: Array<object>}} [context] `segments`
 *   decides a segment's kind; the browser's registry answers when it is absent
 * @returns {object|null}
 */
function realEstateListingNode(input = {}, context = {}) {
  const property = input.entity ?? {};
  const canonical = input.canonical;
  if (!canonical) return null;

  const siteUrl = String(context.siteUrl ?? context.seoSettings?.siteUrl ?? '').replace(/\/+$/, '');
  const location = property.location ?? {};
  const area = property.area ?? {};
  const configuration = property.configuration ?? {};
  const propertyType =
    property.propertyType ??
    (Array.isArray(context.propertyTypes)
      ? context.propertyTypes.find((row) => String(row?.id) === String(property.propertyTypeId))
      : null);

  const amenities = Array.isArray(property.amenities)
    ? property.amenities
    : (Array.isArray(context.amenities) ? context.amenities : []).filter((row) =>
        (property.amenityIds ?? []).map(String).includes(String(row?.id))
      );

  const developer =
    property.project?.developer ??
    (Array.isArray(context.developers)
      ? context.developers.find((row) => String(row?.id) === String(property.project?.developerId))
      : null);

  const areaValue = area.superBuiltUpArea ?? area.builtUpArea ?? area.carpetArea ?? area.plotArea;
  const areaUnit = area.areaUnit ?? 'sqft';

  return compact({
    '@type': ['RealEstateListing', residenceTypeOf(property, propertyType, context.segments)],
    '@id': `${canonical}#listing`,
    url: canonical,
    name: input.title || input.effectiveTitle,
    description: shortDescription(input),
    datePosted: isoDate(property.publishedAt ?? property.createdAt),
    dateModified: isoDate(property.updatedAt),
    image: input.images
      .map((image) => absolute(siteUrl, image.src))
      .filter(Boolean)
      .slice(0, MAX_IMAGES),
    provider: ref(organizationId(siteUrl)),
    seller: developer?.name
      ? compact({
          '@type': 'Organization',
          name: developer.name,
          url: developer.slug ? absolute(siteUrl, `/builders/${developer.slug}`) : undefined,
        })
      : undefined,
    address: compact({
      '@type': 'PostalAddress',
      // An exact street address is the one field that turns an approximate pin
      // into a doorstep, so it follows `showExactLocation` like `geo` does.
      streetAddress: location.showExactLocation ? location.address : undefined,
      addressLocality: location.locality?.name ?? input.extras?.localityName,
      addressRegion: location.city?.state ?? 'Karnataka',
      postalCode: location.pincode,
      addressCountry: 'IN',
    }),
    geo:
      location.showExactLocation && location.latitude && location.longitude
        ? {
            '@type': 'GeoCoordinates',
            latitude: location.latitude,
            longitude: location.longitude,
          }
        : undefined,
    numberOfRooms: Number(configuration.bedrooms) || undefined,
    numberOfBathroomsTotal: Number(configuration.bathrooms) || undefined,
    floorSize: areaValue
      ? compact({
          '@type': 'QuantitativeValue',
          value: Number(areaValue),
          unitCode: AREA_UNIT_CODES[areaUnit],
          unitText: AREA_UNITS.labelOf(areaUnit),
        })
      : undefined,
    amenityFeature: amenities.map((amenity) => ({
      '@type': 'LocationFeatureSpecification',
      name: amenity?.name,
      value: true,
    })),
    offers: offerOf(property, canonical),
  });
}

module.exports = realEstateListingNode;
module.exports.realEstateListingNode = realEstateListingNode;
module.exports.residenceTypeOf = residenceTypeOf;
module.exports.AREA_UNIT_CODES = AREA_UNIT_CODES;
module.exports.MAX_IMAGES = MAX_IMAGES;
