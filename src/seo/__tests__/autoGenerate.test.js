import article from './fixtures/article.json';
import developer from './fixtures/developer.json';
import locality from './fixtures/locality.json';
import masterData from './fixtures/masterData.json';
import property from './fixtures/property.json';
import seoSettings from './fixtures/seoSettings.json';
import { DESCRIPTION_TARGET, generateDefaults, trimToLength } from '../autoGenerate';

const options = { context: masterData };

describe('trimToLength', () => {
  it('leaves a short string alone', () => {
    expect(trimToLength('Short enough.', 40)).toBe('Short enough.');
  });

  it('cuts at a word boundary', () => {
    const cut = trimToLength('one two three four five six seven eight nine ten', 20);
    expect(cut.length).toBeLessThanOrEqual(20);
    expect(cut.endsWith(' ')).toBe(false);
    expect('one two three four five six seven eight nine ten').toContain(cut);
  });

  it('does not leave a dangling comma or dash', () => {
    expect(trimToLength('A phrase, and then more words after it', 10)).not.toMatch(/[,-]$/);
  });

  it('collapses whitespace on the way', () => {
    expect(trimToLength('  two   spaces  ', 40)).toBe('two spaces');
  });

  it('answers an empty string for nothing', () => {
    expect(trimToLength(null)).toBe('');
  });
});

describe('generateDefaults for a property', () => {
  const blank = { ...property, seo: {} };

  it('writes a title from the type template', () => {
    expect(generateDefaults('property', blank, seoSettings, options).title).toBe(
      '3 BHK Apartments for Sale in Whitefield, Bengaluru – ₹1.24 Cr | Squares N Acres'
    );
  });

  it('writes a description from the short description, inside the guide', () => {
    const { description } = generateDefaults('property', blank, seoSettings, options);
    expect(description.length).toBeLessThanOrEqual(DESCRIPTION_TARGET);
    expect(property.shortDescription).toContain(description.replace(/…$/, ''));
  });

  it('writes a focus keyword from the record’s own facts', () => {
    expect(generateDefaults('property', blank, seoSettings, options).focusKeyword).toBe(
      '3 bhk apartment for sale in whitefield'
    );
  });

  it('takes the cover photograph as the share image', () => {
    expect(generateDefaults('property', blank, seoSettings, options).og.imageUrl).toBe(
      property.images.find((image) => image.isCover).url
    );
  });
});

describe('what it will not overwrite (ADD-27)', () => {
  it('keeps every value the editor already wrote', () => {
    const generated = generateDefaults('property', property, seoSettings, options);
    expect(generated.title).toBe(property.seo.title);
    expect(generated.description).toBe(property.seo.description);
    expect(generated.focusKeyword).toBe(property.seo.focusKeyword);
  });

  it('keeps a share image the editor chose', () => {
    const chosen = { ...property, seo: { ...property.seo, og: { imageUrl: '/chosen.png' } } };
    expect(generateDefaults('property', chosen, seoSettings, options).og.imageUrl).toBe(
      '/chosen.png'
    );
  });

  it('replaces them only when it is asked to', () => {
    const generated = generateDefaults('property', property, seoSettings, {
      ...options,
      overwrite: true,
    });
    expect(generated.title).not.toBe(property.seo.title);
    expect(generated.focusKeyword).toBe('3 bhk apartment for sale in whitefield');
  });

  it('treats whitespace as empty', () => {
    const blankish = { ...property, seo: { ...property.seo, title: '   ' } };
    expect(generateDefaults('property', blankish, seoSettings, options).title).not.toBe('   ');
  });
});

describe('generateDefaults for the other types', () => {
  it('writes an article description from its excerpt', () => {
    const blank = { ...article, seo: {} };
    const { description, focusKeyword } = generateDefaults('article', blank, seoSettings, options);
    expect(article.excerpt).toContain(description.slice(0, 40));
    expect(focusKeyword).toBe('karnataka rera');
  });

  it('takes the featured image of an article', () => {
    const blank = { ...article, seo: {} };
    expect(generateDefaults('article', blank, seoSettings, options).og.imageUrl).toBe(
      article.featuredImage.url
    );
  });

  it('writes a locality title from the locality template and takes the hero image', () => {
    const blank = { ...locality, seo: {} };
    const generated = generateDefaults('locality', blank, seoSettings, options);
    expect(generated.title).toBe(
      'Properties in Whitefield, Bengaluru – Buy, Rent & Invest | Squares N Acres'
    );
    expect(generated.og.imageUrl).toBe(locality.heroImageUrl);
    expect(generated.focusKeyword).toBe('properties in whitefield');
  });

  it('falls back to a developer’s logo when there is no cover', () => {
    const blank = { ...developer, seo: {}, coverImageUrl: null };
    expect(generateDefaults('developer', blank, seoSettings, options).og.imageUrl).toBe(
      developer.logoUrl
    );
  });

  it('reads the first paragraph of a body when there is no summary', () => {
    const record = {
      id: 1,
      name: 'Legal Desk',
      slug: 'legal-desk',
      bio: '<p>The first paragraph belongs in the description.</p><p>The second does not.</p>',
      seo: {},
    };
    const { description } = generateDefaults('author', record, seoSettings, options);
    expect(description).toBe('The first paragraph belongs in the description.');
  });
});

describe('an empty record', () => {
  it('generates what it can and nothing it cannot', () => {
    const generated = generateDefaults('property', {}, seoSettings, options);
    expect(generated.description).toBe('');
    expect(generated.focusKeyword).toBe('');
    expect(generated.og.imageUrl).toBeNull();
  });

  it('never throws, with or without settings', () => {
    expect(() => generateDefaults('article', {})).not.toThrow();
    expect(() => generateDefaults('page', {}, seoSettings)).not.toThrow();
  });
});
