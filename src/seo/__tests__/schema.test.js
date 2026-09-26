import article from './fixtures/article.json';
import developer from './fixtures/developer.json';
import locality from './fixtures/locality.json';
import masterData from './fixtures/masterData.json';
import page from './fixtures/page.json';
import property from './fixtures/property.json';
import seoSettings from './fixtures/seoSettings.json';
import { toSeoInput } from '../entityAdapters';
import {
  KNOWN_TYPES,
  absolute,
  aggregateRatingNode,
  articleNode,
  breadcrumbNode,
  compact,
  developerOrganizationNode,
  faqPageNode,
  itemListNode,
  mergeGraph,
  organizationNode,
  parseCustom,
  personNode,
  placeNode,
  primaryNodeFor,
  realEstateListingNode,
  reviewNodes,
  validate,
  validateNode,
  videoObjectNode,
  webPageNode,
  websiteNode,
} from '../schema';

const context = { ...masterData, seoSettings };
const SITE = seoSettings.siteUrl;
const input = (entityType, entity) => toSeoInput(entityType, entity, context);

const valid = (node) => validateNode(node);

describe('compact and absolute', () => {
  it('drops empty properties, recursively', () => {
    expect(compact({ a: 1, b: null, c: '', d: { e: undefined }, f: [] })).toEqual({ a: 1 });
  });

  it('keeps a false and a zero, which are values', () => {
    expect(compact({ a: false, b: 0 })).toEqual({ a: false, b: 0 });
  });

  it('makes a path absolute and leaves a URL alone', () => {
    expect(absolute(SITE, '/a.png')).toBe(`${SITE}/a.png`);
    expect(absolute(SITE, 'https://cdn.test/a.png')).toBe('https://cdn.test/a.png');
    expect(absolute(SITE, '')).toBeUndefined();
  });
});

describe('the organisation and the site', () => {
  const organization = organizationNode({}, context);
  const website = websiteNode({}, context);

  it('publish the knowledge graph under a stable @id (§9.3)', () => {
    expect(organization['@id']).toBe(`${SITE}/#organization`);
    expect(organization['@type']).toBe('RealEstateAgent');
    expect(organization.name).toBe('Squares N Acres');
    expect(organization.address['@type']).toBe('PostalAddress');
    expect(organization.geo).toMatchObject({ '@type': 'GeoCoordinates' });
    expect(valid(organization).valid).toBe(true);
  });

  it('list the alternate phone of Site settings beside the knowledge graph’s (prompt 51)', () => {
    const withSecond = organizationNode(
      {},
      { ...context, siteSettings: { general: { alternatePhone: '9845012345' } } }
    );
    expect(withSecond.telephone).toEqual([organization.telephone, '+919845012345']);
    expect(valid(withSecond).valid).toBe(true);

    // The same number twice is one number.
    const same = organizationNode(
      {},
      { ...context, siteSettings: { general: { alternatePhone: organization.telephone } } }
    );
    expect(same.telephone).toBe(organization.telephone);
  });

  it('publish the site with a search action pointing at the listings', () => {
    expect(website['@id']).toBe(`${SITE}/#website`);
    expect(website.publisher).toEqual({ '@id': `${SITE}/#organization` });
    expect(website.potentialAction.target.urlTemplate).toBe(
      `${SITE}/properties?q={search_term_string}`
    );
    expect(valid(website).valid).toBe(true);
  });
});

describe('breadcrumbNode', () => {
  it('numbers the trail from one and makes every URL absolute', () => {
    const node = breadcrumbNode(
      {
        canonical: `${SITE}/properties/x`,
        items: [
          { name: 'Home', url: '/' },
          { name: 'Properties', url: '/properties' },
          { name: 'A listing' },
        ],
      },
      context
    );
    expect(node['@id']).toBe(`${SITE}/properties/x#breadcrumb`);
    expect(node.itemListElement).toHaveLength(3);
    expect(node.itemListElement[0]).toEqual({
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: SITE,
    });
    expect(node.itemListElement[2].item).toBeUndefined();
    expect(valid(node).valid).toBe(true);
  });

  it('answers null when there is no trail', () => {
    expect(breadcrumbNode({ items: [] }, context)).toBeNull();
  });
});

