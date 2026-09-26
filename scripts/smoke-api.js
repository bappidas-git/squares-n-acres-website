#!/usr/bin/env node
/**
 * End-to-end smoke test of the API (00_MASTER_CONTEXT.md §10; prompt 09 §4.14).
 *
 *   npm run mock        # in one terminal
 *   npm run smoke       # in another
 *
 * The script walks **`src/services/endpoints.js`** — the registry the frontend
 * itself calls through — and exercises every entry against a running server:
 * it logs in as each of the three roles, creates a fixture for every writable
 * resource, sends each endpoint the smallest request that should succeed with
 * the least privileged token that should be allowed, and asserts the status and
 * the envelope of §5.2. Then it checks the two dozen behaviours that a status
 * code cannot tell you about — that a `PATCH` left the other fields alone, that
 * `bedrooms=3` returns only 3-BHK listings, that a CSV starts with a BOM —
 * and deletes everything it created.
 *
 * Walking the registry rather than a list of its own is the point: an endpoint
 * the frontend believes in but the API does not have fails here, and so does
 * one the API has but the registry never declared.
 *
 * It needs a **running** server, which is why it is not part of
 * `npm run check:all`. It talks plain HTTPS or HTTP through `fetch` and never
 * touches `NODE_TLS_REJECT_UNAUTHORIZED`: a base URL with a self-signed
 * certificate is out of scope (§7 of prompt 09).
 *
 *   node scripts/smoke-api.js --baseUrl=https://api.example.com/api --verbose
 *   node scripts/smoke-api.js --email=admin@… --password=…
 */

const { allEndpoints } = require('../src/services/endpoints');
const schemas = require('../src/services/schemas');
const { TOKEN_FOR, WRITABLE, groupOf, isCreate, sampleBody } = require('./lib/guidelines/fixtures');

/* ------------------------------------------------------------------ *
 * Arguments
 * ------------------------------------------------------------------ */

const DEFAULTS = {
  baseUrl: 'http://localhost:4000/api',
  email: 'admin@squaresnacres.com',
  password: 'Admin@123',
  managerEmail: 'manager@squaresnacres.com',
  managerPassword: 'Manager@123',
  salesEmail: 'sales@squaresnacres.com',
  salesPassword: 'Sales@123',
  verbose: false,
  // `--compare=<url>` puts the run in comparison mode: the same reads are sent
  // to `--baseUrl` and to this one, and only the differences are printed.
  compare: '',
};

/** `--key=value` and bare `--flag`, with the documented defaults underneath. */
function parseArgs(argv) {
  const options = { ...DEFAULTS };

  for (const argument of argv) {
    const match = /^--([a-zA-Z]+)(?:=(.*))?$/.exec(argument);
    if (!match) continue;
    const [, key, value] = match;
    if (!(key in options)) continue;
    options[key] = value === undefined ? true : value;
  }

  options.baseUrl = String(options.baseUrl).replace(/\/+$/, '');
  options.compare = options.compare ? String(options.compare).replace(/\/+$/, '') : '';
  return options;
}

const options = parseArgs(process.argv.slice(2));

/* ------------------------------------------------------------------ *
 * Reporting
 * ------------------------------------------------------------------ */

/** One row of the result table. */
const rows = [];

/** Failures worth printing in full under the table. */
const failures = [];

