/**
 * The lead endpoints, end to end (00_MASTER_CONTEXT.md §5.11, §5.14, §6.7).
 *
 * Run with `npm run test:mock`. The harness is described in `./helpers.js`.
 *
 * The seed holds six leads: one unassigned, one on the manager (id 2) and four
 * on the sales user (id 3) — which is what makes the scope of D15 visible
 * (a sales user sees five of the six) without inventing fixtures here.
 */

const assert = require('node:assert/strict');
const { after, describe, it } = require('node:test');

const {
  ADMIN,
  MANAGER,
  SALES,
  SEED,
  cleanupTempFiles,
  silenceRequestLog,
  withServer,
} = require('./helpers');

silenceRequestLog();

after(cleanupTempFiles);

/** What a property enquiry form posts (§6.7). */
const ENQUIRY = {
  name: 'Test Lead',
  phone: '+91 98765 43210',
  email: 'test.lead@example.com',
  message: 'Please call me in the evening.',
  source: 'property-enquiry',
  propertyId: 1,
};

const ids = (response) => response.body.data.map((lead) => lead.id);

describe('POST /leads', () => {
  it('stores a lead, opens its timeline and counts the enquiry', async () => {
    await withServer(async ({ request, login }) => {
      const created = await request('POST', '/leads', { body: ENQUIRY });

      assert.equal(created.status, 201);
      const lead = created.body.data;
      assert.equal(lead.status, 'new');
      assert.equal(lead.priority, 'medium', 'from siteSettings.leads.defaultPriority');
      assert.equal(lead.assignedTo, null, 'auto-assignment is off in the seed');
      assert.deepEqual(lead.property, {
        id: 1,
        title: 'Lakeview Heights — 3 BHK Apartments in Whitefield',
        slug: 'lakeview-heights-3-bhk-whitefield',
      });
      assert.deepEqual(
        lead.activities.map((activity) => [activity.type, activity.description]),
        [['created', 'Lead created via Property Enquiry']]
      );
      assert.equal(lead.ipAddress, undefined, 'the visitor does not get the CRM columns');
      assert.equal(lead.userAgent, undefined);

      const token = await login(ADMIN);
      const property = await request('GET', '/admin/properties/1', { token });
      assert.equal(property.body.data.enquiryCount, 13, 'one more than the seed');
    });
  });

  it('normalises the phone number the forms send', async () => {
    await withServer(async ({ request }) => {
      const shapes = ['+91 98765 43210', '09876543210', '9876543210'];

      for (const phone of shapes) {
        const created = await request('POST', '/leads', { body: { ...ENQUIRY, phone } });
        assert.equal(created.status, 201, phone);
        assert.equal(created.body.data.phone, '+919876543210', phone);
      }

      const invalid = await request('POST', '/leads', { body: { ...ENQUIRY, phone: '12345' } });
      assert.equal(invalid.status, 422);
      assert.ok(invalid.body.errors.phone);
    });
  });

  it('maps the boilerplate’s source values and refuses an unknown one', async () => {
    await withServer(async ({ request }) => {
      const legacy = await request('POST', '/leads', {
        body: { ...ENQUIRY, source: 'property_enquiry' },
      });
      assert.equal(legacy.status, 201);
      assert.equal(legacy.body.data.source, 'property-enquiry');

      const another = await request('POST', '/leads', { body: { ...ENQUIRY, source: 'website' } });
      assert.equal(another.body.data.source, 'contact-page');

      const unknown = await request('POST', '/leads', { body: { ...ENQUIRY, source: 'mystery' } });
      assert.equal(unknown.status, 422);
      assert.deepEqual(unknown.body.errors.source, ['The selected source is invalid.']);
    });
  });

  it('reads the campaign out of the page URL', async () => {
    await withServer(async ({ request }) => {
      const created = await request('POST', '/leads', {
        body: {
          ...ENQUIRY,
          pageUrl: 'https://www.squaresnacres.com/properties/x?utm_source=google&utm_medium=cpc',
        },
      });

      assert.equal(created.body.data.utm.source, 'google');
      assert.equal(created.body.data.utm.medium, 'cpc');
      assert.equal(created.body.data.utm.campaign, null);
    });
  });

  it('swallows a submission that filled the honeypot', async () => {
    await withServer(async ({ request, login, db }) => {
      const before = db.getCollection('leads').length;

      const response = await request('POST', '/leads', {
        body: { ...ENQUIRY, website: 'http://spam.example' },
      });
      assert.deepEqual(response.body, { data: null, message: 'ok' });
      assert.equal(response.status, 200);
      assert.equal(db.getCollection('leads').length, before, 'nothing was stored');

      const token = await login(ADMIN);
      const list = await request('GET', '/admin/leads?perPage=all', { token });
      assert.equal(list.body.meta.total, before);
    });
  });

  it('throttles the eleventh submission of a minute (429)', async () => {
    await withServer(async ({ request }) => {
      for (let index = 0; index < 10; index += 1) {
        assert.equal((await request('POST', '/leads', { body: ENQUIRY })).status, 201);
      }

      const throttled = await request('POST', '/leads', { body: ENQUIRY });
      assert.equal(throttled.status, 429);
      assert.equal(throttled.body.message, 'Too many requests. Please try again in a minute.');
    });
  });

  it('assigns round-robin among the active sales users when settings say so', async () => {
    const seed = {
      ...SEED,
      siteSettings: {
        ...SEED.siteSettings,
        leads: { ...SEED.siteSettings.leads, autoAssign: 'round-robin' },
      },
      leads: [],
    };

    await withServer({ seed }, async ({ request }) => {
      const first = await request('POST', '/leads', { body: ENQUIRY });
      assert.equal(first.body.data.assignedTo, 3, 'the only active sales user');
      assert.deepEqual(
        first.body.data.activities.map((activity) => activity.type),
        ['created', 'assigned']
      );

      const second = await request('POST', '/leads', { body: ENQUIRY });
      assert.equal(second.body.data.assignedTo, 3, 'and round again');
    });
  });
});

