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

describe('image descriptions', () => {
  it('are asked for when a listing goes live, not while it is a draft', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request, login }) => {
      const token = await login(ADMIN);
      const live = LIVE_SEED.properties.find((row) => row.isActive && row.images.length > 1);
      const undescribed = live.images.map((image, index) =>
        index === 1 ? { ...image, alt: '' } : image
      );

      const refused = await request('PATCH', `/admin/properties/${live.id}`, {
        token,
        body: { images: undescribed },
      });
      assert.equal(refused.status, 422);
      assert.match(refused.body.errors['images.1.alt'][0], /Describe this image/);

      const draft = await request('PATCH', `/admin/properties/${live.id}`, {
        token,
        body: { isActive: false },
      });
      assert.equal(draft.status, 200);
      const saved = await request('PATCH', `/admin/properties/${live.id}`, {
        token,
        body: { images: undescribed },
      });
      assert.equal(saved.status, 200, 'a draft saves with an empty description');
      assert.equal(saved.body.data.images[1].alt, '');

      const publish = await request('PATCH', `/admin/properties/${live.id}`, {
        token,
        body: { isActive: true },
      });
      assert.equal(publish.status, 422);
      assert.deepEqual(publish.body.data.notReady[0].gaps, ['1 photograph without a description']);
    });
  });
});

describe('a listing’s share link', () => {
  it('opens that inactive listing for 24 hours, and nothing else', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request, login }) => {
      const token = await login(ADMIN);
      const [draft, other] = LIVE_SEED.properties.filter((row) => !row.isActive);
      assert.ok(draft && other, 'the seed keeps two listings unpublished');

      const closed = await request('GET', `/properties/slug/${draft.slug}`);
      assert.equal(closed.status, 404);

      const issued = await request('POST', `/admin/properties/${draft.id}/preview-token`, {
        token,
      });
      assert.equal(issued.status, 200);
      const { token: share, expiresAt, url } = issued.body.data;
      assert.ok(share && expiresAt);
      assert.match(url, new RegExp(`/properties/${draft.slug}\\?preview=`));
      const hours = (Date.parse(expiresAt) - Date.now()) / 3600000;
      assert.ok(hours > 23.9 && hours <= 24, `${hours} hours`);

      const opened = await request(
        'GET',
        `/properties/slug/${draft.slug}?previewToken=${encodeURIComponent(share)}`
      );
      assert.equal(opened.status, 200);
      assert.equal(opened.body.data.id, draft.id);

      const elsewhere = await request(
        'GET',
        `/properties/slug/${other.slug}?previewToken=${encodeURIComponent(share)}`
      );
      assert.equal(elsewhere.status, 404, 'a token opens the listing it was made for only');

      const sales = await login(SALES);
      const refused = await request('POST', `/admin/properties/${draft.id}/preview-token`, {
        token: sales,
      });
      assert.equal(refused.status, 403);
    });
  });
});

describe('a hidden block', () => {
  it('is kept on the page record and left out of the public read', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request, login }) => {
      const token = await login(ADMIN);
      const page = LIVE_SEED.pages.find(
        (row) => row.status === 'published' && (row.blocks ?? []).length > 1
      );
      const [first, ...rest] = page.blocks;

      const saved = await request('PATCH', `/admin/pages/${page.id}`, {
        token,
        body: { blocks: [{ ...first, hidden: true }, ...rest] },
      });
      assert.equal(saved.status, 200);
      const stored = saved.body.data.blocks.find((row) => row.id === first.id);
      assert.equal(stored.hidden, true);

      const visitor = await request('GET', `/pages/slug/${page.slug}`);
      assert.equal(visitor.status, 200);
      assert.ok(visitor.body.data.blocks.every((row) => row.id !== first.id));
      assert.equal(visitor.body.data.blocks.length, rest.length);
    });
  });
});

