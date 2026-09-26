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

describe('media folders', () => {
  /** A seed whose library holds a few files in known folders. */
  const mediaSeed = () => {
    const seed = JSON.parse(JSON.stringify(LIVE_SEED));
    const now = '2026-09-26T00:00:00.000Z';
    const file = (id, folder, name = `file-${id}`) => ({
      id,
      url: `https://images.example.com/${name}.jpg`,
      publicId: null,
      provider: 'external',
      type: 'image',
      width: null,
      height: null,
      bytes: null,
      format: 'jpg',
      alt: `Test file ${id}`,
      title: null,
      folder,
      tags: [],
      createdAt: now,
      updatedAt: now,
    });
    seed.media = [
      file(9001, 'campaigns'),
      file(9002, 'campaigns/diwali'),
      file(9003, 'campaigns/diwali'),
      file(9004, 'archive'),
      file(9005, null),
    ];
    return seed;
  };

  it('counts each folder and the files in none', async () => {
    await withServer({ seed: mediaSeed() }, async ({ request, login }) => {
      const token = await login(ADMIN);
      const list = await request('GET', '/admin/media?perPage=1', { token });
      assert.equal(list.status, 200);
      assert.deepEqual(list.body.meta.folders, [
        { name: 'archive', count: 1 },
        { name: 'campaigns', count: 1 },
        { name: 'campaigns/diwali', count: 2 },
      ]);
      assert.equal(list.body.meta.unfiled, 1);

      // Filtering on one folder, or on "no folder", leaves the rail whole.
      const one = await request('GET', '/admin/media?folder=archive', { token });
      assert.equal(one.body.meta.folders.length, 3);
      const none = await request('GET', '/admin/media?unfiled=true', { token });
      assert.deepEqual(
        none.body.data.map((row) => row.id),
        [9005]
      );
      assert.equal(none.body.meta.folders.length, 3);
      assert.equal(none.body.meta.unfiled, 1);
    });
  });

  it('keeps only the files nothing shows under usage=unused', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request, login }) => {
      const token = await login(ADMIN);
      const created = await request('POST', '/admin/media', {
        token,
        body: { url: 'https://images.example.com/nobody-shows-this.jpg', alt: 'An unused file' },
      });
      assert.equal(created.status, 201);

      const unused = await request('GET', '/admin/media?perPage=all&usage=unused', { token });
      assert.equal(unused.status, 200);
      const ids = unused.body.data.map((row) => row.id);
      assert.ok(ids.includes(created.body.data.id));
      // Every seeded file is shown somewhere, so the new one is the only answer.
      assert.deepEqual(ids, [created.body.data.id]);

      // And each one it lists deletes without the guard's 409.
      const removed = await request('DELETE', `/admin/media/${created.body.data.id}`, { token });
      assert.equal(removed.status, 200);
    });
  });

  it('moves the selected files that exist and names the ids that do not', async () => {
    await withServer({ seed: mediaSeed() }, async ({ request, login }) => {
      const token = await login(ADMIN);
      const moved = await request('POST', '/admin/media/bulk', {
        token,
        body: { ids: [9002, 9003, 424242], action: 'move', payload: { folder: ' /pages// ' } },
      });
      assert.equal(moved.status, 200);
      assert.deepEqual(moved.body.data, { affected: 2, missing: [424242] });

      const pages = await request('GET', '/admin/media?folder=pages', { token });
      assert.deepEqual(pages.body.data.map((row) => row.id).sort(), [9002, 9003]);
      assert.ok(!pages.body.meta.folders.some((entry) => entry.name === 'campaigns/diwali'));

      // Out of every folder.
      const unfiled = await request('POST', '/admin/media/bulk', {
        token,
        body: { ids: [9004], action: 'move', payload: { folder: null } },
      });
      assert.deepEqual(unfiled.body.data, { affected: 1, missing: [] });
      const record = await request('GET', '/admin/media/9004', { token });
      assert.equal(record.body.data.folder, null);

      const refused = await request('POST', '/admin/media/bulk', {
        token,
        body: { ids: [9001], action: 'move', payload: { folder: 12 } },
      });
      assert.equal(refused.status, 422);
      assert.ok(refused.body.errors['payload.folder']);
    });
  });

  it('renames a folder with the folders inside it, and refuses a name in use until told to merge', async () => {
    await withServer({ seed: mediaSeed() }, async ({ request, login }) => {
      const token = await login(ADMIN);

      const renamed = await request('POST', '/admin/media/folders/rename', {
        token,
        body: { from: 'campaigns', to: 'marketing' },
      });
      assert.equal(renamed.status, 200);
      assert.deepEqual(renamed.body.data, {
        from: 'campaigns',
        to: 'marketing',
        moved: 3,
        merged: false,
      });
      assert.match(renamed.body.message, /Moved 3 files from “campaigns” to “marketing”/);
      const nested = await request('GET', '/admin/media/9002', { token });
      assert.equal(nested.body.data.folder, 'marketing/diwali');
      // The asset stays where it was uploaded.
      assert.equal(nested.body.data.url, 'https://images.example.com/file-9002.jpg');

      const collision = await request('POST', '/admin/media/folders/rename', {
        token,
        body: { from: 'archive', to: 'marketing' },
      });
      assert.equal(collision.status, 422);
      assert.ok(collision.body.errors.to);
      assert.deepEqual(collision.body.data, { existing: { name: 'marketing', count: 3 } });

      const merged = await request('POST', '/admin/media/folders/rename', {
        token,
        body: { from: 'archive', to: 'marketing', merge: true },
      });
      assert.equal(merged.status, 200);
      assert.equal(merged.body.data.merged, true);
      assert.match(merged.body.message, /Merged 1 file from “archive” into “marketing”/);

      const list = await request('GET', '/admin/media', { token });
      assert.deepEqual(list.body.meta.folders, [
        { name: 'marketing', count: 2 },
        { name: 'marketing/diwali', count: 2 },
      ]);
    });
  });

  it('answers 422 for a folder that holds nothing, the same name, or a folder inside itself', async () => {
    await withServer({ seed: mediaSeed() }, async ({ request, login }) => {
      const token = await login(ADMIN);
      const rename = (body) => request('POST', '/admin/media/folders/rename', { token, body });

      const nothing = await rename({ from: 'nowhere', to: 'somewhere' });
      assert.equal(nothing.status, 422);
      assert.ok(nothing.body.errors.from);

      const same = await rename({ from: '/campaigns/', to: 'campaigns' });
      assert.equal(same.status, 422);
      assert.ok(same.body.errors.to);

      const inside = await rename({ from: 'campaigns', to: 'campaigns/2026' });
      assert.equal(inside.status, 422);
      assert.ok(inside.body.errors.to);

      const missing = await rename({ from: 'campaigns' });
      assert.equal(missing.status, 422);
      assert.ok(missing.body.errors.to);
    });
  });

  it('keeps renaming to the roles that manage media', async () => {
    await withServer({ seed: mediaSeed() }, async ({ request, login }) => {
      const sales = await login({ email: 'sales@squaresnacres.com', password: 'Sales@123' });
      const refused = await request('POST', '/admin/media/folders/rename', {
        token: sales,
        body: { from: 'campaigns', to: 'marketing' },
      });
      assert.equal(refused.status, 403);
    });
  });
});