describe('realEstateListingNode', () => {
  const node = realEstateListingNode(input('property', property), context);

  it('is a listing and a dwelling at the same time', () => {
    expect(node['@type']).toEqual(['RealEstateListing', 'Apartment']);
    expect(node['@id']).toBe(`${SITE}/properties/${property.slug}#listing`);
    expect(valid(node).valid).toBe(true);
  });

  it('carries the address, the size, the rooms and the amenities', () => {
    expect(node.address).toMatchObject({ '@type': 'PostalAddress', addressLocality: 'Whitefield' });
    expect(node.floorSize).toEqual({
      '@type': 'QuantitativeValue',
      value: 1650,
      // Google reads the UN/CEFACT code, a human reads the words (prompt 38).
      unitCode: 'FTK',
      unitText: 'sq ft',
    });
    expect(node.numberOfRooms).toBe(3);
    expect(node.amenityFeature.length).toBeGreaterThan(0);
  });

  it('prices the listing in rupees', () => {
    expect(node.offers).toMatchObject({
      '@type': 'Offer',
      price: property.pricing.price,
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
    });
  });

  it('publishes no price when the price is on request', () => {
    const onRequest = {
      ...property,
      pricing: { ...property.pricing, priceOnRequest: true, price: null },
    };
    expect(realEstateListingNode(input('property', onRequest), context).offers).toBeUndefined();
  });

  it('withholds the coordinates unless the record allows the exact location (§9.3)', () => {
    expect(node.geo).toBeUndefined();

    const exact = {
      ...property,
      location: { ...property.location, showExactLocation: true },
    };
    expect(realEstateListingNode(input('property', exact), context).geo).toMatchObject({
      '@type': 'GeoCoordinates',
      latitude: property.location.latitude,
    });
  });

  it('calls a plot a Place rather than a dwelling', () => {
    const plot = { ...property, segment: 'land', propertyTypeId: 9, propertyType: null };
    expect(realEstateListingNode(input('property', plot), context)['@type']).toEqual([
      'RealEstateListing',
      'Place',
    ]);
  });

  it('answers null for a record with no address yet', () => {
    expect(realEstateListingNode(input('property', {}), context)).toBeNull();
  });
});

describe('articleNode', () => {
  const node = articleNode(input('article', article), context);

  it('is a blog posting with a headline, a publisher and dates', () => {
    expect(node['@type']).toBe('BlogPosting');
    expect(node['@id']).toBe(`${SITE}/insights/articles/${article.slug}#article`);
    expect(node.headline).toBe(article.title);
    expect(node.publisher).toEqual({ '@id': `${SITE}/#organization` });
    expect(node.datePublished).toBe(new Date(article.publishedAt).toISOString());
    expect(node.mainEntityOfPage['@id']).toBe(`${SITE}/insights/articles/${article.slug}`);
    expect(valid(node).valid).toBe(true);
  });

  it('honours an explicit schema type', () => {
    const asNews = { ...article, seo: { ...article.seo, schema: { type: 'NewsArticle' } } };
    expect(articleNode(input('article', asNews), context)['@type']).toBe('NewsArticle');
  });

  it('carries the keywords and the section', () => {
    expect(node.keywords).toContain('karnataka rera');
    expect(node.articleSection).toBe('Legal & RERA');
  });
});

describe('faqPageNode', () => {
  it('publishes the questions as text, not as markup', () => {
    const node = faqPageNode(input('article', article), context);
    expect(node['@type']).toBe('FAQPage');
    expect(node['@id']).toBe(`${SITE}/insights/articles/${article.slug}#faq`);
    expect(node.mainEntity).toHaveLength(article.faqs.length);
    expect(node.mainEntity[0].acceptedAnswer.text).not.toContain('<');
    expect(valid(node).valid).toBe(true);
  });

  it('answers null when there are no questions', () => {
    expect(faqPageNode({ faqs: [] })).toBeNull();
  });
});

describe('itemListNode', () => {
  it('lists what is on the page, in order', () => {
    const node = itemListNode(
      {
        canonical: `${SITE}/localities/whitefield`,
        name: 'Properties in Whitefield',
        items: [
          { title: 'One', url: '/properties/one' },
          { title: 'Two', url: '/properties/two' },
        ],
      },
      context
    );
    expect(node['@id']).toBe(`${SITE}/localities/whitefield#itemlist`);
    expect(node.numberOfItems).toBe(2);
    expect(node.itemListElement[1]).toMatchObject({ position: 2, url: `${SITE}/properties/two` });
    expect(valid(node).valid).toBe(true);
  });

  it('numbers a second page from where the first left off', () => {
    const node = itemListNode({ items: [{ title: 'Thirteen' }], startFrom: 13 });
    expect(node.itemListElement[0].position).toBe(13);
  });

  it('answers null for an empty list', () => {
    expect(itemListNode({ items: [] })).toBeNull();
  });
});