describe('who saved a record last', () => {
  it('is named on the admin reads of properties and articles, and nowhere public', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request, login }) => {
      const admin = await login(ADMIN);
      const listing = LIVE_SEED.properties.find((row) => row.isActive);
      const property = await request('GET', `/admin/properties/${listing.id}`, { token: admin });
      assert.equal(property.body.data.updatedByName, 'Admin User');
      const row = (
        await request('GET', `/admin/properties?perPage=all`, { token: admin })
      ).body.data.find((entry) => entry.id === listing.id);
      assert.equal(row.updatedByName, 'Admin User');
      const publicListing = await request('GET', `/properties/slug/${listing.slug}`);
      assert.ok(!('updatedByName' in publicListing.body.data));
      assert.ok(!('updatedBy' in publicListing.body.data));

      const piece = LIVE_SEED.articles.find((entry) => entry.status === 'published');
      const manager = await login(MANAGER);
      const saved = await request('PATCH', `/admin/articles/${piece.id}`, {
        token: manager,
        body: { isFeatured: !piece.isFeatured },
      });
      assert.equal(saved.status, 200);
      assert.equal(saved.body.data.updatedByName, 'Manager User');
      const publicArticle = await request('GET', `/articles/slug/${piece.slug}`);
      assert.ok(!('updatedBy' in publicArticle.body.data));
      assert.ok(!('createdBy' in publicArticle.body.data));
      assert.ok(!('updatedByName' in publicArticle.body.data));
    });
  });
});

describe('a save made over somebody else’s', () => {
  // Each with a change of its own: a replace that changes nothing writes
  // nothing, and moves no version.
  const RECORDS = [
    {
      noun: 'page',
      path: '/admin/pages',
      pick: (seed) => seed.pages.find((row) => row.slug === 'about'),
      change: (record) => ({ title: `${record.title} (revised)` }),
    },
    {
      noun: 'article',
      path: '/admin/articles',
      pick: (seed) => seed.articles.find((row) => row.status === 'draft'),
      change: (record) => ({ title: `${record.title} (revised)` }),
    },
    {
      noun: 'locality',
      path: '/admin/localities',
      pick: (seed) => seed.localities[0],
      change: (record) => ({ shortDescription: `${record.shortDescription} Revised.` }),
    },
    {
      noun: 'developer',
      path: '/admin/developers',
      pick: (seed) => seed.developers[0],
      change: (record) => ({ shortDescription: `${record.shortDescription} Revised.` }),
    },
    {
      noun: 'job opening',
      path: '/admin/jobs',
      pick: (seed) => seed.jobOpenings[0],
      change: (record) => ({ title: `${record.title} (revised)` }),
    },
  ];

  for (const { noun, path, pick, change } of RECORDS) {
    it(`is refused on a ${noun}, naming who saved it, unless the form says to go ahead`, async () => {
      await withServer({ seed: LIVE_SEED }, async ({ request, login }) => {
        const admin = await login(ADMIN);
        const manager = await login(MANAGER);
        const seeded = pick(LIVE_SEED);
        assert.ok(seeded, `the seed carries a ${noun}`);

        // Both open the form on the same version.
        const opened = (await request('GET', `${path}/${seeded.id}`, { token: admin })).body.data;
        assert.equal(
          opened.updatedByName,
          noun === 'article' || noun === 'job opening' ? 'Manager User' : 'Admin User'
        );

        // The manager saves first, naming the version they read.
        const theirs = await request('PUT', `${path}/${seeded.id}`, {
          token: manager,
          body: { ...opened, ...change(opened), updatedAt: opened.updatedAt },
        });
        assert.equal(theirs.status, 200, JSON.stringify(theirs.body));
        assert.equal(theirs.body.data.updatedByName, 'Manager User');

        // The admin's save from the older version is refused, and says who.
        const mine = await request('PUT', `${path}/${seeded.id}`, {
          token: admin,
          body: { ...opened, updatedAt: opened.updatedAt },
        });
        assert.equal(mine.status, 409);
        assert.equal(mine.body.data.conflict, 'stale');
        assert.equal(mine.body.data.current.updatedAt, theirs.body.data.updatedAt);
        assert.equal(mine.body.data.current.updatedByName, 'Manager User');
        assert.deepEqual(mine.body.data.current.updatedBy, { id: 2, name: 'Manager User' });
        assert.equal(mine.body.message, `Manager User saved this ${noun} after you opened it.`);

        // "Save mine anyway" names the version the refusal named.
        const anyway = await request('PUT', `${path}/${seeded.id}`, {
          token: admin,
          body: { ...opened, updatedAt: mine.body.data.current.updatedAt },
        });
        assert.equal(anyway.status, 200);
        assert.equal(anyway.body.data.updatedByName, 'Admin User');
      });
    });
  }

  it('keeps who saved a page out of its public read', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request }) => {
      const read = await request('GET', '/pages/slug/about');
      assert.equal(read.status, 200);
      for (const key of ['createdBy', 'updatedBy', 'updatedByName']) {
        assert.ok(!(key in read.body.data), `${key} is not public`);
      }
      const job = LIVE_SEED.jobOpenings.find((row) => row.isActive);
      const opening = await request('GET', `/jobs/slug/${job.slug}`);
      const openings = await request('GET', '/jobs');
      for (const key of ['createdBy', 'updatedBy', 'updatedByName']) {
        assert.ok(!(key in opening.body.data), `${key} is not public`);
        assert.ok(
          openings.body.data.every((row) => !(key in row)),
          `${key} is not listed`
        );
      }
      const locality = LIVE_SEED.localities.find((row) => row.isActive);
      const place = await request('GET', `/localities/slug/${locality.slug}`);
      for (const key of ['createdBy', 'updatedBy', 'updatedByName']) {
        assert.ok(!(key in place.body.data), `${key} is not public`);
      }
    });
  });
});

