/**
 * `buildListingSeo` — the canonical and index rules of §9.4 and the title
 * template of §9.5, as pure data in and pure data out.
 */

import { buildListingSeo, cleanTitle } from '../listingSeo';
import { listingRouteByKey, resolveListingRoute } from '../listingRoutes';

const masterData = {
  localities: [
    {
      id: 4,
      name: 'Whitefield',
      slug: 'whitefield',
      shortDescription: 'An eastern tech corridor.',
    },
    { id: 7, name: 'Hebbal', slug: 'hebbal' },
  ],
  propertyTypes: [
    { id: 1, name: 'Apartments', slug: 'apartments', segment: 'residential' },
    { id: 2, name: 'Villas', slug: 'villas', segment: 'residential' },
  ],
  cities: [{ id: 1, name: 'Bengaluru', slug: 'bengaluru' }],
  loading: false,
};

const seoSettings = {
  siteUrl: 'https://www.squaresnacres.com',
  separator: '|',
  titleTemplates: {
    listing:
      '%propertytype% %listingtype% in %locality%, %city% – %count% Listings %sep% %sitename%',
  },
  noindex: { filteredListings: true, paginatedListings: false },
};

const build = (routeKey, params = {}, { meta = { total: 24, totalPages: 2 }, ...rest } = {}) =>
  buildListingSeo({
    routeConfig: listingRouteByKey(routeKey),
    params: { sort: 'relevance', page: 1, perPage: 12, ...params },
    meta,
    masterData,
    seoSettings,
    siteName: 'Squares N Acres',
    ...rest,
  });

describe('title', () => {
  it('fills the template from the route and the count', () => {
    expect(build('buy').title).toBe(
      'Properties for Sale in Bengaluru – 24 Listings | Squares N Acres'
    );
  });

  it('names the locality and the property type when exactly one of each is chosen', () => {
    const seo = build('buy', { localityId: ['4'], propertyTypeId: ['1'] });

    expect(seo.title).toBe(
      'Apartments for Sale in Whitefield, Bengaluru – 24 Listings | Squares N Acres'
    );
  });

  it('adds the bedroom count in front of the type', () => {
    expect(build('rent', { bedrooms: ['3'], localityId: ['7'] }).title).toBe(
      '3 BHK Properties for Rent in Hebbal, Bengaluru – 24 Listings | Squares N Acres'
    );
  });

  it('says nothing about a count nobody has yet', () => {
    expect(build('buy', {}, { meta: null }).title).toBe(
      'Properties for Sale in Bengaluru | Squares N Acres'
    );
  });

  it('takes the counted noun down to the singular for a lone result', () => {
    expect(build('buy', {}, { meta: { total: 1, totalPages: 1 } }).title).toBe(
      'Properties for Sale in Bengaluru – 1 Listing | Squares N Acres'
    );
  });

  it('keeps two chosen localities out of the title rather than guessing one', () => {
    expect(build('buy', { localityId: ['4', '7'] }).title).toBe(
      'Properties for Sale in Bengaluru – 24 Listings | Squares N Acres'
    );
  });
});

describe('h1', () => {
  it('is the title without the brand or the count', () => {
    expect(build('properties').h1).toBe('Properties in Bengaluru');
    expect(build('buy').h1).toBe('Properties for sale in Bengaluru');
    expect(build('rent').h1).toBe('Properties for rent in Bengaluru');
  });

  it('is rebuilt from the filters, not from the route', () => {
    expect(build('buy', { localityId: ['4'], propertyTypeId: ['2'], bedrooms: ['4'] }).h1).toBe(
      '4 BHK Villas for sale in Whitefield, Bengaluru'
    );
  });

  it('keeps a status page’s own noun and drops the redundant verb', () => {
    expect(build('buy-ready-to-move').h1).toBe('Ready-to-move homes in Bengaluru');
  });

  it('follows a listing type chosen in the rail on the unfiltered route', () => {
    expect(build('properties', { listingType: 'lease' }).h1).toBe(
      'Properties for lease in Bengaluru'
    );
  });

  it('keeps a segment route’s noun', () => {
    expect(build('plots').h1).toBe('Plots & land in Bengaluru');
    expect(build('commercial').h1).toBe('Commercial properties in Bengaluru');
  });
});

describe('canonical', () => {
  it('is the bare path when nothing is filtered', () => {
    expect(build('buy').canonicalPath).toBe('/buy');
    expect(build('buy').canonicalUrl).toBe('https://www.squaresnacres.com/buy');
  });

  it('carries the index-worthy parameters in the order of §9.4', () => {
    const seo = build('properties', {
      bedrooms: ['3'],
      localityId: ['4'],
      listingType: 'sale',
      propertyTypeId: ['1'],
    });

    expect(seo.canonicalPath).toBe(
      '/properties?listingType=sale&propertyTypeId=1&localityId=4&bedrooms=3'
    );
  });

  it('never repeats a parameter the route already fixed', () => {
    expect(build('rent', { listingType: 'rent', localityId: ['4'] }).canonicalPath).toBe(
      '/rent?localityId=4'
    );
  });

  it('drops everything that is not index-worthy', () => {
    const seo = build('buy', {
      minPrice: 10000000,
      sort: 'price-desc',
      q: 'lake',
      localityId: ['4'],
    });

    expect(seo.canonicalPath).toBe('/buy?localityId=4');
  });

  it('keeps the page number from page two on', () => {
    expect(build('buy', { page: 2 }).canonicalPath).toBe('/buy?page=2');
    expect(build('buy', { page: 3, localityId: ['4'] }).canonicalPath).toBe(
      '/buy?localityId=4&page=3'
    );
  });
});

