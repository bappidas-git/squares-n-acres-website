/**
 * The listing's query string survives every trip through the client (prompt 44).
 *
 * A listing URL is the only state the engine has: the rail writes it, the chips
 * read it, a shared link restores it and `GET /properties` is asked exactly what
 * it says (§5.7). Three things therefore have to hold, and none of them is
 * proved by testing `parseFilters` and `serializeFilters` one at a time:
 *
 *   1. **URL → params → URL is a fixed point.** A filter that survives one lap
 *      and changes on the next is a rail that edits the address behind the
 *      visitor's back and a "copy link" that hands somebody a different search.
 *   2. **The names on the wire are the contract's.** Every key the engine
 *      serialises has to be a §5.7 parameter, or the API ignores it and the
 *      visitor gets results they did not ask for.
 *   3. **The admin table's own serialisation round-trips too**, including the
 *      export, which repeats the filters and the order of the table as it
 *      stands (D44).
 */

import {
  FILTER_GROUPS,
  LISTING_DEFAULTS,
  LISTING_PARAM_TYPES,
  clearAllFilters,
  clearGroups,
  countActiveFilters,
  parseFilters,
  serializeFilters,
  widenSuggestions,
} from '../listingFilters';
import {
  PROPERTY_FILTER_KEYS,
  PROPERTY_LIST_DEFAULTS,
  PROPERTY_LIST_PARAM_KEYS,
  exportParamsOf,
  hasActiveFilters,
} from '../../pages/admin/properties/propertyFilters';

/** Every §5.7 query parameter of `GET /properties`, verbatim. */
const CONTRACT_PARAMS = [
  'listingType',
  'segment',
  'propertyTypeId',
  'localityId',
  'cityId',
  'constructionStatus',
  'availability',
  'bedrooms',
  'minPrice',
  'maxPrice',
  'minArea',
  'maxArea',
  'areaUnit',
  'furnishing',
  'facing',
  'developerId',
  'amenityIds',
  'badgeIds',
  'isFeatured',
  'isVerified',
  'reraRegistered',
  'possessionBy',
  'q',
  'ids',
  'sort',
  'page',
  'perPage',
];

/** The admin list adds three of its own (§5.7, §5.14). */
// `agentId`: the listings one advisor answers for (prompt 51).
const ADMIN_ONLY_PARAMS = ['isActive', 'seoScoreBand', 'createdBy', 'order', 'agentId'];

const query = (params) => new URLSearchParams(serializeFilters(params)).toString();

/** One lap: a query string in, the query string the engine would write out. */
const lap = (search, options) => query(parseFilters(search, options));

/** A search with something set in every group the rail offers. */
const EVERYTHING =
  'listingType=rent&segment=residential&propertyTypeId=1,2&localityId=4,7' +
  '&constructionStatus=ready-to-move,resale&availability=available&bedrooms=2,3,5' +
  '&minPrice=25000&maxPrice=80000&minArea=900&maxArea=2400&areaUnit=sqm' +
  '&furnishing=semi-furnished,fully-furnished&facing=east,north-east&developerId=3' +
  '&amenityIds=1,2,3&badgeIds=4,5&isFeatured=true&reraRegistered=false' +
  '&possessionBy=2027-06&q=lake%20view&sort=price-asc&page=4&perPage=24';

