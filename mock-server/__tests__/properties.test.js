/**
 * The property endpoints, end to end (00_MASTER_CONTEXT.md §5.7, §5.14, §6.1).
 *
 * Run with `npm run test:mock`. The harness and what it guarantees are
 * described in `./helpers.js`.
 *
 * The seed these assertions read is the starter fixture of prompt 06: six
 * active listings — three apartments (one of them a rental), a villa, an office
 * floor on lease and a plot — which is enough to pin every filter, every sort
 * option and the facet counts without depending on the full seed of prompt 10.
 */

const assert = require('node:assert/strict');
const { after, describe, it } = require('node:test');

const { ADMIN, SALES, cleanupTempFiles, silenceRequestLog, withServer } = require('./helpers');
const { resetViews } = require('../lib/viewCounter');

silenceRequestLog();

after(cleanupTempFiles);

/** A complete, valid create body — the form of prompt 18 posts this shape. */
const NEW_PROPERTY = {
  title: 'Test Tower — 2 BHK Apartments in Hebbal',
  listingType: 'sale',
  segment: 'residential',
  propertyTypeId: 1,
  constructionStatus: 'ready-to-move',
  availability: 'available',
  location: { localityId: 4, cityId: 1, address: 'Hebbal Main Road' },
  pricing: { price: 9_500_000 },
  area: { superBuiltUpArea: 1200, areaUnit: 'sqft' },
  configuration: { bedrooms: 2, bathrooms: 2 },
  project: { developerId: 1 },
  images: [
    { url: 'https://picsum.photos/seed/sna-test-1/1200/800', alt: 'Test photo 1', order: 1 },
    { url: 'https://picsum.photos/seed/sna-test-2/1200/800', alt: 'Test photo 2', order: 2 },
  ],
  amenityIds: [1, 2],
  isActive: true,
};

const ids = (response) => response.body.data.map((property) => property.id);

describe('GET /properties — filters', () => {
  it('matches bedrooms against the property and its unit configurations', async () => {
    await withServer(async ({ request }) => {
      const three = await request('GET', '/properties?bedrooms=3');
      assert.deepEqual(ids(three), [1, 2]);

      // Property 4 is a 2 BHK; 1 and 2 have 2 BHK unit configurations (§5.7).
      const two = await request('GET', '/properties?bedrooms=2&perPage=all');
      assert.deepEqual(ids(two).sort(), [1, 2, 4]);

      // `5` means five or more, and the seed's largest home has four.
      assert.equal((await request('GET', '/properties?bedrooms=5')).body.meta.total, 0);

      // A plot has no bedrooms at all, so it never matches the filter.
      assert.ok(!ids(await request('GET', '/properties?bedrooms=2,3,4')).includes(6));
    });
  });

  it('requires every amenity of a multi-value amenityIds filter', async () => {
    await withServer(async ({ request }) => {
      const both = await request('GET', '/properties?amenityIds=1,2&perPage=100');
      assert.deepEqual(ids(both), [1, 2, 4, 5]);

      const rare = await request('GET', '/properties?amenityIds=1,20&perPage=100');
      assert.deepEqual(ids(rare), [5]);
    });
  });

  it('drops listings quoted on request as soon as a price filter is set', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      await request('PATCH', '/admin/properties/6', {
        token,
        body: { pricing: { priceOnRequest: true } },
      });

      const unfiltered = await request('GET', '/properties?perPage=all');
      assert.ok(ids(unfiltered).includes(6), 'no price filter, no exclusion');

      const filtered = await request('GET', '/properties?minPrice=0&perPage=all');
      assert.ok(!ids(filtered).includes(6), 'minPrice=0 still excludes it');
    });
  });

  it('converts the area bounds into the unit the listing is stored in', async () => {
    await withServer(async ({ request }) => {
      // 280 m² is 3 014 sq ft: the villa (3 150) and the office floor (5 900).
      const metric = await request('GET', '/properties?minArea=280&areaUnit=sqm&perPage=all');
      assert.deepEqual(ids(metric).sort(), [3, 5]);

      const imperial = await request('GET', '/properties?minArea=3014&perPage=all');
      assert.deepEqual(ids(imperial).sort(), [3, 5]);
    });
  });

  it('searches the locality and the developer name as well as the title', async () => {
    await withServer(async ({ request }) => {
      assert.deepEqual(ids(await request('GET', '/properties?q=whitefield')), [1]);
      // Both listings of Cauvery Homes, matched through the developer's name.
      assert.deepEqual(ids(await request('GET', '/properties?q=cauvery')).sort(), [3, 6]);
      assert.equal((await request('GET', '/properties?q=nothing-here')).body.meta.total, 0);
    });
  });

  it('returns ids in the order they were asked for', async () => {
    await withServer(async ({ request }) => {
      assert.deepEqual(ids(await request('GET', '/properties?ids=3,1')), [3, 1]);
      assert.deepEqual(ids(await request('GET', '/properties?ids=1,3&sort=price-desc')), [1, 3]);
    });
  });

  it('hides a deactivated listing from the list and the detail read', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      await request('PATCH', '/admin/properties/1', { token, body: { isActive: false } });

      const list = await request('GET', '/properties?perPage=all');
      assert.equal(list.body.meta.total, 5);

      const detail = await request('GET', '/properties/slug/lakeview-heights-3-bhk-whitefield');
      assert.equal(detail.status, 404);

      const admin = await request('GET', '/admin/properties?perPage=all', { token });
      assert.equal(admin.body.meta.total, 6, 'the admin list still shows it');
    });
  });
});