describe('staying signed in', () => {
  it('gives the session a full lifetime again, with the same token', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request }) => {
      const signedIn = await request('POST', '/auth/login', {
        body: { email: 'admin@squaresnacres.com', password: 'Admin@123' },
      });
      assert.equal(signedIn.status, 200);
      const { token, expiresAt } = signedIn.body.data;
      await new Promise((resolve) => {
        setTimeout(resolve, 20);
      });

      const refreshed = await request('POST', '/auth/refresh', { token });
      assert.equal(refreshed.status, 200);
      assert.equal(refreshed.body.data.token, token);
      assert.ok(Date.parse(refreshed.body.data.expiresAt) > Date.parse(expiresAt));
      assert.equal(refreshed.body.data.user.email, 'admin@squaresnacres.com');

      const profile = await request('GET', '/auth/profile', { token });
      assert.equal(profile.status, 200);
    });
  });

  it('is refused without a live token', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request, login }) => {
      assert.equal((await request('POST', '/auth/refresh')).status, 401);
      const token = await login(ADMIN);
      await request('POST', '/auth/logout', { token });
      assert.equal((await request('POST', '/auth/refresh', { token })).status, 401);
    });
  });
});

describe('a redirect a visitor follows', () => {
  it('counts a hit, and names its rule publicly by id', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request, login }) => {
      const admin = await login(ADMIN);
      const rules = (await request('GET', '/redirects')).body.data;
      assert.ok(
        rules.every(
          (rule) => Object.keys(rule).sort().join(',') === 'fromPath,id,statusCode,toPath'
        )
      );

      const rule = rules[0];
      const before = (await request('GET', `/admin/redirects/${rule.id}`, { token: admin })).body
        .data.hits;
      const hit = await request('POST', `/redirects/${rule.id}/hit`);
      assert.equal(hit.status, 204);
      const after = (await request('GET', `/admin/redirects/${rule.id}`, { token: admin })).body
        .data.hits;
      assert.equal(after, before + 1);

      assert.equal((await request('POST', '/redirects/999999/hit')).status, 404);
    });
  });
});