describe('placeNode, developerOrganizationNode, personNode and webPageNode', () => {
  it('publish a locality as a place inside its city', () => {
    const node = placeNode(input('locality', locality), context);
    expect(node['@type']).toBe('Place');
    expect(node['@id']).toBe(`${SITE}/localities/${locality.slug}#place`);
    expect(node.containedInPlace).toEqual({ '@type': 'Place', name: 'Bengaluru' });
    expect(node.geo.latitude).toBe(locality.latitude);
    expect(valid(node).valid).toBe(true);
  });

  it('publish a builder under its own page rather than under the site’s', () => {
    const node = developerOrganizationNode(input('developer', developer), context);
    expect(node['@id']).toBe(`${SITE}/builders/${developer.slug}#organization`);
    expect(node['@id']).not.toBe(`${SITE}/#organization`);
    expect(node.foundingDate).toBe(String(developer.establishedYear));
    expect(valid(node).valid).toBe(true);
  });

  it('publish an author as a person with the places they can be found', () => {
    const author = {
      id: 3,
      name: 'Legal Desk',
      slug: 'legal-desk',
      designation: 'Legal desk',
      bio: '<p>Writes about RERA.</p>',
      avatarUrl: 'https://cdn.test/a.png',
      socialLinks: { linkedin: 'https://linkedin.test/legal', twitter: null },
    };
    const node = personNode(input('author', author), context);
    expect(node['@id']).toBe(`${SITE}/insights/authors/legal-desk#person`);
    expect(node.sameAs).toEqual(['https://linkedin.test/legal']);
    expect(node.jobTitle).toBe('Legal desk');
    expect(valid(node).valid).toBe(true);
  });

  it('publish a CMS page as part of the site', () => {
    const node = webPageNode(input('page', page), context);
    expect(node['@id']).toBe(`${SITE}/${page.slug}#webpage`);
    expect(node.isPartOf).toEqual({ '@id': `${SITE}/#website` });
    expect(valid(node).valid).toBe(true);
  });

  it('answer null without a canonical', () => {
    expect(placeNode(input('locality', {}), context)).toBeNull();
    expect(developerOrganizationNode(input('developer', {}), context)).toBeNull();
    expect(personNode(input('author', {}), context)).toBeNull();
    expect(webPageNode(input('page', {}), context)).toBeNull();
  });
});

describe('videoObjectNode', () => {
  it('derives a thumbnail from a YouTube URL', () => {
    const node = videoObjectNode(
      {
        canonical: `${SITE}/properties/x`,
        videoUrl: 'https://www.youtube.com/watch?v=abcd1234',
        name: 'A walkthrough',
        uploadDate: '2026-05-01T00:00:00.000Z',
      },
      context
    );
    expect(node['@id']).toBe(`${SITE}/properties/x#video`);
    expect(node.thumbnailUrl).toBe('https://img.youtube.com/vi/abcd1234/hqdefault.jpg');
    expect(valid(node).valid).toBe(true);
  });

  it('answers null when there is no video', () => {
    expect(videoObjectNode({ canonical: `${SITE}/x` })).toBeNull();
  });
});

describe('reviewNodes', () => {
  const testimonials = [
    { id: 1, name: 'A client', rating: 5, message: 'Good.', isSample: false, isActive: true },
    { id: 2, name: 'Seed', rating: 4, message: 'Sample.', isSample: true, isActive: true },
  ];

  it('publishes the genuine testimonials and drops the seed ones (§9.3)', () => {
    const nodes = reviewNodes({ canonical: `${SITE}/about`, testimonials });
    expect(nodes).toHaveLength(1);
    expect(nodes[0]['@id']).toBe(`${SITE}/about#review-1`);
    expect(nodes[0].reviewRating.ratingValue).toBe(5);
    expect(valid(nodes[0]).valid).toBe(true);
  });

  it('averages only the genuine ones', () => {
    expect(aggregateRatingNode(testimonials)).toMatchObject({ ratingValue: 5, reviewCount: 1 });
    expect(aggregateRatingNode([{ id: 1, rating: 4, isSample: true }])).toBeNull();
  });
});

describe('mergeGraph', () => {
  it('wraps the nodes in one @context and one @graph', () => {
    const graph = mergeGraph([organizationNode({}, context), websiteNode({}, context)]);
    expect(graph['@context']).toBe('https://schema.org');
    expect(graph['@graph']).toHaveLength(2);
  });

  it('folds two nodes with the same @id into one', () => {
    const graph = mergeGraph([
      { '@type': 'Organization', '@id': 'https://x.test/#o', name: 'X' },
      {
        '@id': 'https://x.test/#o',
        aggregateRating: { '@type': 'AggregateRating', ratingValue: 5 },
      },
    ]);
    expect(graph['@graph']).toHaveLength(1);
    expect(graph['@graph'][0]).toMatchObject({ name: 'X', aggregateRating: { ratingValue: 5 } });
  });

  it('flattens a graph passed among the nodes and drops the nulls', () => {
    const graph = mergeGraph([
      null,
      mergeGraph([{ '@type': 'Place', '@id': 'https://x.test/#p', name: 'P' }]),
      [{ '@type': 'Person', '@id': 'https://x.test/#a', name: 'A' }],
    ]);
    expect(graph['@graph'].map((node) => node['@type'])).toEqual(['Place', 'Person']);
  });

  it('keeps a node with no @id of its own', () => {
    const graph = mergeGraph([{ '@type': 'Offer', price: 1, priceCurrency: 'INR' }]);
    expect(graph['@graph']).toHaveLength(1);
  });
});

