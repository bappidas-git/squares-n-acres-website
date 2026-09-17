import article from './fixtures/article.json';
import developer from './fixtures/developer.json';
import locality from './fixtures/locality.json';
import masterData from './fixtures/masterData.json';
import property from './fixtures/property.json';
import seoSettings from './fixtures/seoSettings.json';
import siteIndex from './fixtures/siteIndex.json';
import { DENSITY, IMAGE_COUNT, runAdditionalTests } from '../analyzers/additional';
import { toSeoInput } from '../entityAdapters';

const baseContext = { ...masterData, seoSettings, siteIndex };

const run = (entityType, entity, extra = {}) => {
  const context = { ...baseContext, ...extra };
  const results = runAdditionalTests(toSeoInput(entityType, entity, context), context);
  return Object.fromEntries(results.map((result) => [result.id, result]));
};

const withSeo = (record, seo) => ({ ...record, seo: { ...record.seo, ...seo } });

describe('keyword-in-subheading', () => {
  it('passes when an H2 carries the keyword', () => {
    const record = { ...article, content: '<h2>Karnataka RERA in practice</h2><p>Body.</p>' };
    expect(run('article', record)['keyword-in-subheading'].status).toBe('pass');
  });

  it('ignores an H1 inside the body (§7)', () => {
    const record = { ...article, content: '<h1>Karnataka RERA</h1><h2>Something else</h2>' };
    expect(run('article', record)['keyword-in-subheading'].status).toBe('fail');
  });

  it('fails when there are no subheadings at all', () => {
    const record = { ...article, content: '<p>Just a paragraph.</p>' };
    const result = run('article', record)['keyword-in-subheading'];
    expect(result.status).toBe('fail');
    expect(result.message).toBe('There are no subheadings.');
  });
});

describe('keyword-in-image-alt', () => {
  it('passes when an alt carries the keyword', () => {
    expect(run('property', property)['keyword-in-image-alt'].status).toBe('pass');
  });

  it('warns when the images are described but not with the keyword', () => {
    const record = {
      ...property,
      images: [{ id: 1, url: '/a.png', alt: 'A building', order: 1, isCover: true }],
    };
    expect(run('property', record)['keyword-in-image-alt'].status).toBe('warn');
  });

  it('warns and counts the images with no alt text at all', () => {
    const record = {
      ...property,
      images: [{ id: 1, url: '/a.png', alt: '', order: 1, isCover: true }],
    };
    const result = run('property', record)['keyword-in-image-alt'];
    expect(result.status).toBe('warn');
    expect(result.message).toContain('1 of 1 images have no alt text');
  });

  it('fails when there are no images', () => {
    expect(run('property', { ...property, images: [] })['keyword-in-image-alt'].status).toBe(
      'fail'
    );
  });
});

describe('keyword-density', () => {
  const body = (hits) =>
    `<p>${'filler word here. '.repeat(100)}${'A 3 BHK apartment in Whitefield. '.repeat(hits)}</p>`;

  it('passes inside the range of SEO-07', () => {
    const result = run('property', { ...property, description: body(4) })['keyword-density'];
    expect(result.status).toBe('pass');
    expect(result.value).toBeGreaterThanOrEqual(DENSITY.min);
    expect(result.value).toBeLessThanOrEqual(DENSITY.max);
  });

  it('warns just under the range', () => {
    const result = run('property', { ...property, description: body(1) })['keyword-density'];
    expect(result.status).toBe('warn');
  });

  it('fails well over it', () => {
    const record = { ...property, description: '<p>3 BHK apartment in Whitefield.</p>' };
    const result = run('property', record)['keyword-density'];
    expect(result.status).toBe('fail');
    expect(result.hint).toContain('keyword stuffing');
  });

  it('fails when there is no body to measure', () => {
    expect(run('property', { ...property, description: '' })['keyword-density'].status).toBe(
      'fail'
    );
  });
});

