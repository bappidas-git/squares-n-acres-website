import article from './fixtures/article.json';
import developer from './fixtures/developer.json';
import locality from './fixtures/locality.json';
import masterData from './fixtures/masterData.json';
import page from './fixtures/page.json';
import property from './fixtures/property.json';
import { MAX_SUGGESTIONS, suggestKeywords, titleNgrams } from '../suggestions';

const context = masterData;

describe('titleNgrams', () => {
  it('reads the 2-, 3- and 4-word phrases a title opens with, stop words gone', () => {
    expect(titleNgrams('Karnataka RERA: A Complete Guide for Bengaluru Homebuyers')).toEqual([
      'karnataka rera',
      'karnataka rera complete',
      'karnataka rera complete guide',
    ]);
  });

  it('keeps the words of a title too short to survive the filter', () => {
    expect(titleNgrams('About us')).toEqual(['about us']);
    expect(titleNgrams('Whitefield')).toEqual(['whitefield']);
    expect(titleNgrams('')).toEqual([]);
  });
});

describe('suggestKeywords for a property', () => {
  const suggestions = suggestKeywords('property', property, context);

  it('leads with what it is, how many rooms and where', () => {
    expect(suggestions[0]).toBe('3 bhk apartment for sale in whitefield');
  });

  it('offers the shorter phrase, the project and the builder', () => {
    expect(suggestions).toContain('apartment in whitefield');
    expect(suggestions).toContain('lakeview heights');
    expect(suggestions).toContain('aurelia estates whitefield');
  });

  it('leaves the configuration out of a plot', () => {
    const plot = {
      ...property,
      segment: 'land',
      propertyTypeId: 9,
      configuration: { bedrooms: null },
    };
    expect(suggestKeywords('property', plot, context).join(' ')).not.toContain('bhk');
  });

  it('says "for rent" for a rental', () => {
    const rental = { ...property, listingType: 'rent' };
    expect(suggestKeywords('property', rental, context)[0]).toContain('for rent');
  });

  it('offers nothing it cannot build from the record', () => {
    expect(suggestKeywords('property', {}, context)).toEqual([]);
  });
});

describe('suggestKeywords for the other types', () => {
  it('offers a locality the phrases people search it by', () => {
    expect(suggestKeywords('locality', locality, context)).toEqual([
      'properties in whitefield',
      'whitefield real estate',
      'flats in whitefield',
      'whitefield property price',
    ]);
  });

  it('offers an article its title n-grams and its category', () => {
    const suggestions = suggestKeywords('article', article, context);
    expect(suggestions[0]).toBe('karnataka rera');
    expect(suggestions).toContain('legal rera');
  });

  it('offers a builder its projects in the city', () => {
    expect(suggestKeywords('developer', developer, context)[0]).toBe(
      'aurelia estates projects in bengaluru'
    );
  });

  it('offers a property type the city it is in', () => {
    expect(
      suggestKeywords('propertyType', { name: 'Apartments', slug: 'apartments' }, context)
    ).toContain('apartments in bengaluru');
  });

  it('offers a page its own title', () => {
    expect(suggestKeywords('page', page, context)[0]).toBe('about us');
  });

  it('offers an author their name', () => {
    expect(suggestKeywords('author', { name: 'Legal Desk' }, context)).toEqual(['legal desk']);
  });
});

describe('the list itself', () => {
  it('is lowercased, de-duplicated and capped', () => {
    const suggestions = suggestKeywords('property', property, context);
    expect(suggestions).toEqual(suggestions.map((value) => value.toLowerCase()));
    expect(new Set(suggestions).size).toBe(suggestions.length);
    expect(suggestions.length).toBeLessThanOrEqual(MAX_SUGGESTIONS);
  });
});
