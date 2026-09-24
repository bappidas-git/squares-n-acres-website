/**
 * `format.js` at its corners (prompt 44).
 *
 * `src/utils/format.test.js` covers the readings a listing normally produces.
 * This suite covers the ones a bug bash produces: the exact boundary where a
 * lakh becomes a crore, a price of zero, a date at the edge of the Indian day,
 * a phone number typed the six ways people type one, and every value that is
 * not a value at all. Each of these renders somewhere on the property path —
 * the price card, the key facts, the unit table, the sticky bar, the draft
 * indicator — and every one of them has an em dash waiting for it rather than
 * `NaN`, `undefined` or `Invalid Date` (§4.3).
 */

import {
  EMPTY,
  formatArea,
  formatBhk,
  formatDate,
  formatDateTime,
  formatMonthYear,
  formatNumber,
  formatPhone,
  formatPhoneForTel,
  formatPrice,
  formatPriceRange,
  formatRelative,
  formatTime,
  formatWhatsappNumber,
  whatsappLink,
} from '../format';

/** Everything that means "there is nothing here". */
const NOTHINGS = [null, undefined, '', '   ', 'not a number', NaN, {}, []];

describe('formatPrice at the unit boundaries', () => {
  it.each([
    [99999, '₹99,999'],
    [100000, '₹1 L'],
    [100001, '₹1 L'],
    [150000, '₹1.5 L'],
    [999999, '₹10 L'],
    // A figure that would print as "₹100 L" is quoted in crore instead.
    [9994999, '₹99.95 L'],
    [9999999, '₹1 Cr'],
    [10000000, '₹1 Cr'],
    [10000001, '₹1 Cr'],
    [14200000, '₹1.42 Cr'],
    [100000000, '₹10 Cr'],
    [1000000000, '₹100 Cr'],
  ])('renders %i as %s', (value, expected) => {
    expect(formatPrice(value)).toBe(expected);
  });

  it('renders a real zero rather than an em dash', () => {
    expect(formatPrice(0)).toBe('₹0');
  });

  it('reads a numeric string the way it reads a number', () => {
    expect(formatPrice('14200000')).toBe(formatPrice(14200000));
  });

  it('trims the zeros a fixed rate leaves behind', () => {
    expect(formatPrice(10500000)).toBe('₹1.05 Cr');
    expect(formatPrice(12000000)).toBe('₹1.2 Cr');
    expect(formatPrice(20000000)).toBe('₹2 Cr');
    expect(formatPrice(1010000)).toBe('₹10.1 L');
  });

  it('appends /month for rent, lease and an explicit perMonth', () => {
    expect(formatPrice(45000, { listingType: 'rent' })).toBe('₹45,000/month');
    expect(formatPrice(250000, { listingType: 'lease' })).toBe('₹2.5 L/month');
    expect(formatPrice(45000, { perMonth: true })).toBe('₹45,000/month');
    expect(formatPrice(45000, { listingType: 'sale' })).toBe('₹45,000');
  });

  it('lets priceOnRequest win over every other option, and over a price', () => {
    expect(formatPrice(9500000, { priceOnRequest: true })).toBe('Price on Request');
    expect(formatPrice(null, { priceOnRequest: true, listingType: 'rent' })).toBe(
      'Price on Request'
    );
  });

  it.each(NOTHINGS.map((value) => [JSON.stringify(value) ?? String(value), value]))(
    'renders the em dash for %s',
    (_label, value) => {
      expect(formatPrice(value)).toBe(EMPTY);
    }
  );
});

describe('formatPriceRange', () => {
  it('collapses a range whose ends are equal', () => {
    expect(formatPriceRange(9500000, 9500000)).toBe('₹95 L');
  });

  it('keeps the order it was handed, so a reversed range is visibly wrong rather than silently right', () => {
    expect(formatPriceRange(15000000, 6800000)).toBe('₹1.5 Cr – ₹68 L');
  });

  it('falls back to the end it has', () => {
    expect(formatPriceRange(null, 9500000)).toBe('₹95 L');
    expect(formatPriceRange(6800000, null)).toBe('₹68 L');
    expect(formatPriceRange(null, null)).toBe(EMPTY);
  });

  it('carries the rent suffix onto both ends', () => {
    expect(formatPriceRange(25000, 45000, { listingType: 'rent' })).toBe(
      '₹25,000/month – ₹45,000/month'
    );
  });

  it('renders a zero end as a price rather than as nothing', () => {
    expect(formatPriceRange(0, 9500000)).toBe('₹0 – ₹95 L');
  });
});

describe('formatArea and formatNumber', () => {
  it('keeps two decimals and no more', () => {
    expect(formatArea(2.5, 'acre')).toBe('2.5 acre');
    expect(formatArea(1650.456, 'sq ft')).toBe('1,650.46 sq ft');
  });

  it('defaults to square feet', () => {
    expect(formatArea(1650)).toBe('1,650 sq ft');
  });

  it('renders a zero area', () => {
    expect(formatArea(0)).toBe('0 sq ft');
  });

  it.each(NOTHINGS.map((value) => [String(value), value]))('is an em dash for %s', (_l, value) => {
    expect(formatArea(value)).toBe(EMPTY);
    expect(formatNumber(value)).toBe(EMPTY);
  });

  it('groups lakhs the Indian way', () => {
    expect(formatNumber(1234567)).toBe('12,34,567');
    expect(formatNumber(1234.567, { maximumFractionDigits: 2 })).toBe('1,234.57');
  });
});

