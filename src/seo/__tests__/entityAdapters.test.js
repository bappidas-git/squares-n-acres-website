import article from './fixtures/article.json';
import developer from './fixtures/developer.json';
import locality from './fixtures/locality.json';
import masterData from './fixtures/masterData.json';
import page from './fixtures/page.json';
import property from './fixtures/property.json';
import seoSettings from './fixtures/seoSettings.json';
import { blocksToHtml, readSeo, toSeoInput } from '../entityAdapters';

const context = { ...masterData, seoSettings };

describe('readSeo', () => {
  it('fills the §9.6 shape a record may not carry yet', () => {
    const seo = readSeo({});
    expect(seo).toMatchObject({
      focusKeyword: '',
      secondaryKeywords: [],
      title: '',
      description: '',
      canonicalUrl: null,
      robots: { index: true, follow: true },
      og: { imageUrl: null },
      twitter: { card: 'summary_large_image' },
      schema: { type: 'auto', custom: '', disabledAutoTypes: [] },
      sitemap: { include: true },
      redirect: { enabled: false },
    });
  });

  it('mirrors the record slug when the seo branch has none', () => {
    expect(readSeo({ slug: 'whitefield' }).slug).toBe('whitefield');
  });

  it('keeps what the record already says', () => {
    expect(readSeo(property).focusKeyword).toBe('3 bhk apartment in whitefield');
  });
});

describe('toSeoInput for a property', () => {
  const input = toSeoInput('property', property, context);

  it('reads the title, the slug, the description and the body', () => {
    expect(input.title).toBe(property.title);
    expect(input.slug).toBe(property.slug);
    expect(input.description).toBe(property.seo.description);
    expect(input.contentHtml).toBe(property.description);
    expect(input.wordCount).toBeGreaterThan(100);
  });

  it('uses the record’s own SEO title as the effective title', () => {
    expect(input.effectiveTitle).toBe(property.seo.title);
    expect(input.templateTitle).toContain('Whitefield');
  });

  it('falls back to the resolved template when the record has no SEO title', () => {
    const untitled = { ...property, seo: { ...property.seo, title: '' } };
    expect(toSeoInput('property', untitled, context).effectiveTitle).toBe(
      toSeoInput('property', untitled, context).templateTitle
    );
  });

  it('gathers the gallery and the body images under one shape', () => {
    expect(input.images.length).toBe(property.images.length);
    expect(input.images[0]).toEqual({ src: property.images[0].url, alt: property.images[0].alt });
  });

  it('gathers the facts the property tests read', () => {
    expect(input.extras).toMatchObject({
      localityName: 'Whitefield',
      propertyTypeName: 'Apartments',
      developerName: 'Aurelia Estates',
      hasPrice: true,
      priceOnRequest: false,
      reraNumber: property.reraNumber,
    });
    expect(input.extras.faqs.length).toBeGreaterThan(0);
    expect(input.extras.amenityIds.length).toBeGreaterThan(8);
  });

  it('knows the record’s URL and canonical', () => {
    expect(input.url).toBe(`/properties/${property.slug}`);
    expect(input.canonical).toBe(`${seoSettings.siteUrl}/properties/${property.slug}`);
  });

  it('reads an active listing as published', () => {
    expect(input.isPublished).toBe(property.isActive);
  });
});

describe('toSeoInput for an article', () => {
  const input = toSeoInput('article', article, context);

  it('reads the body, the excerpt and the taxonomy', () => {
    expect(input.contentHtml).toBe(article.content);
    expect(input.summary).toBe(article.excerpt);
    expect(input.extras.categoryName).toBe('Legal & RERA');
    expect(input.extras.tagIds).toEqual(article.tagIds);
    expect(input.extras.faqs).toHaveLength(article.faqs.length);
  });

  it('counts the featured image among the images', () => {
    expect(input.images[0]).toEqual({
      src: article.featuredImage.url,
      alt: article.featuredImage.alt,
    });
  });

  it('reads the headings of the body', () => {
    expect(input.headings.length).toBeGreaterThan(2);
    expect(input.headings.every((heading) => heading.level >= 2)).toBe(true);
  });

  it('reads a published article as published and a draft as not', () => {
    expect(input.isPublished).toBe(true);
    expect(toSeoInput('article', { ...article, status: 'draft' }, context).isPublished).toBe(false);
  });
});

