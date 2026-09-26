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

  // MB-02: `pageSlug` holds a page's slug, and §6.10 types that as a URL
  // **path** — the four seeded pages under `buyer-assistance/` and `insights/`
  // all carry one, and every lead-capture block hands `page.slug` through
  // verbatim. Typing it as a single segment refused every lead sent from them.
  it('stores the whole slug path of the page a lead came from', async () => {
    await withServer(async ({ request }) => {
      for (const pageSlug of ['contact', 'buyer-assistance/home-loan', 'insights/faqs']) {
        const created = await request('POST', '/leads', { body: { ...ENQUIRY, pageSlug } });
        assert.equal(created.status, 201, pageSlug);
        assert.equal(created.body.data.pageSlug, pageSlug);
      }
    });
  });

  it('still refuses a page slug that is a URL rather than a slug', async () => {
    await withServer(async ({ request }) => {
      for (const pageSlug of ['/buyer-assistance/home-loan', 'Buyer Assistance', 'a//b']) {
        const refused = await request('POST', '/leads', { body: { ...ENQUIRY, pageSlug } });
        assert.equal(refused.status, 422, pageSlug);
        assert.ok(refused.body.errors.pageSlug, pageSlug);
      }
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
      const { followUp, ...paging } = newest.body.meta;
      assert.deepEqual(paging, { page: 1, perPage: 6, total: 6, totalPages: 1 });
      // The worklist's counts ride on every list answer (prompt 51).
      assert.deepEqual(Object.keys(followUp).sort(), ['next7', 'none', 'overdue', 'today']);

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
          // 10:00 UTC is 15:30 in Bengaluru, where the desk reads it (QA-53).
          'Follow-up set for 20 Sep 2026, 03:30 pm',
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

describe('the lost reason (QA-53)', () => {
  it('asks why a lead is marked as lost, and records it in the timeline', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const none = await request('PATCH', '/admin/leads/1', { token, body: { status: 'lost' } });
      assert.equal(none.status, 422);
      assert.ok(none.body.errors.lostReason);

      const short = await request('PATCH', '/admin/leads/1', {
        token,
        body: { status: 'lost', lostReason: ' ab ' },
      });
      assert.equal(short.status, 422);

      const lost = await request('PATCH', '/admin/leads/1', {
        token,
        body: { status: 'lost', lostReason: '  Bought elsewhere ' },
      });
      assert.equal(lost.status, 200);
      assert.equal(lost.body.data.lostReason, 'Bought elsewhere');
      assert.equal(
        lost.body.data.activities.at(-1).description,
        'Status changed from New to Lost — Bought elsewhere'
      );

      // A lost lead's other fields change without the question being asked again.
      const priority = await request('PATCH', '/admin/leads/1', {
        token,
        body: { priority: 'low' },
      });
      assert.equal(priority.status, 200);
      assert.equal(priority.body.data.lostReason, 'Bought elsewhere');
    });
  });

  it('clears the reason when a lead is reopened, and refuses one on an open lead', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const reopened = await request('PATCH', '/admin/leads/6', {
        token,
        body: { status: 'contacted' },
      });
      assert.equal(reopened.status, 200);
      assert.equal(reopened.body.data.lostReason, null);
      assert.equal(
        reopened.body.data.activities.at(-1).description,
        'Status changed from Lost to Contacted'
      );

      const stray = await request('PATCH', '/admin/leads/2', {
        token,
        body: { lostReason: 'Not a lost lead' },
      });
      assert.equal(stray.status, 422);
      assert.ok(stray.body.errors.lostReason);
    });
  });

  it('asks the bulk bar too, and leaves a lead that is already lost as it was', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const none = await request('POST', '/admin/leads/bulk', {
        token,
        body: { ids: [1, 6], action: 'status', payload: { status: 'lost' } },
      });
      assert.equal(none.status, 422);
      assert.ok(none.body.errors['payload.lostReason']);

      const closed = await request('POST', '/admin/leads/bulk', {
        token,
        body: {
          ids: [1, 6],
          action: 'status',
          payload: { status: 'lost', lostReason: 'Duplicate enquiry' },
        },
      });
      assert.deepEqual(closed.body, { data: { affected: 1 }, message: '1 lead updated.' });

      assert.equal(
        (await request('GET', '/admin/leads/1', { token })).body.data.lostReason,
        'Duplicate enquiry'
      );
      assert.equal(
        (await request('GET', '/admin/leads/6', { token })).body.data.lostReason,
        'Signed a lease elsewhere before our shortlist was ready.'
      );
    });
  });
});