describe('slug-quality', () => {
  const at = (slug) => ({ ...property, slug, seo: { ...property.seo, slug } });

  it('passes a readable slug', () => {
    expect(run('property', property)['slug-quality'].status).toBe('pass');
  });

  it('hints at the stop words it carries without failing for them', () => {
    const result = run('property', at('a-flat-in-the-city'))['slug-quality'];
    expect(result.status).toBe('pass');
    expect(result.hint).toContain('“a”');
  });

  it('fails a slug past 75 characters', () => {
    expect(run('property', at('a'.repeat(80)))['slug-quality'].status).toBe('fail');
  });

  it('fails a slug with capitals or spaces', () => {
    expect(run('property', at('Whitefield Flats'))['slug-quality'].status).toBe('fail');
  });

  it('fails a slug that is only numbers', () => {
    const result = run('property', at('12345'))['slug-quality'];
    expect(result.status).toBe('fail');
    expect(result.message).toBe('The slug is only numbers.');
  });

  it('fails when there is no slug yet', () => {
    expect(run('property', at(''))['slug-quality'].status).toBe('fail');
  });
});

describe('internal-link and external-dofollow-link', () => {
  it('pass when the body links both ways', () => {
    const record = {
      ...article,
      content:
        '<p><a href="/localities/whitefield">Whitefield</a> and <a href="https://rera.karnataka.gov.in">the regulator</a>.</p>',
    };
    const results = run('article', record);
    expect(results['internal-link'].status).toBe('pass');
    expect(results['external-dofollow-link'].status).toBe('pass');
  });

  it('fail when the body links neither way', () => {
    const results = run('article', { ...article, content: '<p>No links at all.</p>' });
    expect(results['internal-link'].status).toBe('fail');
    expect(results['external-dofollow-link'].status).toBe('fail');
  });

  it('warn when every outbound link is nofollow', () => {
    const record = {
      ...article,
      content: '<p><a href="https://example.com" rel="nofollow">A source</a></p>',
    };
    expect(run('article', record)['external-dofollow-link'].status).toBe('warn');
  });

  it('are skipped where they do not belong', () => {
    expect(run('property', property)['internal-link'].status).toBe('skip');
    expect(run('page', { slug: 'about', title: 'About' })['external-dofollow-link'].status).toBe(
      'skip'
    );
  });
});

describe('keyword-unique-site', () => {
  it('passes a keyword no other record targets', () => {
    const changed = withSeo(property, { focusKeyword: 'a phrase nothing else uses' });
    expect(run('property', changed)['keyword-unique-site'].status).toBe('pass');
  });

  it('warns when another record already targets it', () => {
    const clash = withSeo(
      { ...property, id: 999 },
      { focusKeyword: siteIndex[1].seo.focusKeyword }
    );
    const result = run('property', clash)['keyword-unique-site'];
    expect(result.status).toBe('warn');
    expect(result.message).toContain(siteIndex[1].title);
  });

  it('is skipped without the site-wide list', () => {
    expect(run('property', property, { siteIndex: null })['keyword-unique-site'].status).toBe(
      'skip'
    );
  });
});

describe('image-count', () => {
  it('passes a listing with five described images', () => {
    expect(run('property', property)['image-count'].status).toBe('pass');
    expect(IMAGE_COUNT.property).toBe(5);
  });

  it('warns a listing with too few', () => {
    const record = { ...property, images: property.images.slice(0, 2) };
    const result = run('property', record)['image-count'];
    expect(result.status).toBe('warn');
    expect(result.message).toContain('2 of the 5 images');
  });

  it('warns when an image has no alt text', () => {
    const images = property.images.map((image, index) =>
      index === 0 ? { ...image, alt: '' } : image
    );
    expect(run('property', { ...property, images })['image-count'].status).toBe('warn');
  });

  it('fails with no images at all', () => {
    expect(run('property', { ...property, images: [] })['image-count'].status).toBe('fail');
  });

  it('asks an article for one image only', () => {
    expect(run('article', article)['image-count'].status).toBe('pass');
    expect(
      run('article', { ...article, featuredImage: null, content: '<p>No images.</p>' })[
        'image-count'
      ].status
    ).toBe('fail');
  });
});

