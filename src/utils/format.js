/**
 * The one place that turns data into display strings (D33). It replaces the
 * five `formatPrice` and three `formatDate` copies the boilerplate carried.
 *
 * Conventions: Indian digit grouping (`en-IN`), lakh/crore for money, IST for
 * absolute dates (D22), and the em dash `—` for "no value".
 *
 * Authored in CommonJS (D36b, extended in prompt 38): `src/seo/variables.js`
 * formats the price and the area a title template prints, and
 * `scripts/validate-jsonld.js` has to `require` that chain from Node with no
 * bundler in front of it.
 *
 * That is also why nothing here `require`s a package: Create React App's
 * catch-all asset rule excludes `.js`, `.mjs`, `.jsx`, `.ts`, `.tsx`, `.html`
 * and `.json` and **nothing else**, so a `require()` that resolves to a `.cjs`
 * entry — which is what `date-fns` 4's `require` condition points at — is
 * emitted as a *file* and the call returns its URL as a string. That is not an
 * error anywhere; it just leaves the import silently undefined, which is how
 * `formatRelative` took the whole admin shell down with it. Everything below
 * is either self-contained or built on `Intl`, which is in the platform.
 */

/** What every formatter renders when it has nothing to render. */
const EMPTY = '—';

const RUPEE = '₹';

/**
 * The number a value stands for, or `null`.
 *
 * `Number()` is too generous to be asked directly: `Number('   ')`,
 * `Number([])`, `Number(null)` and `Number(false)` are all `0`, so a field the
 * editor left as spaces and an empty list both rendered as `₹0` — a price of
 * zero, shown to a visitor, where there is no price at all. Only a number and a
 * string that says a number count.
 */
const toNumber = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim() === '') return null;
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
function formatNumber(value, { maximumFractionDigits = 0 } = {}) {
  const n = toNumber(value);
  if (n === null) return EMPTY;
  return n.toLocaleString('en-IN', { maximumFractionDigits });
}

const CRORE = 10000000;
const LAKH = 100000;

/**
 * The unit a figure reads in, chosen **after** rounding.
 *
 * Picking the unit from the raw number and rounding afterwards makes
 * ₹99,99,999 come out as `₹100 L`, which is a quantity nobody writes: past
 * ninety-nine and a half lakh an Indian price is quoted in crore. Rounding
 * first is what puts the boundary where a reader expects it.
 *
 * @param {number} value
 * @returns {{divisor: number, suffix: string}|null} `null` below a lakh
 */
function unitOf(value) {
  const abs = Math.abs(value);
  if (abs >= CRORE) return { divisor: CRORE, suffix: ' Cr' };
  if (abs < LAKH) return null;
  return Number((abs / LAKH).toFixed(2)) >= 100
    ? { divisor: CRORE, suffix: ' Cr' }
    : { divisor: LAKH, suffix: ' L' };
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
function formatPrice(value, { priceOnRequest = false, listingType, perMonth } = {}) {
  if (priceOnRequest) return 'Price on Request';

  const n = toNumber(value);
  if (n === null) return EMPTY;

  const suffix = perMonth || listingType === 'rent' || listingType === 'lease' ? '/month' : '';

  const unit = unitOf(n);
  if (unit) return `${RUPEE}${trim((n / unit.divisor).toFixed(2))}${unit.suffix}${suffix}`;
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
function formatPriceRange(min, max, options = {}) {
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
function formatArea(value, unit = 'sq ft') {
  const n = toNumber(value);
  if (n === null) return EMPTY;
  return `${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ${unit}`;
}

/** `3 BHK`, `5+ BHK` above the highest configured bucket, `Studio` for 0. */
function formatBhk(bedrooms) {
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
function formatDate(value, { withTime = false } = {}) {
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
function formatDateTime(value) {
  return formatDate(value, { withTime: true });
}

/**
 * `March 2027` in IST — a month and a year, for a possession promise nobody
 * made to the day.
 *
 * @param {string|Date|null} value
 */
function formatMonthYear(value) {
  const date = parse(value);
  if (!date) return EMPTY;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/** `04:30 pm` in IST — the clock alone, for "Draft saved …" style indicators. */
function formatTime(value) {
  const date = parse(value);
  if (!date) return EMPTY;
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', ...TIME_PARTS }).format(date);
}

/**
 * The units a distance is expressed in, and how many of each make the next one.
 *
 * `Infinity` on the last is what stops the walk: anything a year or more is
 * counted in years.
 */
const RELATIVE_UNITS = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 30],
  ['month', 12],
  ['year', Infinity],
];

const RELATIVE_FORMAT = new Intl.RelativeTimeFormat('en-IN', { numeric: 'always' });

/**
 * `3 hours ago`, `2 days ago`, `in 5 minutes` (D22).
 *
 * The largest unit that still counts more than one of itself, rounded — the
 * same reading `date-fns`'s `formatDistanceToNowStrict` gave, from `Intl`
 * instead, which is in the platform and needs no import (see the note at the
 * top of this file).
 *
 * @param {string|number|Date} value
 * @returns {string} `'—'` when it is not a date
 */
function formatRelative(value) {
  const date = parse(value);
  if (!date) return EMPTY;

  const elapsed = Date.now() - date.getTime();
  let amount = Math.abs(elapsed) / 1000;
  let unit = 'second';

  for (const [name, perNext] of RELATIVE_UNITS) {
    unit = name;
    if (amount < perNext) break;
    amount /= perNext;
  }

  // Never "0 seconds ago": the smallest thing worth saying is one of something.
  const rounded = Math.max(1, Math.round(amount));
  return RELATIVE_FORMAT.format(elapsed >= 0 ? -rounded : rounded, unit);
}

/**
 * A `tel:` target: digits only, with the Indian country code.
 * `+91 98765 43210` -> `+919876543210`. Numbers that already carry a country
 * code keep it; anything that is not a plausible number returns `''`.
 *
 * @param {string|number|null} value
 */
function formatPhoneForTel(value) {
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

/**
 * The digits `wa.me` wants: an international number with no `+` and no spaces.
 * `98765 43210` -> `919876543210`.
 *
 * A number stored the way a person types it — ten digits, no country code — is
 * a dead `wa.me` link, which is why this goes through `formatPhoneForTel`
 * rather than simply stripping the punctuation.
 *
 * @param {string|number|null} value
 * @returns {string} `''` when there is no plausible number
 */
function formatWhatsappNumber(value) {
  return formatPhoneForTel(value).replace(/^\+/, '');
}

/**
 * A `https://wa.me/<number>?text=<message>` link, or `''` without a number.
 *
 * @param {string|number|null} number
 * @param {string} [message]
 */
function whatsappLink(number, message) {
  const digits = formatWhatsappNumber(number);
  if (!digits) return '';
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

module.exports = {
  EMPTY,
  formatArea,
  formatBhk,
  formatDate,
  formatDateTime,
  formatNumber,
  formatTime,
  formatPhoneForTel,
  formatPrice,
  formatPriceRange,
  formatRelative,
  formatWhatsappNumber,
  formatMonthYear,
  whatsappLink,
};
