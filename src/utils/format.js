import { formatDistanceToNowStrict } from 'date-fns';

/**
 * The one place that turns data into display strings (D33). It replaces the
 * five `formatPrice` and three `formatDate` copies the boilerplate carried.
 *
 * Conventions: Indian digit grouping (`en-IN`), lakh/crore for money, IST for
 * absolute dates (D22), and the em dash `—` for "no value".
 */

/** What every formatter renders when it has nothing to render. */
export const EMPTY = '—';

const RUPEE = '₹';

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/** Trim the trailing zeros of a fixed-decimal string: 1.40 -> 1.4, 2.00 -> 2. */
const trim = (fixed) => fixed.replace(/\.?0+$/, '');

/**
 * Indian digit grouping.
 * @param {number|string|null} value
 * @param {{ maximumFractionDigits?: number }} [options]
 */
export function formatNumber(value, { maximumFractionDigits = 0 } = {}) {
  const n = toNumber(value);
  if (n === null) return EMPTY;
  return n.toLocaleString('en-IN', { maximumFractionDigits });
}

/**
 * Money in lakh/crore notation.
 *
 *   >= 1 Cr -> `₹1.42 Cr` (2 decimals, trailing zeros trimmed)
 *   >= 1 L  -> `₹85.5 L`
 *   else    -> `₹45,000`
 *
 * `listingType: 'rent' | 'lease'` (or `perMonth: true`) appends `/month`.
 * `priceOnRequest: true` wins over everything and returns "Price on Request";
 * a missing value returns `—`, while a real `0` renders `₹0`.
 *
 * @param {number|string|null} value
 * @param {{ priceOnRequest?: boolean, listingType?: string, perMonth?: boolean, compact?: boolean }} [options]
 */
export function formatPrice(value, { priceOnRequest = false, listingType, perMonth } = {}) {
  if (priceOnRequest) return 'Price on Request';

  const n = toNumber(value);
  if (n === null) return EMPTY;

  const suffix = perMonth || listingType === 'rent' || listingType === 'lease' ? '/month' : '';

  if (Math.abs(n) >= 10000000) return `${RUPEE}${trim((n / 10000000).toFixed(2))} Cr${suffix}`;
  if (Math.abs(n) >= 100000) return `${RUPEE}${trim((n / 100000).toFixed(2))} L${suffix}`;
  return `${RUPEE}${n.toLocaleString('en-IN')}${suffix}`;
}

/**
 * `₹85 L – ₹1.2 Cr`. Falls back to the single value when only one end is known,
 * and collapses to one value when both ends are equal.
 *
 * @param {number|string|null} min
 * @param {number|string|null} max
 * @param {{ priceOnRequest?: boolean, listingType?: string, perMonth?: boolean }} [options]
 */
export function formatPriceRange(min, max, options = {}) {
  if (options.priceOnRequest) return 'Price on Request';

  const low = toNumber(min);
  const high = toNumber(max);
  if (low === null && high === null) return EMPTY;
  if (low === null) return formatPrice(high, options);
  if (high === null) return formatPrice(low, options);
  if (low === high) return formatPrice(low, options);
  return `${formatPrice(low, options)} – ${formatPrice(high, options)}`;
}

/**
 * `1,650 sq ft`.
 * @param {number|string|null} value
 * @param {string} [unit] one of the area units of `enums.js`; defaults to sq ft
 */
export function formatArea(value, unit = 'sq ft') {
  const n = toNumber(value);
  if (n === null) return EMPTY;
  return `${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ${unit}`;
}

/** `3 BHK`, `5+ BHK` above the highest configured bucket, `Studio` for 0. */
export function formatBhk(bedrooms) {
  const n = toNumber(bedrooms);
  if (n === null) return EMPTY;
  if (n <= 0) return 'Studio';
  return n >= 5 ? '5+ BHK' : `${n} BHK`;
}

const DATE_PARTS = { day: '2-digit', month: 'short', year: 'numeric' };
const TIME_PARTS = { hour: '2-digit', minute: '2-digit', hour12: true };

const parse = (value) => {
  if (!value && value !== 0) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * `05 Sep 2026` in IST — never "Invalid Date".
 * @param {string|Date|null} value
 * @param {{ withTime?: boolean }} [options]
 */
export function formatDate(value, { withTime = false } = {}) {
  const date = parse(value);
  if (!date) return EMPTY;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    ...DATE_PARTS,
    ...(withTime ? TIME_PARTS : {}),
  })
    .formatToParts(date)
    .map((part) =>
      // ICU renders September as "Sept" (and some versions as "Sep."); the
      // house format is always the three-letter abbreviation.
      part.type === 'month' ? part.value.replace(/[^A-Za-z]/g, '').slice(0, 3) : part.value
    )
    .join('');
}

/** `05 Sep 2026, 04:30 pm` in IST. */
export function formatDateTime(value) {
  return formatDate(value, { withTime: true });
}

/** `3 hours ago`, `2 days ago` — `date-fns` does the arithmetic (D22). */
export function formatRelative(value) {
  const date = parse(value);
  if (!date) return EMPTY;
  return `${formatDistanceToNowStrict(date)} ago`;
}

/**
 * A `tel:` target: digits only, with the Indian country code.
 * `+91 98765 43210` -> `+919876543210`. Numbers that already carry a country
 * code keep it; anything that is not a plausible number returns `''`.
 *
 * @param {string|number|null} value
 */
export function formatPhoneForTel(value) {
  if (value === null || value === undefined) return '';
  const raw = String(value).trim();
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (raw.startsWith('+')) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `+91${digits.slice(1)}`;
  return `+${digits}`;
}

const format = {
  formatArea,
  formatBhk,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPhoneForTel,
  formatPrice,
  formatPriceRange,
  formatRelative,
};

export default format;
