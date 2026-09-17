/**
 * `listingFilters` — the query string in, the query string out, and the order
 * in which an empty result offers to widen itself.
 */

import {
  FILTER_GROUPS,
  LISTING_DEFAULTS,
  clearAllFilters,
  clearGroups,
  countActiveFilters,
  hasValue,
  parseFilters,
  serializeFilters,
  widenSuggestions,
} from '../listingFilters';

describe('parseFilters', () => {
  it('fills in the defaults when the query string is empty', () => {
    expect(parseFilters('')).toEqual({ sort: 'relevance', page: 1, perPage: 12 });
  });

  it('types every parameter the way the contract reads it', () => {
    const params = parseFilters(
      'listingType=sale&localityId=4,7&bedrooms=2,3&minPrice=2500000&isFeatured=true&page=3'
    );

    expect(params).toMatchObject({
      listingType: 'sale',
      localityId: ['4', '7'],
      bedrooms: ['2', '3'],
      minPrice: 2500000,
      isFeatured: true,
      page: 3,
    });
  });

  it('ignores a number that is not one (§7)', () => {
    const params = parseFilters('minPrice=abc&maxPrice=5000000');

    expect(params.minPrice).toBeUndefined();
    expect(params.maxPrice).toBe(5000000);
  });

  it('ignores a page that is not a page', () => {
    expect(parseFilters('page=abc').page).toBe(1);
    expect(parseFilters('page=-4').page).toBe(1);
    expect(parseFilters('page=2.7').page).toBe(2);
  });

  it('drops parameters the listing does not speak', () => {
    expect(parseFilters('utm_source=newsletter&bhk=3')).toEqual(LISTING_DEFAULTS);
  });

  it('reads a `URLSearchParams` and an object as well as a string', () => {
    expect(parseFilters(new URLSearchParams('q=whitefield')).q).toBe('whitefield');
    expect(parseFilters({ localityId: ['4', '7'] }).localityId).toEqual(['4', '7']);
  });
});

describe('serializeFilters', () => {
  it('writes arrays as comma-separated lists', () => {
    expect(serializeFilters({ localityId: ['4', '7'], bedrooms: [3] })).toEqual({
      localityId: '4,7',
      bedrooms: '3',
    });
  });

  it('leaves the defaults out, so a plain route keeps a plain URL', () => {
    expect(serializeFilters({ sort: 'relevance', page: 1, perPage: 12 })).toEqual({});
    expect(serializeFilters({ sort: 'price-asc', page: 2 })).toEqual({
      sort: 'price-asc',
      page: '2',
    });
  });

  it('leaves empties out', () => {
    expect(serializeFilters({ q: '', localityId: [], minPrice: undefined })).toEqual({});
  });

  it('omits the parameters the route has fixed', () => {
    expect(
      serializeFilters({ listingType: 'rent', localityId: ['4'] }, { omit: ['listingType'] })
    ).toEqual({ localityId: '4' });
  });

  it('round-trips through `parseFilters`', () => {
    const params = parseFilters('listingType=rent&bedrooms=2,3&maxPrice=50000&sort=price-asc');
    const search = new URLSearchParams(serializeFilters(params)).toString();

    expect(parseFilters(search)).toEqual(params);
  });
});

describe('countActiveFilters', () => {
  it('counts nothing for a bare listing', () => {
    expect(countActiveFilters(parseFilters(''))).toBe(0);
  });

  it('counts a budget once, not twice', () => {
    expect(countActiveFilters({ minPrice: 2500000, maxPrice: 5000000 })).toBe(1);
  });

  it('does not count the sort, the page or the route’s own filters', () => {
    const params = { sort: 'price-asc', page: 3, listingType: 'rent', localityId: ['4'] };

    expect(countActiveFilters(params, { fixed: { listingType: 'rent' } })).toBe(1);
  });

  it('needs a number before an area unit counts as a filter', () => {
    expect(countActiveFilters({ areaUnit: 'sqft' })).toBe(0);
    expect(countActiveFilters({ areaUnit: 'sqft', minArea: 1200 })).toBe(1);
  });

  it('counts every group once when everything is set', () => {
    const params = {
      listingType: 'sale',
      segment: 'residential',
      propertyTypeId: ['1'],
      localityId: ['4'],
      minPrice: 1,
      bedrooms: ['3'],
      constructionStatus: ['resale'],
      minArea: 900,
      furnishing: ['unfurnished'],
      facing: ['east'],
      amenityIds: ['2'],
      badgeIds: ['1'],
      developerId: '3',
      availability: 'available',
      isFeatured: true,
      reraRegistered: true,
      possessionBy: '2027-06',
      q: 'lake',
    };

    expect(countActiveFilters(params)).toBe(FILTER_GROUPS.length);
  });
});

describe('widenSuggestions', () => {
  it('offers nothing when nothing is set', () => {
    expect(widenSuggestions(parseFilters(''))).toEqual([]);
  });

  it('orders the offers most restrictive first', () => {
    const params = {
      localityId: ['4'],
      bedrooms: ['3'],
      amenityIds: ['2'],
      minArea: 1200,
      minPrice: 10000000,
      constructionStatus: ['ready-to-move'],
    };

    expect(widenSuggestions(params).map((entry) => entry.id)).toEqual([
      'price',
      'area',
      'amenities',
      'bedrooms',
      'constructionStatus',
      'locality',
    ]);
  });

  it('never offers to drop a filter the route fixed', () => {
    const suggestions = widenSuggestions(
      { localityId: ['4'], minPrice: 10000000 },
      { fixed: { localityId: ['4'] } }
    );

    expect(suggestions.map((entry) => entry.id)).toEqual(['price']);
  });

  it('carries the keys the chip has to clear', () => {
    const [budget] = widenSuggestions({ minPrice: 1, maxPrice: 2 });

    expect(budget.keys).toEqual(['minPrice', 'maxPrice']);
    expect(budget.label).toBe('Any budget');
  });
});

describe('clearGroups / clearAllFilters', () => {
  it('clears every key of a group', () => {
    expect(clearGroups(['price'])).toEqual({ minPrice: undefined, maxPrice: undefined });
  });

  it('clears every filter and returns to the first page', () => {
    const patch = clearAllFilters();

    expect(patch.page).toBe(1);
    expect(patch.localityId).toBeUndefined();
    expect('sort' in patch).toBe(false);
    expect('perPage' in patch).toBe(false);
  });
});

describe('hasValue', () => {
  it('treats empty strings, nulls and empty arrays as unset', () => {
    expect(hasValue('')).toBe(false);
    expect(hasValue(null)).toBe(false);
    expect(hasValue(undefined)).toBe(false);
    expect(hasValue([])).toBe(false);
  });

  it('treats 0 and false as values', () => {
    expect(hasValue(0)).toBe(true);
    expect(hasValue(false)).toBe(true);
  });
});