describe('GET /admin/leads', () => {
  it('filters by status, source, assignee and creation date', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const news = await request('GET', '/admin/leads?status=new', { token });
      assert.deepEqual(ids(news), [1]);

      const sources = await request('GET', '/admin/leads?source=home-loan,contact-page', {
        token,
      });
      assert.deepEqual(ids(sources).sort(), [3, 4]);

      const unassigned = await request('GET', '/admin/leads?assignedTo=unassigned', { token });
      assert.deepEqual(ids(unassigned), [1]);

      const theirs = await request('GET', '/admin/leads?assignedTo=3', { token });
      assert.deepEqual(ids(theirs).sort(), [2, 3, 5, 6]);

      const day = await request('GET', '/admin/leads?from=2026-09-05&to=2026-09-05', { token });
      assert.deepEqual(ids(day), [2]);

      const search = await request('GET', '/admin/leads?q=ananya', { token });
      assert.deepEqual(ids(search), [1]);
    });
  });

  it('sorts newest first and pages like every other admin list', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const newest = await request('GET', '/admin/leads?perPage=all', { token });
      assert.deepEqual(ids(newest), [1, 2, 4, 3, 5, 6]);
      assert.deepEqual(newest.body.meta, { page: 1, perPage: 6, total: 6, totalPages: 1 });

      const oldest = await request('GET', '/admin/leads?sort=createdAt&order=asc&perPage=2', {
        token,
      });
      assert.deepEqual(ids(oldest), [6, 5]);
      assert.equal(oldest.body.meta.totalPages, 3);

      // A list row carries the embeds but not the timeline (`LeadList`).
      const [row] = newest.body.data;
      assert.equal(row.activities, undefined);
      assert.ok(Object.prototype.hasOwnProperty.call(row, 'assignedUser'));
    });
  });

  it('keeps a sales user inside their own scope', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(SALES);

      const list = await request('GET', '/admin/leads?perPage=all', { token });
      assert.deepEqual(ids(list).sort(), [1, 2, 3, 5, 6], 'their own and the unassigned one');

      assert.equal((await request('GET', '/admin/leads/2', { token })).status, 200);
      assert.equal(
        (await request('GET', '/admin/leads/4', { token })).status,
        404,
        'the manager’s lead does not exist as far as they are concerned'
      );
    });
  });
});

