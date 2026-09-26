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

/* ------------------------------------------------------------------ *
 * The lead desk (prompt 51, 4.D)
 * ------------------------------------------------------------------ */

const { MANAGER, SALES } = require('./helpers');

/** The seed, with the lead settings a test needs. */
const seedWith = (mutate) => {
  const seed = JSON.parse(JSON.stringify(LIVE_SEED));
  mutate?.(seed);
  return seed;
};

/** A public enquiry, as the site's forms send one. */
const enquiry = (overrides = {}) => ({
  name: 'Kavya Iyer',
  phone: '+91 91234 56780',
  source: 'property-enquiry',
  propertyId: 1,
  message: 'Please call me back.',
  ...overrides,
});

describe('entering a lead by hand', () => {
  it('files a walk-in with its note, and says who added it', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request, login }) => {
      const token = await login(ADMIN);
      const created = await request('POST', '/admin/leads', {
        token,
        body: {
          name: 'Walk-in Visitor',
          phone: '98450 12345',
          source: 'walk-in',
          propertyId: 2,
          assignedTo: 3,
          note: 'Came to the office with the brochure in hand.',
        },
      });
      assert.equal(created.status, 201);
      const lead = created.body.data;
      assert.equal(lead.source, 'walk-in');
      assert.equal(lead.phone, '+919845012345');
      assert.equal(lead.assignedTo, 3);
      assert.equal(lead.notes.length, 1);
      assert.match(lead.activities[0].description, /^Added by Admin User — Walk-in$/);
      assert.ok(lead.activities.some((entry) => entry.type === 'note-added'));
      assert.equal(lead.propertySnapshot.title, lead.property.title);
    });
  });

  it('makes a sales user the owner whatever the form names', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request, login }) => {
      const token = await login(SALES);
      const created = await request('POST', '/admin/leads', {
        token,
        body: { name: 'Phone Caller', phone: '9845012346', source: 'phone', assignedTo: 1 },
      });
      assert.equal(created.status, 201);
      assert.equal(created.body.data.assignedTo, 3);
    });
  });

  it('refuses a listing that does not exist, and allows a number already on file', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request, login }) => {
      const token = await login(ADMIN);
      const refused = await request('POST', '/admin/leads', {
        token,
        body: { name: 'Nobody', phone: '9845012347', source: 'referral', propertyId: 99999 },
      });
      assert.equal(refused.status, 422);
      assert.ok(refused.body.errors.propertyId);

      const seeded = LIVE_SEED.leads[0];
      const again = await request('POST', '/admin/leads', {
        token,
        body: { name: seeded.name, phone: seeded.phone, source: 'phone' },
      });
      assert.equal(again.status, 201);
      assert.equal(again.body.data.isPossibleDuplicate, true);
    });
  });
});

describe('the desk’s own sources', () => {
  it('are refused on the public form', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request }) => {
      const refused = await request('POST', '/leads', {
        body: { name: 'Asha Menon', phone: '9000000031', source: 'walk-in', consent: true },
      });
      assert.equal(refused.status, 422);
      assert.ok(refused.body.errors.source);
    });
  });
});

describe('logging a conversation', () => {
  it('writes a typed entry with its note', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request, login }) => {
      const token = await login(ADMIN);
      const logged = await request('POST', '/admin/leads/1/activities', {
        token,
        body: { type: 'call', outcome: 'Interested, wants a Saturday visit', note: 'Wife joins.' },
      });
      assert.equal(logged.status, 200);
      const entry = logged.body.data.activities.at(-1);
      assert.equal(entry.type, 'call-logged');
      assert.equal(entry.description, 'Call logged — Interested, wants a Saturday visit');
      assert.equal(entry.note, 'Wife joins.');
      assert.equal(entry.createdByName, 'Admin User');

      const refused = await request('POST', '/admin/leads/1/activities', {
        token,
        body: { type: 'carrier-pigeon' },
      });
      assert.equal(refused.status, 422);
    });
  });
});

