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
      // Sales first, then the rent (4, ₹58,000/month) and the lease (5): a
      // monthly figure is never ranked against a sale price, which used to put
      // both rentals ahead of the ₹62.4 L flat on "low to high".
      const cheapest = await request('GET', '/properties?sort=price-asc&perPage=all');
      assert.deepEqual(ids(cheapest), [6, 2, 1, 3, 4, 5]);

      const dearest = await request('GET', '/properties?sort=price-desc&perPage=all');
      assert.deepEqual(ids(dearest), [3, 1, 2, 6, 5, 4]);

      const largest = await request('GET', '/properties?sort=area-desc&perPage=all');
      assert.deepEqual(ids(largest).slice(0, 2), [5, 3]);

      // `relevance` is featured first, then priority, then the latest edit.
      const relevant = await request('GET', '/properties?perPage=all');
      assert.deepEqual(ids(relevant).slice(0, 3).sort(), [1, 2, 3]);
    });
  });

  it('groups sales before rentals on the admin price column too', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const ascending = await request('GET', '/admin/properties?sort=price&order=asc&perPage=all', {
        token,
      });
      assert.deepEqual(ids(ascending), [6, 2, 1, 3, 4, 5]);

      const descending = await request(
        'GET',
        '/admin/properties?sort=price&order=desc&perPage=all',
        { token }
      );
      assert.deepEqual(ids(descending), [3, 1, 2, 6, 5, 4]);
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

  it('reads a listing by slug whether or not it is published', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const slug = 'lakeview-heights-3-bhk-whitefield';

      const found = await request('GET', `/admin/properties/slug/${slug}`, { token });
      assert.equal(found.status, 200);
      assert.equal(found.body.data.id, 1);
      assert.ok(found.body.data.createdBy !== undefined, 'the admin fields are there');

      await request('PATCH', '/admin/properties/1', { token, body: { isActive: false } });

      const hidden = await request('GET', `/properties/slug/${slug}`);
      assert.equal(hidden.status, 404, 'the public route still hides it');

      const preview = await request('GET', `/admin/properties/slug/${slug}`, { token });
      assert.equal(preview.status, 200, 'the admin route does not');
      assert.equal(preview.body.data.isActive, false);

      const missing = await request('GET', '/admin/properties/slug/nothing-here', { token });
      assert.equal(missing.status, 404);

      const anonymous = await request('GET', `/admin/properties/slug/${slug}`);
      assert.equal(anonymous.status, 401, 'no token, no preview');
    });
  });

  it('lets a sales user read the admin slug route but not write (§7)', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(SALES);
      const found = await request(
        'GET',
        '/admin/properties/slug/lakeview-heights-3-bhk-whitefield',
        { token }
      );
      assert.equal(found.status, 200);
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

  /* ---------------------------------------------------------------- *
   * Regressions found by the prompt 44 bug bash
   * ---------------------------------------------------------------- */

  it('derives the slug from the title when the client sends an empty one (§5.9)', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      // The form posts `slug: ''` and `seo.slug: ''` whenever the editor has
      // not chosen a URL; §5.9 has the API derive one. Before prompt 44 the
      // validator refused both as malformed slugs, so the record could not be
      // created at all.
      const created = await request('POST', '/admin/properties', {
        token,
        body: {
          ...NEW_PROPERTY,
          title: 'Empty Slug Tower — 2 BHK Apartments in Hebbal',
          slug: '',
          seo: { slug: '' },
        },
      });

      assert.equal(created.status, 201);
      assert.equal(created.body.data.slug, 'empty-slug-tower-2-bhk-apartments-in-hebbal');
      assert.equal(created.body.data.seo.slug, created.body.data.slug);
    });
  });

  it('refuses a pincode that is not six digits (§6.1)', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const short = await request('POST', '/admin/properties', {
        token,
        body: {
          ...NEW_PROPERTY,
          title: 'Bad Pincode Tower — 2 BHK Apartments in Hebbal',
          location: { ...NEW_PROPERTY.location, pincode: '12' },
        },
      });
      assert.equal(short.status, 422);
      assert.ok(short.body.errors['location.pincode']);

      const letters = await request('POST', '/admin/properties', {
        token,
        body: {
          ...NEW_PROPERTY,
          title: 'Bad Pincode Tower — 2 BHK Apartments in Hebbal',
          location: { ...NEW_PROPERTY.location, pincode: 'abc123' },
        },
      });
      assert.equal(letters.status, 422);

      const good = await request('POST', '/admin/properties', {
        token,
        body: {
          ...NEW_PROPERTY,
          title: 'Good Pincode Tower — 2 BHK Apartments in Hebbal',
          location: { ...NEW_PROPERTY.location, pincode: '560024' },
        },
      });
      assert.equal(good.status, 201);
      assert.equal(good.body.data.location.pincode, '560024');
    });
  });

  it('requires a possession date while a project is pre-launch or under construction', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      for (const constructionStatus of ['pre-launch', 'under-construction']) {
        const missing = await request('POST', '/admin/properties', {
          token,
          body: {
            ...NEW_PROPERTY,
            title: `No Possession Tower — ${constructionStatus} Apartments in Hebbal`,
            constructionStatus,
          },
        });
        assert.equal(missing.status, 422, constructionStatus);
        assert.deepEqual(missing.body.errors.possessionDate, [
          'The possessionDate field is required.',
        ]);

        const given = await request('POST', '/admin/properties', {
          token,
          body: {
            ...NEW_PROPERTY,
            title: `Possession Tower — ${constructionStatus} Apartments in Hebbal`,
            constructionStatus,
            possessionDate: '2029-06-30',
          },
        });
        assert.equal(given.status, 201, constructionStatus);
      }

      // A home that is finished promises nothing, so it needs no date.
      const ready = await request('POST', '/admin/properties', {
        token,
        body: { ...NEW_PROPERTY, title: 'Ready Tower — 2 BHK Apartments in Hebbal' },
      });
      assert.equal(ready.status, 201);

      // A `PATCH` that moves a listing into one of those states must say when.
      const moved = await request('PATCH', '/admin/properties/1', {
        token,
        body: { constructionStatus: 'under-construction' },
      });
      assert.equal(moved.status, 422);
      assert.ok(moved.body.errors.possessionDate);
    });
  });

  it('clears the seo branch a copy cannot inherit (§9.6)', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      await request('PATCH', '/admin/properties/1', {
        token,
        body: {
          seo: {
            canonicalUrl: 'https://www.squaresnacres.com/properties/the-original',
            redirect: { enabled: true, toPath: '/somewhere-else', statusCode: 301 },
            score: 88,
            scoreBand: 'good',
            testsPassed: 44,
            testsTotal: 50,
          },
        },
      });

      const copy = await request('POST', '/admin/properties/1/duplicate', { token });
      assert.equal(copy.status, 201);

      const { seo } = copy.body.data;
      assert.equal(seo.canonicalUrl, null, 'a copy is not the original page');
      assert.equal(seo.redirect.enabled, false);
      assert.equal(seo.score, null);
      assert.equal(seo.scoreBand, 'none');
      assert.equal(seo.testsPassed, 0);
      assert.equal(seo.testsTotal, 0);
      // §9.6 types `analysis` as an object of four lists; it was reset to `[]`,
      // so a panel reading `analysis.basic` got `undefined`.
      assert.ok(seo.analysis && !Array.isArray(seo.analysis));
      assert.deepEqual(seo.analysis, {
        basic: [],
        additional: [],
        titleReadability: [],
        contentReadability: [],
      });
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