describe('PATCH /admin/leads/:id', () => {
  it('records what each change was', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const patched = await request('PATCH', '/admin/leads/1', {
        token,
        body: {
          status: 'contacted',
          priority: 'low',
          assignedTo: 3,
          followUpAt: '2026-09-20T10:00:00.000Z',
        },
      });

      assert.equal(patched.status, 200);
      assert.deepEqual(
        patched.body.data.activities.map((activity) => activity.description),
        [
          'Lead created via Property Enquiry',
          'Status changed from New to Contacted',
          'Priority changed from High to Low',
          'Assigned to Sales User',
          'Follow-up set for 20 Sep 2026',
        ]
      );
      assert.equal(patched.body.data.assignedUser.name, 'Sales User');

      // Setting the same values again adds nothing to the timeline.
      const again = await request('PATCH', '/admin/leads/1', {
        token,
        body: { status: 'contacted' },
      });
      assert.equal(again.body.data.activities.length, 5);

      const unknown = await request('PATCH', '/admin/leads/1', { token, body: { assignedTo: 99 } });
      assert.equal(unknown.status, 422);
      assert.ok(unknown.body.errors.assignedTo);
    });
  });

  it('lets a sales user work their pipeline but not hand a lead on', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(SALES);

      const own = await request('PATCH', '/admin/leads/2', {
        token,
        body: { status: 'qualified', priority: 'high' },
      });
      assert.equal(own.status, 200);
      assert.equal(own.body.data.status, 'qualified');

      const assign = await request('PATCH', '/admin/leads/2', { token, body: { assignedTo: 2 } });
      assert.equal(assign.status, 403);
      assert.equal(assign.body.message, 'You do not have permission to perform this action.');

      assert.equal(
        (await request('PATCH', '/admin/leads/4', { token, body: { status: 'lost' } })).status,
        404
      );
      assert.equal((await request('DELETE', '/admin/leads/2', { token })).status, 403);
    });
  });
});

describe('claim, notes and bulk', () => {
  it('lets sales claim an open lead exactly once', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(SALES);

      const claimed = await request('POST', '/admin/leads/1/claim', { token });
      assert.equal(claimed.status, 200);
      assert.equal(claimed.body.data.assignedTo, 3);
      assert.equal(claimed.body.data.activities.at(-1).description, 'Assigned to Sales User');

      const again = await request('POST', '/admin/leads/1/claim', { token });
      assert.equal(again.status, 409);

      // Claiming is the sales counterpart of assigning, which admins hold.
      const admin = await login(ADMIN);
      assert.equal((await request('POST', '/admin/leads/3/claim', { token: admin })).status, 403);
    });
  });

  it('adds and removes notes, with the author on each one', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const added = await request('POST', '/admin/leads/1/notes', {
        token,
        body: { text: 'Called, will visit on Saturday.' },
      });
      assert.equal(added.status, 200);
      assert.deepEqual(
        added.body.data.notes.map((note) => [note.id, note.text, note.createdByName]),
        [[1, 'Called, will visit on Saturday.', 'Admin User']]
      );
      assert.equal(added.body.data.activities.at(-1).type, 'note-added');

      const empty = await request('POST', '/admin/leads/1/notes', { token, body: { text: '' } });
      assert.equal(empty.status, 422);

      // A sales user may not withdraw somebody else's note.
      const sales = await login(SALES);
      assert.equal(
        (await request('DELETE', '/admin/leads/1/notes/1', { token: sales })).status,
        403
      );

      const removed = await request('DELETE', '/admin/leads/1/notes/1', { token });
      assert.deepEqual(removed.body.data.notes, []);
      assert.equal((await request('DELETE', '/admin/leads/1/notes/1', { token })).status, 404);
    });
  });

  it('applies a bulk action and keeps it away from sales', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const status = await request('POST', '/admin/leads/bulk', {
        token,
        body: { ids: [5, 6], action: 'status', payload: { status: 'qualified' } },
      });
      assert.deepEqual(status.body, { data: { affected: 2 }, message: '2 leads updated.' });

      const lead = await request('GET', '/admin/leads/5', { token });
      assert.equal(lead.body.data.status, 'qualified');
      assert.equal(lead.body.data.activities.at(-1).type, 'status-changed');

      const invalid = await request('POST', '/admin/leads/bulk', {
        token,
        body: { ids: [5], action: 'status', payload: { status: 'nope' } },
      });
      assert.equal(invalid.status, 422);
      assert.ok(invalid.body.errors['payload.status']);

      const unsupported = await request('POST', '/admin/leads/bulk', {
        token,
        body: { ids: [5], action: 'feature' },
      });
      assert.equal(unsupported.status, 422);

      const sales = await login(SALES);
      assert.equal(
        (
          await request('POST', '/admin/leads/bulk', {
            token: sales,
            body: { ids: [5], action: 'status', payload: { status: 'lost' } },
          })
        ).status,
        403
      );
    });
  });

  it('assigns and deletes in bulk for a manager', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(MANAGER);

      const assigned = await request('POST', '/admin/leads/bulk', {
        token,
        body: { ids: [1], action: 'assign', payload: { assignedTo: 3 } },
      });
      assert.deepEqual(assigned.body, { data: { affected: 1 }, message: '1 lead updated.' });

      const deleted = await request('POST', '/admin/leads/bulk', {
        token,
        body: { ids: [5, 6], action: 'delete' },
      });
      assert.deepEqual(deleted.body, { data: { affected: 2 }, message: '2 leads deleted.' });
      assert.equal((await request('GET', '/admin/leads/5', { token })).status, 404);
    });
  });
});

