import { breadcrumbsFor, compactTrail, toUiItems } from '../breadcrumbs';

/**
 * One trail, drawn by `<Breadcrumbs>` and published by `<Seo>` (§9.3).
 *
 * The rule the whole module exists for is the last one asserted here: the page
 * you are standing on is never a link. A `BreadcrumbList` whose final item
 * points at itself is the kind of thing that passes every validator and still
 * reads as a mistake to anybody who follows it.
 */

const PROPERTY = {
  title: 'Lakeview Heights',
  listingType: 'sale',
  location: { locality: { name: 'Whitefield', slug: 'whitefield' } },
};

describe('breadcrumbsFor', () => {
  it('leaves the home page without a trail', () => {
    expect(breadcrumbsFor('home')).toEqual([]);
  });

  it('gives a property its listing type and its locality', () => {
    expect(breadcrumbsFor('property', PROPERTY)).toEqual([
      { name: 'Home', path: '/' },
      { name: 'Buy', path: '/buy' },
      { name: 'Whitefield', path: '/localities/whitefield' },
      { name: 'Lakeview Heights' },
    ]);
  });

  it('skips a locality the record does not have', () => {
    const trail = breadcrumbsFor('property', { ...PROPERTY, location: {} });
    expect(trail.map((item) => item.name)).toEqual(['Home', 'Buy', 'Lakeview Heights']);
  });

  it('hangs an article under its category', () => {
    const trail = breadcrumbsFor('article', {
      title: 'Karnataka RERA explained',
      category: { name: 'Legal & RERA', slug: 'legal-rera' },
    });

    expect(trail).toEqual([
      { name: 'Home', path: '/' },
      { name: 'Insights', path: '/insights/articles' },
      { name: 'Legal & RERA', path: '/insights/articles/category/legal-rera' },
      { name: 'Karnataka RERA explained' },
    ]);
  });

  it('turns a nested page slug into an unlinked parent crumb (§9.7)', () => {
    const trail = breadcrumbsFor('page', {
      slug: 'buyer-assistance/home-loan',
      title: 'Home loan assistance',
    });

    expect(trail).toEqual([
      { name: 'Home', path: '/' },
      // `/buyer-assistance` is not a page, so the crumb is a label and not a
      // link to a 404.
      { name: 'Buyer Assistance', path: undefined },
      { name: 'Home loan assistance' },
    ]);
  });

  it('names a page from its slug when it has no title yet', () => {
    expect(breadcrumbsFor('page', { slug: 'sell-let' }).at(-1)).toEqual({ name: 'Sell Let' });
  });

  it('prefers the breadcrumb title an editor wrote (§9.6)', () => {
    const trail = breadcrumbsFor('locality', {
      name: 'Whitefield',
      slug: 'whitefield',
      seo: { breadcrumbTitle: 'Whitefield, East Bengaluru' },
    });

    expect(trail.at(-1)).toEqual({ name: 'Whitefield, East Bengaluru' });
  });

  it('takes a listing trail from the route that states it', () => {
    const routeConfig = {
      breadcrumbs: [
        { label: 'Home', to: '/' },
        { label: 'Buy', to: '/buy' },
        { label: 'Ready to Move' },
      ],
    };

    expect(breadcrumbsFor('listing', null, { routeConfig })).toEqual([
      { name: 'Home', path: '/' },
      { name: 'Buy', path: '/buy' },
      { name: 'Ready to Move' },
    ]);
  });

  it.each([
    ['localities', ['Home', 'Localities']],
    ['builders', ['Home', 'Builders']],
    ['blog', ['Home', 'Insights']],
    ['faqs', ['Home', 'Insights', 'FAQs']],
    ['jobs', ['Home', 'Careers']],
    ['shortlist', ['Home', 'Shortlist']],
    ['search', ['Home', 'Search']],
  ])('gives the %s index its own trail', (type, expected) => {
    expect(breadcrumbsFor(type).map((item) => item.name)).toEqual(expected);
  });

  it('honours the home label from the settings (§6.14)', () => {
    const trail = breadcrumbsFor('builders', null, { homeLabel: 'Squares N Acres' });
    expect(trail[0].name).toBe('Squares N Acres');
  });

  it('never links the page you are already on', () => {
    for (const type of ['property', 'locality', 'developer', 'article', 'job', 'page']) {
      const trail = breadcrumbsFor(type, { name: 'A', title: 'A', slug: 'a' });
      expect(trail.at(-1).path).toBeUndefined();
    }
  });
});

describe('compactTrail', () => {
  it('accepts both spellings and drops a crumb with no name', () => {
    expect(
      compactTrail([{ label: 'Home', to: '/' }, { name: '', path: '/nowhere' }, { name: 'Here' }])
    ).toEqual([{ name: 'Home', path: '/' }, { name: 'Here' }]);
  });
});

describe('toUiItems', () => {
  it('speaks the vocabulary `<Breadcrumbs>` was written against', () => {
    expect(toUiItems([{ name: 'Home', path: '/' }, { name: 'Here' }])).toEqual([
      { label: 'Home', to: '/' },
      { label: 'Here', to: undefined },
    ]);
  });
});