describe('listing filters round-trip', () => {
  it('reaches a fixed point after one lap, for every parameter at once', () => {
    const once = lap(EVERYTHING);
    const twice = lap(once);

    expect(twice).toBe(once);
  });

  it('keeps every value it was given', () => {
    const params = parseFilters(EVERYTHING);
    const written = new URLSearchParams(serializeFilters(params));

    expect(written.get('localityId')).toBe('4,7');
    expect(written.get('bedrooms')).toBe('2,3,5');
    expect(written.get('minPrice')).toBe('25000');
    expect(written.get('areaUnit')).toBe('sqm');
    expect(written.get('isFeatured')).toBe('true');
    expect(written.get('reraRegistered')).toBe('false');
    expect(written.get('possessionBy')).toBe('2027-06');
    expect(written.get('q')).toBe('lake view');
    expect(written.get('perPage')).toBe('24');
  });

  it.each(Object.entries(LISTING_PARAM_TYPES))('round-trips %s on its own (%s)', (key, type) => {
    const sample = {
      csv: '7,9',
      number: '1234.5',
      int: '3',
      bool: 'true',
      string: 'sample-value',
    }[type];

    const search = `${key}=${sample}`;
    const params = parseFilters(search);
    const written = new URLSearchParams(serializeFilters(params));

    // `page=3` is not a default, so every sample below is written back out.
    expect(written.get(key)).toBe(sample);
    expect(lap(search)).toBe(lap(lap(search)));
  });

  it('leaves the defaults out of the address', () => {
    const written = serializeFilters(LISTING_DEFAULTS);

    expect(written).toEqual({});
  });

  it('drops the parameters the route fixed, so `/rent` never grows ?listingType=rent', () => {
    const params = parseFilters('listingType=rent&localityId=4');
    const written = serializeFilters(params, { omit: ['listingType'] });

    expect(written).not.toHaveProperty('listingType');
    expect(written.localityId).toBe('4');
  });

  it('ignores a value it cannot read rather than passing NaN to the API', () => {
    const written = serializeFilters(parseFilters('minPrice=abc&page=zero&isFeatured=perhaps'));

    expect(written).not.toHaveProperty('minPrice');
    expect(written).not.toHaveProperty('isFeatured');
    expect(written).not.toHaveProperty('page');
  });

  it('survives the noise a real address collects', () => {
    const search = 'localityId=4,,7&bedrooms=%203%20&utm_source=newsletter&nonsense=1';
    const params = parseFilters(search);

    expect(params.localityId).toEqual(['4', '7']);
    expect(params.bedrooms).toEqual(['3']);
    expect(serializeFilters(params)).not.toHaveProperty('utm_source');
  });

  it('serialises only names the contract answers', () => {
    for (const key of Object.keys(LISTING_PARAM_TYPES)) {
      expect(CONTRACT_PARAMS).toContain(key);
    }
  });

  it('gives every filter group keys the engine actually reads', () => {
    for (const group of FILTER_GROUPS) {
      for (const key of group.keys) {
        expect(LISTING_PARAM_TYPES).toHaveProperty(key);
      }
    }
  });

  it('counts a budget once although it travels as two parameters', () => {
    const params = parseFilters('minPrice=2500000&maxPrice=9000000&localityId=4');

    expect(countActiveFilters(params)).toBe(2);
  });

  it('does not count a unit with no numbers beside it', () => {
    expect(countActiveFilters(parseFilters('areaUnit=sqm'))).toBe(0);
    expect(countActiveFilters(parseFilters('areaUnit=sqm&minArea=900'))).toBe(1);
  });

  it('never counts or offers to widen a group the route fixed', () => {
    const params = parseFilters('localityId=4&minPrice=2500000');
    const fixed = { localityId: ['4'] };

    expect(countActiveFilters(params, { fixed })).toBe(1);
    expect(widenSuggestions(params, { fixed }).map((group) => group.id)).toEqual(['price']);
  });

  it('clears what it says it clears, and nothing else', () => {
    const params = parseFilters(EVERYTHING);
    const cleared = { ...params, ...clearGroups(['price', 'area']) };
    const written = serializeFilters(cleared);

    expect(written).not.toHaveProperty('minPrice');
    expect(written).not.toHaveProperty('maxPrice');
    expect(written).not.toHaveProperty('minArea');
    expect(written).not.toHaveProperty('areaUnit');
    expect(written.localityId).toBe('4,7');
  });

  it('clears every filter while keeping the sort and returning to page one', () => {
    const params = parseFilters(EVERYTHING);
    const written = serializeFilters({ ...params, ...clearAllFilters() });

    expect(written).toEqual({ sort: 'price-asc', perPage: '24' });
  });
});

describe('the admin table round-trips its own filters', () => {
  const ADMIN_SEARCH =
    'q=lakeview&listingType=sale&segment=residential&propertyTypeId=1&localityId=4' +
    '&constructionStatus=under-construction,pre-launch&availability=available' +
    '&isActive=true&isFeatured=false&developerId=2&seoScoreBand=good' +
    '&sort=updatedAt&order=desc&page=2&perPage=50';

  it('serialises only names the contract answers', () => {
    for (const key of Object.keys(PROPERTY_LIST_PARAM_KEYS)) {
      expect([...CONTRACT_PARAMS, ...ADMIN_ONLY_PARAMS]).toContain(key);
    }
  });

  it('declares a type for every key it filters on', () => {
    for (const key of PROPERTY_FILTER_KEYS) {
      expect(PROPERTY_LIST_PARAM_KEYS).toHaveProperty(key);
    }
  });

  it('knows a narrowed table from an empty one', () => {
    expect(hasActiveFilters(PROPERTY_LIST_DEFAULTS)).toBe(false);
    expect(hasActiveFilters({ ...PROPERTY_LIST_DEFAULTS, page: 3 })).toBe(false);
    expect(hasActiveFilters({ ...PROPERTY_LIST_DEFAULTS, q: 'lake' })).toBe(true);
    expect(hasActiveFilters({ ...PROPERTY_LIST_DEFAULTS, constructionStatus: [] })).toBe(false);
  });

  it('exports the table as it stands: every filter, the order, every page (D44)', () => {
    const params = Object.fromEntries(new URLSearchParams(ADMIN_SEARCH));
    const exported = exportParamsOf({ ...params, constructionStatus: ['under-construction'] });

    expect(exported.perPage).toBe('all');
    expect(exported.sort).toBe('updatedAt');
    expect(exported.order).toBe('desc');
    expect(exported.q).toBe('lakeview');
    expect(exported.constructionStatus).toEqual(['under-construction']);
    // The page is the table's, not the export's.
    expect(exported).not.toHaveProperty('page');
  });

  it('leaves an unset filter out of the export rather than sending an empty one', () => {
    const exported = exportParamsOf({ ...PROPERTY_LIST_DEFAULTS, q: '', localityId: null });

    expect(exported).not.toHaveProperty('q');
    expect(exported).not.toHaveProperty('localityId');
  });
});