describe('GET /properties — sorting and facets', () => {
  it('orders by price, area, views and relevance', async () => {
    await withServer(async ({ request }) => {
      const cheapest = await request('GET', '/properties?sort=price-asc&perPage=all');
      assert.deepEqual(ids(cheapest), [4, 5, 6, 2, 1, 3]);

      const dearest = await request('GET', '/properties?sort=price-desc&perPage=all');
      assert.deepEqual(ids(dearest), [3, 1, 2, 6, 5, 4]);

      const largest = await request('GET', '/properties?sort=area-desc&perPage=all');
      assert.deepEqual(ids(largest).slice(0, 2), [5, 3]);

      // `relevance` is featured first, then priority, then the latest edit.
      const relevant = await request('GET', '/properties?perPage=all');
      assert.deepEqual(ids(relevant).slice(0, 3).sort(), [1, 2, 3]);
    });
  });

  it('counts facets on the filtered set, before pagination', async () => {
    await withServer(async ({ request }) => {
      const { facets, total, perPage } = (await request('GET', '/properties?perPage=2')).body.meta;

      assert.equal(total, 6);
      assert.equal(perPage, 2);
      assert.deepEqual(
        facets.propertyType.find((entry) => entry.id === 1),
        { id: 1, name: 'Apartments', count: 3 }
      );
      assert.deepEqual(
        facets.constructionStatus.find((entry) => entry.value === 'ready-to-move'),
        { value: 'ready-to-move', count: 5 }
      );
      assert.equal(
        facets.locality.reduce((sum, entry) => sum + entry.count, 0),
        6
      );

      const filtered = (await request('GET', '/properties?listingType=rent')).body.meta.facets;
      assert.deepEqual(filtered.locality, [{ id: 5, name: 'Koramangala', count: 1 }]);
    });
  });
});