describe('correcting a lead’s details', () => {
  it('stores the number the way a form does and says who changed what', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request, login }) => {
      const token = await login(ADMIN);
      const patched = await request('PATCH', '/admin/leads/1', {
        token,
        body: { phone: '098450 99887', email: 'new.address@example.com' },
      });
      assert.equal(patched.status, 200);
      assert.equal(patched.body.data.phone, '+919845099887');
      const entry = patched.body.data.activities.at(-1);
      assert.equal(entry.type, 'details-updated');
      assert.equal(entry.description, 'Details updated by Admin User — phone, e-mail');
    });
  });

  it('lets a sales user correct only the leads that are theirs', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request, login }) => {
      const token = await login(SALES);
      const own = LIVE_SEED.leads.find((lead) => lead.assignedTo === 3);
      const unassigned = LIVE_SEED.leads.find((lead) => lead.assignedTo === null);

      const ok = await request('PATCH', `/admin/leads/${own.id}`, {
        token,
        body: { name: 'Corrected Name' },
      });
      assert.equal(ok.status, 200);

      const refused = await request('PATCH', `/admin/leads/${unassigned.id}`, {
        token,
        body: { name: 'Not Mine' },
      });
      assert.equal(refused.status, 403);
    });
  });
});

describe('the follow-up worklist', () => {
  it('filters open leads by where their follow-up stands, and counts each bucket', async () => {
    const now = Date.now();
    const hour = 60 * 60 * 1000;
    const seed = seedWith((data) => {
      data.leads = data.leads.slice(0, 5).map((lead, index) => ({
        ...lead,
        status: index === 4 ? 'converted' : 'contacted',
        followUpAt: [
          new Date(now - 48 * hour).toISOString(),
          new Date(now + 60 * 1000).toISOString(),
          new Date(now + 72 * hour).toISOString(),
          null,
          new Date(now - 48 * hour).toISOString(),
        ][index],
      }));
    });

    await withServer({ seed }, async ({ request, login }) => {
      const token = await login(ADMIN);
      const all = await request('GET', '/admin/leads?perPage=all', { token });
      // The converted lead's passed follow-up is nobody's worry.
      assert.equal(all.body.meta.followUp.overdue, 1);
      assert.equal(all.body.meta.followUp.none, 1);
      assert.ok(all.body.meta.followUp.next7 >= 2);

      const overdue = await request('GET', '/admin/leads?perPage=all&followUp=overdue', { token });
      assert.deepEqual(
        overdue.body.data.map((lead) => lead.id),
        [seed.leads[0].id]
      );
      // The chips keep their numbers while one of them is chosen.
      assert.deepEqual(overdue.body.meta.followUp, all.body.meta.followUp);

      const none = await request('GET', '/admin/leads?perPage=all&followUp=none', { token });
      assert.deepEqual(
        none.body.data.map((lead) => lead.id),
        [seed.leads[3].id]
      );

      const idle = await request('GET', '/admin/leads?perPage=all&idleDays=10000', { token });
      assert.equal(idle.body.data.length, 0);
    });
  });

  it('puts the overdue follow-ups first on the dashboard, and counts them', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request, login }) => {
      const token = await login(ADMIN);
      const { body } = await request('GET', '/admin/dashboard', { token });
      const rows = body.data.upcomingFollowUps;
      assert.ok(body.data.overdueCount > 0);
      assert.equal(rows[0].isOverdue, true);
      const firstUpcoming = rows.findIndex((row) => !row.isOverdue);
      if (firstUpcoming !== -1) assert.ok(rows.slice(firstUpcoming).every((row) => !row.isOverdue));

      const week = await request('GET', '/admin/dashboard?range=7', { token });
      assert.equal(week.body.data.trends.leadsByDay.length, 7);
    });
  });
});