describe('formatBhk', () => {
  it.each([
    [0, 'Studio'],
    [1, '1 BHK'],
    [4, '4 BHK'],
    [5, '5+ BHK'],
    [9, '5+ BHK'],
  ])('renders %s as %s', (value, expected) => {
    expect(formatBhk(value)).toBe(expected);
  });

  it('calls a negative count a studio rather than "-1 BHK"', () => {
    expect(formatBhk(-1)).toBe('Studio');
  });

  it('is an em dash for a plot, which has no bedrooms at all', () => {
    expect(formatBhk(null)).toBe(EMPTY);
    expect(formatBhk(undefined)).toBe(EMPTY);
  });
});

describe('dates in IST', () => {
  it('abbreviates every month to three letters, September included', () => {
    expect(formatDate('2026-09-05T06:30:00.000Z')).toBe('05 Sep 2026');
    expect(formatDate('2026-03-20T12:45:00.000Z')).toBe('20 Mar 2026');
  });

  it('reads a plain yyyy-mm-dd, which is how a possession date is stored', () => {
    expect(formatDate('2029-06-30')).toBe('30 Jun 2029');
  });

  it('shifts a UTC instant into the Indian day it belongs to', () => {
    // 20:00 UTC is 01:30 the next morning in Asia/Kolkata (+05:30).
    expect(formatDate('2026-09-05T20:00:00.000Z')).toBe('06 Sep 2026');
  });

  it('accepts a Date as readily as a string', () => {
    expect(formatDate(new Date('2026-09-05T06:30:00.000Z'))).toBe('05 Sep 2026');
  });

  it('adds the clock when asked, and on its own', () => {
    // ICU separates the clock from the meridiem with U+202F, not a space, so
    // the pattern asks for whitespace rather than for one character.
    expect(formatDateTime('2026-09-05T11:00:00.000Z')).toMatch(/^05 Sep 2026, \d{2}:\d{2}\s[ap]m$/);
    expect(formatTime('2026-09-05T11:00:00.000Z')).toMatch(/^\d{2}:\d{2}\s[ap]m$/);
  });

  it('renders a possession promise as a month and a year', () => {
    expect(formatMonthYear('2029-06-30')).toBe('June 2029');
  });

  it.each([null, undefined, '', 'yesterday', '2026-13-45', NaN])(
    'never renders "Invalid Date" for %s',
    (value) => {
      expect(formatDate(value)).toBe(EMPTY);
      expect(formatDateTime(value)).toBe(EMPTY);
      expect(formatMonthYear(value)).toBe(EMPTY);
      expect(formatTime(value)).toBe(EMPTY);
      expect(formatRelative(value)).toBe(EMPTY);
    }
  );
});

describe('formatRelative', () => {
  const at = (ms) => new Date(Date.now() - ms).toISOString();

  it.each([
    [1_000, /1 second ago/],
    [90_000, /2 minutes ago|1 minute ago/],
    [3 * 3600_000, /3 hours ago/],
    [2 * 86400_000, /2 days ago/],
    [40 * 86400_000, /1 month ago/],
    [400 * 86400_000, /1 year ago/],
  ])('reads %i ms ago as %s', (ms, expected) => {
    expect(formatRelative(at(ms))).toMatch(expected);
  });

  it('never says "0 seconds ago"', () => {
    expect(formatRelative(new Date().toISOString())).toBe('1 second ago');
  });

  it('reads a future instant as "in …"', () => {
    expect(formatRelative(new Date(Date.now() + 5 * 60_000).toISOString())).toMatch(
      /^in 5 minutes/
    );
  });
});

describe('phone numbers', () => {
  it.each([
    ['9876543210', '+919876543210'],
    ['98765 43210', '+919876543210'],
    ['98765-43210', '+919876543210'],
    ['+91 98765 43210', '+919876543210'],
    ['+919876543210', '+919876543210'],
    ['919876543210', '+919876543210'],
    ['09876543210', '+919876543210'],
  ])('dials %s as %s', (input, expected) => {
    expect(formatPhoneForTel(input)).toBe(expected);
  });

  it('takes a number stored as a number', () => {
    expect(formatPhoneForTel(9876543210)).toBe('+919876543210');
  });

  it.each([null, undefined, '', '   ', 'call us', '--'])(
    'returns an empty string for %s, so the button is not rendered',
    (value) => {
      expect(formatPhoneForTel(value)).toBe('');
      expect(formatWhatsappNumber(value)).toBe('');
      expect(whatsappLink(value, 'Hello')).toBe('');
    }
  );

  it('drops the plus for wa.me and encodes the message', () => {
    expect(formatWhatsappNumber('98765 43210')).toBe('919876543210');
    expect(whatsappLink('9876543210', 'Hi, I am interested in 3 BHK & plots')).toBe(
      'https://wa.me/919876543210?text=Hi%2C%20I%20am%20interested%20in%203%20BHK%20%26%20plots'
    );
  });

  it('builds a bare link when there is no message', () => {
    expect(whatsappLink('9876543210')).toBe('https://wa.me/919876543210');
  });
});

// QA-53: the CRM printed `9876500100` for one lead and `+919876500100` for the
// next — the same kind of number, stored as it arrived.
describe('formatPhone', () => {
  it.each([
    ['9876500100', '+91 98765 00100'],
    ['+919876500100', '+91 98765 00100'],
    ['98765 00100', '+91 98765 00100'],
    ['09876500100', '+91 98765 00100'],
    ['9123456780', '+91 91234 56780'],
    [9876500100, '+91 98765 00100'],
  ])('prints %p as %p', (stored, shown) => {
    expect(formatPhone(stored)).toBe(shown);
  });

  it('prints any other number as it was stored', () => {
    expect(formatPhone('+1 415 555 0100')).toBe('+1 415 555 0100');
    expect(formatPhone('1800 123 4567')).toBe('1800 123 4567');
  });

  it.each([null, undefined])('prints nothing for %p', (value) => {
    expect(formatPhone(value)).toBe('');
  });
});