describe('toSeoInput for a page', () => {
  const input = toSeoInput('page', page, context);

  it('turns the blocks into a body it can measure', () => {
    expect(input.contentHtml).toContain('<h2>');
    expect(input.wordCount).toBeGreaterThan(100);
    expect(input.headings.length).toBeGreaterThan(2);
  });

  it('keeps the page’s own path', () => {
    expect(input.url).toBe(`/${page.slug}`);
  });
});

describe('toSeoInput for a locality, a developer and a taxonomy record', () => {
  it('reads a locality under its name', () => {
    const input = toSeoInput('locality', locality, context);
    expect(input.title).toBe(locality.name);
    expect(input.contentHtml).toBe(locality.description);
    expect(input.extras.connectivity).toHaveLength(locality.connectivity.length);
    expect(input.extras.highlights).toHaveLength(locality.highlights.length);
    expect(input.extras.cityName).toBe('Bengaluru');
  });

  it('reads a developer under its name', () => {
    const input = toSeoInput('developer', developer, context);
    expect(input.title).toBe(developer.name);
    expect(input.url).toBe(`/builders/${developer.slug}`);
    expect(input.coverImageUrl).toBe(developer.coverImageUrl);
  });

  it('reads a taxonomy record with its description as the summary and no body', () => {
    const input = toSeoInput(
      'articleCategory',
      { id: 1, name: 'Buying Guides', slug: 'buying-guides', description: 'Step by step.' },
      context
    );
    expect(input.title).toBe('Buying Guides');
    expect(input.summary).toBe('Step by step.');
    expect(input.contentHtml).toBe('');
  });

  it('reads an author with the bio as the body', () => {
    const input = toSeoInput(
      'author',
      { id: 3, name: 'Legal Desk', slug: 'legal-desk', bio: '<p>Writes about RERA.</p>' },
      context
    );
    expect(input.contentText).toBe('Writes about RERA.');
    expect(input.url).toBe('/insights/authors/legal-desk');
  });
});

describe('toSeoInput for an empty record', () => {
  it('answers a complete shape with nothing in it, and never throws', () => {
    for (const entityType of ['property', 'article', 'page', 'locality', 'developer', 'author']) {
      const input = toSeoInput(entityType, {}, context);
      expect(input.title).toBe('');
      expect(input.slug).toBe('');
      expect(input.contentText).toBe('');
      expect(input.images).toEqual([]);
      expect(input.links).toEqual([]);
      expect(input.headings).toEqual([]);
      expect(input.url).toBeNull();
      expect(input.canonical).toBeNull();
      expect(input.wordCount).toBe(0);
    }
  });

  it('survives a record with no arguments at all', () => {
    expect(() => toSeoInput('property')).not.toThrow();
  });
});

describe('blocksToHtml', () => {
  it('turns a block title into a heading and its prose into paragraphs', () => {
    const html = blocksToHtml({
      blocks: [
        { id: 1, type: 'richText', order: 1, data: { title: 'Our story', html: '<p>Body</p>' } },
      ],
    });
    expect(html).toContain('<h2>Our story</h2>');
    expect(html).toContain('<p>Body</p>');
  });

  it('keeps an image with its alt text', () => {
    const html = blocksToHtml({
      blocks: [{ id: 1, type: 'image', order: 1, data: { url: '/a.png', alt: 'A photograph' } }],
    });
    expect(html).toContain('alt="A photograph"');
  });

  it('keeps a call to action as a link', () => {
    const html = blocksToHtml({
      blocks: [
        {
          id: 1,
          type: 'cta',
          order: 1,
          data: { buttonHref: '/contact', buttonLabel: 'Talk to us' },
        },
      ],
    });
    expect(html).toContain('<a href="/contact">Talk to us</a>');
  });

  it('reads the blocks in the order they are placed in', () => {
    const html = blocksToHtml({
      blocks: [
        { id: 2, type: 'richText', order: 2, data: { title: 'Second' } },
        { id: 1, type: 'richText', order: 1, data: { title: 'First' } },
      ],
    });
    expect(html.indexOf('First')).toBeLessThan(html.indexOf('Second'));
  });

  it('answers an empty string for a page with no blocks', () => {
    expect(blocksToHtml({})).toBe('');
  });
});
