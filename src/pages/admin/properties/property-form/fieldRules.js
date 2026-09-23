/**
 * Which fields a listing actually has (00_MASTER_CONTEXT.md §6.1).
 *
 * A property record carries every field of every kind of property, but no
 * single listing does: a plot has no bedrooms, a resale flat has no possession
 * date, a rental has no booking price range. The rules that decide are written
 * **once**, here, so the tab that hides a field, the validator that excuses it
 * and the confirm dialog that clears it all agree — and so a test can read them
 * without rendering anything.
 *
 * Every rule takes the whole `values` object rather than the field it keys on,
 * because "shown" is nearly always a function of two of them (segment and
 * property type, status and listing type).
 */

import { AREA_UNITS } from '../../../../config/enums';

/* ------------------------------------------------------------------ *
 * Segment
 * ------------------------------------------------------------------ */

export const isResidential = (values) => values?.segment === 'residential';

export const isCommercial = (values) => values?.segment === 'commercial';

/** `land` in the contract, "Plots & Land" on screen (§6.17). */
export const isPlot = (values) => values?.segment === 'land';

/* ------------------------------------------------------------------ *
 * Listing type
 * ------------------------------------------------------------------ */

/** Rent and lease are quoted per month and share one set of fields (D90). */
export const isRentOrLease = (values) =>
  values?.listingType === 'rent' || values?.listingType === 'lease';

/* ------------------------------------------------------------------ *
 * Visibility
 * ------------------------------------------------------------------ */

/** Bedrooms, bathrooms, balconies, kitchen — a home, not a plot or an office. */
export const showsBhk = (values) => isResidential(values);

/**
 * Covered and open parking: a home **or** an office. Hidden for commercial
 * listings before, although every seeded office, shop and warehouse carries
 * parking and the details page prints it — so an editor could neither see nor
 * change what the public page said, and moving a listing into Commercial wiped it.
 */
export const showsParking = (values) => !isPlot(values);

/**
 * The residential types that stand on a plot of their own, so the plot's size
 * is part of what is being sold. Slugs, because they are what master data
 * keeps stable across environments (§6.3).
 */
export const PLOT_TYPE_SLUGS = new Set(['villas', 'independent-houses', 'row-houses']);

const PLOT_AREA_KEYS = ['plotArea', 'plotLength', 'plotWidth'];

const hasPlotValues = (values) =>
  PLOT_AREA_KEYS.some((key) => {
    const value = values?.area?.[key];
    return value !== null && value !== undefined && value !== '';
  });

/**
 * Plot area, length × width and the dimension unit.
 *
 * Plots always; a villa or a house too, because its plot is half of what it
 * is; and any listing that already holds a plot measurement, so a figure the
 * details page prints is never out of the editor's reach. It used to be plots
 * only — eight seeded villas and houses printed a plot area nobody could edit.
 *
 * @param {object} values
 * @param {string} [propertyTypeSlug] the listing's property type, when known
 */
export const showsPlotDimensions = (values, propertyTypeSlug) =>
  isPlot(values) || PLOT_TYPE_SLUGS.has(propertyTypeSlug) || hasPlotValues(values);

/** The built areas a home or an office is measured by. */
export const showsBuiltAreas = (values) => !isPlot(values);

/** Furnishing: a building's, so everything except bare land. */
export const showsFurnishing = (values) => !isPlot(values);

/**
 * Facing and ownership: every listing. A plot has a facing and a title as
 * surely as a flat does — all five seeded plots carry both and the details
 * page prints them — and hiding them for land hid them from the editor alone.
 */
export const showsFacingAndOwnership = () => true;

/** A floor number only means something inside a building. */
export const showsFloors = (values) => !isPlot(values);

/** The statuses that promise a date rather than describe a finished building. */
export const showsPossessionDate = (values) =>
  values?.constructionStatus === 'pre-launch' ||
  values?.constructionStatus === 'under-construction';

/**
 * A finished building's age. Not a plot's: land has no age, and the seeded
 * plots' `0` printed "Newly built" on every one of them.
 */
export const showsAge = (values) =>
  !isPlot(values) &&
  (values?.constructionStatus === 'ready-to-move' || values?.constructionStatus === 'resale');

/* ------------------------------------------------------------------ *
 * Pricing
 * ------------------------------------------------------------------ */

/**
 * A sale is quoted once; the range and the per-sq-ft rate belong to it. The
 * building's maintenance charge is shown for a sale as well — leaving it off
 * this list made moving a rental to Sale ask to clear a field the Sale view
 * then displayed.
 */