describe('og-image-set, canonical-set and indexable', () => {
  it('pass a published listing with a share image', () => {
    const record = withSeo(property, { og: { ...property.seo.og, imageUrl: '/og.png' } });
    const results = run('property', record);
    expect(results['og-image-set'].status).toBe('pass');
    expect(results['canonical-set'].status).toBe('pass');
    expect(results['indexable'].status).toBe('pass');
  });

  it('warns when the share image is only the cover photograph', () => {
    expect(run('property', property)['og-image-set'].status).toBe('warn');
  });

  it('fails when there is no image anywhere', () => {
    expect(run('property', { ...property, images: [] })['og-image-set'].status).toBe('fail');
  });

  it('fails the canonical of a record with no slug', () => {
    const result = run('property', { ...property, slug: '', seo: { ...property.seo, slug: '' } })[
      'canonical-set'
    ];
    expect(result.status).toBe('fail');
  });

  it('names the canonical it resolved', () => {
    expect(run('property', property)['canonical-set'].message).toContain(
      `${seoSettings.siteUrl}/properties/${property.slug}`
    );
  });

  it('fails a record that is noindexed on purpose', () => {
    const record = withSeo(property, { robots: { ...property.seo.robots, index: false } });
    const result = run('property', record)['indexable'];
    expect(result.status).toBe('fail');
    expect(result.message).toContain('not to index');
  });

  it('fails a record that is not published yet', () => {
    const result = run('property', { ...property, isActive: false })['indexable'];
    expect(result.status).toBe('fail');
    expect(result.message).toContain('Not published');
  });
});

describe('the property-only tests', () => {
  it('pass a complete listing', () => {
    const results = run('property', property);
    expect(results['price-present'].status).toBe('pass');
    expect(results['locality-in-title'].status).toBe('pass');
    expect(results['rera-present'].status).toBe('pass');
    expect(results['faqs-min-3'].status).toBe('pass');
    expect(results['floor-plan-or-units'].status).toBe('pass');
    expect(results['amenities-min-8'].status).toBe('pass');
  });

  it('accepts "price on request" as a price (§7)', () => {
    const record = {
      ...property,
      pricing: { ...property.pricing, price: null, priceRangeMin: null, priceOnRequest: true },
    };
    const result = run('property', record)['price-present'];
    expect(result.status).toBe('pass');
    expect(result.message).toBe('Price on request acknowledged.');
  });

  it('fails a listing with no price and no acknowledgement', () => {
    const record = {
      ...property,
      pricing: { priceOnRequest: false, currency: 'INR' },
    };
    expect(run('property', record)['price-present'].status).toBe('fail');
  });

  it('fails when the title does not name the locality', () => {
    const record = withSeo(property, { title: 'A very nice apartment indeed' });
    const result = run('property', record)['locality-in-title'];
    expect(result.status).toBe('fail');
    expect(result.message).toContain('Whitefield');
  });

  it('fails when no locality is set at all', () => {
    const record = { ...property, location: { ...property.location, localityId: null } };
    const result = run('property', record)['locality-in-title'];
    expect(result.status).toBe('fail');
    expect(result.field).toBe('location.localityId');
  });

  it('warns rather than fails for the enhancements', () => {
    const bare = {
      ...property,
      reraNumber: '',
      faqs: [],
      floorPlans: [],
      unitConfigurations: [],
      amenityIds: [1, 2],
    };
    const results = run('property', bare);
    expect(results['rera-present'].status).toBe('warn');
    expect(results['faqs-min-3'].status).toBe('warn');
    expect(results['floor-plan-or-units'].status).toBe('warn');
    expect(results['amenities-min-8'].status).toBe('warn');
  });

  it('checks the description for the locality and the property type', () => {
    const both = withSeo(property, {
      description: 'An apartment in Whitefield with a clubhouse and a pool on the podium level.',
    });
    expect(run('property', both)['description-mentions-locality-and-type'].status).toBe('pass');

    const one = withSeo(property, { description: 'An apartment with a clubhouse and a pool.' });
    expect(run('property', one)['description-mentions-locality-and-type'].status).toBe('warn');

    const neither = withSeo(property, { description: 'A place with a clubhouse and a pool.' });
    expect(run('property', neither)['description-mentions-locality-and-type'].status).toBe('fail');
  });

  it('are skipped for everything that is not a listing', () => {
    const results = run('article', article);
    for (const id of ['price-present', 'locality-in-title', 'rera-present', 'amenities-min-8']) {
      expect(results[id].status).toBe('skip');
    }
  });
});

