/**
 * TEMPORARY — the bridge between the contract record of §6.1 and the field
 * names `PropertyListing` still reads.
 *
 * The property **details** page was rebuilt on the real shape in prompt 23, so
 * everything only it read — the gallery strings, the legacy specification and
 * nearby shapes, the flattened SEO fields, the old `sections` keys — went with
 * it. What is left is the handful of names the listing page's client-side
 * filter, its sort and `PropertyFilters`' facet lists still speak; prompt 26
 * replaces that page with the server-driven listing engine (D94) and deletes
 * this file.
 *
 * **Nothing writes through this adapter** and nothing in the admin reads
 * through it.
 *
 * Registered in `docs/PROJECT_STATE.md` → "Pending rewrites" (owner 26).
 */

const list = (value) => (Array.isArray(value) ? value : []);

/** The old `configuration` was an array of strings such as `["2 BHK", "3 BHK"]`. */
function legacyConfiguration(property) {
  const units = list(property.unitConfigurations)
    .filter((unit) => unit?.isActive !== false)
    .map((unit) => unit?.name)
    .filter(Boolean);
  if (units.length > 0) return [...new Set(units)];

  const bedrooms = property.configuration?.bedrooms;
  return bedrooms ? [`${bedrooms} BHK`] : [];
}

/** The one figure the price filter and the price sort compare. */
function legacyPrice(property) {
  const pricing = property.pricing ?? {};
  const isRental = property.listingType === 'rent' || property.listingType === 'lease';
  if (isRental) return pricing.rentPerMonth ?? null;
  return pricing.price ?? pricing.priceRangeMin ?? null;
}

/**
 * One contract property with the names the listing page still reads.
 *
 * Every field of the record is kept alongside them, so a component that has
 * already been rewritten can read `images`/`pricing` while the page around it
 * still narrows on `price` and `location.area`.
 *
 * @param {object|null} property a record from `/properties*`
 * @returns {object|null}
 */
export function toLegacyProperty(property) {
  if (!property || typeof property !== 'object') return null;

  const location = property.location ?? {};

  return {
    ...property,

    type: property.listingType ?? '',
    status: property.constructionStatus ?? '',
    propertyType: property.propertyType?.slug ?? '',
    propertyTypeId: property.propertyTypeId ?? property.propertyType?.id ?? null,

    price: legacyPrice(property),
    configuration: legacyConfiguration(property),

    location: {
      ...location,
      area: location.locality?.name ?? '',
      city: location.city?.name ?? '',
    },

    developer: property.project?.developer?.name ?? '',
  };
}

export default toLegacyProperty;