const record = ({ key, method, path, expected, actual, ok, note }) => {
  rows.push({ key, method, path, expected: String(expected), actual: String(actual), ok, note });
  if (!ok) failures.push({ key, method, path, expected, actual, note });
  if (options.verbose) {
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${method.padEnd(6)} ${path}  → ${actual} (${key})`);
  }
};

/** Prints the `key | method | path | expected | actual | ok` table of §4.14. */
function printTable() {
  const header = {
    key: 'key',
    method: 'method',
    path: 'path',
    expected: 'expected',
    actual: 'actual',
    ok: 'ok',
  };
  const all = [header, ...rows.map((row) => ({ ...row, ok: row.ok ? 'yes' : 'NO' }))];
  const widths = Object.keys(header).map((column) =>
    Math.max(...all.map((row) => String(row[column]).length))
  );

  const line = (row) =>
    Object.keys(header)
      .map((column, index) => String(row[column]).padEnd(widths[index]))
      .join(' | ');

  console.log(line(header));
  console.log(widths.map((width) => '-'.repeat(width)).join('-+-'));
  for (const row of all.slice(1)) console.log(line(row));
}

/* ------------------------------------------------------------------ *
 * HTTP
 * ------------------------------------------------------------------ */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** The longest the run will wait out a rate-limit window, in seconds. */
const MAX_RETRY_WAIT = 65;

/**
 * One request against the server under test.
 *
 * A 429 is waited out once. The public forms accept ten submissions a minute
 * per IP (§5.11) and one run spends six of them, so two runs inside a minute
 * legitimately hit the limit — that is the API working, not a failure, and the
 * honest response is to wait rather than to weaken the rule.
 *
 * @param {string} method
 * @param {string} path the path below the base URL, query string included
 * @param {{token?: string, body?: object, retry?: boolean, baseUrl?: string}} [init]
 * @returns {Promise<{status: number, text: string, json: object|null, headers: Headers}>}
 */
async function api(method, path, { token, body, retry = true, baseUrl } = {}) {
  const base = baseUrl ?? options.baseUrl;
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  // `Response.text()` strips a leading BOM, and a CSV export has to carry one
  // (§5.14), so the body is decoded here with the BOM left in place.
  const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(await response.arrayBuffer());

  if (response.status === 429 && retry) {
    const wait = Math.min(Number(response.headers.get('retry-after')) || 60, MAX_RETRY_WAIT);
    console.log(`  rate limited on ${method} ${path} — waiting ${wait}s for the window to reset`);
    await sleep((wait + 1) * 1000);
    return api(method, path, { token, body, retry: false, baseUrl: base });
  }

  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null; // CSV, XML and plain text land here.
  }

  return { status: response.status, text, json, headers: response.headers };
}

/* ------------------------------------------------------------------ *
 * Envelope assertions (§5.2)
 * ------------------------------------------------------------------ */

const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const META_KEYS = ['page', 'perPage', 'total', 'totalPages'];

/** The two lists §5.7 gives facets to; `featured` and `similar` are fixed sets. */
const FACETED = new Set(['properties.list', 'adminProperties.list']);

/**
 * Checks the envelope a response shape promises.
 *
 * @param {string} shape the registry's `response` name
 * @param {object} response
 * @param {string} key the registry key, for the rules that are per-endpoint
 * @returns {string|null} the complaint, or `null` when the envelope is right
 */
function checkEnvelope(shape, response, key) {
  const { json, text } = response;

  if (shape === 'Xml') {
    return text.trimStart().startsWith('<?xml') ? null : 'expected an XML document';
  }
  if (shape === 'Text') {
    return text.trim() === '' ? 'expected a non-empty text document' : null;
  }
  if (shape === 'Csv') {
    return text.startsWith('﻿') ? null : 'expected a UTF-8 BOM';
  }
  if (shape === 'NoContent') {
    return text === '' ? null : 'expected no body';
  }

  if (!isObject(json)) return 'expected a JSON envelope';
  if (!('data' in json)) return 'envelope has no `data` key';

  if (shape === 'Null') {
    if (json.data !== null) return '`data` should be null';
    if (typeof json.message !== 'string') return 'expected a `message`';
    return null;
  }

  if (shape.endsWith('List')) {
    if (!Array.isArray(json.data)) return '`data` should be an array';
    if (!isObject(json.meta)) return 'a list needs `meta`';
    const missing = META_KEYS.filter((key) => typeof json.meta[key] !== 'number');
    if (missing.length > 0) return `meta is missing ${missing.join(', ')}`;
    if (FACETED.has(key) && !isObject(json.meta.facets)) {
      return 'a property list needs `meta.facets`';
    }
    return null;
  }

  if (json.data !== null && !isObject(json.data)) return '`data` should be an object';
  return null;
}

/* ------------------------------------------------------------------ *
 * Sample bodies, built from the shared schema descriptors
 * ------------------------------------------------------------------ */

/**
 * A token that is unique to this run, so the names, slugs, paths and e-mail
 * addresses the run invents cannot collide with the ones a previous run left
 * behind — on the mock, or on a shared staging API.
 */
const RUN_ID = Date.now().toString(36);

let counter = 0;
const nextSeed = () => `${RUN_ID}${(counter += 1)}`;

/*
 * `sampleValue`, `sampleBody`, `WRITABLE`, `CREATES` and `TOKEN_FOR` live in
 * `scripts/lib/guidelines/fixtures.js`: the guidelines generator captures the
 * documented examples with exactly the same bodies this run sends, and two
 * copies of the same knowledge would drift.
 */

/* ------------------------------------------------------------------ *
 * The resources the walk writes to
 * ------------------------------------------------------------------ */

/** Ids the run created, newest first, so cleanup unwinds what it built. */
const created = [];

/** Fixtures the walk reuses, keyed by registry group. */
const fixtures = {};

/** The three role tokens plus the run's own throwaway account. */
const tokens = {};

/**
 * Creates one record of a writable resource and registers it for cleanup.
 *
 * @param {string} group a key of {@link WRITABLE}
 * @returns {Promise<object|null>} the created record
 */
async function createFixture(group) {
  const spec = WRITABLE[group];
  const seed = nextSeed();
  const body = {
    ...sampleBody(schemas.getSchema(spec.schema), seed),
    ...(spec.overrides?.(seed) ?? {}),
  };

  const response = await api('POST', spec.path, { token: tokens.admin, body });
  if (response.status !== 201 || !response.json?.data) {
    failures.push({
      key: `fixture:${group}`,
      method: 'POST',
      path: spec.path,
      expected: 201,
      actual: response.status,
      note: response.text.slice(0, 400),
    });
    return null;
  }

  created.unshift({ path: `${spec.path}/${response.json.data.id}`, group });
  return response.json.data;
}

/* ------------------------------------------------------------------ *
 * The endpoints the walk cannot plan generically
 * ------------------------------------------------------------------ */

/**
 * Groups whose records arrive through a public form rather than an admin
 * `POST`. Their `DELETE` still needs something of its own to delete, so each
 * one knows how to produce a throwaway.
 */
const PUBLIC_CREATED = {
  adminLeads: async () => {
    const response = await api('POST', '/leads', {
      body: { name: 'Smoke Delete Lead', phone: '9876543210', source: 'contact-page' },
    });
    return response.json?.data ?? null;
  },
  adminNewsletterSubscribers: async () => {
    const response = await api('POST', '/newsletter/subscribe', {
      body: { email: `smoke.delete.${nextSeed()}.${Date.now()}@example.com` },
    });
    return response.json?.data ?? null;
  },
  adminJobApplications: async () => {
    const response = await api('POST', `/jobs/${fixtures.adminJobs?.id ?? 1}/apply`, {
      body: {
        name: 'Smoke Delete Applicant',
        email: `smoke.delete.${nextSeed()}.${Date.now()}@example.com`,
        phone: '9876543210',
        resumeUrl: 'https://example.com/smoke-cv.pdf',
      },
    });
    return response.json?.data ?? null;
  },
};

/**
 * The plan for the endpoints whose request cannot be derived from the registry
 * alone — a body only the domain knows, a prerequisite the run has to create
 * first, or a call that would revoke the token it is made with.
 *
 * Each entry returns `{ path?, body?, token?, expect?, skip? }`.
 */
const SPECIAL = {
  'properties.list': () => ({ path: '/properties?perPage=2' }),
  'properties.counts': () => ({ path: '/properties/counts?by=segment,listingType' }),
  'properties.suggestions': () => ({ path: '/properties/suggestions?q=whitefield' }),
  'properties.view': () => ({ body: {} }),

  'articles.list': () => ({ path: '/articles?perPage=2' }),

  // The files of a listing open to the token a lead about it was answered
  // with, so the run files one first and cleans it up afterwards.
  'properties.documentAccess': async () => {
    const lead = await api('POST', '/leads', {
      body: {
        name: 'Smoke Access Lead',
        phone: '9876543210',
        source: 'document-request',
        propertyId: 1,
        message: 'Created by the API smoke test.',
      },
    });
    const id = lead.json?.data?.id;
    if (id) created.unshift({ path: `/admin/leads/${id}` });
    const token = lead.json?.data?.access?.token;
    if (!token) return { skip: 'the lead was answered without an access token' };
    return { path: '/properties/1/documents/access', body: { token }, expect: 200 };
  },

  'leads.create': () => ({
    body: {
      name: 'Smoke Test Lead',
      phone: '9876543210',
      email: 'smoke.lead@example.com',
      source: 'contact-page',
      message: 'Created by the API smoke test.',
    },
    expect: 201,
    after: (response) => {
      if (response.json?.data?.id)
        created.unshift({ path: `/admin/leads/${response.json.data.id}` });
    },
  }),

  // A known address is what the registry's `Null` response describes: the
  // duplicate answer, not the 201 of a first-time subscriber.
  'newsletter.subscribe': () => ({
    body: { email: 'subscriber.one@example.com' },
    expect: 200,
  }),

  'jobs.apply': () => ({
    path: `/jobs/${fixtures.adminJobs?.id ?? 1}/apply`,
    body: {
      name: 'Smoke Applicant',
      email: `smoke.applicant.${nextSeed()}@example.com`,
      phone: '9876543210',
      resumeUrl: 'https://example.com/smoke-cv.pdf',
    },
    expect: 201,
    after: (response) => {
      if (response.json?.data?.id) {
        created.unshift({ path: `/admin/job-applications/${response.json.data.id}` });
        fixtures.adminJobApplications = response.json.data;
      }
    },
  }),

  'auth.login': () => ({ body: { email: options.email, password: options.password } }),

  // Logging out revokes the token that made the call, so this one gets a
  // session of its own rather than ending the run's admin session.
  'auth.logout': async () => {
    const session = await api('POST', '/auth/login', {
      body: { email: options.email, password: options.password },
    });
    return { token: session.json?.data?.token };
  },

  'auth.profile': () => ({ token: tokens.smoke }),
  'auth.updateProfile': () => ({
    token: tokens.smoke,
    body: { name: 'Smoke Test User', phone: '9876543212', avatarUrl: null },
  }),
  'auth.updatePassword': () => ({
    token: tokens.smoke,
    body: { currentPassword: SMOKE_USER.password, newPassword: `${SMOKE_USER.password}!` },
  }),

  // The run's own lead is unassigned, which is exactly what `claim` needs.
  'adminLeads.claim': () => ({ path: `/admin/leads/${fixtures.adminLeads?.id ?? 1}/claim` }),
  'adminLeads.addNote': () => ({
    path: `/admin/leads/${fixtures.adminLeads?.id}/notes`,
    body: { text: 'Note added by the API smoke test.' },
    after: (response) => {
      const notes = response.json?.data?.notes ?? [];
      fixtures.noteId = notes.at(-1)?.id ?? null;
    },
  }),
  'adminLeads.removeNote': () => ({
    path: `/admin/leads/${fixtures.adminLeads?.id}/notes/${fixtures.noteId}`,
    skip: fixtures.noteId ? false : 'no note was created',
  }),
  'adminLeads.exportCsv': () => ({ path: '/admin/leads/export' }),

  'adminSettings.update': async () => {
    const current = await api('GET', '/admin/settings', { token: tokens.admin });
    return { body: { general: { siteName: current.json?.data?.general?.siteName } } };
  },
  'adminSeo.updateSettings': async () => {
    const current = await api('GET', '/admin/seo/settings', { token: tokens.admin });
    return { body: { separator: current.json?.data?.separator ?? '|' } };
  },
  'adminSeo.overview': () => ({ path: '/admin/seo/overview?type=property&perPage=5' }),

  // A rename needs a folder of the run's own: the run files a record there,
  // renames the folder, and removes the record afterwards (prompt 51).
  'adminMedia.renameFolder': async () => {
    const seed = nextSeed();
    const folder = `smoke-folder-${seed}`;
    const record = await api('POST', '/admin/media', {
      token: tokens.admin,
      body: {
        url: `https://images.example.com/smoke-rename-${seed}.jpg`,
        alt: 'Smoke — a file whose folder is renamed',
        folder,
      },
    });
    const id = record.json?.data?.id;
    if (!id) return { skip: `could not file a record to rename its folder (${record.status})` };
    created.unshift({ path: `/admin/media/${id}?force=true` });
    return { body: { from: folder, to: `${folder}-renamed` }, expect: 200 };
  },

  // A lead the desk enters itself (prompt 51) — as a sales user, whose lead it
  // then is — removed again afterwards.
  'adminLeads.create': () => ({
    body: {
      name: 'Smoke Desk Lead',
      phone: '9876543211',
      source: 'walk-in',
      note: 'Created by the API smoke test.',
    },
    expect: 201,
    after: (response) => {
      if (response.json?.data?.id) {
        created.unshift({ path: `/admin/leads/${response.json.data.id}` });
      }
    },
  }),
  'adminLeads.logActivity': () => ({
    path: `/admin/leads/${fixtures.adminLeads?.id}/activities`,
    body: { type: 'call', outcome: 'Logged by the API smoke test' },
    skip: fixtures.adminLeads?.id ? false : 'no lead was created',
  }),

  // `resolve` needs a path to resolve, and the seed redirects `/blog`.
  'redirects.resolve': () => ({ path: '/redirects/resolve?path=/blog' }),
  // The run's own subscriber, marked as somebody who asked to stop.
  'adminNewsletterSubscribers.patch': () => ({ body: { status: 'unsubscribed' } }),
  // An address nothing answers, reported the way the 404 page reports it.
  'notFound.report': () => ({
    body: { path: `/smoke-missing-${RUN_ID}`, referrer: 'https://www.google.com/' },
  }),
  // The run dismisses the address it reported itself, and nothing else.
  'adminSeo.dismissNotFound': async () => {
    const reported = `/smoke-dismissed-${RUN_ID}`;
    await api('POST', '/not-found', { body: { path: reported } });
    const listed = await api('GET', `/admin/seo/not-found?q=${encodeURIComponent(reported)}`, {
      token: tokens.admin,
    });
    const line = (listed.json?.data ?? []).find((entry) => entry.path === reported);
    if (!line) return { skip: 'the reported address was not listed' };
    return { path: `/admin/seo/not-found/${line.id}` };
  },

  // The import is an upsert keyed on `fromPath`, so it is pointed at the
  // redirect the walk already created: the run updates its own fixture rather
  // than leaving a record behind that cleanup does not know about.
  'adminRedirects.import': () => ({
    body: {
      rows: [
        {
          fromPath: fixtures.adminRedirects?.fromPath ?? '/smoke-import',
          toPath: '/properties',
          statusCode: 301,
        },
      ],
    },
  }),
};