describe('the 404 log', () => {
  it('counts an address once a visit, a day at a time, and lists it once', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request, login }) => {
      const admin = await login(ADMIN);
      const first = await request('POST', '/not-found', {
        body: { path: '/flats-in-hebal?utm=x', referrer: 'https://www.google.com/' },
      });
      assert.equal(first.status, 204);
      await request('POST', '/not-found', { body: { path: '/flats-in-hebal/' } });

      const listed = await request('GET', '/admin/seo/not-found', { token: admin });
      assert.equal(listed.status, 200);
      const line = listed.body.data.find((entry) => entry.path === '/flats-in-hebal');
      assert.equal(line.count, 2);
      assert.equal(line.days, 1);
      assert.equal(line.referrer, 'https://www.google.com/');
      assert.equal(listed.body.meta.total, listed.body.data.length);
    });
  });

  it('ignores the panel, the API, static files and redirected addresses', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request, login }) => {
      const admin = await login(ADMIN);
      const redirected = LIVE_SEED.redirects.find((rule) => rule.isActive).fromPath;
      for (const path of [
        '/admin/nowhere',
        '/api/nothing',
        '/static/js/main.old.js',
        '/logo.png',
        redirected,
      ]) {
        assert.equal((await request('POST', '/not-found', { body: { path } })).status, 204);
      }
      const listed = await request('GET', '/admin/seo/not-found', { token: admin });
      assert.equal(listed.body.data.length, 0);

      const refused = await request('POST', '/not-found', { body: { path: 'no-slash' } });
      assert.equal(refused.status, 422);
    });
  });

  it('keeps at most 500 rows, the ones seen longest ago going first', () => {
    const { MAX_ROWS, recordVisit } = require('../lib/notFoundLog');
    const rows = [];
    const start = Date.parse('2026-09-01T00:00:00.000Z');
    for (let index = 0; index < MAX_ROWS + 5; index += 1) {
      recordVisit(rows, { path: `/gone-${index}`, now: new Date(start + index * 1000) });
    }
    assert.equal(rows.length, MAX_ROWS);
    assert.ok(!rows.some((row) => row.path === '/gone-0'));
    assert.ok(rows.some((row) => row.path === `/gone-${MAX_ROWS + 4}`));
  });

  it('is read and dismissed by the SEO desk only', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request, login }) => {
      await request('POST', '/not-found', { body: { path: '/old-brochure-2019' } });
      const sales = await login(SALES);
      assert.equal((await request('GET', '/admin/seo/not-found', { token: sales })).status, 403);

      const admin = await login(ADMIN);
      const line = (await request('GET', '/admin/seo/not-found', { token: admin })).body.data[0];
      const dismissed = await request('DELETE', `/admin/seo/not-found/${line.id}`, {
        token: admin,
      });
      assert.equal(dismissed.status, 200);
      assert.equal(
        (await request('GET', '/admin/seo/not-found', { token: admin })).body.data.length,
        0
      );
      assert.equal(
        (await request('DELETE', `/admin/seo/not-found/${line.id}`, { token: admin })).status,
        404
      );
    });
  });
});

describe('a subscriber who asked to stop', () => {
  it('is marked unsubscribed, the status being all a PATCH may change', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request, login }) => {
      const admin = await login(ADMIN);
      const subscriber = LIVE_SEED.newsletterSubscribers.find((row) => row.status === 'subscribed');
      const marked = await request('PATCH', `/admin/newsletter-subscribers/${subscriber.id}`, {
        token: admin,
        body: { status: 'unsubscribed', email: 'someone.else@example.com' },
      });
      assert.equal(marked.status, 200);
      assert.equal(marked.body.data.status, 'unsubscribed');
      assert.equal(marked.body.data.email, subscriber.email);

      const refused = await request('PATCH', `/admin/newsletter-subscribers/${subscriber.id}`, {
        token: admin,
        body: { status: 'paused' },
      });
      assert.equal(refused.status, 422);

      const exported = await request(
        'GET',
        '/admin/newsletter-subscribers/export?status=subscribed',
        {
          token: admin,
        }
      );
      assert.ok(!exported.text.includes(subscriber.email));

      const sales = await login(SALES);
      assert.equal(
        (
          await request('PATCH', `/admin/newsletter-subscribers/${subscriber.id}`, {
            token: sales,
            body: { status: 'subscribed' },
          })
        ).status,
        403
      );
    });
  });
});

describe('the site’s address', () => {
  it('is changed under SEO settings, and Site settings answer the copy', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request, login }) => {
      const admin = await login(ADMIN);
      const saved = await request('PUT', '/admin/seo/settings', {
        token: admin,
        body: { siteUrl: 'https://staging.example' },
      });
      assert.equal(saved.status, 200);

      const settings = await request('GET', '/admin/settings', { token: admin });
      assert.equal(settings.body.data.general.siteUrl, 'https://staging.example');
      assert.equal(
        (await request('GET', '/settings')).body.data.general.siteUrl,
        'https://staging.example'
      );
    });
  });

  it('is not written by a Site settings save', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request, login }) => {
      const admin = await login(ADMIN);
      const saved = await request('PUT', '/admin/settings', {
        token: admin,
        body: { general: { siteUrl: 'https://elsewhere.example', tagline: 'Homes, verified' } },
      });
      assert.equal(saved.status, 200);
      assert.equal(saved.body.data.general.siteUrl, LIVE_SEED.seoSettings.siteUrl);
      assert.equal(saved.body.data.general.tagline, 'Homes, verified');
    });
  });
});

