/*
 * Testing Library's `no-node-access` and `no-wait-for-multiple-assertions`
 * rules are about the rendered body, where a query is always better than a
 * `querySelector`. This file asserts the **document head**, which Testing
 * Library has no queries for and which `render()` does not return: reading
 * `document.head` is the only way to see what Helmet actually wrote, and
 * waiting for the title *and* the graph together is what makes that read
 * happen after Helmet has committed rather than during.
 */
/* eslint-disable testing-library/no-node-access, testing-library/no-wait-for-multiple-assertions */
import { waitFor } from '@testing-library/react';

import Seo from '../Seo';
import renderWith from '../../../test-utils';
import { PAGE_TYPES } from '../seoDefaults';

/**
 * The head, asserted through the document it actually writes to.
 *
 * Reading `document.head` rather than a render tree is the point: Helmet's job
 * is the difference between the two, and a test that stopped at the JSX would
 * pass while the page shipped no `<title>` at all.
 */

const SITE_URL = 'https://www.squaresnacres.com';

const SEO_SETTINGS = {
  siteUrl: SITE_URL,
  separator: '|',
  titleTemplates: {
    default: '%title% %sep% %sitename%',
    home: '%sitename% – Buy, Sell & Rent Properties in Bangalore',
    property: '%bhk% %propertytype% %listingtype% in %locality%, %city% – %price% %sep% %sitename%',
    page: '%title% %sep% %sitename%',
    article: '%title% %sep% %sitename%',
    locality: 'Properties in %locality%, %city% – Buy, Rent & Invest %sep% %sitename%',
  },
  defaults: {
    metaDescription: 'The site-wide description.',
    ogImageUrl: `${SITE_URL}/brand/og-default.png`,
    twitterCard: 'summary_large_image',
    robots: { index: true, follow: true },
  },
  knowledgeGraph: {
    type: 'RealEstateAgent',
    name: 'Squares N Acres',
    logoUrl: `${SITE_URL}/brand/logo.png`,
    phone: '+919800000001',
    sameAs: [],
  },
  verification: { google: 'google-token', bing: null, pinterest: null, yandex: null },
  breadcrumbs: { enabled: true, homeLabel: 'Home' },
  noindex: { filteredListings: true, paginatedListings: false },
  customHeadHtml: null,
  customBodyEndHtml: null,
};

let mockSiteSettings = {};

jest.mock('../../../contexts/SiteSettingsContext', () => {
  const actual = jest.requireActual('../../../contexts/SiteSettingsContext');
  return { ...actual, useSiteSettings: () => mockSiteSettings };
});

const PROPERTY = {
  id: 1,
  title: 'Lakeview Heights',
  slug: 'lakeview-heights',
  listingType: 'sale',
  segment: 'residential',
  isActive: true,
  availability: 'available',
  publishedAt: '2026-04-23T09:30:00.000Z',
  updatedAt: '2026-06-29T06:20:00.000Z',
  shortDescription: 'A three-bedroom apartment beside the lake.',
  description: '<p>A quiet three bedroom apartment in Whitefield, Bengaluru.</p>',
  pricing: { price: 14200000, currency: 'INR' },
  configuration: { bedrooms: 3, bathrooms: 3 },
  area: { superBuiltUpArea: 1650, areaUnit: 'sqft' },
  location: {
    locality: { id: 4, name: 'Whitefield', slug: 'whitefield' },
    city: { id: 1, name: 'Bengaluru' },
    pincode: '560066',
    latitude: 12.97,
    longitude: 77.75,
    address: 'Survey No. 11',
    showExactLocation: false,
  },
  images: [{ url: 'https://example.com/a.jpg', alt: 'Lakeview Heights', isCover: true }],
  faqs: [{ question: 'Is it ready?', answer: '<p>Yes.</p>' }],
  propertyType: { id: 1, name: 'Apartment', slug: 'apartments' },
  seo: null,
};