/** The account the run creates for the `/auth/*` endpoints. */
const SMOKE_USER = {
  name: 'API Smoke Test',
  email: `smoke.runner.${Date.now()}@example.com`,
  password: 'SmokeTest@123',
  role: 'sales',
};

/* ------------------------------------------------------------------ *
 * The walk
 * ------------------------------------------------------------------ */

/** Fills `:id`, `:slug` and the other path parameters of one endpoint. */
function resolvePath(endpoint) {
  const group = groupOf(endpoint);
  const fixture = fixtures[group];
  const write = ['PUT', 'PATCH', 'DELETE'].includes(endpoint.method);

  return endpoint.path
    .replace(/:id/g, () => String(write && fixture ? fixture.id : (endpoint.example ?? 1)))
    .replace(/:slug/g, () => String(endpoint.example ?? ''));
}

/**
 * Whether a `DELETE` removes the resource itself rather than something inside
 * it. `/admin/leads/:id` does; `/admin/leads/:id/notes/:noteId` removes a note
 * from a lead that has to survive the call, so it needs no throwaway of its own.
 */
const deletesARecord = (endpoint) => endpoint.path.endsWith('/:id');

/**
 * The request one registry entry turns into, and the status it should answer.
 *
 * @param {object} endpoint a registry entry
 * @returns {Promise<object>} `{ skip }` or `{ path, method, token, body, expect }`
 */
async function planFor(endpoint) {
  const group = groupOf(endpoint);
  const special = SPECIAL[endpoint.key];
  const base = {
    method: endpoint.method,
    path: resolvePath(endpoint),
    token: tokens[TOKEN_FOR[endpoint.auth] ?? 'admin'],
    // A report the API only takes note of answers 204 with no body (prompt 51).
    expect: endpoint.response === 'NoContent' ? 204 : isCreate(endpoint) ? 201 : 200,
    body: undefined,
  };

  // Every list of §5.8's bulk actions has `delete`, and an id nothing matches
  // makes it a no-op — a smoke test must not delete somebody's data.
  if (endpoint.path.endsWith('/bulk')) {
    base.body = { ids: [999999], action: 'delete' };
    base.expect = 200;
  } else if (endpoint.path.endsWith('/check-slug')) {
    base.path = `${endpoint.path}?slug=smoke-test-slug`;
  } else if (endpoint.method === 'POST' && WRITABLE[group]?.path === endpoint.path) {
    const seed = nextSeed();
    base.body = {
      ...sampleBody(schemas.getSchema(WRITABLE[group].schema), seed),
      ...(WRITABLE[group].overrides?.(seed) ?? {}),
    };
  } else if (endpoint.method === 'PUT' && WRITABLE[group]) {
    const seed = nextSeed();
    base.body = {
      ...sampleBody(schemas.getSchema(WRITABLE[group].schema), seed),
      ...(WRITABLE[group].overrides?.(seed) ?? {}),
    };
  } else if (endpoint.method === 'PATCH' && WRITABLE[group]) {
    base.body = { ...WRITABLE[group].patch };
  } else if (endpoint.method === 'DELETE' && deletesARecord(endpoint) && WRITABLE[group]) {
    // A delete needs something of its own to delete.
    const victim = await createFixture(group);
    if (!victim) return { skip: `could not create a ${group} record to delete` };
    created.shift();
    base.path = `${WRITABLE[group].path}/${victim.id}`;
  } else if (endpoint.method === 'DELETE' && deletesARecord(endpoint) && PUBLIC_CREATED[group]) {
    const victim = await PUBLIC_CREATED[group]();
    if (!victim) return { skip: `could not create a ${group} record to delete` };
    base.path = endpoint.path.replace(':id', String(victim.id));
  }

  if (!special) return base;

  const overrides = await special(endpoint);
  return { ...base, ...overrides };
}

/** Sends one planned request and records the row. */
async function runEndpoint(endpoint) {
  const plan = await planFor(endpoint);

  if (plan.skip) {
    record({
      key: endpoint.key,
      method: endpoint.method,
      path: endpoint.path,
      expected: 'skip',
      actual: 'skip',
      ok: true,
      note: plan.skip,
    });
    return;
  }

  const response = await api(plan.method, plan.path, { token: plan.token, body: plan.body });
  const statusOk = response.status === plan.expect;
  const envelope = statusOk ? checkEnvelope(endpoint.response, response, endpoint.key) : null;

  record({
    key: endpoint.key,
    method: plan.method,
    path: plan.path,
    expected: plan.expect,
    actual: response.status,
    ok: statusOk && envelope === null,
    note: envelope ?? (statusOk ? '' : response.text.slice(0, 300)),
  });

  // Anything the walk brought into existence is the walk's to take away again.
  const group = groupOf(endpoint);
  if (statusOk && isCreate(endpoint) && WRITABLE[group] && response.json?.data?.id) {
    created.unshift({ path: `${WRITABLE[group].path}/${response.json.data.id}`, group });
  }

  if (statusOk && plan.after) plan.after(response);
}