describe('the locality-only tests', () => {
  it('pass a complete locality', () => {
    const results = run('locality', locality);
    expect(results['connectivity-present'].status).toBe('pass');
    expect(results['highlights-present'].status).toBe('pass');
  });

  it('warn a thin one and fail an empty one', () => {
    expect(
      run('locality', { ...locality, connectivity: [{ label: 'Metro', value: 'Purple Line' }] })[
        'connectivity-present'
      ].status
    ).toBe('warn');
    expect(run('locality', { ...locality, highlights: [] })['highlights-present'].status).toBe(
      'fail'
    );
  });

  it('are skipped for a developer', () => {
    expect(run('developer', developer)['connectivity-present'].status).toBe('skip');
  });
});

describe('the article-only tests', () => {
  it('pass a complete article', () => {
    const results = run('article', article);
    expect(results['excerpt-present'].status).toBe('pass');
    expect(results['category-assigned'].status).toBe('pass');
    expect(results['tags-min-2'].status).toBe('pass');
    expect(results['faq-block-present'].status).toBe('pass');
    expect(results['related-links-present'].status).toBe('pass');
  });

  it('fail or warn where the record is thin', () => {
    const thin = {
      ...article,
      excerpt: '',
      categoryId: null,
      tagIds: [],
      faqs: [],
      relatedArticleIds: [],
      relatedPropertyIds: [],
      featuredImage: null,
    };
    const results = run('article', thin);
    expect(results['excerpt-present'].status).toBe('fail');
    expect(results['category-assigned'].status).toBe('fail');
    expect(results['tags-min-2'].status).toBe('fail');
    expect(results['faq-block-present'].status).toBe('warn');
    expect(results['related-links-present'].status).toBe('warn');
    expect(results['featured-image-alt-keyword'].status).toBe('warn');
  });

  it('warns a short excerpt and a single tag', () => {
    expect(run('article', { ...article, excerpt: 'Too short.' })['excerpt-present'].status).toBe(
      'warn'
    );
    expect(run('article', { ...article, tagIds: [1] })['tags-min-2'].status).toBe('warn');
  });

  it('passes the featured image when its alt names the keyword', () => {
    const record = {
      ...article,
      featuredImage: { url: '/a.png', alt: 'Karnataka RERA portal', caption: null },
    };
    expect(run('article', record)['featured-image-alt-keyword'].status).toBe('pass');
  });
});

describe('an empty record', () => {
  it('is analysed without an exception, whatever the type (§7)', () => {
    for (const entityType of ['property', 'article', 'page', 'locality', 'developer', 'author']) {
      expect(() => run(entityType, {})).not.toThrow();
    }
  });

  it('warns only where the test is an enhancement, and fails everywhere else', () => {
    const warned = Object.values(run('property', {}))
      .filter((result) => result.status === 'warn')
      .map((result) => result.id)
      .sort();

    // The four SEO-07 tests §4.4 marks "(warn)". `analyze()` reads even these
    // as failures on a record nobody has written yet, which is what makes the
    // empty record score 0.
    expect(warned).toEqual([
      'amenities-min-8',
      'faqs-min-3',
      'floor-plan-or-units',
      'rera-present',
    ]);
  });
});