const ARTICLE = {
  id: 7,
  title: 'Karnataka RERA explained',
  slug: 'karnataka-rera-explained',
  status: 'published',
  publishedAt: '2026-05-27T06:30:00.000Z',
  updatedAt: '2026-07-01T10:05:00.000Z',
  excerpt: 'What RERA means for a Bengaluru buyer.',
  content: '<p>The Act, in plain words.</p>',
  featuredImage: { url: 'https://example.com/rera.jpg', alt: 'RERA' },
  author: { id: 3, name: 'Editorial Team', slug: 'editorial-team' },
  category: { id: 3, name: 'Legal & RERA', slug: 'legal-rera' },
  tags: [{ id: 1, name: 'RERA' }],
  seo: null,
};

const PAGE = {
  id: 2,
  title: 'About us',
  slug: 'about',
  status: 'published',
  blocks: [],
  seo: null,
};

/** The head as one object, once Helmet has committed it. */
async function head() {
  // Helmet commits on the next frame, and jsdom starts every test with an
  // empty title — so "a title element exists" is not the same as "the head has
  // been written", and waiting for the former would read the head too early.
  // Every page has a graph (the publisher and the site are on all of them), so
  // its script is the last thing written and the honest thing to wait for.
  await waitFor(() => {
    expect(document.title).not.toBe('');
    expect(document.head.querySelector('script[type="application/ld+json"]')).not.toBeNull();
  });

  const metaOf = (selector) =>
    document.head.querySelector(selector)?.getAttribute('content') ?? null;
  const script = document.head.querySelector('script[type="application/ld+json"]');

  return {
    title: document.title,
    description: metaOf('meta[name="description"]'),
    robots: metaOf('meta[name="robots"]'),
    canonical: document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
    prev: document.head.querySelector('link[rel="prev"]')?.getAttribute('href') ?? null,
    next: document.head.querySelector('link[rel="next"]')?.getAttribute('href') ?? null,
    rss: document.head.querySelector('link[rel="alternate"]')?.getAttribute('href') ?? null,
    og: {
      type: metaOf('meta[property="og:type"]'),
      title: metaOf('meta[property="og:title"]'),
      image: metaOf('meta[property="og:image"]'),
      locale: metaOf('meta[property="og:locale"]'),
      siteName: metaOf('meta[property="og:site_name"]'),
      url: metaOf('meta[property="og:url"]'),
    },
    twitter: {
      card: metaOf('meta[name="twitter:card"]'),
      image: metaOf('meta[name="twitter:image"]'),
    },
    article: {
      published: metaOf('meta[property="article:published_time"]'),
      modified: metaOf('meta[property="article:modified_time"]'),
      author: metaOf('meta[property="article:author"]'),
      section: metaOf('meta[property="article:section"]'),
      tags: [...document.head.querySelectorAll('meta[property="article:tag"]')].map((meta) =>
        meta.getAttribute('content')
      ),
    },
    verification: metaOf('meta[name="google-site-verification"]'),
    themeColor: metaOf('meta[name="theme-color"]'),
    lang: document.documentElement.getAttribute('lang'),
    graph: script ? JSON.parse(script.textContent.replace(/\\u003c/g, '<')) : null,
  };
}

/** The `@type`s present in the graph, flattened. */
const typesIn = (graph) =>
  (graph?.['@graph'] ?? []).flatMap((node) =>
    Array.isArray(node['@type']) ? node['@type'] : node['@type'] ? [node['@type']] : []
  );

const nodeOfType = (graph, type) =>
  (graph?.['@graph'] ?? []).find((node) =>
    (Array.isArray(node['@type']) ? node['@type'] : [node['@type']]).includes(type)
  );

beforeEach(() => {
  mockSiteSettings = {
    settings: { general: { siteName: 'Squares N Acres', siteUrl: SITE_URL }, integrations: {} },
    seoSettings: SEO_SETTINGS,
    loading: false,
  };
  document.head.querySelectorAll('[data-rh], [data-sna-jsonld]').forEach((node) => node.remove());
  document.title = '';
});