describe('validate', () => {
  it('accepts the graph the generators build for a listing', () => {
    const graph = mergeGraph([
      organizationNode({}, context),
      websiteNode({}, context),
      realEstateListingNode(input('property', property), context),
      faqPageNode(input('property', property), context),
    ]);
    expect(validate(graph)).toEqual({ valid: true, errors: [] });
  });

  it('refuses a type it does not know (§7)', () => {
    const { valid: ok, errors } = validateNode({ '@type': 'Foo', name: 'X' });
    expect(ok).toBe(false);
    expect(errors[0].message).toContain('Unknown @type');
    expect(KNOWN_TYPES.has('Foo')).toBe(false);
  });

  it('refuses a URL that is not absolute (§7)', () => {
    const { valid: ok, errors } = validateNode({
      '@type': 'WebPage',
      name: 'X',
      url: '/relative',
    });
    expect(ok).toBe(false);
    expect(errors.some((error) => error.path === 'url')).toBe(true);
  });

  it('refuses a date that is not ISO 8601 (§7)', () => {
    const { valid: ok, errors } = validateNode({
      '@type': 'BlogPosting',
      headline: 'X',
      datePublished: '17/09/2026',
    });
    expect(ok).toBe(false);
    expect(errors.some((error) => error.path === 'datePublished')).toBe(true);
  });

  it('names the property a type cannot do without', () => {
    const { errors } = validateNode({ '@type': 'WebSite', url: 'https://x.test' });
    expect(errors[0].message).toBe('WebSite requires “name”.');
  });

  it('refuses a node with no @type at all', () => {
    expect(validateNode({ name: 'X' }).errors[0].message).toBe('Missing @type.');
  });

  it('accepts a bare reference to another node', () => {
    expect(validateNode({ '@id': 'https://x.test/#o' }).valid).toBe(true);
  });

  it('checks the nodes nested inside a node', () => {
    const { errors } = validateNode({
      '@type': 'Place',
      name: 'X',
      geo: { '@type': 'Nonsense' },
    });
    expect(errors.some((error) => error.path.startsWith('geo.'))).toBe(true);
  });

  it('requires a @context on a whole document', () => {
    expect(validate({ '@graph': [] }).errors[0].message).toBe('Missing @context.');
  });
});

describe('parseCustom', () => {
  it('accepts a single valid node', () => {
    const result = parseCustom('{"@type":"Place","name":"Whitefield"}');
    expect(result.valid).toBe(true);
    expect(result.nodes).toHaveLength(1);
  });

  it('accepts a list and a whole graph', () => {
    expect(parseCustom('[{"@type":"Place","name":"A"}]').nodes).toHaveLength(1);
    expect(
      parseCustom('{"@context":"https://schema.org","@graph":[{"@type":"Place","name":"A"}]}').nodes
    ).toHaveLength(1);
  });

  it('answers nothing for an empty string', () => {
    expect(parseCustom('')).toEqual({ valid: true, nodes: [], errors: [] });
  });

  it('reports JSON that does not parse', () => {
    const result = parseCustom('{ not json');
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain('Not valid JSON');
  });

  it('reports a node the validator refuses and publishes nothing', () => {
    const result = parseCustom('{"@type":"Foo"}');
    expect(result.valid).toBe(false);
    expect(result.nodes).toEqual([]);
  });

  it('refuses something that is not an object', () => {
    expect(parseCustom('"a string"').valid).toBe(false);
  });
});

describe('primaryNodeFor', () => {
  it('knows the node each entity type leads with', () => {
    expect(primaryNodeFor('property', input('property', property), context)['@type'][0]).toBe(
      'RealEstateListing'
    );
    expect(primaryNodeFor('article', input('article', article), context)['@type']).toBe(
      'BlogPosting'
    );
    expect(primaryNodeFor('locality', input('locality', locality), context)['@type']).toBe('Place');
    expect(primaryNodeFor('developer', input('developer', developer), context)['@type']).toBe(
      'Organization'
    );
    expect(primaryNodeFor('page', input('page', page), context)['@type']).toBe('WebPage');
  });

  it('answers null for a type it has no generator for', () => {
    expect(primaryNodeFor('nonsense', input('page', page), context)).toBeNull();
  });
});
