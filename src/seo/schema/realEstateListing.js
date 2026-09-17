/**
 * A listing as search engines read it (§9.3).
 *
 * The node carries two types: `RealEstateListing`, which is what makes it a
 * listing, and the kind of dwelling it is — an `Apartment`, a `House`, a
 * `Place` for land and commercial space — which is what lets a result show the
 * right thing. Coordinates are published **only** when the record says the
 * exact location may be shown (§6.1 `showExactLocation`); an approximate pin
 * published as an exact one is worse than none.
 */

import { AREA_UNITS } from '../../config/enums';
import { absolute, compact, isoDate, ref } from './graph';
import { organizationId } from './organization';

/** schema.org's word for each of our property-type segments and slugs. */
const RESIDENCE_TYPES = {
  apartments: 'Apartment',
  studios: 'Apartment',
  'builder-floors': 'Apartment',
  penthouses: 'Apartment',
  duplexes: 'Apartment',
  'pg-co-living': 'Apartment',
  villas: 'House',
  'independent-houses': 'House',
  'row-houses': 'House',
};

/** `available` → schema.org availability. */
const AVAILABILITY = {
  available: 'https://schema.org/InStock',
  sold: 'https://schema.org/SoldOut',
  rented: 'https://schema.org/SoldOut',
  reserved: 'https://schema.org/LimitedAvailability',
};

/** The second `@type` of the listing: what kind of place it is. */
export function residenceTypeOf(property, propertyType) {
  const slug = propertyType?.slug ?? property?.propertyType?.slug ?? '';
  if (RESIDENCE_TYPES[slug]) return RESIDENCE_TYPES[slug];
  if (property?.segment === 'land' || property?.segment === 'commercial') return 'Place';
  return 'Residence';
}

/**
 * @param {object} input the normalised record (`entityAdapters.toSeoInput`) of a property
 * @param {{seoSettings?: object, siteUrl?: string, propertyTypes?: Array<object>,
 *   amenities?: Array<object>}} [context]
 * @returns {object|null}
 */
export function realEstateListingNode(input = {}, context = {}) {
  const property = input.entity ?? {};
  const canonical = input.canonical;
  if (!canonical) return null;

  const siteUrl = String(context.siteUrl ?? context.seoSettings?.siteUrl ?? '').replace(/\/+$/, '');
  const location = property.location ?? {};
  const pricing = property.pricing ?? {};
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

  const areaValue = area.superBuiltUpArea ?? area.builtUpArea ?? area.carpetArea ?? area.plotArea;
  const price = property.listingType === 'sale' ? pricing.price : pricing.rentPerMonth;

  return compact({
    '@type': ['RealEstateListing', residenceTypeOf(property, propertyType)],
    '@id': `${canonical}#listing`,
    url: canonical,
    name: input.title || input.effectiveTitle,
    description: input.description || input.summary,
    datePosted: isoDate(property.publishedAt ?? property.createdAt),
    dateModified: isoDate(property.updatedAt),
    image: input.images.map((image) => absolute(siteUrl, image.src)).filter(Boolean),
    provider: ref(organizationId(siteUrl)),
    address: compact({
      '@type': 'PostalAddress',
      streetAddress: location.address,
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
      ? {
          '@type': 'QuantitativeValue',
          value: Number(areaValue),
          unitText: AREA_UNITS.labelOf(area.areaUnit ?? 'sqft'),
        }
      : undefined,
    amenityFeature: amenities.map((amenity) => ({
      '@type': 'LocationFeatureSpecification',
      name: amenity?.name,
      value: true,
    })),
    offers:
      pricing.priceOnRequest || !Number(price)
        ? undefined
        : compact({
            '@type': 'Offer',
            price: Number(price),
            priceCurrency: pricing.currency || 'INR',
            availability: AVAILABILITY[property.availability] ?? AVAILABILITY.available,
            url: canonical,
          }),
  });
}

export default realEstateListingNode;