describe('the remaining public property routes', () => {
  it('lists featured listings by priority', async () => {
    await withServer(async ({ request }) => {
      const featured = await request('GET', '/properties/featured');

      assert.equal(featured.status, 200);
      assert.deepEqual(ids(featured).sort(), [1, 2, 3]);
      assert.equal(featured.body.meta.perPage, 12);
    });
  });

  it('answers the type-ahead from four collections and only from two characters', async () => {
    await withServer(async ({ request }) => {
      const short = await request('GET', '/properties/suggestions?q=w');
      assert.deepEqual(short.body.data, {
        localities: [],
        properties: [],
        propertyTypes: [],
        developers: [],
      });

      const { data } = (await request('GET', '/properties/suggestions?q=whi')).body;
      assert.deepEqual(data.localities, [
        { id: 1, name: 'Whitefield', slug: 'whitefield', propertyCount: 1 },
      ]);
      assert.equal(data.properties[0].localityName, 'Whitefield');
      assert.equal(data.properties[0].price, 12_400_000);

      const villas = (await request('GET', '/properties/suggestions?q=villa')).body.data;
      assert.deepEqual(villas.propertyTypes, [{ id: 2, name: 'Villas', slug: 'villas' }]);
    });
  });

  it('serves the detail read by slug, without the private agent fields', async () => {
    await withServer(async ({ request }) => {
      const response = await request('GET', '/properties/slug/lakeview-heights-3-bhk-whitefield');

      assert.equal(response.status, 200);
      assert.equal(response.body.data.id, 1);
      assert.equal(response.body.data.createdBy, undefined);
      assert.equal(response.body.data.agent.phone, undefined, 'showOnListing is false');
      assert.equal(response.body.data.agent.name, 'Team Member One', 'the display name stays');
      assert.equal(response.body.data.propertyType.slug, 'apartments');
      assert.equal(response.body.data.location.locality.name, 'Whitefield');
    });
  });

  it('answers similar listings with the editor’s picks first', async () => {
    await withServer(async ({ request, login }) => {
      const chosen = await request('GET', '/properties/1/similar');
      assert.deepEqual(ids(chosen), [2, 3], 'similarPropertyIds, in order');

      // A pick that is no longer active simply does not appear, and the rule
      // fills the rest from the same listing type and locality or type.
      const token = await login(ADMIN);
      await request('PATCH', '/admin/properties/2', { token, body: { isActive: false } });

      const filled = await request('GET', '/properties/1/similar');
      assert.deepEqual(ids(filled), [3]);

      assert.equal((await request('GET', '/properties/4/similar')).body.data.length, 0);
      assert.equal((await request('GET', '/properties/2/similar')).status, 404);
    });
  });

  it('counts one view per visitor per hour', async () => {
    await withServer(async ({ request }) => {
      resetViews();
      const before = (await request('GET', '/properties/slug/lakeview-heights-3-bhk-whitefield'))
        .body.data.viewCount;

      const first = await request('POST', '/properties/1/view');
      assert.equal(first.body.data.viewCount, before + 1);

      const second = await request('POST', '/properties/1/view');
      assert.equal(second.body.data.viewCount, before + 1, 'the reload does not count');

      assert.equal((await request('POST', '/properties/999/view')).status, 404);
    });
  });
});

