/**
 * The shipped seed, served by the real application.
 *
 * The other suites run against `./fixtures/starter-db.json` so that their
 * assertions describe behaviour rather than data (see `./helpers.js`). This
 * one is the counterpart: it boots the mock over the committed `db.json` and
 * checks the handful of facts the rest of the repository relies on — the
 * reserved slugs that `src/services/endpoints.js` uses as examples, the CMS
 * page whose slug contains a slash, and the §10 collection sizes.
 *
 * `scripts/validate-seed.js` checks the file; this checks that the API can
 * actually serve it.
 */

const assert = require('node:assert/strict');
const { after, describe, it } = require('node:test');

const { ADMIN, LIVE_SEED, cleanupTempFiles, silenceRequestLog, withServer } = require('./helpers');

silenceRequestLog();

after(cleanupTempFiles);

/** Runs `body` against a server started over the committed seed. */
const withSeed = (body) => withServer({ seed: LIVE_SEED }, body);

describe('the committed seed', () => {
  it('serves the slugs the endpoint registry uses as examples', async () => {
    await withSeed(async ({ request }) => {
      const property = await request('GET', '/properties/slug/lakeview-heights-3-bhk-whitefield');
      assert.equal(property.status, 200);
      assert.equal(property.body.data.isActive, true);

      const article = await request('GET', '/articles/slug/karnataka-rera-guide-for-homebuyers');
      assert.equal(article.status, 200);
      assert.equal(article.body.data.status, 'published');

      const locality = await request('GET', '/localities/slug/whitefield');
      assert.equal(locality.status, 200);

      const developer = await request('GET', '/developers/slug/aurelia-estates');
      assert.equal(developer.status, 200);

      const page = await request('GET', '/pages/slug/about');
      assert.equal(page.status, 200);

      const job = await request('GET', '/jobs/slug/real-estate-advisor-bengaluru');
      assert.equal(job.status, 200);
    });
  });

  it('serves a CMS page whose slug is a path (§6.10)', async () => {
    await withSeed(async ({ request }) => {
      const response = await request('GET', '/pages/slug/buyer-assistance/home-loan');
      assert.equal(response.status, 200);
      assert.equal(response.body.data.slug, 'buyer-assistance/home-loan');
      assert.ok(response.body.data.blocks.some((block) => block.type === 'banks'));
    });
  });

  it('holds the collection sizes of §10', async () => {
    assert.ok(LIVE_SEED.properties.length >= 36, 'at least 36 properties');
    assert.equal(LIVE_SEED.properties.filter((row) => row.isActive).length >= 34, true);
    assert.equal(LIVE_SEED.localities.length, 20);
    assert.equal(LIVE_SEED.propertyTypes.length, 17);
    assert.ok(LIVE_SEED.amenities.length >= 40, 'at least 40 amenities');
    assert.ok(LIVE_SEED.articles.length >= 12, 'at least 12 articles');
    // Fifteen written pages and the eleven built-in ones (QA-56).
    assert.equal(LIVE_SEED.pages.filter((row) => row.template !== 'system').length, 15);
    assert.equal(LIVE_SEED.pages.filter((row) => row.template === 'system').length, 11);
    assert.equal(LIVE_SEED.headerMenus.length, 10);
    assert.equal(LIVE_SEED.leads.length, 45);
  });

  it('answers the admin dashboard with data in every panel', async () => {
    await withSeed(async ({ request, login }) => {
      const token = await login(ADMIN);
      const response = await request('GET', '/admin/dashboard', { token });

      assert.equal(response.status, 200);
      const { stats, trends, topProperties, recentLeads } = response.body.data;

      assert.ok(stats.propertiesActive >= 34);
      assert.ok(stats.leadsTotal === 45);
      assert.ok(
        trends.leadsByDay.some((day) => day.count > 0),
        'leads in the last 30 days'
      );
      assert.ok(trends.leadsBySource.length > 10, 'several sources');
      assert.equal(topProperties.length, 5);
      assert.equal(recentLeads.length, 10);
    });
  });
});