describe('a repeat enquiry', () => {
  it('goes to the owner of the open lead from the same number, and that lead hears of it', async () => {
    const seed = seedWith((data) => {
      data.siteSettings.leads.autoAssign = 'round-robin';
      const [first] = data.leads;
      Object.assign(first, {
        phone: '+919123456780',
        status: 'contacted',
        assignedTo: 2,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      });
    });

    await withServer({ seed }, async ({ request, login }) => {
      const created = await request('POST', '/leads', { body: enquiry() });
      assert.equal(created.status, 201);

      const token = await login(ADMIN);
      const lead = (await request('GET', `/admin/leads/${created.body.data.id}`, { token })).body
        .data;
      assert.equal(lead.assignedTo, 2);
      assert.match(lead.activities[1].description, /they hold lead #1 from this number/);

      const older = (await request('GET', '/admin/leads/1', { token })).body.data;
      const last = older.activities.at(-1);
      assert.equal(last.type, 'enquired-again');
      assert.match(last.description, /^Enquired again via Property Enquiry about .+ — lead #\d+$/);
    });
  });

  it('takes the usual way when the older lead is closed or more than thirty days old', async () => {
    const seed = seedWith((data) => {
      data.siteSettings.leads.autoAssign = 'none';
      const [first, second] = data.leads;
      Object.assign(first, {
        phone: '+919123456780',
        status: 'lost',
        lostReason: 'Bought elsewhere',
        assignedTo: 2,
      });
      Object.assign(second, {
        phone: '+919123456781',
        status: 'contacted',
        assignedTo: 2,
        createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
      });
    });

    await withServer({ seed }, async ({ request }) => {
      const closed = await request('POST', '/leads', { body: enquiry() });
      assert.equal(closed.body.data.assignedTo, null);
      const stale = await request('POST', '/leads', { body: enquiry({ phone: '9123456781' }) });
      assert.equal(stale.body.data.assignedTo, null);
    });
  });
});

describe('a lead about a deleted listing', () => {
  it('still names it, from its snapshot, on screen and in the export', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request, login }) => {
      const token = await login(ADMIN);
      const seeded = LIVE_SEED.leads.find((lead) => lead.propertyId !== null);
      const title = LIVE_SEED.properties.find((row) => row.id === seeded.propertyId).title;

      const removed = await request('DELETE', `/admin/properties/${seeded.propertyId}`, { token });
      assert.equal(removed.status, 200);

      const lead = (await request('GET', `/admin/leads/${seeded.id}`, { token })).body.data;
      assert.equal(lead.property.title, `${title} (deleted)`);
      assert.equal(lead.property.slug, null);
      assert.equal(lead.property.deleted, true);

      const csv = await request('GET', `/admin/leads/export?q=${encodeURIComponent(seeded.name)}`, {
        token,
      });
      assert.match(
        csv.text,
        new RegExp(`${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\(deleted\\)`)
      );
    });
  });
});

describe('the listing’s advisor', () => {
  it('receives a lead about one of their listings, else the rotation does', async () => {
    const seed = seedWith((data) => {
      data.siteSettings.leads.autoAssign = 'listing-advisor';
    });
    const advised = seed.properties.find(
      (property) => property.isActive && property.agent?.teamMemberId === 2
    );
    const unlinked = seed.properties.find(
      (property) => property.isActive && property.agent?.teamMemberId === 4
    );

    await withServer({ seed }, async ({ request }) => {
      const toAdvisor = await request('POST', '/leads', {
        body: enquiry({ propertyId: advised.id, phone: '9000000001' }),
      });
      // Team Member 2 is linked to the Sales User (id 3).
      assert.equal(toAdvisor.body.data.assignedTo, 3);

      const toRotation = await request('POST', '/leads', {
        body: enquiry({ propertyId: unlinked.id, phone: '9000000002' }),
      });
      assert.equal(toRotation.body.data.assignedTo, 3, 'the only sales user is next');
    });
  });
});

describe('the Team list', () => {
  it('counts each member’s listings for the admin, and the properties list filters by them', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request, login }) => {
      const token = await login(ADMIN);
      const team = (await request('GET', '/admin/team?perPage=all', { token })).body.data;
      const second = team.find((member) => member.id === 2);
      const expected = LIVE_SEED.properties.filter((row) => row.agent?.teamMemberId === 2).length;
      assert.equal(second.listingCount, expected);
      assert.equal(second.userId, 3);

      const listings = await request('GET', '/admin/properties?perPage=all&agentId=2', { token });
      assert.equal(listings.body.data.length, expected);

      const publicTeam = (await request('GET', '/team')).body.data;
      assert.ok(publicTeam.every((member) => !('listingCount' in member) && !('userId' in member)));
    });
  });
});