describe('<Seo> — titles', () => {
  it('resolves the record through its type template (§9.5)', async () => {
    renderWith(<Seo type="property" entity={PROPERTY} />, {
      initialEntries: ['/properties/lakeview-heights'],
    });

    expect((await head()).title).toBe(
      '3 BHK Apartment for Sale in Whitefield, Bengaluru – ₹1.42 Cr | Squares N Acres'
    );
  });

  it('puts a page of its own through the template too', async () => {
    renderWith(<Seo type="localities" />, { initialEntries: ['/localities'] });

    expect((await head()).title).toBe('Localities in Bengaluru | Squares N Acres');
  });

  it('uses an override title verbatim (§9.3)', async () => {
    renderWith(<Seo type="listing" overrides={{ title: 'Apartments for sale – 12 Listings' }} />, {
      initialEntries: ['/buy/apartments'],
    });

    expect((await head()).title).toBe('Apartments for sale – 12 Listings');
  });

  it('resolves the home template with no record at all', async () => {
    renderWith(<Seo type="home" />, { initialEntries: ['/'] });

    expect((await head()).title).toBe('Squares N Acres – Buy, Sell & Rent Properties in Bangalore');
  });

  it('falls back to the site-wide description (§9.3)', async () => {
    renderWith(<Seo type="page" entity={PAGE} />, { initialEntries: ['/about'] });

    expect((await head()).description).toBe('The site-wide description.');
  });
});

describe('<Seo> — canonical', () => {
  it('is the record’s own address, absolute and without a trailing slash', async () => {
    renderWith(<Seo type="property" entity={PROPERTY} />, {
      initialEntries: ['/properties/lakeview-heights?utm_source=mail'],
    });

    expect((await head()).canonical).toBe(`${SITE_URL}/properties/lakeview-heights`);
  });

  it('is the path for a page that is a route rather than a record', async () => {
    renderWith(<Seo type="builders" />, { initialEntries: ['/builders'] });

    expect((await head()).canonical).toBe(`${SITE_URL}/builders`);
  });

  it('takes the listing’s own canonical, page number and all (§9.4)', async () => {
    renderWith(
      <Seo
        type="listing"
        overrides={{ canonical: '/buy/apartments?page=2' }}
        variables={{ page: 2 }}
      />,
      { initialEntries: ['/buy/apartments?page=2&sort=price-asc'] }
    );

    expect((await head()).canonical).toBe(`${SITE_URL}/buy/apartments?page=2`);
  });

  it('honours the record’s canonical override', async () => {
    const entity = { ...PAGE, seo: { canonicalUrl: `${SITE_URL}/company/about` } };
    renderWith(<Seo type="page" entity={entity} />, { initialEntries: ['/about'] });

    expect((await head()).canonical).toBe(`${SITE_URL}/company/about`);
  });
});

describe('<Seo> — robots', () => {
  it('never indexes or follows a preview (§9.3)', async () => {
    renderWith(<Seo type="property" entity={PROPERTY} />, {
      initialEntries: ['/properties/lakeview-heights?preview=admin'],
    });

    expect((await head()).robots).toBe('noindex, nofollow');
  });

  it.each(['search', 'shortlist', 'notFound', 'error', 'admin'])(
    'never indexes or follows a %s page',
    async (type) => {
      renderWith(<Seo type={type} />, { initialEntries: ['/shortlist'] });

      expect((await head()).robots).toBe('noindex, nofollow');
    }
  );

  it('keeps an unpublished record out of the index but still crawlable', async () => {
    renderWith(<Seo type="property" entity={{ ...PROPERTY, isActive: false }} />, {
      initialEntries: ['/properties/lakeview-heights'],
    });

    const robots = (await head()).robots;
    expect(robots).toContain('noindex');
    expect(robots).toContain('follow');
    expect(robots).not.toContain('nofollow');
  });

  it.each(['localities', 'builders', 'blog', 'faqs', 'jobs'])(
    'indexes the %s page, which is a route and therefore never a draft',
    async (type) => {
      renderWith(<Seo type={type} />, { initialEntries: ['/localities'] });

      expect((await head()).robots).toMatch(/^index, follow/);
    }
  );

  it('drops a filtered listing from the index and keeps its links (§9.4)', async () => {
    renderWith(<Seo type="listing" />, { initialEntries: ['/buy?minPrice=5000000'] });

    expect((await head()).robots).toBe('noindex, follow, max-image-preview:large');
  });

  it('publishes the record’s own directives when it may be indexed', async () => {
    const entity = {
      ...PROPERTY,
      seo: { robots: { index: true, follow: true, maxImagePreview: 'large', maxSnippet: -1 } },
    };
    renderWith(<Seo type="property" entity={entity} />, {
      initialEntries: ['/properties/lakeview-heights'],
    });

    expect((await head()).robots).toBe('index, follow, max-snippet:-1, max-image-preview:large');
  });
});

