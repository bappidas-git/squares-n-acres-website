/**
 * The two decisions about a listing's headline price that the public price
 * card and the admin's "On the site" preview must make the same way.
 *
 * They were written twice and disagreed: the preview printed "₹1.42 Cr
 * onwards" under every single sale price, while the card adds "onwards" only
 * when the figure is the bottom of something — a range, or several unit types.
 */

const isRental = (property) =>
  property?.listingType === 'rent' || property?.listingType === 'lease';

const present = (value) => value !== null && value !== undefined && value !== '';

/**
 * A sale quoted as a range with two different ends.
 *
 * @param {object} property a record of §6.1, or the property form's values
 * @returns {boolean}
 */
export function hasPriceRange(property) {
  const pricing = property?.pricing ?? {};
  if (isRental(property) || pricing.priceOnRequest === true) return false;
  return (
    present(pricing.priceRangeMin) &&
    present(pricing.priceRangeMax) &&
    Number(pricing.priceRangeMin) > 0 &&
    Number(pricing.priceRangeMax) > 0 &&
    Number(pricing.priceRangeMin) !== Number(pricing.priceRangeMax)
  );
}

/**
 * The unit configurations a visitor is shown — active, and actually filled in
 * (the form holds blank rows the payload drops).
 *
 * @param {object} property
 * @returns {Array<object>}
 */
export const shownUnitsOf = (property) =>
  (Array.isArray(property?.unitConfigurations) ? property.unitConfigurations : []).filter(
    (unit) => unit && unit.isActive !== false && String(unit.name ?? '').trim() !== ''
  );

/**
 * Whether the headline is a starting figure — "onwards".
 *
 * @param {object} property
 * @returns {boolean}
 */
export function showsOnwards(property) {
  const pricing = property?.pricing ?? {};
  if (isRental(property) || pricing.priceOnRequest === true) return false;
  return hasPriceRange(property) || shownUnitsOf(property).length > 1;
}