describe('GET /admin/leads/export', () => {
  it('writes a CSV with a BOM, the contract’s columns and the same filters', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const response = await request('GET', '/admin/leads/export', { token });

      assert.equal(response.status, 200);
      assert.equal(response.headers.get('content-type'), 'text/csv; charset=utf-8');
      assert.match(
        response.headers.get('content-disposition'),
        /^attachment; filename="leads-\d{4}-\d{2}-\d{2}\.csv"$/
      );

      assert.ok(response.text.startsWith('﻿'), 'Excel needs the BOM');
      const [header, ...rows] = response.text.slice(1).trim().split('\r\n');
      assert.equal(
        header,
        'ID,Name,Phone,Email,Source,Status,Priority,Assigned To,Property,Requirement,Message,Follow-up,Created At'
      );
      assert.equal(rows.length, 6);
      assert.match(rows[0], /^1,Ananya Rao,/);
      assert.match(rows[0], /Property Enquiry/, 'the labels are the ones the CRM shows');

      const empty = await request('GET', '/admin/leads/export?q=nobody-by-that-name', { token });
      assert.equal(empty.text.slice(1).trim().split('\r\n').length, 1, 'the header row alone');
    });
  });

  it('exports a sales user’s own scope only', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(SALES);
      const response = await request('GET', '/admin/leads/export', { token });

      const rows = response.text.slice(1).trim().split('\r\n').slice(1);
      assert.equal(rows.length, 5);
      assert.ok(!rows.some((row) => row.startsWith('4,')), 'the manager’s lead is not in the file');
    });
  });
});

describe('isPossibleDuplicate', () => {
  it('flags both leads when one number enquires twice inside the window', async () => {
    await withServer(async ({ request, login }) => {
      // The same person, typing their number two different ways.
      const first = await request('POST', '/leads', {
        body: { ...ENQUIRY, name: 'Rohit Nair', phone: '9845012345' },
      });
      const second = await request('POST', '/leads', {
        body: {
          ...ENQUIRY,
          name: 'Rohit N.',
          phone: '+91 98450 12345',
          source: 'callback-request',
        },
      });

      const token = await login(ADMIN);
      const list = await request('GET', '/admin/leads?perPage=all', { token });
      const flagged = list.body.data.filter((lead) => lead.isPossibleDuplicate);

      assert.deepEqual(
        flagged.map((lead) => lead.id).sort((a, b) => a - b),
        [first.body.data.id, second.body.data.id],
        'the flag is on the pair, not on the newer one alone'
      );
      assert.equal(
        list.body.data.find((lead) => lead.id === 1).isPossibleDuplicate,
        false,
        'a number that enquired once is not a duplicate'
      );

      const detail = await request('GET', `/admin/leads/${second.body.data.id}`, { token });
      assert.equal(detail.body.data.isPossibleDuplicate, true, 'the detail carries it too');
    });
  });

  it('is not part of what the public form gets back', async () => {
    await withServer(async ({ request }) => {
      const created = await request('POST', '/leads', { body: ENQUIRY });
      assert.equal(created.body.data.isPossibleDuplicate, undefined);
    });
  });

  it('tells a sales user about a duplicate they cannot open', async () => {
    await withServer(async ({ request, login }) => {
      const admin = await login(ADMIN);

      // Two enquiries from one number, one of them parked on the manager —
      // outside the sales scope of D15, which is exactly why the flag matters.
      const theirs = await request('POST', '/leads', {
        body: { ...ENQUIRY, name: 'Meera Iyer', phone: '9845099887' },
      });
      const hidden = await request('POST', '/leads', {
        body: { ...ENQUIRY, name: 'Meera I.', phone: '9845099887' },
      });
      await request('PATCH', `/admin/leads/${hidden.body.data.id}`, {
        token: admin,
        body: { assignedTo: 2 },
      });

      const token = await login(SALES);
      assert.equal(
        (await request('GET', `/admin/leads/${hidden.body.data.id}`, { token })).status,
        404
      );

      const visible = await request('GET', `/admin/leads/${theirs.body.data.id}`, { token });
      assert.equal(visible.body.data.isPossibleDuplicate, true);
    });
  });
});