describe('/admin/properties', () => {
  it('creates a listing with a generated slug, ids and defaults', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const created = await request('POST', '/admin/properties', { token, body: NEW_PROPERTY });

      assert.equal(created.status, 201);
      const property = created.body.data;
      assert.equal(property.slug, 'test-tower-2-bhk-apartments-in-hebbal');
      assert.equal(property.seo.slug, property.slug, 'the two slugs are one');
      assert.equal(property.createdBy, 1);
      assert.ok(property.publishedAt, 'an active listing is published now');
      assert.deepEqual(
        property.images.map((image) => image.id),
        [1, 2]
      );
      assert.equal(property.images.filter((image) => image.isCover).length, 1);
      assert.equal(property.pricing.currency, 'INR', 'nested defaults are filled');
      assert.equal(Object.keys(property.sectionVisibility).length, 18);
      assert.equal(property.viewCount, 0);
    });
  });

  it('refuses a duplicate slug with 409 and an invalid body with 422', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const duplicate = await request('POST', '/admin/properties', {
        token,
        body: { ...NEW_PROPERTY, slug: 'lakeview-heights-3-bhk-whitefield' },
      });
      assert.equal(duplicate.status, 409);
      assert.deepEqual(duplicate.body.errors.slug, ['The slug has already been taken.']);

      const invalid = await request('POST', '/admin/properties', {
        token,
        body: { title: 'short' },
      });
      assert.equal(invalid.status, 422);
      assert.ok(invalid.body.errors.title);
      assert.ok(invalid.body.errors.location);
    });
  });

  it('suggests a free slug for check-slug', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const taken = await request(
        'GET',
        '/admin/properties/check-slug?slug=lakeview-heights-3-bhk-whitefield',
        { token }
      );
      assert.deepEqual(taken.body.data, {
        available: false,
        suggestion: 'lakeview-heights-3-bhk-whitefield-2',
      });

      const own = await request(
        'GET',
        '/admin/properties/check-slug?slug=lakeview-heights-3-bhk-whitefield&excludeId=1',
        { token }
      );
      assert.equal(own.body.data.available, true);
    });
  });

  it('replaces the whole record on PUT and only the keys sent on PATCH', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const stored = (await request('GET', '/admin/properties/1', { token })).body.data;

      const partial = await request('PUT', '/admin/properties/1', {
        token,
        body: { title: 'Just the title here' },
      });
      assert.equal(partial.status, 422, 'a PUT states the whole record');

      const replaced = await request('PUT', '/admin/properties/1', {
        token,
        body: { ...NEW_PROPERTY, slug: stored.slug, title: 'Lakeview Heights — renamed' },
      });
      assert.equal(replaced.status, 200);
      assert.equal(replaced.body.data.viewCount, stored.viewCount, 'counters survive');
      assert.equal(replaced.body.data.createdAt, stored.createdAt);
      assert.equal(replaced.body.data.updatedBy, 1);
      assert.deepEqual(replaced.body.data.highlights, [], 'omitted fields take their default');

      const patched = await request('PATCH', '/admin/properties/3', {
        token,
        body: { seo: { title: 'A new SEO title' } },
      });
      assert.equal(patched.body.data.seo.title, 'A new SEO title');
      assert.equal(
        Object.keys(patched.body.data.seo).length,
        Object.keys(stored.seo).length,
        'the other seo keys survive'
      );
      assert.equal(patched.body.data.images.length, 5, 'and so does everything else');

      const images = await request('PATCH', '/admin/properties/3', {
        token,
        body: { images: [{ url: 'https://picsum.photos/seed/one/800/600', alt: 'Only' }] },
      });
      assert.equal(images.body.data.images.length, 1, 'an array is replaced, not merged');
      assert.equal(images.body.data.images[0].isCover, true, 'and the cover is re-derived');
    });
  });

  it('duplicates a listing as an inactive draft', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const first = await request('POST', '/admin/properties/1/duplicate', { token });
      assert.equal(first.status, 201);
      assert.equal(
        first.body.data.title,
        'Lakeview Heights — 3 BHK Apartments in Whitefield (Copy)'
      );
      assert.equal(first.body.data.slug, 'lakeview-heights-3-bhk-whitefield-copy');
      assert.equal(first.body.data.isActive, false);
      assert.equal(first.body.data.isFeatured, false);
      assert.equal(first.body.data.viewCount, 0);
      assert.equal(first.body.data.enquiryCount, 0);
      assert.equal(first.body.data.seo.score, null);

      const second = await request('POST', '/admin/properties/1/duplicate', { token });
      assert.equal(second.body.data.slug, 'lakeview-heights-3-bhk-whitefield-copy-2');
    });
  });

  it('applies a bulk action and reports how many it touched', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const featured = await request('POST', '/admin/properties/bulk', {
        token,
        body: { ids: [4, 5], action: 'feature' },
      });
      assert.deepEqual(featured.body, {
        data: { affected: 2 },
        message: '2 properties updated.',
      });
      assert.equal((await request('GET', '/properties/featured')).body.meta.total, 5);

      const unsupported = await request('POST', '/admin/properties/bulk', {
        token,
        body: { ids: [4], action: 'status' },
      });
      assert.equal(unsupported.status, 422);
      assert.ok(unsupported.body.errors.action);
    });
  });

  it('removes a deleted listing from the similar lists that named it', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const deleted = await request('DELETE', '/admin/properties/2', { token });
      assert.deepEqual(deleted.body, { data: null, message: 'Deleted' });

      const one = await request('GET', '/admin/properties/1', { token });
      assert.deepEqual(one.body.data.similarPropertyIds, [3]);

      assert.equal((await request('DELETE', '/admin/properties/2', { token })).status, 404);
    });
  });

  it('lets a sales user read the desk but not write to it', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(SALES);

      assert.equal((await request('GET', '/admin/properties', { token })).status, 200);
      assert.equal((await request('GET', '/admin/properties/1', { token })).status, 200);
      assert.equal(
        (await request('POST', '/admin/properties', { token, body: NEW_PROPERTY })).status,
        403
      );
      assert.equal(
        (await request('PATCH', '/admin/properties/1', { token, body: { isFeatured: true } }))
          .status,
        403
      );
      assert.equal((await request('DELETE', '/admin/properties/1', { token })).status, 403);
      assert.equal((await request('POST', '/admin/properties/1/duplicate', { token })).status, 403);
    });
  });
});