describe('the test lead alert', () => {
  it('answers with the saved addresses, for an admin only', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request, login }) => {
      const admin = await login(ADMIN);
      const sent = await request('POST', '/admin/settings/test-lead-alert', { token: admin });
      assert.equal(sent.status, 200);
      assert.deepEqual(sent.body.data.sentTo, LIVE_SEED.siteSettings.leads.notificationEmails);
      assert.ok(sent.body.data.sentAt);

      const manager = await login(MANAGER);
      const refused = await request('POST', '/admin/settings/test-lead-alert', { token: manager });
      assert.equal(refused.status, 403);
    });
  });

  it('says so when no address is saved', async () => {
    const seed = seedWith((data) => {
      data.siteSettings.leads.notificationEmails = [];
    });
    await withServer({ seed }, async ({ request, login }) => {
      const token = await login(ADMIN);
      const refused = await request('POST', '/admin/settings/test-lead-alert', { token });
      assert.equal(refused.status, 422);
      assert.ok(refused.body.errors['leads.notificationEmails']);
    });
  });
});

describe('the properties bulk bar’s value-carrying actions', () => {
  const bulk = (request, token, action, ids, payload) =>
    request('POST', '/admin/properties/bulk', { token, body: { ids, action, payload } });

  it('sets the availability of a batch and counts only what changed', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request, login }) => {
      const token = await login(ADMIN);
      const [first, second] = LIVE_SEED.properties.filter(
        (row) => row.availability === 'available'
      );

      const sold = await bulk(request, token, 'availability', [first.id, second.id], {
        availability: 'sold',
      });
      assert.equal(sold.status, 200);
      assert.equal(sold.body.data.affected, 2);
      const again = await bulk(request, token, 'availability', [first.id], {
        availability: 'sold',
      });
      assert.equal(again.body.data.affected, 0);

      const read = await request('GET', `/admin/properties/${first.id}`, { token });
      assert.equal(read.body.data.availability, 'sold');

      const refused = await bulk(request, token, 'availability', [first.id], {
        availability: 'gone',
      });
      assert.equal(refused.status, 422);
      assert.ok(refused.body.errors['payload.availability']);
    });
  });

  it('hands listings to another advisor, and refuses one who is switched off', async () => {
    const seed = seedWith((data) => {
      data.teamMembers.find((member) => member.id === 5).isActive = false;
    });
    await withServer({ seed }, async ({ request, login }) => {
      const token = await login(ADMIN);
      const ids = LIVE_SEED.properties
        .filter((row) => row.agent?.teamMemberId === 2)
        .map((row) => row.id);
      assert.ok(ids.length > 0);

      const moved = await bulk(request, token, 'assignAgent', ids, { agentId: 3 });
      assert.equal(moved.status, 200);
      assert.equal(moved.body.data.affected, ids.length);
      const left = await request('GET', '/admin/properties?perPage=all&agentId=2', { token });
      assert.equal(left.body.data.length, 0);

      const inactive = await bulk(request, token, 'assignAgent', ids, { agentId: 5 });
      assert.equal(inactive.status, 422);
      assert.match(inactive.body.errors['payload.agentId'][0], /switched off/);

      const missing = await bulk(request, token, 'assignAgent', ids, { agentId: 999 });
      assert.equal(missing.status, 422);
    });
  });

  it('moves a locality with its city, and refuses a type from another segment', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request, login }) => {
      const token = await login(ADMIN);
      const residential = LIVE_SEED.properties.find((row) => row.segment === 'residential');
      const locality = LIVE_SEED.localities.find(
        (row) => row.id !== residential.location.localityId
      );

      const moved = await bulk(request, token, 'setLocality', [residential.id], {
        localityId: locality.id,
      });
      assert.equal(moved.status, 200);
      const read = await request('GET', `/admin/properties/${residential.id}`, { token });
      assert.equal(read.body.data.location.localityId, locality.id);
      assert.equal(read.body.data.location.cityId, locality.cityId);

      const other = LIVE_SEED.propertyTypes.find((type) => type.segment !== 'residential');
      const refused = await bulk(request, token, 'setPropertyType', [residential.id], {
        propertyTypeId: other.id,
      });
      assert.equal(refused.status, 422);
      assert.match(refused.body.errors['payload.propertyTypeId'][0], /change it in the form/);

      const cleared = await bulk(request, token, 'setDeveloper', [residential.id], {
        developerId: null,
      });
      assert.equal(cleared.status, 200);
      const after = await request('GET', `/admin/properties/${residential.id}`, { token });
      assert.equal(after.body.data.project.developerId, null);

      const noLocality = await bulk(request, token, 'setLocality', [residential.id], {
        localityId: null,
      });
      assert.equal(noLocality.status, 422);
    });
  });
});