describe('the Rent and Commercial menus', () => {
  it('are flags on the property types, public, and seeded as the menus were', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request, login }) => {
      const types = (await request('GET', '/property-types?perPage=100')).body.data;
      const flagged = (flag) =>
        types
          .filter((type) => type[flag] === true)
          .sort((left, right) => left.order - right.order)
          .map((type) => type.slug);

      assert.deepEqual(flagged('showInRentMenu'), [
        'apartments',
        'villas',
        'independent-houses',
        'pg-co-living',
      ]);
      assert.deepEqual(flagged('showInCommercialMenu'), [
        'office-spaces',
        'retail-shops',
        'warehouses',
        'co-working-spaces',
      ]);

      const admin = await login(ADMIN);
      const penthouses = types.find((type) => type.slug === 'penthouses');
      const patched = await request('PATCH', `/admin/property-types/${penthouses.id}`, {
        token: admin,
        body: { showInRentMenu: true },
      });
      assert.equal(patched.status, 200);
      assert.equal(patched.body.data.showInRentMenu, true);

      const refused = await request('PATCH', `/admin/property-types/${penthouses.id}`, {
        token: admin,
        body: { showInCommercialMenu: 'yes' },
      });
      assert.equal(refused.status, 422);
    });
  });
});

describe('GET /properties/counts', () => {
  it('counts the live listings per value, under the list’s own filters', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request }) => {
      const counted = await request('GET', '/properties/counts?by=segment,listingType');
      assert.equal(counted.status, 200);
      assert.equal(counted.headers.get('cache-control'), 'public, max-age=300');
      assert.deepEqual(Object.keys(counted.body), ['data', 'meta']);
      assert.equal(counted.body.meta, null);

      const live = LIVE_SEED.properties.filter((property) => property.isActive);
      const sum = (tally) => Object.values(tally).reduce((total, count) => total + count, 0);
      assert.equal(sum(counted.body.data.segment), live.length);
      assert.equal(sum(counted.body.data.listingType), live.length);
      assert.equal(
        counted.body.data.segment.residential,
        live.filter((property) => property.segment === 'residential').length
      );

      // Every key is a string, and a value no live listing has is absent.
      const byType = (await request('GET', '/properties/counts?by=propertyTypeId&listingType=rent'))
        .body.data.propertyTypeId;
      const rentals = live.filter((property) => property.listingType === 'rent');
      assert.equal(sum(byType), rentals.length);
      for (const [id, count] of Object.entries(byType)) {
        const listed = await request(
          'GET',
          `/properties?perPage=1&listingType=rent&propertyTypeId=${id}`
        );
        assert.equal(listed.body.meta.total, count, `type ${id}`);
      }
    });
  });

  it('ignores a dimension it does not know, and answers the three status tiles', async () => {
    await withServer({ seed: LIVE_SEED }, async ({ request }) => {
      assert.deepEqual(
        (await request('GET', '/properties/counts?by=bogus,segment')).body.data.segment,
        (await request('GET', '/properties/counts?by=segment')).body.data.segment
      );
      assert.deepEqual((await request('GET', '/properties/counts?by=bogus')).body.data, {});
      assert.deepEqual((await request('GET', '/properties/counts')).body.data, {});

      const statuses = (
        await request('GET', '/properties/counts?by=constructionStatus&listingType=sale')
      ).body.data.constructionStatus;
      for (const status of ['ready-to-move', 'under-construction', 'pre-launch']) {
        const listed = await request(
          'GET',
          `/properties?perPage=1&listingType=sale&constructionStatus=${status}`
        );
        assert.equal(statuses[status] ?? 0, listed.body.meta.total, status);
      }
    });
  });
});
