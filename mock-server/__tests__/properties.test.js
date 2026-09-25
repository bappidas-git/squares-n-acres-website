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
const { ACCESS_TTL_MS, issueAccess } = require('../lib/fileAccess');
const { resetViews } = require('../lib/viewCounter');

silenceRequestLog();

after(cleanupTempFiles);

/**
 * A complete, valid create body — the form of prompt 18 posts this shape. It
 * is published, so it carries what the publish rules ask for (QA-62): a
 * described photograph, a summary, 300 characters of description and a price.
 */
const NEW_PROPERTY = {
  title: 'Test Tower — 2 BHK Apartments in Hebbal',
  shortDescription: 'Two-bedroom homes off Hebbal Main Road, ready to move.',
  description: `<p>${'Test Tower is a ready-to-move block of two-bedroom homes off Hebbal Main Road. '.repeat(5)}</p>`,
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

  it('narrows the featured listings by the filters it declares (QA-62)', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      // The rental joins the featured stock, and the row is asked for it alone.
      await request('PATCH', '/admin/properties/4', { token, body: { isFeatured: true } });

      assert.deepEqual(ids(await request('GET', '/properties/featured?listingType=rent')), [4]);
      assert.deepEqual(ids(await request('GET', '/properties/featured?propertyTypeId=2')), [3]);
      // Never anything that is not featured, whatever the filter asks.
      assert.equal(
        (await request('GET', '/properties/featured?listingType=lease')).body.meta.total,
        0
      );
    });
  });

  it('answers a newly featured listing in the featured row, in priority order (QA-62)', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      await request('PATCH', '/admin/properties/6', { token, body: { isFeatured: true } });

      // Priority 1: after the three the seed features, and in the answer.
      assert.deepEqual(ids(await request('GET', '/properties/featured?perPage=24')), [1, 2, 3, 6]);

      // Switched off, it leaves the row although it stays featured.
      await request('PATCH', '/admin/properties/6', { token, body: { isActive: false } });
      assert.deepEqual(ids(await request('GET', '/properties/featured?perPage=24')), [1, 2, 3]);
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

  it('shows only what master data has switched on (QA-60)', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const slug = 'lakeview-heights-3-bhk-whitefield';

      // Lakeview carries amenities 1 and 2 and badge 3, in locality 1, by
      // developer 1. Switch one of each off.
      for (const path of ['amenities/1', 'badges/3', 'localities/1', 'developers/1']) {
        const off = await request('PATCH', `/admin/${path}`, { token, body: { isActive: false } });
        assert.equal(off.status, 200, path);
      }

      const { data } = (await request('GET', `/properties/slug/${slug}`)).body;
      assert.ok(!data.amenities.some((amenity) => amenity.id === 1), 'the inactive amenity');
      assert.ok(
        data.amenities.some((amenity) => amenity.id === 2),
        'an active one stays'
      );
      assert.ok(!data.badges.some((badge) => badge.id === 3), 'the inactive badge');
      // The name still labels the listing; without a slug, nothing links to a
      // page that answers 404.
      assert.deepEqual(data.location.locality, { id: 1, name: 'Whitefield', slug: null });
      assert.equal(data.project.developer.slug, null);
      assert.ok(data.project.developer.name);

      // A list reads the same way — the cards carry the badges.
      const card = (await request('GET', '/properties?ids=1')).body.data[0];
      assert.ok(!card.badges.some((badge) => badge.id === 3));
      assert.equal(card.location.locality.slug, null);

      // The admin read keeps every tick, so the property form never drops one.
      const admin = (await request('GET', '/admin/properties/1', { token })).body.data;
      assert.ok(admin.amenities.some((amenity) => amenity.id === 1));
      assert.ok(admin.badges.some((badge) => badge.id === 3));
      assert.equal(admin.location.locality.slug, 'whitefield');
      assert.ok(admin.project.developer.slug);
    });
  });

  it('does not publish a switched-off team member as a listing’s advisor (QA-61)', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      // Lakeview names Team Member One and shows the card; the member gets a
      // number and an e-mail for the card to be filled from.
      await request('PATCH', '/admin/properties/1', {
        token,
        body: { agent: { teamMemberId: 1, showOnListing: true } },
      });
      await request('PATCH', '/admin/team/1', {
        token,
        body: { phone: '9880000001', email: 'one@squaresnacres.com' },
      });
      const shown = (await request('GET', '/properties/slug/lakeview-heights-3-bhk-whitefield'))
        .body.data.agent;
      assert.equal(shown.phone, '9880000001');

      // They leave: switched off, they answer for the listing no more.
      await request('PATCH', '/admin/team/1', { token, body: { isActive: false } });
      const gone = (await request('GET', '/properties/slug/lakeview-heights-3-bhk-whitefield')).body
        .data.agent;
      assert.equal(gone.name, null);
      assert.equal(gone.phone, null);
      assert.equal(gone.email, null);

      // What a listing typed itself still shows: Cauvery Green gives its own
      // name and number beside Team Member Two.
      await request('PATCH', '/admin/team/2', { token, body: { isActive: false } });
      const typed = (await request('GET', '/properties/slug/cauvery-green-villas-yelahanka')).body
        .data.agent;
      assert.equal(typed.name, 'Team Member Two');
      assert.equal(typed.phone, '9880000002');

      // The admin read keeps the member, so the property form still names them.
      const admin = (await request('GET', '/admin/properties/1', { token })).body.data.agent;
      assert.equal(admin.phone, '9880000001');
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

/** Listing 1 of the starter fixture, which ships with no files at all. */
const LAKEVIEW = 'lakeview-heights-3-bhk-whitefield';

const FILE = {
  brochure: 'https://files.example.com/lakeview/brochure.pdf',
  rera: 'https://files.example.com/lakeview/rera-certificate.pdf',
  prices: 'https://files.example.com/lakeview/price-list.pdf',
};

/**
 * A gated brochure, an open paper, a gated paper, and the brochure attached a
 * second time as a paper — the four cases the public read has to get right.
 */
const FILES = {
  brochureUrl: FILE.brochure,
  brochureLeadGated: true,
  documents: [
    { id: 1, title: 'RERA certificate', url: FILE.rera, type: 'approval', leadGated: false },
    { id: 2, title: 'Price list', url: FILE.prices, type: 'price-list', leadGated: true },
    { id: 3, title: 'Brochure', url: FILE.brochure, type: 'brochure', leadGated: false },
  ],
};

const PLAN = {
  twoBhk: 'https://files.example.com/lakeview/plan-2bhk.png',
  twoBhkPdf: 'https://files.example.com/lakeview/plan-2bhk.pdf',
  threeBhk: 'https://files.example.com/lakeview/plan-3bhk.png',
  unit: 'https://files.example.com/lakeview/unit-2bhk.png',
  unitPdf: 'https://files.example.com/lakeview/unit-2bhk.pdf',
  retired: 'https://files.example.com/lakeview/unit-studio.png',
};

/**
 * Two floor plans (one with a PDF) and three unit configurations: one with a
 * drawing and a PDF, one with neither, and a retired one with a drawing.
 */
const PLANS = {
  floorPlans: [
    {
      id: 1,
      title: '2 BHK — 1,180 sq ft',
      imageUrl: PLAN.twoBhk,
      pdfUrl: PLAN.twoBhkPdf,
      order: 1,
    },
    { id: 2, title: '3 BHK — 1,650 sq ft', imageUrl: PLAN.threeBhk, pdfUrl: null, order: 2 },
  ],
  unitConfigurations: [
    {
      id: 1,
      name: '2 BHK',
      bedrooms: 2,
      floorPlanImageUrl: PLAN.unit,
      floorPlanPdfUrl: PLAN.unitPdf,
      isActive: true,
    },
    { id: 2, name: '3 BHK', bedrooms: 3, isActive: true },
    { id: 3, name: 'Studio', bedrooms: 1, floorPlanImageUrl: PLAN.retired, isActive: false },
  ],
};

/** What the gated "Open" of a paper posts (`document-request`, P28). */
const DOCUMENT_REQUEST = {
  name: 'Test Visitor',
  phone: '9876543210',
  email: 'visitor@example.com',
  source: 'document-request',
  propertyId: 1,
  message: 'Requested: Price list',
};

describe('gated files (QA-51 OPEN-1)', () => {
  it('keeps the address of every gated file out of every public read', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const saved = await request('PATCH', '/admin/properties/1', { token, body: FILES });
      assert.equal(saved.status, 200, saved.text);

      const { data } = (await request('GET', `/properties/slug/${LAKEVIEW}`)).body;
      assert.equal(data.brochureUrl, null);
      assert.equal(data.hasBrochure, true, 'the page still knows there is a brochure to ask for');
      assert.equal(data.brochureLeadGated, true);
      assert.deepEqual(
        data.documents.map((document) => [document.id, document.url, document.leadGated]),
        [
          [1, FILE.rera, false],
          [2, null, true],
        ],
        'the brochure attached as a paper is the brochure, offered once (P25)'
      );
      assert.deepEqual(
        data.documents.map((document) => document.hasFile),
        [true, true]
      );

      // Not in the JSON anywhere — the detail read, the list, the featured row,
      // a lookup by id.
      for (const path of [
        `/properties/slug/${LAKEVIEW}`,
        '/properties?perPage=all',
        '/properties/featured',
        '/properties?ids=1',
      ]) {
        const response = await request('GET', path);
        assert.equal(response.status, 200, path);
        assert.ok(response.text.includes('"id":1'), `${path} has listing 1`);
        for (const url of [FILE.brochure, FILE.prices]) {
          assert.ok(!response.text.includes(url), `${path} gives away ${url}`);
        }
      }
    });
  });

  it('leaves the admin reads exactly as stored', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      await request('PATCH', '/admin/properties/1', { token, body: FILES });

      for (const path of ['/admin/properties/1', `/admin/properties/slug/${LAKEVIEW}`]) {
        const { data } = (await request('GET', path, { token })).body;
        assert.equal(data.brochureUrl, FILE.brochure, path);
        assert.equal(data.brochureLeadGated, true, path);
        assert.equal(data.hasBrochure, undefined, `${path} is the record, not the public view`);
        assert.deepEqual(
          data.documents.map((document) => [document.id, document.url, document.leadGated]),
          FILES.documents.map((document) => [document.id, document.url, document.leadGated]),
          path
        );
        assert.ok(
          data.documents.every((document) => document.hasFile === undefined),
          path
        );
      }

      const list = await request('GET', '/admin/properties?perPage=100', { token });
      const row = list.body.data.find((property) => property.id === 1);
      assert.equal(row.brochureUrl, FILE.brochure);
    });
  });

  it('gates an open file that shares its address with a gated one', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const deed = 'https://files.example.com/lakeview/sale-deed.pdf';
      await request('PATCH', '/admin/properties/1', {
        token,
        body: {
          // The brochure is left open, but the same file is gated as a paper.
          brochureUrl: FILE.brochure,
          brochureLeadGated: false,
          documents: [
            { id: 1, title: 'Brochure', url: FILE.brochure, type: 'brochure', leadGated: true },
            { id: 2, title: 'Sale deed (draft)', url: deed, type: 'legal', leadGated: false },
            { id: 3, title: 'Sale deed', url: deed, type: 'legal', leadGated: true },
          ],
        },
      });

      const read = await request('GET', `/properties/slug/${LAKEVIEW}`);
      const { data } = read.body;
      assert.equal(data.brochureUrl, null);
      assert.equal(data.brochureLeadGated, true, 'the page shows the lock it will meet');
      assert.deepEqual(
        data.documents.map((document) => [document.id, document.url, document.leadGated]),
        [
          [2, null, true],
          [3, null, true],
        ]
      );
      assert.ok(!read.text.includes(FILE.brochure) && !read.text.includes(deed));

      // A brochure that is open and nobody's gated file is simply a link.
      await request('PATCH', '/admin/properties/1', {
        token,
        body: { brochureUrl: FILE.rera, brochureLeadGated: false, documents: [] },
      });
      const open = (await request('GET', `/properties/slug/${LAKEVIEW}`)).body.data;
      assert.equal(open.brochureUrl, FILE.rera);
      assert.equal(open.brochureLeadGated, false);
      assert.equal(open.hasBrochure, true);

      // No brochure at all is not a brochure to ask for.
      await request('PATCH', '/admin/properties/1', { token, body: { brochureUrl: null } });
      const none = (await request('GET', `/properties/slug/${LAKEVIEW}`)).body.data;
      assert.equal(none.brochureUrl, null);
      assert.equal(none.hasBrochure, false);
    });
  });

  it('answers a lead about the listing with a token that opens its files', async () => {
    await withServer(async ({ request, login, db }) => {
      const token = await login(ADMIN);
      await request('PATCH', '/admin/properties/1', { token, body: FILES });

      // Any form about the listing earns it: a paper, an enquiry, a floor plan
      // (P24, P28 — the visitor is not asked again for the next file).
      for (const source of ['document-request', 'property-enquiry', 'floor-plan-request']) {
        const created = await request('POST', '/leads', { body: { ...DOCUMENT_REQUEST, source } });
        assert.equal(created.status, 201, created.text);

        const { access } = created.body.data;
        assert.equal(typeof access?.token, 'string', source);
        assert.ok(access.token.length >= 32, 'long enough not to be guessed');
        const lifetime = Date.parse(access.expiresAt) - Date.now();
        assert.ok(lifetime > ACCESS_TTL_MS - 60_000 && lifetime <= ACCESS_TTL_MS, 'a day');

        const files = await request('POST', '/properties/1/documents/access', {
          body: { token: access.token },
        });
        assert.equal(files.status, 200, files.text);
        assert.deepEqual(files.body.data, {
          brochureUrl: FILE.brochure,
          // Every paper with an address, the open one too, so the page can
          // render one list; the brochure's second copy is still left out.
          documents: [
            { id: 1, url: FILE.rera },
            { id: 2, url: FILE.prices },
          ],
          // The starter listing's drawings, which have no PDF; its units
          // carry no drawing at all.
          floorPlans: [
            {
              id: 1,
              imageUrl: 'https://picsum.photos/seed/sna-lakeview-heights-plan-2bhk/1000/700',
              pdfUrl: null,
            },
            {
              id: 2,
              imageUrl: 'https://picsum.photos/seed/sna-lakeview-heights-plan-3bhk/1000/700',
              pdfUrl: null,
            },
          ],
          unitConfigurations: [],
        });

        // The token is this answer's alone: the CRM never stores it.
        const stored = db.getCollection('leads').find((lead) => lead.id === created.body.data.id);
        assert.ok(stored, 'the lead was filed');
        assert.ok(!JSON.stringify(stored).includes(access.token));
        const crm = await request('GET', `/admin/leads/${stored.id}`, { token });
        assert.equal(crm.body.data.access, undefined);
      }
    });
  });

  it('keeps every floor-plan drawing and PDF out of the public reads', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const saved = await request('PATCH', '/admin/properties/1', { token, body: PLANS });
      assert.equal(saved.status, 200, saved.text);

      const { data } = (await request('GET', `/properties/slug/${LAKEVIEW}`)).body;
      assert.deepEqual(
        data.floorPlans.map((plan) => [
          plan.id,
          plan.imageUrl,
          plan.pdfUrl,
          plan.hasImage,
          plan.hasPdf,
        ]),
        [
          [1, null, null, true, true],
          [2, null, null, true, false],
        ]
      );
      assert.equal(data.floorPlans[0].title, '2 BHK — 1,180 sq ft', 'the rest of the plan stays');
      assert.deepEqual(
        data.unitConfigurations.map((unit) => [
          unit.id,
          unit.floorPlanImageUrl,
          unit.floorPlanPdfUrl,
          unit.hasFloorPlanImage,
          unit.hasFloorPlanPdf,
        ]),
        [
          [1, null, null, true, true],
          [2, null, null, false, false],
          [3, null, null, true, false],
        ]
      );

      for (const path of [
        `/properties/slug/${LAKEVIEW}`,
        '/properties?perPage=all',
        '/properties/featured',
        '/properties?ids=1',
      ]) {
        const response = await request('GET', path);
        assert.ok(response.text.includes('"id":1'), `${path} has listing 1`);
        for (const url of Object.values(PLAN)) {
          assert.ok(!response.text.includes(url), `${path} gives away ${url}`);
        }
      }

      // The admin reads the record as stored.
      const admin = (await request('GET', '/admin/properties/1', { token })).body.data;
      assert.equal(admin.floorPlans[0].imageUrl, PLAN.twoBhk);
      assert.equal(admin.floorPlans[0].pdfUrl, PLAN.twoBhkPdf);
      assert.equal(admin.floorPlans[0].hasImage, undefined);
      assert.equal(admin.unitConfigurations[0].floorPlanImageUrl, PLAN.unit);
      assert.equal(admin.unitConfigurations[0].floorPlanPdfUrl, PLAN.unitPdf);
      assert.equal(admin.unitConfigurations[0].hasFloorPlanImage, undefined);
    });
  });

  it('hands the floor-plan files over with the rest, for the units the page shows', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      await request('PATCH', '/admin/properties/1', { token, body: PLANS });

      const lead = (
        await request('POST', '/leads', {
          body: { ...DOCUMENT_REQUEST, source: 'floor-plan-request', message: 'Floor plans' },
        })
      ).body.data;
      const files = await request('POST', '/properties/1/documents/access', {
        body: { token: lead.access.token },
      });

      assert.equal(files.status, 200, files.text);
      assert.deepEqual(files.body.data.floorPlans, [
        { id: 1, imageUrl: PLAN.twoBhk, pdfUrl: PLAN.twoBhkPdf },
        { id: 2, imageUrl: PLAN.threeBhk, pdfUrl: null },
      ]);
      assert.deepEqual(
        files.body.data.unitConfigurations,
        [{ id: 1, floorPlanImageUrl: PLAN.unit, floorPlanPdfUrl: PLAN.unitPdf }],
        'a retired unit is not on the page, and its drawing is not handed out'
      );
    });
  });

  it('gates an open paper or brochure that is also a floor plan’s file', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      await request('PATCH', '/admin/properties/1', {
        token,
        body: {
          ...PLANS,
          brochureUrl: PLAN.twoBhkPdf,
          brochureLeadGated: false,
          documents: [
            { id: 1, title: 'Unit plan', url: PLAN.unitPdf, type: 'floor-plan', leadGated: false },
          ],
        },
      });

      const read = await request('GET', `/properties/slug/${LAKEVIEW}`);
      const { data } = read.body;
      assert.equal(data.brochureUrl, null);
      assert.equal(data.brochureLeadGated, true);
      assert.deepEqual(
        data.documents.map((document) => [document.id, document.url, document.leadGated]),
        [[1, null, true]]
      );
      assert.ok(!read.text.includes(PLAN.twoBhkPdf) && !read.text.includes(PLAN.unitPdf));
    });
  });

  it('answers a lead that names no open listing without a token', async () => {
    await withServer(async ({ request, login }) => {
      const general = await request('POST', '/leads', {
        body: { name: 'Test Visitor', phone: '9876543210', source: 'contact-page' },
      });
      assert.equal(general.status, 201, general.text);
      assert.equal(general.body.data.access, null);

      const token = await login(ADMIN);
      await request('PATCH', '/admin/properties/2', { token, body: { isActive: false } });
      const unpublished = await request('POST', '/leads', {
        body: { ...DOCUMENT_REQUEST, propertyId: 2 },
      });
      assert.equal(unpublished.status, 201, unpublished.text);
      assert.equal(unpublished.body.data.access, null);

      // The honeypot still answers as if accepted, and hands out nothing.
      const robot = await request('POST', '/leads', {
        body: { ...DOCUMENT_REQUEST, website: 'https://spam.example.com' },
      });
      assert.deepEqual(robot.body, { data: null, message: 'ok' });
    });
  });

  it('refuses the files without a live token for that listing and its lead', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      await request('PATCH', '/admin/properties/1', { token, body: FILES });

      const lead = (await request('POST', '/leads', { body: DOCUMENT_REQUEST })).body.data;
      const elsewhere = (
        await request('POST', '/leads', { body: { ...DOCUMENT_REQUEST, propertyId: 2 } })
      ).body.data;
      const ask = (id, body) => request('POST', `/properties/${id}/documents/access`, { body });

      const missing = await ask(1, {});
      assert.equal(missing.status, 422);
      assert.ok(missing.body.errors.token, 'the token is required');

      const unknown = await ask(1, { token: 'not-a-token' });
      assert.equal(unknown.status, 403);
      assert.equal(unknown.body.message, 'Share your details to open the files of this listing.');
      assert.ok(!unknown.text.includes(FILE.prices));

      assert.equal(
        (await ask(1, { token: elsewhere.access.token })).status,
        403,
        'another listing'
      );
      assert.equal((await ask(2, { token: elsewhere.access.token })).status, 200);

      const expired = issueAccess(1, lead.id, Date.now() - ACCESS_TTL_MS - 1000);
      assert.equal((await ask(1, { token: expired.token })).status, 403, 'expired');

      // A lead deleted from the CRM — spam, a test entry — takes its token with it.
      assert.equal((await request('DELETE', `/admin/leads/${lead.id}`, { token })).status, 200);
      assert.equal((await ask(1, { token: lead.access.token })).status, 403, 'deleted lead');

      // An unpublished listing has no files to hand out, whatever the token.
      const fresh = (await request('POST', '/leads', { body: DOCUMENT_REQUEST })).body.data;
      assert.equal((await ask(1, { token: fresh.access.token })).status, 200);
      await request('PATCH', '/admin/properties/1', { token, body: { isActive: false } });
      assert.equal((await ask(1, { token: fresh.access.token })).status, 404);
      assert.equal((await ask(999, { token: fresh.access.token })).status, 404);
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

  it('gives a title with no Latin letter or digit a slug of its own (QA-60)', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      // A title in Devanagari alone makes no slug at all. It was stored as ''
      // — for both of these — and neither listing had a page.
      const hindi = {
        ...NEW_PROPERTY,
        title: 'व्हाइटफील्ड में शानदार फ्लैट',
        slug: '',
        seo: { slug: '' },
      };
      const first = await request('POST', '/admin/properties', { token, body: hindi });
      const second = await request('POST', '/admin/properties', { token, body: hindi });
      assert.equal(first.status, 201);
      assert.equal(first.body.data.slug, `property-${first.body.data.id}`);
      assert.equal(first.body.data.seo.slug, first.body.data.slug, 'the two slugs are one');
      assert.equal(second.body.data.slug, `property-${second.body.data.id}`);

      // A replace that asks for a derived slug again keeps the one it has.
      const replaced = await request('PUT', `/admin/properties/${first.body.data.id}`, {
        token,
        body: { ...hindi, title: 'व्हाइटफील्ड में नया फ्लैट' },
      });
      assert.equal(replaced.status, 200);
      assert.equal(replaced.body.data.slug, first.body.data.slug);
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

describe('the publish rules on every write (QA-62)', () => {
  /** A draft with nothing a visitor could read: no photo, no text, no price. */
  const BARE_DRAFT = {
    ...NEW_PROPERTY,
    title: 'Bare Draft — 2 BHK Apartment in Hebbal',
    images: [],
    description: '',
    shortDescription: '',
    pricing: {},
    isActive: false,
  };

  it('stores a half-written listing as a draft, and refuses it live', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const draft = await request('POST', '/admin/properties', { token, body: BARE_DRAFT });
      assert.equal(draft.status, 201);

      const live = await request('POST', '/admin/properties', {
        token,
        body: { ...BARE_DRAFT, title: 'Bare Live — 2 BHK Apartment in Hebbal', isActive: true },
      });
      assert.equal(live.status, 422);
      assert.deepEqual(Object.keys(live.body.errors).sort(), [
        'description',
        'images',
        'pricing.price',
        'shortDescription',
      ]);
      assert.equal(
        live.body.errors.images[0],
        'A published listing needs at least one image with a description.'
      );
    });
  });

  it('refuses the list’s eye toggle on a listing that is not ready, naming what it lacks', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const { id } = (await request('POST', '/admin/properties', { token, body: BARE_DRAFT })).body
        .data;

      const toggled = await request('PATCH', `/admin/properties/${id}`, {
        token,
        body: { isActive: true },
      });
      assert.equal(toggled.status, 422);
      assert.equal(
        toggled.body.message,
        '“Bare Draft — 2 BHK Apartment in Hebbal” is not ready to go live: no photograph with a description, 0 of 300 characters of description, no one-line summary, no price.'
      );
      assert.deepEqual(toggled.body.data.notReady, [
        {
          id,
          title: 'Bare Draft — 2 BHK Apartment in Hebbal',
          gaps: [
            'no photograph with a description',
            '0 of 300 characters of description',
            'no one-line summary',
            'no price',
          ],
        },
      ]);

      // Still a draft, and its page is still a 404.
      const stored = (await request('GET', `/admin/properties/${id}`, { token })).body.data;
      assert.equal(stored.isActive, false);
      assert.equal(
        (await request('GET', `/properties/slug/${encodeURIComponent(stored.slug)}`)).status,
        404
      );
    });
  });

  it('asks a rental for its rent, not a price', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const rental = await request('POST', '/admin/properties', {
        token,
        body: { ...NEW_PROPERTY, listingType: 'rent', pricing: { price: 9_500_000 } },
      });

      assert.equal(rental.status, 422);
      assert.deepEqual(Object.keys(rental.body.errors), ['pricing.rentPerMonth']);
    });
  });

  it('leaves a write that touches nothing the rules read alone', async () => {
    await withServer(async ({ request, login, db }) => {
      const token = await login(ADMIN);
      // A live listing from before the rules — its description emptied behind
      // the API's back — can still be featured or re-prioritised.
      db.getCollection('properties').find((row) => row.id === 1).description = '';

      const starred = await request('PATCH', '/admin/properties/1', {
        token,
        body: { isFeatured: true, priorityOrder: 3 },
      });
      assert.equal(starred.status, 200);

      // Replacing it, or editing what the rules read, is asked.
      const edited = await request('PATCH', '/admin/properties/1', {
        token,
        body: { shortDescription: 'Still no description.' },
      });
      assert.equal(edited.status, 422);
      assert.ok(edited.body.errors.description);
    });
  });

  it('refuses a bulk activate whole when one listing is not ready, and names it', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const bare = (await request('POST', '/admin/properties', { token, body: BARE_DRAFT })).body
        .data;
      await request('POST', '/admin/properties/bulk', {
        token,
        body: { action: 'deactivate', ids: [2] },
      });

      const refused = await request('POST', '/admin/properties/bulk', {
        token,
        body: { action: 'activate', ids: [bare.id, 2] },
      });
      assert.equal(refused.status, 422);
      assert.match(refused.body.message, /^“Bare Draft — 2 BHK Apartment in Hebbal” is not ready/);
      assert.deepEqual(
        refused.body.data.notReady.map((entry) => entry.id),
        [bare.id]
      );
      // All or nothing: the ready one was not activated either.
      assert.equal(
        (await request('GET', '/admin/properties/2', { token })).body.data.isActive,
        false
      );

      const ready = await request('POST', '/admin/properties/bulk', {
        token,
        body: { action: 'activate', ids: [2] },
      });
      assert.equal(ready.status, 200);
      assert.equal(
        (await request('GET', '/admin/properties/2', { token })).body.data.isActive,
        true
      );
    });
  });
});