describe('sorting, searching and dates (QA-53)', () => {
  it('sorts a status along the funnel and a priority by rank', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const funnel = await request('GET', '/admin/leads?sort=status&order=asc&perPage=all', {
        token,
      });
      assert.deepEqual(ids(funnel), [1, 2, 3, 4, 5, 6], 'New … Converted, then Lost');

      const urgent = await request('GET', '/admin/leads?sort=priority&order=desc&perPage=all', {
        token,
      });
      assert.deepEqual(
        urgent.body.data.map((lead) => lead.priority),
        ['high', 'high', 'high', 'medium', 'medium', 'low']
      );
    });
  });

  it('finds a phone number however it is typed', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      for (const q of ['9876500001', '98765 00001', '+91 98765 00001', '098765-00001']) {
        const found = await request('GET', `/admin/leads?q=${encodeURIComponent(q)}`, { token });
        assert.deepEqual(ids(found), [1], q);
      }
    });
  });

  it('stores a 91-series mobile in the one shape, so its second enquiry is a duplicate', async () => {
    await withServer(async ({ request, login }) => {
      const first = await request('POST', '/leads', {
        body: { ...ENQUIRY, name: 'Kavya Rao', phone: '9123456780' },
      });
      assert.equal(first.body.data.phone, '+919123456780', 'the leading 91 is the number');

      const second = await request('POST', '/leads', {
        body: { ...ENQUIRY, name: 'Kavya R.', phone: '+91 91234 56780' },
      });

      const token = await login(ADMIN);
      const detail = await request('GET', `/admin/leads/${second.body.data.id}`, { token });
      assert.equal(detail.body.data.isPossibleDuplicate, true);
    });
  });

  it('reads a created date in IST', () => {
    const { applyLeadFilters } = require('../lib/leadFilters');
    // 01:30 on 5 September in Bengaluru is still 4 September in UTC.
    const night = { id: 1, createdAt: '2026-09-04T20:00:00.000Z' };

    assert.equal(applyLeadFilters([night], { from: '2026-09-05', to: '2026-09-05' }).length, 1);
    assert.equal(applyLeadFilters([night], { from: '2026-09-04', to: '2026-09-04' }).length, 0);
  });

  it('counts a night-time lead on the Indian day it arrived', () => {
    const { buildDashboard } = require('../lib/dashboard');
    const state = { leads: [{ id: 1, status: 'new', createdAt: '2026-09-04T20:00:00.000Z' }] };

    // 07:30 on 5 September, IST.
    const dashboard = buildDashboard(state, { now: Date.parse('2026-09-05T02:00:00.000Z') });
    assert.equal(dashboard.stats.leadsToday, 1);
    assert.deepEqual(dashboard.trends.leadsByDay.at(-1), { date: '2026-09-05', count: 1 });
  });
});