describe('<Seo> — social cards', () => {
  it('falls back down the image chain to the settings default (§9.3)', async () => {
    renderWith(<Seo type="page" entity={PAGE} />, { initialEntries: ['/about'] });

    const resolved = await head();
    expect(resolved.og.image).toBe(`${SITE_URL}/brand/og-default.png`);
    expect(resolved.twitter.image).toBe(`${SITE_URL}/brand/og-default.png`);
    expect(resolved.og.locale).toBe('en_IN');
    expect(resolved.og.siteName).toBe('Squares N Acres');
    expect(resolved.twitter.card).toBe('summary_large_image');
  });

  it('prefers the record’s own cover image', async () => {
    renderWith(<Seo type="property" entity={PROPERTY} />, {
      initialEntries: ['/properties/lakeview-heights'],
    });

    expect((await head()).og.image).toBe('https://example.com/a.jpg');
  });

  it('makes a local image absolute against the site URL', async () => {
    const entity = { ...PAGE, seo: { og: { imageUrl: '/media/about.png' } } };
    renderWith(<Seo type="page" entity={entity} />, { initialEntries: ['/about'] });

    expect((await head()).og.image).toBe(`${SITE_URL}/media/about.png`);
  });

  it('says an article is an article, with its `article:*` meta', async () => {
    renderWith(<Seo type="article" entity={ARTICLE} />, {
      initialEntries: ['/insights/articles/karnataka-rera-explained'],
    });

    const resolved = await head();
    expect(resolved.og.type).toBe('article');
    expect(resolved.article.published).toBe('2026-05-27T06:30:00.000Z');
    expect(resolved.article.modified).toBe('2026-07-01T10:05:00.000Z');
    expect(resolved.article.author).toBe('Editorial Team');
    expect(resolved.article.section).toBe('Legal & RERA');
    expect(resolved.article.tags).toEqual(['RERA']);
  });
});

