import article from './fixtures/article.json';
import locality from './fixtures/locality.json';
import masterData from './fixtures/masterData.json';
import property from './fixtures/property.json';
import seoSettings from './fixtures/seoSettings.json';
import { OG_TYPE_OF, resolveSeoOutput, robotsContent, robotsDirectives } from '../resolve';
import { autoNodeTypes, buildGraph, schemaTypeOptions } from '../schema';

const context = { ...masterData, seoSettings };

describe('robotsDirectives', () => {
  it('leads with the two switches that matter', () => {
    expect(robotsDirectives({})).toEqual(['index', 'follow']);
    expect(robotsDirectives({ index: false })).toEqual(['noindex', 'follow']);
    expect(robotsDirectives({ follow: false })).toEqual(['index', 'nofollow']);
  });

  it('prints a limit only when it has been set', () => {
    expect(robotsContent({ maxImagePreview: 'large' })).toBe(
      'index, follow, max-image-preview:large'
    );
    expect(robotsContent({ maxSnippet: -1, maxImagePreview: null })).toBe(
      'index, follow, max-snippet:-1'
    );
    expect(robotsContent({ maxImagePreview: null })).toBe('index, follow');
  });

  it('adds the three "do not" flags in a fixed order', () => {
    expect(
      robotsContent({
        noimageindex: true,
        noarchive: true,
        nosnippet: true,
        maxImagePreview: null,
      })
    ).toBe('index, follow, noarchive, nosnippet, noimageindex');
  });

  it('forces noindex for a record that is not published', () => {
    expect(robotsDirectives({ index: true }, { indexable: false })[0]).toBe('noindex');
  });
});

describe('resolveSeoOutput', () => {
  it('uses an explicit title verbatim, variables and all', () => {
    const own = resolveSeoOutput('property', property, seoSettings, context);
    expect(own.title).toBe(property.seo.title);
    expect(own.titleSource).toBe('own');

    const templated = resolveSeoOutput(
      'property',
      { ...property, seo: { ...property.seo, title: '' } },
      seoSettings,
      context
    );
    expect(templated.titleSource).toBe('template');
    expect(templated.title).toContain('Whitefield');
    expect(templated.title).toContain(seoSettings.knowledgeGraph.name);

    const withVariables = resolveSeoOutput(
      'property',
      { ...property, seo: { ...property.seo, title: '%bhk% in %locality% — %price%' } },
      seoSettings,
      context
    );
    expect(withVariables.title).toBe('3 BHK in Whitefield — ₹1.24 Cr');
  });

  it('falls back to the site-wide description and says that it did', () => {
    const own = resolveSeoOutput('property', property, seoSettings, context);
    expect(own.descriptionSource).toBe('own');

    const fallback = resolveSeoOutput(
      'property',
      { ...property, seo: { ...property.seo, description: '' } },
      seoSettings,
      context
    );
    expect(fallback.description).toBe(seoSettings.defaults.metaDescription);
    expect(fallback.descriptionSource).toBe('default');
  });

  it('computes the canonical, and lets an override replace it', () => {
    const auto = resolveSeoOutput('property', property, seoSettings, context);
    expect(auto.canonical).toBe(`${seoSettings.siteUrl}/properties/${property.slug}`);
    expect(auto.canonicalSource).toBe('auto');

    const override = resolveSeoOutput(
      'property',
      { ...property, seo: { ...property.seo, canonicalUrl: 'https://example.com/elsewhere/' } },
      seoSettings,
      context
    );
    expect(override.canonical).toBe('https://example.com/elsewhere');
    expect(override.canonicalSource).toBe('own');
  });

  it('noindexes a record that is not published, whatever its own robots say', () => {
    const live = resolveSeoOutput('property', property, seoSettings, context);
    expect(live.robots).toContain('index');
    expect(live.indexable).toBe(true);

    const draft = resolveSeoOutput(
      'property',
      { ...property, isActive: false },
      seoSettings,
      context
    );
    expect(draft.robots.startsWith('noindex')).toBe(true);
    expect(draft.indexable).toBe(false);
  });

  it('follows the §9.3 image chain and types the card', () => {
    const cover = property.images.find((image) => image.isCover)?.url;
    const fromRecord = resolveSeoOutput(
      'property',
      { ...property, seo: { ...property.seo, og: { imageUrl: '' } } },
      seoSettings,
      context
    );
    expect(fromRecord.og.imageUrl).toBe(cover);

    const own = resolveSeoOutput(
      'property',
      { ...property, seo: { ...property.seo, og: { imageUrl: 'https://cdn.test/share.jpg' } } },
      seoSettings,
      context
    );
    expect(own.og.imageUrl).toBe('https://cdn.test/share.jpg');

    const noImages = resolveSeoOutput(
      'locality',
      { ...locality, heroImageUrl: null, seo: { ...locality.seo, og: {} } },
      seoSettings,
      context
    );
    expect(noImages.og.imageUrl).toBe(seoSettings.defaults.ogImageUrl);
  });

  it('gives an article og:type article and everything else website', () => {
    expect(resolveSeoOutput('article', article, seoSettings, context).ogType).toBe('article');
    expect(resolveSeoOutput('property', property, seoSettings, context).ogType).toBe('website');
    expect(OG_TYPE_OF.author).toBe('profile');
  });

  it('lets the social cards fall back to the search title and description', () => {
    const resolved = resolveSeoOutput(
      'property',
      { ...property, seo: { ...property.seo, og: {}, twitter: { card: 'summary' } } },
      seoSettings,
      context
    );
    expect(resolved.og.title).toBe(resolved.title);
    expect(resolved.twitter.description).toBe(resolved.description);
    expect(resolved.twitter.card).toBe('summary');
  });

  it('answers for a record nobody has written yet', () => {
    const blank = resolveSeoOutput('property', {}, seoSettings, context);
    expect(blank.canonical).toBeNull();
    expect(blank.canonicalSource).toBe('none');
    expect(blank.description).toBe(seoSettings.defaults.metaDescription);
  });
});