const SALE_PRICE_FIELDS = [
  'price',
  'priceOnRequest',
  'priceRangeMin',
  'priceRangeMax',
  'pricePerSqft',
  'priceNegotiable',
  'maintenanceChargesMonthly',
  'bookingAmount',
  'otherCharges',
];

/** A tenancy is quoted per month, with a deposit and a maintenance charge. */
const RENTAL_PRICE_FIELDS = [
  'rentPerMonth',
  'priceOnRequest',
  'securityDeposit',
  'maintenanceChargesMonthly',
  'priceNegotiable',
  'bookingAmount',
  'otherCharges',
];

/**
 * The `pricing` keys a listing of this type shows.
 *
 * @param {'sale'|'rent'|'lease'} listingType
 * @returns {string[]} keys of `values.pricing`
 */
export function priceFieldsFor(listingType) {
  return listingType === 'rent' || listingType === 'lease'
    ? [...RENTAL_PRICE_FIELDS]
    : [...SALE_PRICE_FIELDS];
}

/** Whether a `pricing` key is shown for a listing type. */
export const showsPriceField = (listingType, field) => priceFieldsFor(listingType).includes(field);

/**
 * The `pricing` keys that stop being shown when a listing changes type —
 * what the Basics tab offers to clear (§7 of prompt 19).
 *
 * `otherCharges` is never on this list: a maintenance charge or a stamp-duty
 * line is worth keeping whichever way the listing is going out.
 *
 * @param {'sale'|'rent'|'lease'} from
 * @param {'sale'|'rent'|'lease'} to
 * @returns {string[]}
 */
export function pricingFieldsClearedBy(from, to) {
  const kept = new Set(priceFieldsFor(to));
  return priceFieldsFor(from).filter(
    (field) => !kept.has(field) && field !== 'otherCharges' && field !== 'priceOnRequest'
  );
}

/* ------------------------------------------------------------------ *
 * Segment changes
 * ------------------------------------------------------------------ */

/** A home's rooms — the part of `configuration` only a home has. */
const ROOM_FIELDS = [
  'bedrooms',
  'bathrooms',
  'balconies',
  'servantRoom',
  'studyRoom',
  'poojaRoom',
  'kitchenType',
];

/** Parking, which a home and an office both have and a plot does not. */
const PARKING_FIELDS = ['parkingCovered', 'parkingOpen'];

/** The three built areas, which a plot does not have. */
const BUILT_AREA_FIELDS = ['superBuiltUpArea', 'builtUpArea', 'carpetArea'];

/** The plot measurements. */
const PLOT_AREA_FIELDS = ['plotArea', 'plotLength', 'plotWidth', 'plotDimensionUnit'];

/** What `configuration`/`area` value a cleared field returns to. */
const BLANK = {
  servantRoom: false,
  studyRoom: false,
  poojaRoom: false,
  kitchenType: '',
};

/**
 * The dotted paths that no longer apply once a listing moves to `segment`,
 * paired with the value they return to — the patch the Basics tab applies
 * after the editor confirms (§7 of prompt 19).
 *
 * Moving back does not restore anything: the fields come back blank, which is
 * the honest state for a listing that has just been reclassified.
 *
 * @param {'residential'|'commercial'|'land'} segment the segment being moved to
 * @returns {Record<string, unknown>} dotted path → blank value
 */
export function clearedBySegment(segment) {
  const patch = {};
  const clear = (prefix, fields) =>
    fields.forEach((field) => {
      patch[`${prefix}.${field}`] = BLANK[field] ?? null;
    });

  // Rooms are a home's; parking goes only with the building.
  if (segment !== 'residential') clear('configuration', ROOM_FIELDS);
  if (segment === 'land') clear('configuration', PARKING_FIELDS);
  if (segment === 'land') clear('area', BUILT_AREA_FIELDS);
  // A villa or a house keeps its plot, so only an office loses one.
  if (segment === 'commercial') clear('area', PLOT_AREA_FIELDS);
  if (segment === 'land') {
    // Facing and ownership stay: land has both.
    patch.furnishing = '';
    patch.floorNumber = null;
    patch.totalFloors = null;
    patch.ageOfPropertyYears = null;
  }

  return patch;
}

/** Whether any of a patch's paths currently holds something worth a confirm. */
export function anyFilled(values, paths) {
  return paths.some((path) => {
    const held = path.split('.').reduce((carried, key) => carried?.[key], values);
    return held !== null && held !== undefined && held !== '' && held !== false;
  });
}

/* ------------------------------------------------------------------ *
 * Area arithmetic
 * ------------------------------------------------------------------ */

