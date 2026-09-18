/**
 * `listingRoutes` — every listing URL the site answers, and what it resolves to
 * (prompt 44).
 *
 * Nine static routes and three dynamic ones share one engine; a route
 * contributes its **fixed** filters and its words and nothing else (D94). Two
 * rules decide whether a URL is a page or a 404, and both are easy to break
 * without noticing:
 *
 *   - D25's resolution order. A `:propertyTypeSlug` segment is read as a
 *     construction status first and as a property type second, which is what
 *     keeps `/buy/ready-to-move` a status page and `/rent/apartments` a type
 *     page without either shadowing the other.
 *   - the pending state. Master data decides whether a slug is a type or a
 *     404, so a page asked before it has arrived waits rather than flashing a
 *     404 at an address that is perfectly valid.
 *
 * Every fixed filter is also checked against `listingFilters`: a route that
 * fixes a parameter the engine does not read would narrow nothing at all.
 */

import LISTING_ROUTES, {
  DEFAULT_CITY,
  listingRouteByKey,
  resolveDynamicSlug,
  resolveListingRoute,
} from '../listingRoutes';
import { CONSTRUCTION_STATUS } from '../../../config/enums';
import { LISTING_PARAM_TYPES } from '../../../utils/listingFilters';

/** The property types the seed publishes, as master data hands them over. */
const propertyTypes = [
  { id: 1, name: 'Apartments', slug: 'apartments', segment: 'residential' },
  { id: 2, name: 'Villas', slug: 'villas', segment: 'residential' },
  { id: 9, name: 'Residential Plots', slug: 'residential-plots', segment: 'land' },
  { id: 11, name: 'Office Spaces', slug: 'office-spaces', segment: 'commercial' },
];

const loaded = { propertyTypes, loading: false };

describe('the route table', () => {
  it('answers the nine addresses the site links to', () => {
    expect(LISTING_ROUTES.map((route) => route.key)).toEqual([
      'properties',
      'buy',
      'buy-pre-launch',
      'buy-under-construction',
      'buy-ready-to-move',
      'buy-resale',
      'buy-type',
      'rent',
      'rent-type',
      'lease',
      'commercial',
      'commercial-type',
      'plots',
    ]);
  });

  it('gives every route a path, a noun and a breadcrumb trail', () => {
    expect(
      LISTING_ROUTES.map((route) => ({
        key: route.key,
        path: typeof route.path === 'string' && route.path.startsWith('/'),
        noun: Boolean(route.noun),
        home: route.breadcrumbs[0],
        // A static route's trail is complete, so its last crumb is the page
        // itself and carries no link; a dynamic route's trail is still one
        // crumb short — `resolveListingRoute` appends the slug's label to it.
        lastCrumbLinks: Object.prototype.hasOwnProperty.call(route.breadcrumbs.at(-1), 'to'),
      }))
    ).toEqual(
      LISTING_ROUTES.map((route) => ({
        key: route.key,
        path: true,
        noun: true,
        home: { label: 'Home', to: '/' },
        lastCrumbLinks: Boolean(route.dynamic),
      }))
    );
  });

  it('fixes only parameters the engine actually reads', () => {
    for (const route of LISTING_ROUTES) {
      for (const key of Object.keys(route.fixed)) {
        expect(LISTING_PARAM_TYPES).toHaveProperty(key);
      }
    }
  });

  it('gives a static route an intro and leaves a dynamic one to its slug', () => {
    expect(
      LISTING_ROUTES.map((route) => ({ key: route.key, hasIntro: typeof route.intro === 'string' }))
    ).toEqual(LISTING_ROUTES.map((route) => ({ key: route.key, hasIntro: !route.dynamic })));
  });

  it('falls back to /properties for a key it does not know', () => {
    expect(listingRouteByKey('nonsense').key).toBe('properties');
    expect(listingRouteByKey(undefined).key).toBe('properties');
    expect(listingRouteByKey('rent').key).toBe('rent');
  });

  it('names the city the headings are about', () => {
    expect(DEFAULT_CITY).toBe('Bengaluru');
  });
});