describe('buildGraph', () => {
  it('publishes the node the type leads with, its questions and its trail', () => {
    const graph = buildGraph('property', property, seoSettings, context);
    const types = graph['@graph'].flatMap((node) =>
      Array.isArray(node['@type']) ? node['@type'] : [node['@type']]
    );

    expect(graph['@context']).toBe('https://schema.org');
    expect(types).toContain('RealEstateListing');
    expect(types).toContain('FAQPage');
    expect(types).toContain('BreadcrumbList');
  });

  it('replaces the leading node’s type when one is forced', () => {
    const graph = buildGraph(
      'property',
      { ...property, seo: { ...property.seo, schema: { type: 'Product' } } },
      seoSettings,
      context
    );
    expect(graph['@graph'][0]['@type']).toBe('Product');
    // The questions stay a FAQPage whatever the listing calls itself.
    expect(graph['@graph'].some((node) => node['@type'] === 'FAQPage')).toBe(true);
  });

  it('leaves out a generated type the record switched off', () => {
    const graph = buildGraph(
      'property',
      { ...property, seo: { ...property.seo, schema: { disabledAutoTypes: ['FAQPage'] } } },
      seoSettings,
      context
    );
    expect(graph['@graph'].some((node) => node['@type'] === 'FAQPage')).toBe(false);
  });

  it('appends a valid custom block and ignores an invalid one', () => {
    const valid = buildGraph(
      'property',
      {
        ...property,
        seo: {
          ...property.seo,
          schema: { custom: '{"@type":"Event","name":"Site visit","startDate":"2026-10-01"}' },
        },
      },
      seoSettings,
      context
    );
    expect(valid['@graph'].some((node) => node['@type'] === 'Event')).toBe(true);

    const broken = buildGraph(
      'property',
      { ...property, seo: { ...property.seo, schema: { custom: '{ not json }' } } },
      seoSettings,
      context
    );
    expect(broken['@graph'].some((node) => node['@type'] === 'Event')).toBe(false);
    expect(broken['@graph'].length).toBeGreaterThan(0);
  });

  it('lists the generated types for the panel’s checklist', () => {
    expect(autoNodeTypes('property', property, seoSettings, context)).toEqual(
      expect.arrayContaining(['RealEstateListing', 'FAQPage', 'BreadcrumbList'])
    );
    expect(autoNodeTypes('locality', locality, seoSettings, context)).toContain('Place');
  });

  it('offers each entity type only the schema types it could honestly claim', () => {
    const forProperty = schemaTypeOptions('property').map((option) => option.value);
    expect(forProperty[0]).toBe('auto');
    expect(forProperty).toContain('RealEstateListing');
    expect(forProperty).not.toContain('Article');

    const forArticle = schemaTypeOptions('article').map((option) => option.value);
    expect(forArticle).toContain('BlogPosting');
    expect(forArticle).not.toContain('RealEstateListing');
  });
});
