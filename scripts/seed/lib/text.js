/**
 * Formatting helpers for the copy the seed writes.
 *
 * The public site formats prices and areas with `src/utils/format.js`; this
 * file exists because the *text* of a description ("from ₹1.24 Cr", "1,650 sq
 * ft") has to carry the same numbers as the structured fields next to it, and
 * a second implementation is how the two drift apart. The rules are D33's:
 * crore above a crore, lakh above a lakh, Indian digit grouping below that.
 */

const { slugify } = require('../../../mock-server/lib/slug');

/** Indian digit grouping: 1234567 → `12,34,567`. */
function grouped(value) {
  const [whole, fraction] = String(Math.round(Number(value))).split('.');
  const last = whole.slice(-3);
  const rest = whole.slice(0, -3);
  const head = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},` : '';
  return `${head}${last}${fraction ? `.${fraction}` : ''}`;
}

/** Trims `1.20` to `1.2` and `1.00` to `1`. */
const trimZeros = (value) => String(value).replace(/\.?0+$/, '');

/**
 * A rupee amount in the short Indian form (D33).
 *
 * @param {number} amount
 * @returns {string} `₹1.24 Cr`, `₹85.5 L`, `₹45,000`
 */
function inr(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '';
  if (value >= 10000000) return `₹${trimZeros((value / 10000000).toFixed(2))} Cr`;
  if (value >= 100000) return `₹${trimZeros((value / 100000).toFixed(2))} L`;
  return `₹${grouped(value)}`;
}

/** A monthly rent: `₹45,000 a month`. */
const rent = (amount) => `${inr(amount)} a month`;

/** An area with its unit: `1,650 sq ft`, `2.5 acres`. */
function area(value, unit = 'sqft') {
  if (unit === 'acre') {
    const acres = trimZeros(Number(value).toFixed(2));
    return `${acres} ${Number(acres) === 1 ? 'acre' : 'acres'}`;
  }
  if (unit === 'guntha') return `${trimZeros(Number(value).toFixed(2))} guntha`;
  if (unit === 'cent') return `${trimZeros(Number(value).toFixed(2))} cent`;
  if (unit === 'sqyd') return `${grouped(value)} sq yd`;
  if (unit === 'sqm') return `${grouped(value)} sq m`;
  return `${grouped(value)} sq ft`;
}

/** `3 BHK`, or `''` for a plot or a commercial floor. */
const bhk = (bedrooms) => (bedrooms ? `${bedrooms} BHK` : '');

/** Wraps paragraphs of plain text into `<p>` elements. */
const paragraphs = (...parts) =>
  parts
    .flat()
    .filter(Boolean)
    .map((part) => `<p>${part.replace(/\s+/g, ' ').trim()}</p>`)
    .join('');

/** `a, b and c` — the list separator English actually uses. */
function sentenceList(items) {
  const list = items.filter(Boolean);
  if (list.length === 0) return '';
  if (list.length === 1) return list[0];
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}

/** Lowercases an initial capital so a name can start a clause mid-sentence. */
const lower = (text) => String(text).charAt(0).toLowerCase() + String(text).slice(1);

module.exports = { grouped, inr, rent, area, bhk, paragraphs, sentenceList, slugify, lower };