describe('<Seo> — links and the rest of the head', () => {
  it('links a paginated series without inventing `?page=1` (§7)', async () => {
    renderWith(
      <Seo
        type="listing"
        overrides={{ canonical: '/buy?page=2' }}
        pagination={{ prev: '/buy', next: '/buy?page=3' }}
      />,
      { initialEntries: ['/buy?page=2'] }
    );

    const resolved = await head();
    expect(resolved.prev).toBe(`${SITE_URL}/buy`);
    expect(resolved.next).toBe(`${SITE_URL}/buy?page=3`);
  });

  it('offers the feed on the blog routes', async () => {
    renderWith(<Seo type="blog" />, { initialEntries: ['/insights/articles'] });

    expect((await head()).rss).toMatch(/rss\.xml$/);
  });

  it('offers the feed nowhere else', async () => {
    renderWith(<Seo type="localities" />, { initialEntries: ['/localities'] });

    expect((await head()).rss).toBeNull();
  });

  it('carries the language, the verification tag and the browser chrome', async () => {
    renderWith(<Seo type="home" />, { initialEntries: ['/'] });

    const resolved = await head();
    expect(resolved.lang).toBe('en-IN');
    expect(resolved.verification).toBe('google-token');
    expect(resolved.themeColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(document.head.querySelector('link[rel="apple-touch-icon"]')).not.toBeNull();
  });
});

describe('<Seo> — JSON-LD', () => {
  it('publishes exactly one script holding one graph (§9.3)', async () => {
    renderWith(<Seo type="home" />, { initialEntries: ['/'] });
    await head();

    expect(document.head.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(1);
  });

  it('keeps one script when two pages are mounted at once', async () => {
    // What a route transition looks like for a frame: the outgoing page has not
    // unmounted and the incoming one has rendered. Helmet de-duplicates a
    // `<script>` by its contents, so a graph that changes is a second script
    // unless the head holds exactly one node and rewrites it (JsonLd.jsx).
    renderWith(
      <>
        <Seo type="localities" items={[{ name: 'Whitefield', url: '/localities/whitefield' }]} />
        <Seo type="builders" items={[{ name: 'Aurelia Estates', url: '/builders/aurelia' }]} />
      </>,
      { initialEntries: ['/builders'] }
    );

    const { graph } = await head();
    expect(document.head.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(1);
    expect(nodeOfType(graph, 'ItemList').itemListElement[0].name).toBe('Aurelia Estates');
  });

  it('gives the home page the publisher, the site and a search box', async () => {
    renderWith(<Seo type="home" />, { initialEntries: ['/'] });
    const { graph } = await head();

    expect(typesIn(graph)).toEqual(expect.arrayContaining(['RealEstateAgent', 'WebSite']));
    expect(nodeOfType(graph, 'WebSite').potentialAction['@type']).toBe('SearchAction');
  });

  it('offers the search box on the home page only', async () => {
    renderWith(<Seo type="localities" />, { initialEntries: ['/localities'] });
    const { graph } = await head();

    expect(nodeOfType(graph, 'WebSite').potentialAction).toBeUndefined();
  });

  it.each([
    ['property', PROPERTY, '/properties/lakeview-heights', 'RealEstateListing'],
    ['article', ARTICLE, '/insights/articles/karnataka-rera-explained', 'BlogPosting'],
    ['page', PAGE, '/about', 'WebPage'],
    [
      'locality',
      { id: 4, name: 'Whitefield', slug: 'whitefield' },
      '/localities/whitefield',
      'Place',
    ],
    [
      'developer',
      { id: 1, name: 'Aurelia Estates', slug: 'aurelia-estates' },
      '/builders/aurelia-estates',
      'Organization',
    ],
    [
      'author',
      { id: 3, name: 'Editorial Team', slug: 'editorial-team' },
      '/insights/authors/editorial-team',
      'Person',
    ],
    [
      'job',
      {
        id: 1,
        title: 'Advisor',
        slug: 'advisor',
        description: '<p>Work with buyers.</p>',
        postedAt: '2026-08-13',
        isActive: true,
      },
      '/careers/advisor',
      'JobPosting',
    ],
  ])('leads a %s page with a %s node', async (type, entity, path, expected) => {
    renderWith(<Seo type={type} entity={entity} />, { initialEntries: [path] });

    expect(typesIn((await head()).graph)).toContain(expected);
  });

  it('publishes the questions the page actually shows, not only the stored ones', async () => {
    renderWith(
      <Seo
        type="property"
        entity={PROPERTY}
        faqs={[
          { question: 'Is it ready?', answer: 'Yes.' },
          { question: 'Is there parking?', answer: 'Two covered bays.' },
        ]}
      />,
      { initialEntries: ['/properties/lakeview-heights'] }
    );

    const faq = nodeOfType((await head()).graph, 'FAQPage');
    expect(faq.mainEntity).toHaveLength(2);
  });

  it('lists what an index page is a list of', async () => {
    renderWith(
      <Seo
        type="localities"
        items={[
          { name: 'Whitefield', url: '/localities/whitefield' },
          { name: 'Hebbal', url: '/localities/hebbal' },
        ]}
      />,
      { initialEntries: ['/localities'] }
    );

    const list = nodeOfType((await head()).graph, 'ItemList');
    expect(list.numberOfItems).toBe(2);
    expect(list.itemListElement[0].url).toBe(`${SITE_URL}/localities/whitefield`);
  });

  it('publishes a trail everywhere there is one', async () => {
    renderWith(
      <Seo
        type="locality"
        entity={{ id: 4, name: 'Whitefield', slug: 'whitefield' }}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Localities', path: '/localities' },
          { name: 'Whitefield' },
        ]}
      />,
      { initialEntries: ['/localities/whitefield'] }
    );

    const trail = nodeOfType((await head()).graph, 'BreadcrumbList');
    expect(trail.itemListElement.map((item) => item.name)).toEqual([
      'Home',
      'Localities',
      'Whitefield',
    ]);
    // The page you are on is the end of the trail, so it has no link.
    expect(trail.itemListElement[2].item).toBeUndefined();
  });

  it('appends an editor’s own schema and skips the types they switched off (§9.6)', async () => {
    const entity = {
      ...PROPERTY,
      seo: {
        schema: {
          type: 'auto',
          disabledAutoTypes: ['FAQPage'],
          custom: '{"@type":"Service","name":"Site visit"}',
        },
      },
    };
    renderWith(<Seo type="property" entity={entity} />, {
      initialEntries: ['/properties/lakeview-heights'],
    });

    const types = typesIn((await head()).graph);
    expect(types).toContain('Service');
    expect(types).not.toContain('FAQPage');
  });

  it('leaves out what the knowledge graph does not have, rather than publishing it empty (§7)', async () => {
    mockSiteSettings = {
      ...mockSiteSettings,
      seoSettings: {
        ...SEO_SETTINGS,
        knowledgeGraph: { type: 'RealEstateAgent', name: 'Squares N Acres' },
      },
    };
    renderWith(<Seo type="home" />, { initialEntries: ['/'] });

    const publisher = nodeOfType((await head()).graph, 'RealEstateAgent');
    expect(publisher.name).toBe('Squares N Acres');
    expect(publisher).not.toHaveProperty('telephone');
    // A `PostalAddress` holding nothing but its own `@type` is not an address.
    expect(publisher).not.toHaveProperty('address');
  });

  it('publishes no review for a seeded sample testimonial (D41)', async () => {
    renderWith(
      <Seo
        type="home"
        testimonials={[{ id: 1, name: 'Sample — A. Rao', rating: 5, isSample: true }]}
      />,
      { initialEntries: ['/'] }
    );

    const { graph } = await head();
    expect(typesIn(graph)).not.toContain('Review');
    expect(nodeOfType(graph, 'RealEstateAgent').aggregateRating).toBeUndefined();
  });

  it('publishes a review for a testimonial somebody actually gave', async () => {
    renderWith(
      <Seo
        type="home"
        testimonials={[{ id: 2, name: 'R. Kumar', rating: 5, isSample: false, message: 'Good.' }]}
      />,
      { initialEntries: ['/'] }
    );

    const { graph } = await head();
    expect(typesIn(graph)).toContain('Review');
    expect(nodeOfType(graph, 'RealEstateAgent').aggregateRating.reviewCount).toBe(1);
  });
});

describe('<Seo> — every page type', () => {
  it.each(PAGE_TYPES)('renders a title and a robots directive for %s', async (type) => {
    renderWith(<Seo type={type} entity={type === 'property' ? PROPERTY : undefined} />, {
      initialEntries: ['/'],
    });

    const resolved = await head();
    expect(resolved.title.length).toBeGreaterThan(0);
    expect(resolved.robots).toMatch(/^(no)?index/);
  });
});