/**
 * Length × width in the unit the plot area is stored in.
 *
 * `plotDimensionUnit` is typed as an `AREA_UNITS` value by the contract
 * (`src/services/schemas/property.js`), so "feet" is `sqft` and "metres" is
 * `sqm`; the square of either is exactly the area unit of the same name, and
 * `AREA_UNITS.toSqft` converts between them.
 *
 * @param {number|string|null} length
 * @param {number|string|null} width
 * @param {string} dimensionUnit an `AREA_UNITS` value
 * @param {string} areaUnit the unit `area.plotArea` is stored in
 * @returns {number|null} the area, rounded to two decimals, or `null`
 */
export function plotAreaFrom(length, width, dimensionUnit, areaUnit) {
  const l = Number(length);
  const w = Number(width);
  if (!Number.isFinite(l) || !Number.isFinite(w) || l <= 0 || w <= 0) return null;

  const inSqft = AREA_UNITS.toSqft(l * w, dimensionUnit || 'sqft');
  if (inSqft === null) return null;

  const target = AREA_UNITS.meta[areaUnit || 'sqft']?.sqftFactor;
  if (!target) return null;

  return Math.round((inSqft / target) * 100) / 100;
}

/** The two `AREA_UNITS` values that double as length units, for the plot select. */
export const PLOT_DIMENSION_UNITS = [
  { value: 'sqft', label: 'Feet (ft)' },
  { value: 'sqm', label: 'Metres (m)' },
];

/* ------------------------------------------------------------------ *
 * The per-sq-ft rate (D33)
 * ------------------------------------------------------------------ */

const measured = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

/**
 * The area a per-sq-ft rate divides by, **in square feet**.
 *
 * Super built-up is what the market quotes against; carpet area is the honest
 * fallback; a plot has neither. The record may be measured in any of the six
 * `AREA_UNITS`, so the figure is converted rather than assumed (§6.17).
 *
 * @param {object} area the `area` branch
 * @returns {number|null}
 */
export function sellableSqft(area = {}) {
  const value =
    measured(area.superBuiltUpArea) ?? measured(area.carpetArea) ?? measured(area.plotArea);
  if (value === null) return null;
  return AREA_UNITS.toSqft(value, area.areaUnit || 'sqft');
}

/**
 * The rate this listing's price works out at, rounded to the rupee.
 *
 * Rentals and listings priced on request have none: a monthly rent per square
 * foot is not a number anybody quotes, and a price on request has no price.
 *
 * @param {object} values the form values
 * @returns {number|null}
 */
export function derivedPricePerSqft(values = {}) {
  const pricing = values.pricing ?? {};
  if (isRentOrLease(values) || pricing.priceOnRequest === true) return null;

  const price = measured(pricing.price);
  const sqft = sellableSqft(values.area);
  if (price === null || !sqft) return null;

  return Math.round(price / sqft);
}

/**
 * The rate as the form holds it: `null` — "follow the price" — unless somebody
 * typed a rate of their own.
 *
 * The API stores the rate the form derived on save (D33), so a record comes
 * back holding the division itself, and a stored value used to read as "typed
 * by hand": after the first save the rate froze, and doubling the price left
 * the old figure on the site. A stored rate that *is* the division is still
 * following the price. A rental has no rate at all — seed #27 carried "44" (its
 * rent over its area), which reappeared as "₹44 per sq ft" the moment it was
 * moved to Sale.
 *
 * @param {object} values the form values, with the stored rate in `pricing`
 * @returns {number|null}
 */
export function heldPricePerSqft(values = {}) {
  const stored = measured(values.pricing?.pricePerSqft);
  if (stored === null || isRentOrLease(values)) return null;
  const derived = derivedPricePerSqft({
    ...values,
    pricing: { ...values.pricing, pricePerSqft: null },
  });
  return derived !== null && Math.round(stored) === derived ? null : stored;
}

/**
 * One area figure moved from one unit to another, to two decimals.
 *
 * @param {number|string|null} value
 * @param {string} from an `AREA_UNITS` value
 * @param {string} to
 * @returns {number|null}
 */
export function convertArea(value, from, to) {
  const number = measured(value);
  if (number === null) return value === '' || value === undefined ? null : value;
  const inSqft = AREA_UNITS.toSqft(number, from || 'sqft');
  const factor = AREA_UNITS.meta[to || 'sqft']?.sqftFactor;
  if (inSqft === null || !factor) return number;
  return Math.round((inSqft / factor) * 100) / 100;
}

/** The `area` figures a unit change converts. */
export const AREA_FIGURES = ['superBuiltUpArea', 'builtUpArea', 'carpetArea', 'plotArea'];