/* ------------------------------------------------------------------ *
 * Behaviours a status code cannot describe
 * ------------------------------------------------------------------ */

/** Records one named assertion. */
function check(name, ok, note = '') {
  record({
    key: name,
    method: 'CHECK',
    path: '-',
    expected: 'pass',
    actual: ok ? 'pass' : 'fail',
    ok,
    note,
  });
}

/** The targeted assertions of §4.14. */
async function targetedChecks() {
  const admin = tokens.admin;
  const sales = tokens.sales;

  const noToken = await api('GET', '/admin/properties');
  check('rbac.401-without-token', noToken.status === 401, `got ${noToken.status}`);

  const salesCreate = await api('POST', '/admin/properties', { token: sales, body: {} });
  check('rbac.403-sales-create-property', salesCreate.status === 403, `got ${salesCreate.status}`);

  const salesUsers = await api('GET', '/admin/users', { token: sales });
  check('rbac.403-sales-users', salesUsers.status === 403, `got ${salesUsers.status}`);

  // "Stay signed in" (prompt 51): the run's own session, same token, later end.
  const refreshed = await api('POST', '/auth/refresh', { token: sales });
  check(
    'auth.refresh-keeps-the-token',
    refreshed.status === 200 &&
      refreshed.json?.data?.token === sales &&
      Number.isFinite(Date.parse(refreshed.json?.data?.expiresAt ?? '')),
    `got ${refreshed.status}`
  );

  // PATCH keeps what it did not mention (§5.8). The walk has already written
  // to this fixture, so the comparison is against what is stored now.
  const fixtureId = fixtures.adminProperties?.id;
  const stored = fixtureId
    ? (await api('GET', `/admin/properties/${fixtureId}`, { token: admin })).json?.data
    : null;

  // The slug of the fixture the block below switches off, for the admin preview.
  let inactiveSlug = null;

  if (stored) {
    const patched = await api('PATCH', `/admin/properties/${stored.id}`, {
      token: admin,
      body: { isFeatured: true },
    });
    check(
      'patch.keeps-untouched-fields',
      patched.json?.data?.title === stored.title && patched.json?.data?.isFeatured === true,
      `title "${patched.json?.data?.title}" vs "${stored.title}"`
    );

    // A `PUT` states the whole record, so it carries every required field; the
    // optional ones it leaves out — `isFeatured`, which the `PATCH` above just
    // set — come back at their model defaults.
    const replaced = await api('PUT', `/admin/properties/${stored.id}`, {
      token: admin,
      body: {
        ...sampleBody(schemas.getSchema('property.create'), nextSeed()),
        title: 'Smoke replaced listing title',
        propertyTypeId: 1,
        location: { localityId: 1, cityId: 1 },
      },
    });
    check(
      'put.fills-defaults',
      replaced.status === 200 && replaced.json?.data?.isFeatured === false,
      `status ${replaced.status}, isFeatured=${replaced.json?.data?.isFeatured}`
    );

    // An inactive listing is not public, and a 404 says nothing about why.
    await api('PATCH', `/admin/properties/${stored.id}`, {
      token: admin,
      body: { isActive: false },
    });
    const hidden = await api('GET', `/properties/slug/${replaced.json?.data?.slug}`);
    check('slug.404-for-inactive', hidden.status === 404, `got ${hidden.status}`);
    inactiveSlug = replaced.json?.data?.slug ?? null;
  }

  const threeBhk = await api('GET', '/properties?bedrooms=3&perPage=50');
  const impure = (threeBhk.json?.data ?? []).filter((row) => {
    const own = row.configuration?.bedrooms;
    const units = (row.unitConfigurations ?? []).map((unit) => unit.bedrooms);
    return own !== 3 && !units.includes(3);
  });
  check(
    'filter.bedrooms-purity',
    threeBhk.status === 200 && impure.length === 0,
    `${impure.length} stray rows`
  );

  const facets = threeBhk.json?.meta?.facets;
  check('facets.present', Boolean(facets?.propertyType && facets?.bedrooms), 'meta.facets');

  await checkPropertyCounts();

  // The lead form: honeypot, validation, legacy sources (§5.11, D20).
  const honeypot = await api('POST', '/leads', {
    body: {
      name: 'Robot',
      phone: '9876543210',
      source: 'contact-page',
      website: 'http://spam.example',
    },
  });
  check(
    'leads.honeypot',
    honeypot.status === 200 && honeypot.json?.data === null,
    `got ${honeypot.status}`
  );

  const badPhone = await api('POST', '/leads', {
    body: { name: 'Smoke Test', phone: '12345', source: 'contact-page' },
  });
  check(
    'leads.422-bad-phone',
    badPhone.status === 422 && Boolean(badPhone.json?.errors?.phone),
    `got ${badPhone.status}`
  );

  const legacy = await api('POST', '/leads', {
    body: { name: 'Smoke Legacy', phone: '9876543210', source: 'property_enquiry' },
  });
  check(
    'leads.legacy-source-mapped',
    legacy.status === 201 && legacy.json?.data?.source === 'property-enquiry',
    `source=${legacy.json?.data?.source}`
  );
  if (legacy.json?.data?.id) created.unshift({ path: `/admin/leads/${legacy.json.data.id}` });

  const slugCheck = await api(
    'GET',
    '/admin/properties/check-slug?slug=lakeview-heights-3-bhk-whitefield',
    {
      token: admin,
    }
  );
  check(
    'check-slug.reports-taken',
    slugCheck.json?.data?.available === false && Boolean(slugCheck.json?.data?.suggestion),
    JSON.stringify(slugCheck.json?.data)
  );

  // The admin preview of an unpublished listing (§5.10): the public route says
  // 404 and the admin route by the same slug answers with the record.
  const bySlug = await api('GET', '/admin/properties/slug/lakeview-heights-3-bhk-whitefield', {
    token: admin,
  });
  check(
    'admin-slug.reads-by-slug',
    bySlug.status === 200 && bySlug.json?.data?.slug === 'lakeview-heights-3-bhk-whitefield',
    `got ${bySlug.status}`
  );

  const bySlugAnonymous = await api(
    'GET',
    '/admin/properties/slug/lakeview-heights-3-bhk-whitefield'
  );
  check(
    'admin-slug.401-without-token',
    bySlugAnonymous.status === 401,
    `got ${bySlugAnonymous.status}`
  );

  if (inactiveSlug) {
    // The block above switched this fixture off, so it is the unpublished one.
    const preview = await api('GET', `/admin/properties/slug/${inactiveSlug}`, { token: admin });
    check(
      'admin-slug.previews-inactive',
      preview.status === 200 && preview.json?.data?.isActive === false,
      `got ${preview.status}`
    );
  }

  const duplicate = await api('POST', '/admin/properties/1/duplicate', { token: admin });
  check(
    'duplicate.creates-draft',
    duplicate.status === 201 && duplicate.json?.data?.isActive === false
  );
  if (duplicate.json?.data?.id)
    created.unshift({ path: `/admin/properties/${duplicate.json.data.id}` });

  // The value-carrying bulk actions (prompt 51), on the run's own copy only.
  const copy = duplicate.json?.data ?? null;
  if (copy?.id) {
    const target = copy.availability === 'sold' ? 'reserved' : 'sold';
    const marked = await api('POST', '/admin/properties/bulk', {
      token: admin,
      body: { ids: [copy.id], action: 'availability', payload: { availability: target } },
    });
    const refused = await api('POST', '/admin/properties/bulk', {
      token: admin,
      body: { ids: [copy.id], action: 'assignAgent', payload: { agentId: 999999 } },
    });
    check(
      'bulk.payload-actions',
      marked.status === 200 && marked.json?.data?.affected === 1 && refused.status === 422,
      `got ${marked.status} / ${refused.status}`
    );

    // A share link opens the run's inactive copy, and only with its token.
    const issued = await api('POST', `/admin/properties/${copy.id}/preview-token`, {
      token: admin,
    });
    const share = issued.json?.data?.token ?? '';
    const closed = await api('GET', `/properties/slug/${encodeURIComponent(copy.slug)}`);
    const opened = await api(
      'GET',
      `/properties/slug/${encodeURIComponent(copy.slug)}?previewToken=${encodeURIComponent(share)}`
    );
    check(
      'properties.share-preview',
      issued.status === 200 && closed.status === 404 && opened.status === 200,
      `got ${issued.status} / ${closed.status} / ${opened.status}`
    );
  }

  // A replace made from an older version is refused, and names who saved
  // (prompt 51) — on the run's own locality. A second passes between the two
  // saves: a store keeping `updated_at` to the second could not tell them apart.
  const place = await createFixture('adminLocalities');
  if (place?.id) {
    const path = `/admin/localities/${place.id}`;
    const opened = (await api('GET', path, { token: admin })).json?.data ?? place;
    await sleep(1100);
    const first = await api('PUT', path, {
      token: admin,
      body: { ...opened, shortDescription: 'Saved first.', updatedAt: opened.updatedAt },
    });
    const second = await api('PUT', path, {
      token: admin,
      body: {
        ...opened,
        shortDescription: 'Saved from the older copy.',
        updatedAt: opened.updatedAt,
      },
    });
    check(
      'stale-guard.409-names-the-saver',
      first.status === 200 &&
        second.status === 409 &&
        second.json?.data?.conflict === 'stale' &&
        typeof second.json?.data?.current?.updatedByName === 'string',
      `got ${first.status} / ${second.status}`
    );
  } else {
    check('stale-guard.409-names-the-saver', false, 'could not create the run’s own locality');
  }

  const bulk = await api('POST', '/admin/properties/bulk', {
    token: admin,
    body: { ids: [999999], action: 'activate' },
  });
  check('bulk.reports-affected', bulk.status === 200 && bulk.json?.data?.affected === 0);

  const csv = await api('GET', '/admin/leads/export', { token: admin });
  check('csv.bom', csv.text.startsWith('﻿'), 'leads export');

  const subscriberCsv = await api('GET', '/admin/newsletter-subscribers/export', { token: admin });
  check('csv.bom-newsletter', subscriberCsv.text.startsWith('﻿'), 'subscriber export');

  const index = await api('GET', '/sitemap.xml');
  check('sitemap.index-well-formed', /<sitemapindex/.test(index.text) && /<loc>/.test(index.text));

  // The index names its children where it was fetched (prompt 51), so every
  // one of them opens from here — on the API path as at the root.
  const childLocs = [...index.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const elsewhere = childLocs.filter((loc) => !loc.startsWith(`${options.baseUrl}/`));
  check(
    'sitemap.children-on-the-fetch-origin',
    childLocs.length > 0 && elsewhere.length === 0,
    elsewhere.length > 0 ? `${elsewhere[0]} is not under ${options.baseUrl}` : ''
  );
  const firstChild = childLocs[0] ? await fetch(childLocs[0]).catch(() => null) : null;
  check(
    'sitemap.child-opens',
    firstChild?.status === 200,
    `${childLocs[0] ?? 'no child'} answered ${firstChild?.status ?? 'nothing'}`
  );

  const properties = await api('GET', '/sitemap-properties.xml');
  check(
    'sitemap.properties-urlset',
    /<urlset/.test(properties.text) && /<url>/.test(properties.text)
  );

  const robots = await api('GET', '/robots.txt');
  check('robots.has-sitemap-line', /^Sitemap:\s*http/m.test(robots.text));
  check('robots.no-placeholder', !/%siteurl%/i.test(robots.text));

  const rss = await api('GET', '/rss.xml');
  check('rss.channel', /<rss[^>]*version="2\.0"/.test(rss.text) && /<item>/.test(rss.text));

  const llms = await api('GET', '/llms.txt');
  check('llms.heading', llms.text.trimStart().startsWith('#'));

  const resolved = await api('GET', '/redirects/resolve?path=/blog');
  check(
    'redirects.resolve',
    resolved.status === 200 && typeof resolved.json?.data?.toPath === 'string',
    `got ${resolved.status}`
  );

  // A rule the site follows counts a hit (prompt 51): the Hits column was 0
  // for every rule a visitor had been sent on by.
  const rule = (await api('GET', '/redirects')).json?.data?.[0];
  if (rule?.id) {
    const before = (await api('GET', `/admin/redirects/${rule.id}`, { token: admin })).json?.data;
    const hit = await api('POST', `/redirects/${rule.id}/hit`);
    const after = (await api('GET', `/admin/redirects/${rule.id}`, { token: admin })).json?.data;
    check(
      'redirects.hit-counts',
      hit.status === 204 && Number(after?.hits) === Number(before?.hits ?? 0) + 1,
      `got ${hit.status}, ${before?.hits} → ${after?.hits}`
    );
  } else {
    check('redirects.hit-counts', false, 'no active redirect to follow');
  }

  // The 404 log (prompt 51): an address counted once a visit, the panel
  // ignored, and a dismissal taking it off the list.
  const unknownPath = `/smoke-404-${RUN_ID}`;
  await api('POST', '/not-found', {
    body: { path: unknownPath, referrer: 'https://example.com/' },
  });
  await api('POST', '/not-found', { body: { path: `${unknownPath}/` } });
  await api('POST', '/not-found', { body: { path: '/admin/nowhere' } });
  const logged = await api('GET', `/admin/seo/not-found?q=${encodeURIComponent(unknownPath)}`, {
    token: admin,
  });
  const line = (logged.json?.data ?? []).find((entry) => entry.path === unknownPath);
  const ignored = await api('GET', '/admin/seo/not-found?q=nowhere', { token: admin });
  const dismissed = line
    ? await api('DELETE', `/admin/seo/not-found/${line.id}`, { token: admin })
    : { status: 0 };
  check(
    'not-found.logged-counted-dismissed',
    line?.count === 2 &&
      line?.referrer === 'https://example.com/' &&
      (ignored.json?.data ?? []).length === 0 &&
      dismissed.status === 200,
    `count ${line?.count}, dismissed ${dismissed.status}`
  );

  const dashboard = await api('GET', '/admin/dashboard', { token: admin });
  const expectedKeys = [
    'stats',
    'trends',
    'recentLeads',
    'topProperties',
    'seoHealth',
    'upcomingFollowUps',
    'overdueCount',
  ];
  const missing = expectedKeys.filter((key) => !(key in (dashboard.json?.data ?? {})));
  check('dashboard.shape', missing.length === 0, `missing ${missing.join(', ')}`);
  check(
    'dashboard.trends-30-days',
    (dashboard.json?.data?.trends?.leadsByDay ?? []).length === 30,
    `${(dashboard.json?.data?.trends?.leadsByDay ?? []).length} days`
  );

  // Overdue follow-ups lead the card, and `range` sizes the series (prompt 51).
  const followUps = dashboard.json?.data?.upcomingFollowUps ?? [];
  const firstUpcoming = followUps.findIndex((row) => !row.isOverdue);
  check(
    'dashboard.overdue-first',
    firstUpcoming === -1 || followUps.slice(firstUpcoming).every((row) => !row.isOverdue),
    `${dashboard.json?.data?.overdueCount ?? '?'} overdue`
  );
  const week = await api('GET', '/admin/dashboard?range=7', { token: admin });
  check(
    'dashboard.range-7',
    (week.json?.data?.trends?.leadsByDay ?? []).length === 7,
    `${(week.json?.data?.trends?.leadsByDay ?? []).length} days`
  );

  // The worklist's counts ride on the lead list (prompt 51).
  const worklist = await api('GET', '/admin/leads?perPage=1', { token: admin });
  const buckets = Object.keys(worklist.json?.meta?.followUp ?? {}).sort();
  check(
    'leads.worklist-counts',
    buckets.join(',') === 'next7,none,overdue,today',
    `meta.followUp: ${buckets.join(', ') || 'missing'}`
  );

  const duplicateSubscriber = await api('POST', '/newsletter/subscribe', {
    body: { email: 'subscriber.one@example.com' },
  });
  check(
    'newsletter.dedupe',
    duplicateSubscriber.status === 200 && duplicateSubscriber.json?.data === null,
    `got ${duplicateSubscriber.status}`
  );

  const overview = await api('GET', '/admin/seo/overview?perPage=all', { token: admin });
  const row = (overview.json?.data ?? [])[0];
  check(
    'seo.overview-rows',
    Boolean(row && 'type' in row && 'url' in row && 'seo' in row),
    JSON.stringify(Object.keys(row ?? {}))
  );

  // A draft is invisible until its preview link says otherwise (D28). The
  // walk replaced this article, so its slug is read back rather than assumed.
  const articleId = fixtures.adminArticles?.id;
  const draft = articleId
    ? (await api('GET', `/admin/articles/${articleId}`, { token: admin })).json?.data
    : null;

  if (draft) {
    const blocked = await api('GET', `/articles/slug/${draft.slug}`);
    const tokenResponse = await api('GET', `/admin/articles/${draft.id}/preview-token`, {
      token: admin,
    });
    const preview = await api(
      'GET',
      `/articles/slug/${draft.slug}?preview=${tokenResponse.json?.data?.token}`
    );
    check(
      'preview.token-opens-draft',
      blocked.status === 404 && preview.status === 200,
      `draft ${blocked.status}, preview ${preview.status}`
    );
  }

  // The pair either side of one article, in publication order within its
  // category (prompt 34). The seed's second Legal & RERA piece has one on each
  // side; the answer is two summary rows, never the bodies.
  const legal = await api('GET', '/articles?categorySlug=legal-rera&sort=newest&perPage=all');
  const legalRows = Array.isArray(legal.json?.data) ? legal.json.data : [];
  const middle = legalRows[Math.floor(legalRows.length / 2)];

  if (middle) {
    const pair = await api(
      `GET`,
      `/articles/${middle.id}/adjacent?categoryId=${legalRows[0]?.categoryId ?? ''}`
    );
    const { prev, next } = pair.json?.data ?? {};
    check(
      'articles.adjacent-pair',
      pair.status === 200 &&
        'prev' in (pair.json?.data ?? {}) &&
        'next' in (pair.json?.data ?? {}) &&
        [prev, next].every((row) => row === null || (row.id !== undefined && !('content' in row))),
      `status ${pair.status}, prev ${prev?.id ?? 'null'}, next ${next?.id ?? 'null'}`
    );
  }

  const localityInUse = await api('DELETE', '/admin/localities/1', { token: admin });
  check(
    'delete-guard.409-with-usedBy',
    localityInUse.status === 409 && Array.isArray(localityInUse.json?.data?.usedBy),
    `got ${localityInUse.status}`
  );

  // Media's own guard: a file something still shows cannot be removed from the
  // library without saying so, and `?force=true` is the editor's answer to the
  // list it is shown (prompt 39 §5).
  await checkMediaForceDelete(admin);
  await checkMediaFolders(admin);

  const authors = await api('GET', '/authors');
  check(
    'authors.no-email',
    (authors.json?.data ?? []).every((author) => !('email' in author)),
    'public authors'
  );

  // Settings merge known keys only (§4.7).
  const before = await api('GET', '/admin/settings', { token: admin });
  const merged = await api('PUT', '/admin/settings', {
    token: admin,
    body: { general: { siteName: before.json?.data?.general?.siteName }, unknownKey: 1 },
  });
  check(
    'settings.deep-merge',
    merged.json?.data?.general?.tagline === before.json?.data?.general?.tagline &&
      !('unknownKey' in (merged.json?.data ?? {})),
    'general.tagline survived, unknownKey dropped'
  );

  const managerSettings = await api('PUT', '/admin/settings', {
    token: tokens.manager,
    body: { general: { siteName: 'Nope' } },
  });
  check('settings.manager-403', managerSettings.status === 403, `got ${managerSettings.status}`);
}

/* ------------------------------------------------------------------ *
 * Setup and teardown
 * ------------------------------------------------------------------ */

/** Signs in, or fails the run loudly — nothing else can work without this. */
/**
 * `GET /properties/counts` (prompt 51): the envelope, a dimension's keys, a
 * filter narrowing the counts, an unknown dimension ignored — and the two
 * requests the home page makes agreeing with the `perPage=1` totals the tiles
 * used to ask for one by one.
 */
async function checkPropertyCounts() {
  const listed = async (query) =>
    (await api('GET', `/properties?perPage=1${query ? `&${query}` : ''}`)).json?.meta?.total;
  const sum = (tally) =>
    isObject(tally) ? Object.values(tally).reduce((total, count) => total + count, 0) : NaN;

  const bySegment = await api('GET', '/properties/counts?by=segment');
  const segments = bySegment.json?.data?.segment;
  check(
    'counts.envelope',
    bySegment.status === 200 &&
      isObject(segments) &&
      bySegment.json?.meta === null &&
      Object.keys(bySegment.json.data).join() === 'segment',
    `got ${bySegment.status}`
  );

  const all = await listed('');
  check(
    'counts.segment-keys',
    isObject(segments) &&
      Object.keys(segments).length > 0 &&
      Object.values(segments).every((count) => Number.isInteger(count) && count > 0) &&
      sum(segments) === all,
    `${sum(segments)} counted, ${all} listed`
  );

  const rentals = (await api('GET', '/properties/counts?by=propertyTypeId&listingType=rent')).json
    ?.data?.propertyTypeId;
  const rentTotal = await listed('listingType=rent');
  check(
    'counts.filter-narrows',
    sum(rentals) === rentTotal && rentTotal < all,
    `${sum(rentals)} counted, ${rentTotal} rentals listed`
  );

  const unknown = await api('GET', '/properties/counts?by=bogus,segment');
  check(
    'counts.unknown-dimension-ignored',
    unknown.status === 200 &&
      Object.keys(unknown.json?.data ?? {}).join() === 'segment' &&
      JSON.stringify(unknown.json.data.segment) === JSON.stringify(segments),
    `got ${unknown.status}`
  );

  // The home page's two questions, spot-checked tile by tile.
  const totals = (await api('GET', '/properties/counts?by=segment,listingType,propertyTypeId')).json
    ?.data;
  const saleStatus = (await api('GET', '/properties/counts?by=constructionStatus&listingType=sale'))
    .json?.data;
  const typeId = Object.keys(totals?.propertyTypeId ?? {})[0];
  const spots = [
    [totals?.segment?.land ?? 0, await listed('segment=land')],
    [totals?.segment?.commercial ?? 0, await listed('segment=commercial')],
    [totals?.listingType?.rent ?? 0, rentTotal],
    [totals?.propertyTypeId?.[typeId] ?? 0, await listed(`propertyTypeId=${typeId}`)],
    [
      saleStatus?.constructionStatus?.['ready-to-move'] ?? 0,
      await listed('listingType=sale&constructionStatus=ready-to-move'),
    ],
    [
      saleStatus?.constructionStatus?.['pre-launch'] ?? 0,
      await listed('listingType=sale&constructionStatus=pre-launch'),
    ],
  ];
  const off = spots.filter(([counted, total]) => counted !== total);
  check(
    'counts.match-the-list',
    Boolean(totals && saleStatus && typeId) && off.length === 0,
    off.map(([counted, total]) => `${counted} ≠ ${total}`).join(', ')
  );
}

async function login(email, password, label) {
  const response = await api('POST', '/auth/login', { body: { email, password } });
  if (response.status !== 200 || !response.json?.data?.token) {
    throw new Error(
      `Cannot sign in as ${label} (${email}): ${response.status} ${response.text.slice(0, 200)}`
    );
  }
  return response.json.data.token;
}

/** Health, logins and one fixture per writable resource. */
async function setup() {
  const health = await api('GET', '/health');
  record({
    key: 'health',
    method: 'GET',
    path: '/health',
    expected: 200,
    actual: health.status,
    ok: health.status === 200 && health.json?.data?.status === 'ok',
    note: health.text.slice(0, 200),
  });
  if (health.status !== 200)
    throw new Error(`No server at ${options.baseUrl} — start it with \`npm run mock\`.`);

  tokens.admin = await login(options.email, options.password, 'admin');
  tokens.manager = await login(options.managerEmail, options.managerPassword, 'manager');
  tokens.sales = await login(options.salesEmail, options.salesPassword, 'sales');

  for (const group of Object.keys(WRITABLE)) {
    fixtures[group] = await createFixture(group);
  }

  // The `/auth/*` endpoints run against an account of the run's own, so a
  // profile edit or a password change never touches the seed's three users.
  const smokeUser = await api('POST', '/admin/users', { token: tokens.admin, body: SMOKE_USER });
  if (smokeUser.status === 201) {
    created.unshift({ path: `/admin/users/${smokeUser.json.data.id}` });
    tokens.smoke = await login(SMOKE_USER.email, SMOKE_USER.password, 'the smoke account');
  }

  const lead = await api('POST', '/leads', {
    body: { name: 'Smoke Fixture Lead', phone: '9876543210', source: 'contact-page' },
  });
  if (lead.status === 201) {
    fixtures.adminLeads = lead.json.data;
    created.unshift({ path: `/admin/leads/${lead.json.data.id}` });
  }

  const subscriber = await api('POST', '/newsletter/subscribe', {
    body: { email: `smoke.subscriber.${Date.now()}@example.com` },
  });
  if (subscriber.status === 201) {
    fixtures.adminNewsletterSubscribers = subscriber.json.data;
    created.unshift({ path: `/admin/newsletter-subscribers/${subscriber.json.data.id}` });
  }
}

/**
 * Media's delete guard, both ways round.
 *
 * The library's record of a picture a seeded listing already shows is looked
 * up — an address is unique in the library (QA-63), so a second record of it
 * cannot be made — and the plain `DELETE` must refuse it with the list, which
 * removes nothing. `?force=true` is then proved on a record the run makes
 * itself, so the seed keeps every file it shipped with. The Cloudinary asset
 * is never touched either way — this API has never held it (D12).
 *
 * @param {string} admin the admin token
 */
async function checkMediaForceDelete(admin) {
  const listing = await api('GET', '/properties?perPage=1');
  const url = listing.json?.data?.[0]?.images?.[0]?.url;
  if (!url) {
    check('media.delete-guard-409', false, 'no seeded listing image to point at');
    return;
  }

  const library = await api('GET', `/admin/media?perPage=all&q=${encodeURIComponent(url)}`, {
    token: admin,
  });
  const used = (library.json?.data ?? []).find((row) => row.url === url);
  if (!used) {
    check('media.delete-guard-409', false, 'the library holds no record of that picture');
  } else {
    const refused = await api('DELETE', `/admin/media/${used.id}`, { token: admin });
    check(
      'media.delete-guard-409',
      refused.status === 409 && Array.isArray(refused.json?.data?.usedIn),
      `got ${refused.status}`
    );
  }

  const record = await api('POST', '/admin/media', {
    token: admin,
    body: {
      url: `https://images.example.com/smoke-force-${Date.now()}.jpg`,
      alt: 'Smoke — a record made to be removed',
    },
  });
  if (record.status !== 201) {
    check('media.force-delete', false, `could not create the record (${record.status})`);
    return;
  }

  const id = record.json.data.id;
  const forced = await api('DELETE', `/admin/media/${id}?force=true`, { token: admin });
  check('media.force-delete', forced.status === 200, `got ${forced.status}`);

  // Whatever happened above, the run leaves nothing behind.
  if (forced.status !== 200) created.unshift({ path: `/admin/media/${id}?force=true` });
}

/**
 * Media folders (prompt 51): the list counts each folder, a bulk `move` names
 * the ids it did not find, a rename onto a folder in use waits for `merge`, and
 * `usage=unused` lists a file nothing shows. Everything runs on records the
 * run files itself, in folders named after the run.
 *
 * @param {string} admin the admin token
 */
async function checkMediaFolders(admin) {
  const seed = nextSeed();
  const folder = (name) => `smoke-${name}-${seed}`;
  const file = async (name, target) => {
    const response = await api('POST', '/admin/media', {
      token: admin,
      body: {
        url: `https://images.example.com/smoke-${name}-${seed}.jpg`,
        alt: `Smoke — ${name}`,
        folder: target,
      },
    });
    const id = response.json?.data?.id ?? null;
    if (id) created.unshift({ path: `/admin/media/${id}?force=true` });
    return id;
  };

  const first = await file('a', folder('a'));
  const second = await file('b', folder('b'));
  if (!first || !second) {
    check('media.folder-counts', false, 'could not file the records the checks need');
    return;
  }

  const listed = await api('GET', `/admin/media?perPage=1&q=${encodeURIComponent(folder('a'))}`, {
    token: admin,
  });
  const entry = (listed.json?.meta?.folders ?? []).find((one) => one?.name === folder('a'));
  check(
    'media.folder-counts',
    listed.status === 200 && entry?.count === 1 && typeof listed.json?.meta?.unfiled === 'number',
    `folders ${JSON.stringify(listed.json?.meta?.folders ?? null).slice(0, 120)}`
  );

  const moved = await api('POST', '/admin/media/bulk', {
    token: admin,
    body: { ids: [first, 999999], action: 'move', payload: { folder: folder('c') } },
  });
  check(
    'media.bulk-move-reports-missing',
    moved.status === 200 &&
      moved.json?.data?.affected === 1 &&
      Array.isArray(moved.json?.data?.missing) &&
      moved.json.data.missing.includes(999999),
    `got ${moved.status} ${JSON.stringify(moved.json?.data ?? null)}`
  );

  const collision = await api('POST', '/admin/media/folders/rename', {
    token: admin,
    body: { from: folder('b'), to: folder('c') },
  });
  check(
    'media.rename-collision-422',
    collision.status === 422 && collision.json?.data?.existing?.name === folder('c'),
    `got ${collision.status}`
  );

  const merged = await api('POST', '/admin/media/folders/rename', {
    token: admin,
    body: { from: folder('b'), to: folder('c'), merge: true },
  });
  check(
    'media.rename-merge',
    merged.status === 200 && merged.json?.data?.merged === true && merged.json?.data?.moved === 1,
    `got ${merged.status}`
  );

  const unused = await api(
    'GET',
    `/admin/media?perPage=all&usage=unused&q=${encodeURIComponent(folder('c'))}`,
    { token: admin }
  );
  const ids = (unused.json?.data ?? []).map((row) => row.id);
  check(
    'media.usage-unused',
    unused.status === 200 && ids.includes(first) && ids.includes(second),
    `got ${unused.status}, ${ids.length} rows`
  );
}

/** Removes everything the run created, newest first. */
async function cleanup() {
  let removed = 0;
  let stuck = 0;

  for (const entry of created) {
    const response = await api('DELETE', entry.path, { token: tokens.admin });
    if (response.status === 200 || response.status === 404) removed += 1;
    else stuck += 1;
  }

  check('cleanup.removed-what-it-created', stuck === 0, `${removed} removed, ${stuck} left behind`);
}

/* ------------------------------------------------------------------ *
 * Comparison mode (`--compare=<url>`)
 * ------------------------------------------------------------------ */

/**
 * Query strings the reads that need one cannot be sent without.
 *
 * Everything else is called bare: the registry's `example` fills the path
 * parameters and the defaults of §5.6 do the rest.
 */
const COMPARE_QUERY = {
  'properties.counts': '?by=segment,listingType',
  'properties.suggestions': '?q=whitefield',
  'redirects.resolve': '?path=/blog',
  'adminSeo.overview': '?type=property&perPage=5',
  'adminLeads.exportCsv': '?status=new',
};

/** The comparable summary of one response. */
function shapeOf(response) {
  const { json, status, headers } = response;
  const contentType = (headers.get('content-type') ?? '').split(';')[0].trim();

  if (!isObject(json)) return { status, contentType, envelope: null, meta: null, data: null };

  const first = Array.isArray(json.data) ? json.data[0] : json.data;

  return {
    status,
    contentType,
    envelope: Object.keys(json).sort().join(','),
    meta: isObject(json.meta)
      ? Object.keys(json.meta)
          .sort()
          .map((key) => `${key}:${Array.isArray(json.meta[key]) ? 'array' : typeof json.meta[key]}`)
          .join(',')
      : null,
    data: isObject(first)
      ? Object.keys(first).sort().join(',')
      : Array.isArray(json.data)
        ? 'empty list'
        : json.data === null
          ? 'null'
          : json.data === undefined
            ? 'absent'
            : typeof json.data,
  };
}

/** What `a` has that `b` does not, as a readable list. */
const onlyIn = (a, b) => {
  const right = new Set(String(b ?? '').split(','));
  return String(a ?? '')
    .split(',')
    .filter((key) => key !== '' && !right.has(key));
};

/**
 * Sends every read to both servers and prints what differs.
 *
 * Only reads: the two servers hold different rows, and firing the same write at
 * both would leave two different databases behind. Writes are covered by
 * running the whole walk against each server in turn.
 *
 * Values are never compared, only shapes — the two databases legitimately
 * disagree about every `updatedAt`, and a diff full of those hides the one
 * difference that matters.
 */
async function compareRun() {
  const [left, right] = [options.baseUrl, options.compare];
  console.log(`Comparing\n  A: ${left}\n  B: ${right}\n`);

  const sessions = {};
  for (const [role, email, password] of [
    ['admin', options.email, options.password],
    ['manager', options.managerEmail, options.managerPassword],
    ['sales', options.salesEmail, options.salesPassword],
  ]) {
    const a = await api('POST', '/auth/login', { body: { email, password }, baseUrl: left });
    const b = await api('POST', '/auth/login', { body: { email, password }, baseUrl: right });
    if (a.status !== 200 || b.status !== 200) {
      throw new Error(
        `Cannot sign in as ${role}: A answered ${a.status}, B answered ${b.status}. ` +
          'Both servers need the same accounts before they can be compared.'
      );
    }
    sessions[role] = { a: a.json?.data?.token, b: b.json?.data?.token };
  }

  const differences = [];
  const reads = allEndpoints().filter((endpoint) => endpoint.method === 'GET');
  let identical = 0;

  for (const endpoint of reads) {
    const role = TOKEN_FOR[endpoint.auth];
    const path = `${resolvePath(endpoint)}${COMPARE_QUERY[endpoint.key] ?? ''}`;
    const session = role ? sessions[role] : { a: undefined, b: undefined };

    // eslint-disable-next-line no-await-in-loop -- the walk is a sequence on purpose
    const [a, b] = await Promise.all([
      api('GET', path, { token: session.a, baseUrl: left }),
      api('GET', path, { token: session.b, baseUrl: right }),
    ]);

    const [shapeA, shapeB] = [shapeOf(a), shapeOf(b)];
    const found = [];

    if (shapeA.status !== shapeB.status) found.push(`status ${shapeA.status} vs ${shapeB.status}`);
    if (shapeA.contentType !== shapeB.contentType) {
      found.push(`content-type ${shapeA.contentType || '—'} vs ${shapeB.contentType || '—'}`);
    }
    if (shapeA.envelope !== shapeB.envelope) {
      if (!shapeB.envelope) found.push('no JSON envelope at all — §5.2 wants { data, … }');
      else if (!shapeA.envelope) found.push('an envelope where A sends none');
      else {
        const missing = onlyIn(shapeA.envelope, shapeB.envelope);
        const extra = onlyIn(shapeB.envelope, shapeA.envelope);
        found.push(
          `envelope${missing.length ? ` missing ${missing.join(', ')}` : ''}${extra.length ? ` extra ${extra.join(', ')}` : ''}`
        );
      }
    }

    // A response with no envelope at all has no `meta` and no `data` to compare
    // either; saying so once is more use than sixty key names underneath it.
    const noEnvelope =
      shapeA.envelope !== shapeB.envelope && (!shapeA.envelope || !shapeB.envelope);

    if (!noEnvelope && shapeA.meta !== shapeB.meta) {
      found.push(`meta ${shapeA.meta ?? 'none'} vs ${shapeB.meta ?? 'none'}`);
    }
    if (!noEnvelope && shapeA.data !== shapeB.data) {
      const missing = onlyIn(shapeA.data, shapeB.data);
      const extra = onlyIn(shapeB.data, shapeA.data);
      found.push(
        missing.length || extra.length
          ? `data${missing.length ? ` missing ${missing.join(', ')}` : ''}${extra.length ? ` extra ${extra.join(', ')}` : ''}`
          : `data ${shapeA.data} vs ${shapeB.data}`
      );
    }

    if (found.length === 0) identical += 1;
    else differences.push({ key: endpoint.key, path, difference: found.join('; ') });

    if (options.verbose) {
      console.log(`${found.length === 0 ? 'same' : 'DIFF'} GET ${path}`);
    }
  }

  if (differences.length === 0) {
    console.log(`${identical}/${reads.length} reads answer the same shape. No differences.`);
    return;
  }

  const widths = [
    Math.max(3, ...differences.map((row) => row.key.length)),
    Math.max(4, ...differences.map((row) => row.path.length)),
  ];
  console.log(
    `${'key'.padEnd(widths[0])} | ${'path'.padEnd(widths[1])} | difference\n` +
      `${'-'.repeat(widths[0])}-+-${'-'.repeat(widths[1])}-+-${'-'.repeat(11)}`
  );
  for (const row of differences) {
    console.log(`${row.key.padEnd(widths[0])} | ${row.path.padEnd(widths[1])} | ${row.difference}`);
  }

  console.log(
    `\n${identical}/${reads.length} reads answer the same shape; ` +
      `${differences.length} differ.\n` +
      'Fix them in this order: status first (something is missing), then the ' +
      'envelope (something is shaped wrong), then the `data` keys (something is ' +
      'named wrong).'
  );
  process.exitCode = 1;
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

async function main() {
  if (options.compare) {
    await compareRun();
    return;
  }

  console.log(`Smoke testing ${options.baseUrl}\n`);

  await setup();

  for (const endpoint of allEndpoints()) {
    // eslint-disable-next-line no-await-in-loop -- the run is a sequence on purpose
    await runEndpoint(endpoint);
  }

  await targetedChecks();
  await cleanup();

  printTable();

  const passed = rows.filter((row) => row.ok).length;
  console.log(`\n${passed}/${rows.length} checks passed, ${rows.length - passed} failed.`);

  if (failures.length > 0) {
    console.log('\nFailures:');
    for (const failure of failures) {
      console.log(`  ${failure.key}: ${failure.method} ${failure.path}`);
      console.log(`    expected ${failure.expected}, got ${failure.actual}`);
      if (failure.note)
        console.log(`    ${String(failure.note).replace(/\n/g, ' ').slice(0, 300)}`);
    }
  }

  process.exitCode = failures.length > 0 ? 1 : 0;
}

main().catch((error) => {
  console.error(`\n${error.message}`);
  process.exitCode = 1;
});