describe('a replace made from an older version (QA-62)', () => {
  it('is refused with 409 and who saved in between, and changes nothing', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const read = (await request('GET', '/admin/properties/1', { token })).body.data;

      // Somebody stars it from the list after the form read it…
      const starred = await request('PATCH', '/admin/properties/1', {
        token,
        body: { isFeatured: false },
      });
      assert.equal(starred.status, 200);

      // …and the form, still holding the old version, saves.
      const stale = await request('PUT', '/admin/properties/1', {
        token,
        body: { ...NEW_PROPERTY, title: read.title, isFeatured: true, updatedAt: read.updatedAt },
      });
      assert.equal(stale.status, 409);
      assert.equal(stale.body.data.conflict, 'stale');
      assert.equal(stale.body.data.current.updatedAt, starred.body.data.updatedAt);
      assert.equal(stale.body.data.current.updatedBy.name, 'Admin User');
      assert.equal(stale.body.message, 'Admin User saved this listing after you opened it.');

      const stored = (await request('GET', '/admin/properties/1', { token })).body.data;
      assert.equal(stored.isFeatured, false, 'the refused replace wrote nothing');
    });
  });

  it('goes through from the current version, and without one at all', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const read = (await request('GET', '/admin/properties/1', { token })).body.data;

      const current = await request('PUT', '/admin/properties/1', {
        token,
        body: { ...NEW_PROPERTY, title: read.title, updatedAt: read.updatedAt },
      });
      assert.equal(current.status, 200);
      assert.notEqual(current.body.data.updatedAt, read.updatedAt, 'a save moves the version');

      // No version is "save over whatever is there" — what "Save mine anyway"
      // sends, and what every client did before the check existed.
      const unversioned = await request('PUT', '/admin/properties/1', {
        token,
        body: { ...NEW_PROPERTY, title: read.title },
      });
      assert.equal(unversioned.status, 200);
    });
  });
});
