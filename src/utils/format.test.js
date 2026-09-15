import {
  EMPTY,
  formatArea,
  formatBhk,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPhoneForTel,
  formatPrice,
  formatPriceRange,
  formatRelative,
} from './format';

describe('formatPrice', () => {
  it('uses crore above 1,00,00,000 and trims trailing zeros', () => {
    expect(formatPrice(14200000)).toBe('₹1.42 Cr');
    expect(formatPrice(14000000)).toBe('₹1.4 Cr');
    expect(formatPrice(20000000)).toBe('₹2 Cr');
    expect(formatPrice(10000000)).toBe('₹1 Cr');
  });

  it('uses lakh between 1,00,000 and 1 Cr', () => {
    expect(formatPrice(8550000)).toBe('₹85.5 L');
    expect(formatPrice(100000)).toBe('₹1 L');
    expect(formatPrice(9999999)).toBe('₹100 L');
  });

  it('uses Indian grouping below a lakh', () => {
    expect(formatPrice(45000)).toBe('₹45,000');
    expect(formatPrice(99999)).toBe('₹99,999');
  });

  it('appends /month for rent and lease listings', () => {
    expect(formatPrice(45000, { listingType: 'rent' })).toBe('₹45,000/month');
    expect(formatPrice(45000, { listingType: 'lease' })).toBe('₹45,000/month');
    expect(formatPrice(4500000, { perMonth: true })).toBe('₹45 L/month');
    expect(formatPrice(45000, { listingType: 'sale' })).toBe('₹45,000');
  });

  it('returns "Price on Request" only when the flag is passed', () => {
    expect(formatPrice(0, { priceOnRequest: true })).toBe('Price on Request');
    expect(formatPrice(12000000, { priceOnRequest: true })).toBe('Price on Request');
    expect(formatPrice(0)).toBe('₹0');
  });

  it('returns the em dash for a missing or unparsable value', () => {
    expect(formatPrice(null)).toBe(EMPTY);
    expect(formatPrice(undefined)).toBe(EMPTY);
    expect(formatPrice('')).toBe(EMPTY);
    expect(formatPrice('abc')).toBe(EMPTY);
  });
});

describe('formatPriceRange', () => {
  it('joins both ends with an en dash', () => {
    expect(formatPriceRange(8500000, 12000000)).toBe('₹85 L – ₹1.2 Cr');
  });

  it('collapses to one value when an end is missing or equal', () => {
    expect(formatPriceRange(8500000, null)).toBe('₹85 L');
    expect(formatPriceRange(null, 12000000)).toBe('₹1.2 Cr');
    expect(formatPriceRange(8500000, 8500000)).toBe('₹85 L');
  });

  it('honours priceOnRequest and the empty case', () => {
    expect(formatPriceRange(1, 2, { priceOnRequest: true })).toBe('Price on Request');
    expect(formatPriceRange(null, null)).toBe(EMPTY);
  });
});

describe('formatArea / formatNumber / formatBhk', () => {
  it('formats areas with the unit', () => {
    expect(formatArea(1650)).toBe('1,650 sq ft');
    expect(formatArea(1650, 'sq m')).toBe('1,650 sq m');
    expect(formatArea(null)).toBe(EMPTY);
  });

  it('groups numbers the Indian way', () => {
    expect(formatNumber(1234567)).toBe('12,34,567');
    expect(formatNumber('abc')).toBe(EMPTY);
  });

  it('formats BHK labels', () => {
    expect(formatBhk(3)).toBe('3 BHK');
    expect(formatBhk(5)).toBe('5+ BHK');
    expect(formatBhk(7)).toBe('5+ BHK');
    expect(formatBhk(0)).toBe('Studio');
    expect(formatBhk(null)).toBe(EMPTY);
  });
});

describe('dates', () => {
  it('formats an ISO date in IST', () => {
    expect(formatDate('2026-09-05T10:00:00.000Z')).toBe('05 Sep 2026');
  });

  it('adds the time when asked', () => {
    expect(formatDateTime('2026-09-05T10:00:00.000Z')).toMatch(/^05 Sep 2026/);
    expect(formatDateTime('2026-09-05T10:00:00.000Z')).toMatch(/03:30/);
  });

  it('never renders "Invalid Date"', () => {
    expect(formatDate('not-a-date')).toBe(EMPTY);
    expect(formatDate(null)).toBe(EMPTY);
    expect(formatDate('')).toBe(EMPTY);
    expect(formatDateTime('not-a-date')).toBe(EMPTY);
    expect(formatRelative('not-a-date')).toBe(EMPTY);
  });

  it('renders relative time with an "ago" suffix', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(formatRelative(threeHoursAgo)).toBe('3 hours ago');
  });
});

describe('formatPhoneForTel', () => {
  it('normalises Indian numbers', () => {
    expect(formatPhoneForTel('+91 98765 43210')).toBe('+919876543210');
    expect(formatPhoneForTel('98765 43210')).toBe('+919876543210');
    expect(formatPhoneForTel('9876543210')).toBe('+919876543210');
    expect(formatPhoneForTel('919876543210')).toBe('+919876543210');
    expect(formatPhoneForTel('09876543210')).toBe('+919876543210');
  });

  it('returns an empty string when there is nothing to dial', () => {
    expect(formatPhoneForTel(null)).toBe('');
    expect(formatPhoneForTel('')).toBe('');
    expect(formatPhoneForTel('n/a')).toBe('');
  });
});