describe('noindex', () => {
  it('indexes a plain category page', () => {
    expect(build('buy').noindex).toBe(false);
    expect(build('buy', { localityId: ['4'], bedrooms: ['3'] }).noindex).toBe(false);
  });

  it('refuses a page a visitor built for themselves', () => {
    expect(build('buy', { minPrice: 10000000 }).noindex).toBe(true);
    expect(build('buy', { q: 'lake view' }).noindex).toBe(true);
    expect(build('buy', { sort: 'price-desc' }).noindex).toBe(true);
    expect(build('buy', { amenityIds: ['2'] }).noindex).toBe(true);
    expect(build('buy', { developerId: '3' }).noindex).toBe(true);
    expect(build('buy', { ids: ['1', '2'] }).noindex).toBe(true);
  });

  it('respects `seoSettings.noindex.filteredListings`', () => {
    const seo = buildListingSeo({
      routeConfig: listingRouteByKey('buy'),
      params: { minPrice: 10000000, sort: 'relevance', page: 1, perPage: 12 },
      meta: { total: 3 },
      masterData,
      seoSettings: { ...seoSettings, noindex: { filteredListings: false } },
    });

    expect(seo.noindex).toBe(false);
  });

  it('respects `seoSettings.noindex.paginatedListings`', () => {
    expect(build('buy', { page: 2 }).noindex).toBe(false);

    const seo = buildListingSeo({
      routeConfig: listingRouteByKey('buy'),
      params: { page: 2, sort: 'relevance', perPage: 12 },
      meta: { total: 30, totalPages: 3 },
      masterData,
      seoSettings: { ...seoSettings, noindex: { paginatedListings: true } },
    });

    expect(seo.noindex).toBe(true);
  });
});

describe('pagination links', () => {
  it('has no previous on page one and a next while pages remain', () => {
    const seo = build('buy', { page: 1 }, { meta: { total: 24, totalPages: 2 } });

    expect(seo.pagination.prev).toBeNull();
    expect(seo.pagination.next).toBe('https://www.squaresnacres.com/buy?page=2');
  });

  it('has no next on the last page', () => {
    const seo = build('buy', { page: 2 }, { meta: { total: 24, totalPages: 2 } });

    expect(seo.pagination.prev).toBe('https://www.squaresnacres.com/buy');
    expect(seo.pagination.next).toBeNull();
  });
});

describe('intro', () => {
  it('is the locality’s own sentence when one locality is chosen', () => {
    expect(build('buy', { localityId: ['4'] }).intro).toBe('An eastern tech corridor.');
  });

  it('falls back to the route’s sentence', () => {
    expect(build('plots').intro).toBe(listingRouteByKey('plots').intro);
  });
});

describe('description', () => {
  it('describes the actual result set', () => {
    expect(build('buy', { localityId: ['4'], propertyTypeId: ['1'] }).description).toBe(
      'Browse 24 apartments for sale in Whitefield, Bengaluru. Compare prices, floor plans and amenities, then enquire with Squares N Acres.'
    );
  });
});

describe('a resolved dynamic route', () => {
  it('reads the property type out of the slug', () => {
    const { state, config } = resolveListingRoute({
      routeKey: 'buy-type',
      slug: 'villas',
      masterData,
    });
    const seo = buildListingSeo({
      routeConfig: config,
      params: { sort: 'relevance', page: 1, perPage: 12 },
      meta: { total: 6, totalPages: 1 },
      masterData,
      seoSettings,
      siteName: 'Squares N Acres',
    });

    expect(state).toBe('ok');
    expect(seo.h1).toBe('Villas for sale in Bengaluru');
    expect(seo.canonicalPath).toBe('/buy/villas');
    expect(seo.noindex).toBe(false);
  });
});

describe('cleanTitle', () => {
  it('removes unresolved variables and the punctuation they leave', () => {
    expect(cleanTitle('Properties %listingtype% in %locality%, Bengaluru')).toBe(
      'Properties in Bengaluru'
    );
    expect(cleanTitle('  Properties  in   Bengaluru  –  ')).toBe('Properties in Bengaluru');
    expect(cleanTitle('Properties in Bengaluru –  | Squares N Acres')).toBe(
      'Properties in Bengaluru | Squares N Acres'
    );
  });

  it('leaves a phrase that still reads — the count is removed with its phrase upstream', () => {
    // `buildListingSeo` drops "– %count% Listings" whole when there is no count,
    // which is why `cleanTitle` never has to guess what a stray dash belonged to.
    expect(cleanTitle('Properties in Bengaluru – %count% Listings | Site')).toBe(
      'Properties in Bengaluru – Listings | Site'
    );
  });
});
