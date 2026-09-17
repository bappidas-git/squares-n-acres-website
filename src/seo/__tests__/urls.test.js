import article from './fixtures/article.json';
import developer from './fixtures/developer.json';
import locality from './fixtures/locality.json';
import page from './fixtures/page.json';
import property from './fixtures/property.json';
import seoSettings from './fixtures/seoSettings.json';
import {
  INDEX_WORTHY_PARAMS,
  absoluteUrl,
  canonicalFor,
  canonicalForEntity,
  isIndexable,
  isNoindexListing,
  normalisePath,
  publicPathFor,
} from '../urls';

const SITE = 'https://www.squaresnacres.com';

describe('normalisePath and absoluteUrl', () => {
  it('gives a path a leading slash and takes its trailing one away', () => {
    expect(normalisePath('about/')).toBe('/about');
    expect(normalisePath('/about')).toBe('/about');
    expect(normalisePath('/')).toBe('/');
    expect(normalisePath('')).toBe('/');
  });

  it('builds an absolute URL with no trailing slash, including for the home page', () => {
    expect(absoluteUrl(SITE, '/about')).toBe(`${SITE}/about`);
    expect(absoluteUrl(`${SITE}/`, '/about/')).toBe(`${SITE}/about`);
    expect(absoluteUrl(SITE, '/')).toBe(SITE);
  });

  it('answers the path alone when there is no site URL', () => {
    expect(absoluteUrl('', '/about')).toBe('/about');
  });
});

describe('publicPathFor', () => {
  it('knows where every entity type lives', () => {
    expect(publicPathFor('property', property)).toBe(`/properties/${property.slug}`);
    expect(publicPathFor('article', article)).toBe(`/insights/articles/${article.slug}`);
    expect(publicPathFor('articleCategory', { slug: 'buying-guides' })).toBe(
      '/insights/articles/category/buying-guides'
    );
    expect(publicPathFor('articleTag', { slug: 'rera' })).toBe('/insights/articles/tag/rera');
    expect(publicPathFor('author', { slug: 'legal-desk' })).toBe('/insights/authors/legal-desk');
    expect(publicPathFor('locality', locality)).toBe(`/localities/${locality.slug}`);
    expect(publicPathFor('developer', developer)).toBe(`/builders/${developer.slug}`);
    expect(publicPathFor('page', page)).toBe(`/${page.slug}`);
  });

  it('sends a commercial property type to the commercial route and the rest to buy', () => {
    expect(publicPathFor('propertyType', { slug: 'apartments', segment: 'residential' })).toBe(
      '/buy/apartments'
    );
    expect(publicPathFor('propertyType', { slug: 'office-spaces', segment: 'commercial' })).toBe(
      '/commercial/office-spaces'
    );
  });

  it('keeps a page slug that is a path', () => {
    expect(publicPathFor('page', { slug: 'buyer-assistance/home-loan' })).toBe(
      '/buyer-assistance/home-loan'
    );
  });

  it('answers null for a record with no slug', () => {
    expect(publicPathFor('property', {})).toBeNull();
  });
});

describe('canonicalFor', () => {
  it('drops every parameter that is not index-worthy (§9.4)', () => {
    expect(
      canonicalFor(SITE, '/properties', { localityId: 4, sort: 'price-asc', minPrice: 5000000 })
    ).toBe(`${SITE}/properties?localityId=4`);
  });

  it('writes the index-worthy parameters in the order of §9.4, whatever order they arrive in', () => {
    const a = canonicalFor(SITE, '/properties', { localityId: 4, listingType: 'sale' });
    const b = canonicalFor(SITE, '/properties', { listingType: 'sale', localityId: 4 });
    expect(a).toBe(b);
    expect(a).toBe(`${SITE}/properties?listingType=sale&localityId=4`);
  });

  it('keeps all seven index-worthy keys', () => {
    const query = {
      listingType: 'sale',
      segment: 'residential',
      propertyTypeId: 1,
      localityId: 4,
      constructionStatus: 'ready-to-move',
      bedrooms: 3,
      page: 2,
    };
    expect(canonicalFor(SITE, '/properties', query)).toBe(
      `${SITE}/properties?listingType=sale&segment=residential&propertyTypeId=1&localityId=4&constructionStatus=ready-to-move&bedrooms=3&page=2`
    );
    expect(INDEX_WORTHY_PARAMS).toHaveLength(7);
  });

  it('leaves page one out', () => {
    expect(canonicalFor(SITE, '/properties', { page: 1 })).toBe(`${SITE}/properties`);
  });

  it('leaves a default sort out and keeps a value that is not the default', () => {
    expect(canonicalFor(SITE, '/properties', { sort: 'relevance' })).toBe(`${SITE}/properties`);
  });

  it('joins a list of values with commas', () => {
    expect(canonicalFor(SITE, '/properties', { bedrooms: [2, 3] })).toBe(
      `${SITE}/properties?bedrooms=2%2C3`
    );
  });
});

describe('canonicalForEntity', () => {
  it('builds the canonical from the record’s own path', () => {
    expect(canonicalForEntity('property', property, { seoSettings })).toBe(
      `${SITE}/properties/${property.slug}`
    );
  });

  it('honours an explicit canonical, without its trailing slash', () => {
    const overridden = { ...property, seo: { ...property.seo, canonicalUrl: `${SITE}/other/` } };
    expect(canonicalForEntity('property', overridden, { seoSettings })).toBe(`${SITE}/other`);
  });

  it('answers null when there is no slug', () => {
    expect(canonicalForEntity('property', {}, { seoSettings })).toBeNull();
  });
});

describe('isNoindexListing', () => {
  it('leaves an index-worthy listing indexable', () => {
    expect(isNoindexListing({ listingType: 'sale', localityId: 4 }, seoSettings)).toBe(false);
  });

  it('noindexes a search, a price filter and an amenity filter (§9.4)', () => {
    expect(isNoindexListing({ q: 'whitefield' }, seoSettings)).toBe(true);
    expect(isNoindexListing({ minPrice: 5000000 }, seoSettings)).toBe(true);
    expect(isNoindexListing({ amenityIds: [1, 2] }, seoSettings)).toBe(true);
    expect(isNoindexListing({ sort: 'price-asc' }, seoSettings)).toBe(true);
  });

  it('ignores a parameter left at its default', () => {
    expect(isNoindexListing({ sort: 'relevance', perPage: 12, page: 1 }, seoSettings)).toBe(false);
  });

  it('obeys the settings', () => {
    expect(isNoindexListing({ q: 'x' }, { noindex: { filteredListings: false } })).toBe(false);
    expect(isNoindexListing({ page: 3 }, { noindex: { paginatedListings: true } })).toBe(true);
    expect(isNoindexListing({ page: 3 }, seoSettings)).toBe(false);
  });

  it('is happy with no parameters at all', () => {
    expect(isNoindexListing()).toBe(false);
  });
});

describe('isIndexable', () => {
  it('refuses a record whose robots say not to index it', () => {
    expect(isIndexable({ seo: { robots: { index: false } } })).toBe(false);
  });

  it('refuses a record that is not published', () => {
    expect(isIndexable(property, { isPublished: false })).toBe(false);
  });

  it('accepts a published record with no opinion', () => {
    expect(isIndexable(property, { isPublished: true })).toBe(true);
  });
});