describe('what a write changes (QA-53)', () => {
  it('counts only the leads a bulk action changed, and assigns by id', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const same = await request('POST', '/admin/leads/bulk', {
        token,
        body: { ids: [1, 4], action: 'priority', payload: { priority: 'high' } },
      });
      assert.deepEqual(same.body, { data: { affected: 0 }, message: '0 leads updated.' });

      const text = await request('POST', '/admin/leads/bulk', {
        token,
        body: { ids: [1], action: 'assign', payload: { assignedTo: '3' } },
      });
      assert.equal(text.status, 422);
      assert.ok(text.body.errors['payload.assignedTo']);
    });
  });

  it('refuses a deactivated colleague as a new owner', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);

      const created = await request('POST', '/admin/users', {
        token,
        body: {
          name: 'Former Sales',
          email: 'former.sales@example.com',
          password: 'Former@123',
          role: 'sales',
          isActive: false,
        },
      });
      assert.equal(created.status, 201);
      const formerId = created.body.data.id;

      const single = await request('PATCH', '/admin/leads/1', {
        token,
        body: { assignedTo: formerId },
      });
      assert.equal(single.status, 422);
      assert.deepEqual(single.body.errors.assignedTo, ['The selected user is inactive.']);

      const bulk = await request('POST', '/admin/leads/bulk', {
        token,
        body: { ids: [1], action: 'assign', payload: { assignedTo: formerId } },
      });
      assert.equal(bulk.status, 422);
    });
  });

  it('writes nothing for a change that changes nothing', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const before = (await request('GET', '/admin/leads/2', { token })).body.data;

      const same = await request('PATCH', '/admin/leads/2', {
        token,
        body: { status: before.status, priority: before.priority },
      });
      assert.equal(same.body.data.updatedAt, before.updatedAt);
      assert.equal(same.body.data.activities.length, before.activities.length);
    });
  });

  it('names the author of every timeline entry', async () => {
    await withServer(async ({ request, login }) => {
      const admin = await login(ADMIN);
      await request('PATCH', '/admin/leads/2', { token: admin, body: { priority: 'high' } });

      // A sales user cannot read the directory; the lead names the author.
      const token = await login(SALES);
      const lead = (await request('GET', '/admin/leads/2', { token })).body.data;
      const last = lead.activities.at(-1);

      assert.equal(last.description, 'Priority changed from Medium to High');
      assert.equal(last.createdByName, 'Admin User');
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
        'ID,Name,Phone,Email,Source,Status,Lost Reason,Priority,Assigned To,Property,Requirement,Message,Follow-up (IST),Created At (IST)'
      );
      assert.equal(rows.length, 6);
      assert.match(rows[0], /^1,Ananya Rao,/);
      assert.match(rows[0], /Property Enquiry/, 'the labels are the ones the CRM shows');

      const empty = await request('GET', '/admin/leads/export?q=nobody-by-that-name', { token });
      assert.equal(empty.text.slice(1).trim().split('\r\n').length, 1, 'the header row alone');
    });
  });

  it('writes the cells in the words and the timezone the desk reads (QA-53)', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const response = await request('GET', '/admin/leads/export', { token });
      const rows = response.text.slice(1).trim().split('\r\n').slice(1);
      const row = (id) => rows.find((line) => line.startsWith(`${id},`));

      // Labels and a lakh/crore budget, not "sale · 9000000–12000000 · 3-6-months".
      assert.match(row(1), /,Buy · Apartments · 3 BHK · Whitefield · 1–3 months,/);
      assert.match(
        row(2),
        /,Buy · Apartments · 3 BHK · Sarjapur Road · ₹90 L – ₹1\.2 Cr · 3–6 months,/
      );

      // IST wall-clock times: 11:20 UTC is 16:50, 05:30 UTC is 11:00.
      assert.match(row(1), /,2026-09-08 16:50$/);
      assert.match(row(2), /,2026-09-18 11:00,2026-09-05 13:30$/);

      // Why a lost lead was lost is in the file; nobody else has a reason.
      assert.match(row(6), /,Lost,Signed a lease elsewhere before our shortlist was ready\.,Low,/);
      assert.match(row(5), /,Converted,,High,/);
    });
  });

  it('keeps a cell a spreadsheet would run as a formula as text (QA-53)', async () => {
    await withServer(async ({ request, login }) => {
      await request('POST', '/leads', {
        body: { ...ENQUIRY, name: '=HYPERLINK("https://evil.test","Open")', message: '@SUM(1)' },
      });

      const token = await login(ADMIN);
      const response = await request('GET', '/admin/leads/export?q=HYPERLINK', { token });
      const [row] = response.text.slice(1).trim().split('\r\n').slice(1);

      assert.match(row, /,"'=HYPERLINK\(""https:\/\/evil\.test"",""Open""\)",/);
      assert.match(row, /,'\+919876543210,/, 'a +91 number stays a number, not 9.19877E+11');
      assert.match(row, /,'@SUM\(1\),/);
    });
  });

  it('writes the rows in the order the table was sorted in (QA-53)', async () => {
    await withServer(async ({ request, login }) => {
      const token = await login(ADMIN);
      const response = await request('GET', '/admin/leads/export?sort=priority&order=asc', {
        token,
      });
      const rows = response.text.slice(1).trim().split('\r\n').slice(1);

      assert.deepEqual(
        rows.map((line) => Number(line.split(',')[0])),
        [6, 2, 3, 1, 4, 5],
        'Low, then Medium, then High — newest first inside each'
      );
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
