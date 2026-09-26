/**
 * The mock behaviours prompt 51 added or corrected — controls that looked
 * clickable and did nothing, or did it silently.
 *
 * Run with `npm run test:mock`. The harness is `./helpers.js`: a real server
 * over a private copy of the seed.
 */

const assert = require('node:assert/strict');
const { after, describe, it } = require('node:test');

const { ADMIN, LIVE_SEED, cleanupTempFiles, silenceRequestLog, withServer } = require('./helpers');

silenceRequestLog();

after(cleanupTempFiles);

describe('the jobs list "Type" filter', () => {
  it('narrows the admin list by employment type', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request, login }) => {
      const token = await login(ADMIN);
      const all = (await request('GET', '/admin/jobs?perPage=all', { token })).body.data;
      const types = [...new Set(all.map((job) => job.employmentType))];
      assert.ok(types.length > 1, 'the seed carries more than one employment type');

      const [wanted] = types;
      const filtered = await request('GET', `/admin/jobs?perPage=all&employmentType=${wanted}`, {
        token,
      });
      assert.equal(filtered.status, 200);
      assert.ok(filtered.body.data.length > 0);
      assert.ok(filtered.body.data.every((job) => job.employmentType === wanted));
      assert.ok(filtered.body.data.length < all.length);
    });
  });
});

describe('the newsletter switch', () => {
  it('refuses a subscription while "Collect subscriptions" is off', async () => {
    const seed = JSON.parse(JSON.stringify(LIVE_SEED));
    seed.siteSettings.newsletter.enabled = false;

    await withServer({ seed }, async ({ request }) => {
      const refused = await request('POST', '/newsletter/subscribe', {
        body: { email: 'reader@example.com' },
      });
      assert.equal(refused.status, 403);
      assert.match(refused.body.message, /not taking subscriptions/i);
    });
  });

  it('takes one while it is on', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request }) => {
      const taken = await request('POST', '/newsletter/subscribe', {
        body: { email: 'reader@example.com' },
      });
      assert.equal(taken.status, 201);
    });
  });
});

describe('the redirects CSV', () => {
  it('re-activates an updated rule and keeps the note the file carried', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request, login }) => {
      const token = await login(ADMIN);
      const created = await request('POST', '/admin/redirects', {
        token,
        body: { fromPath: '/old-offer', toPath: '/offers', statusCode: 301, isActive: false },
      });
      assert.equal(created.status, 201);

      const imported = await request('POST', '/admin/redirects/import', {
        token,
        body: {
          rows: [{ fromPath: '/old-offer', toPath: '/new-offers', statusCode: 301, note: 'Q3' }],
        },
      });
      assert.equal(imported.status, 200);
      assert.equal(imported.body.data.updated, 1);

      const after = await request('GET', `/admin/redirects/${created.body.data.id}`, { token });
      assert.equal(after.body.data.toPath, '/new-offers');
      assert.equal(after.body.data.isActive, true);
      assert.equal(after.body.data.note, 'Q3');
    });
  });

  it('exports what the list filters select', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request, login }) => {
      const token = await login(ADMIN);
      await request('POST', '/admin/redirects', {
        token,
        body: { fromPath: '/paused-rule', toPath: '/offers', statusCode: 301, isActive: false },
      });

      const inactive = await request('GET', '/admin/redirects/export?isActive=false', { token });
      assert.equal(inactive.status, 200);
      assert.match(inactive.text, /\/paused-rule/);
      const active = await request('GET', '/admin/redirects/export?isActive=true', { token });
      assert.doesNotMatch(active.text, /\/paused-rule/);

      const searched = await request('GET', '/admin/redirects/export?q=paused', { token });
      const lines = searched.text.trim().split(/\r?\n/);
      assert.equal(lines.length, 2, 'the header and the one match');
    });
  });
});