describe('resolveDynamicSlug', () => {
  it.each(CONSTRUCTION_STATUS.values.map((value) => [value]))(
    'reads %s as a construction status before it looks at property types (D25)',
    (status) => {
      const resolved = resolveDynamicSlug('buy', status, loaded);

      expect(resolved.state).toBe('ok');
      expect(resolved.kind).toBe('status');
      expect(resolved.fixed).toEqual({ constructionStatus: [status] });
      expect(resolved.label).toBe(CONSTRUCTION_STATUS.labelOf(status));
    }
  );

  it('reads a status slug under /rent too, so the order never depends on the parent', () => {
    expect(resolveDynamicSlug('rent', 'ready-to-move', loaded)).toMatchObject({
      state: 'ok',
      kind: 'status',
    });
  });

  it.each([
    ['apartments', 1],
    ['villas', 2],
    ['residential-plots', 9],
    ['office-spaces', 11],
  ])('resolves %s to property type #%i', (slug, id) => {
    const resolved = resolveDynamicSlug('buy', slug, loaded);

    expect(resolved.state).toBe('ok');
    expect(resolved.kind).toBe('propertyType');
    expect(resolved.fixed).toEqual({ propertyTypeId: [String(id)] });
    expect(resolved.record.id).toBe(id);
  });

  it('is case-insensitive about the segment it was given', () => {
    expect(resolveDynamicSlug('buy', 'Apartments', loaded).state).toBe('ok');
    expect(resolveDynamicSlug('buy', 'READY-TO-MOVE', loaded).kind).toBe('status');
  });

  it('waits rather than 404ing while master data is on its way', () => {
    expect(resolveDynamicSlug('buy', 'apartments', { propertyTypes: [], loading: true })).toEqual({
      state: 'pending',
    });
    expect(resolveDynamicSlug('buy', 'apartments', { propertyTypes: [], loading: false })).toEqual({
      state: 'pending',
    });
    expect(resolveDynamicSlug('buy', 'apartments', {})).toEqual({ state: 'pending' });
  });

  it('is a 404 once master data has arrived without the slug in it', () => {
    expect(resolveDynamicSlug('buy', 'there-is-no-such-type', loaded)).toEqual({
      state: 'not-found',
    });
  });

  it.each([undefined, null, ''])('treats %s as a slug nobody has', (slug) => {
    expect(resolveDynamicSlug('buy', slug, loaded)).toEqual({ state: 'not-found' });
  });

  it('takes the type’s own short description as the page intro when it has one', () => {
    const described = {
      propertyTypes: [
        { id: 1, name: 'Apartments', slug: 'apartments', shortDescription: 'Flats.' },
      ],
      loading: false,
    };

    expect(resolveDynamicSlug('buy', 'apartments', described).intro).toBe('Flats.');
    expect(resolveDynamicSlug('buy', 'apartments', loaded).intro).toBeUndefined();
  });
});

describe('resolveListingRoute', () => {
  it('returns a static route unchanged', () => {
    const { state, config } = resolveListingRoute({ routeKey: 'rent', masterData: loaded });

    expect(state).toBe('ok');
    expect(config.fixed).toEqual({ listingType: 'rent' });
    expect(config.path).toBe('/rent');
  });

  it('merges the segment’s filters into the parent’s, keeping both', () => {
    const { state, config } = resolveListingRoute({
      routeKey: 'rent-type',
      slug: 'apartments',
      masterData: loaded,
    });

    expect(state).toBe('ok');
    expect(config.fixed).toEqual({ listingType: 'rent', propertyTypeId: ['1'] });
    expect(config.path).toBe('/rent/apartments');
    expect(config.noun).toBe('Apartments');
    expect(config.breadcrumbs.at(-1)).toEqual({ label: 'Apartments' });
  });

  it('keeps the parent’s listing type on a status page under /buy', () => {
    const { config } = resolveListingRoute({
      routeKey: 'buy-type',
      slug: 'under-construction',
      masterData: loaded,
    });

    expect(config.fixed).toEqual({
      listingType: 'sale',
      constructionStatus: ['under-construction'],
    });
    expect(config.breadcrumbs.at(-1)).toEqual({ label: 'Under Construction' });
  });

  it('keeps the segment on a commercial type page', () => {
    const { config } = resolveListingRoute({
      routeKey: 'commercial-type',
      slug: 'office-spaces',
      masterData: loaded,
    });

    expect(config.fixed).toEqual({ segment: 'commercial', propertyTypeId: ['11'] });
  });

  it('passes the pending and not-found states through with the parent’s config', () => {
    const pending = resolveListingRoute({
      routeKey: 'buy-type',
      slug: 'apartments',
      masterData: { propertyTypes: [], loading: true },
    });
    expect(pending.state).toBe('pending');
    expect(pending.config.key).toBe('buy-type');

    const missing = resolveListingRoute({
      routeKey: 'buy-type',
      slug: 'nothing-like-this',
      masterData: loaded,
    });
    expect(missing.state).toBe('not-found');
  });

  it('falls back to /properties for an unknown route key', () => {
    expect(resolveListingRoute({ routeKey: 'nonsense', masterData: loaded }).config.key).toBe(
      'properties'
    );
  });

  it('never fixes a filter the engine cannot read, whatever the slug resolved to', () => {
    const resolved = ['apartments', 'ready-to-move', 'office-spaces'].flatMap((slug) =>
      ['buy-type', 'rent-type', 'commercial-type'].map((routeKey) =>
        resolveListingRoute({ routeKey, slug, masterData: loaded })
      )
    );

    const unknown = resolved
      .filter((entry) => entry.state === 'ok')
      .flatMap((entry) => Object.keys(entry.config.fixed))
      .filter((key) => !(key in LISTING_PARAM_TYPES));

    expect(unknown).toEqual([]);
  });
});
