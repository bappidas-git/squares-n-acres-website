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

/** Length × width and the dimension unit: plots only. */
export const showsPlotDimensions = (values) => isPlot(values);

/** The built areas a home or an office is measured by. */
export const showsBuiltAreas = (values) => !isPlot(values);

/** Furnishing, facing and ownership: everything except bare land. */
export const showsFurnishing = (values) => !isPlot(values);

/** A floor number only means something inside a building. */
export const showsFloors = (values) => !isPlot(values);

/** The statuses that promise a date rather than describe a finished building. */
export const showsPossessionDate = (values) =>
  values?.constructionStatus === 'pre-launch' ||
  values?.constructionStatus === 'under-construction';

/** The statuses where the building already exists and has an age. */
export const showsAge = (values) =>
  values?.constructionStatus === 'ready-to-move' || values?.constructionStatus === 'resale';

/* ------------------------------------------------------------------ *
 * Pricing
 * ------------------------------------------------------------------ */

/** A sale is quoted once; the range and the per-sq-ft rate belong to it. */
const SALE_PRICE_FIELDS = [
  'price',
  'priceOnRequest',
  'priceRangeMin',
  'priceRangeMax',
  'pricePerSqft',
  'priceNegotiable',
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

/** Everything under `configuration` — a home's rooms. */
const CONFIGURATION_FIELDS = [
  'bedrooms',
  'bathrooms',
  'balconies',
  'parkingCovered',
  'parkingOpen',
  'servantRoom',
  'studyRoom',
  'poojaRoom',
  'kitchenType',
];

/** The three built areas, which a plot does not have. */
const BUILT_AREA_FIELDS = ['superBuiltUpArea', 'builtUpArea', 'carpetArea'];

/** The plot-only measurements. */
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

  if (segment !== 'residential') clear('configuration', CONFIGURATION_FIELDS);
  if (segment === 'land') clear('area', BUILT_AREA_FIELDS);
  if (segment !== 'land') clear('area', PLOT_AREA_FIELDS);
  if (segment === 'land') {
    patch.furnishing = '';
    patch.facing = '';
    patch.ownership = '';
    patch.floorNumber = null;
    patch.totalFloors = null;
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
