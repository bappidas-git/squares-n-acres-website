/**
 * Live examples for the handover package (prompt 47 §4.1).
 *
 * Every entry of `src/services/endpoints.js` is called against a running mock:
 * signed in as each role, with the entry's `example` filling the path
 * parameters, and — for the writes — against copies the run creates and deletes
 * again. What comes back is trimmed and written to
 * `backend_developer_guidelines/.tmp/examples.json`, which the documents read.
 *
 * **Everything here has to be the same on every run**, because regenerating the
 * package twice must produce no diff:
 *
 *   * bodies come from `fixtures.js` with a fixed seed and a fixed `now`;
 *   * the endpoints are walked in registry order;
 *   * arrays are cut to two items and strings to 300 characters, always;
 *   * the values a server invents per call — timestamps, tokens, the counters
 *     a read itself moves — are replaced by the fixed samples of `STABLE`.
 *
 * The last one is the reason a captured `createdAt` reads `2026-01-15`: the
 * shape and the format are the contract, the instant is not.
 */

const { allEndpoints } = require('../../../src/services/endpoints');
const schemas = require('../../../src/services/schemas');
const { MODELS } = require('../../../mock-server/schemas/models');
const {
  TOKEN_FOR,
  WRITABLE,
  collectionOfGroup,
  groupOf,
  isCreate,
  sampleBody,
} = require('./fixtures');

/** The instant every sampled date and datetime is taken from. */
const NOW = '2026-01-15T09:30:00.000Z';

/** What a volatile value is replaced by, so two runs produce one file. */
const STABLE = {
  datetime: NOW,
  date: NOW.slice(0, 10),
  token: '3f9a1c7e5b2d8a6f4c0e9b3d7a5f1c8e2b6d4a0f9c3e7b5d',
  count: 0,
};

/**
 * Response keys whose number the capture run itself moves.
 *
 * `viewsThisMonth` is here because capturing `POST /properties/:id/view` adds a
 * row the API has no endpoint to remove, so the dashboard's figure would climb
 * by one on every run of the generator.
 */
const VOLATILE_COUNTERS = new Set(['viewCount', 'enquiryCount', 'hits', 'viewsThisMonth']);

/** Response keys that hold a credential rather than data. */
const VOLATILE_TOKENS = new Set(['token', 'previewToken']);

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A preview token inside a URL — `?preview=…` is minted fresh on every call. */
const PREVIEW_TOKEN = /([?&]preview=)[A-Za-z0-9_-]{16,}/g;

/**
 * CSV columns whose number this run itself moves, matched case-insensitively:
 * an export names its columns for a person (`Hits`), not for a schema.
 */
const VOLATILE_COLUMNS = new Set(['hits', 'views', 'viewcount', 'enquiries', 'enquirycount']);

/** How many items of an array survive into an example. */
const MAX_ITEMS = 2;
/** How many characters of a string value survive into an example. */
const MAX_STRING = 300;
/** How many characters of a CSV, XML or text body survive into an example. */
const MAX_TEXT = 600;

/** Trims and stabilises one JSON value. */
function trim(value, key) {
  if (Array.isArray(value)) {
    const kept = value.slice(0, MAX_ITEMS).map((item) => trim(item, key));
    return value.length > MAX_ITEMS
      ? [...kept, `…${value.length - MAX_ITEMS} more (trimmed for this example)`]
      : kept;
  }

  if (value && typeof value === 'object') {
    const out = {};
    for (const [name, child] of Object.entries(value)) out[name] = trim(child, name);
    return out;
  }

  if (typeof value === 'number' && VOLATILE_COUNTERS.has(key)) return STABLE.count;

  if (typeof value === 'string') {
    if (VOLATILE_TOKENS.has(key)) return STABLE.token;
    if (ISO_DATETIME.test(value)) return STABLE.datetime;
    if (ISO_DATE.test(value)) return STABLE.date;
    const stable = value.replace(PREVIEW_TOKEN, `$1${STABLE.token.slice(0, 32)}`);
    if (stable.length > MAX_STRING) return `${stable.slice(0, MAX_STRING)}…`;
    return stable;
  }

  return value;
}

/** The RFC-822 instant an RSS feed stamps itself with. */
const RFC_822 = /[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} (GMT|[+-]\d{4})/g;

/** What an RFC-822 date is replaced by — the same instant as {@link NOW}. */
const STABLE_RFC_822 = 'Thu, 15 Jan 2026 09:30:00 GMT';

/**
 * Replaces the run's instants inside a text body.
 *
 * A CSV names itself after today, and an RSS feed stamps a `lastBuildDate`, so
 * both change between two runs of an otherwise identical generator.
 */
/**
 * Rewrites the columns of a CSV body whose numbers this run moves.
 *
 * The redirects export carries `hits`, and capturing
 * `GET /redirects/resolve` is what moves it — so without this, two runs of the
 * generator disagree by one and the package is not reproducible.
 */
function stabiliseCsv(text) {
  const bom = text.startsWith('\ufeff') ? '\ufeff' : '';
  const lines = text.slice(bom.length).split(/\r?\n/);
  if (lines.length === 0) return text;

  const header = lines[0].split(',').map((name) => name.replace(/^"|"$/g, '').trim().toLowerCase());
  const volatile = header
    .map((name, index) => (VOLATILE_COLUMNS.has(name) ? index : -1))
    .filter((index) => index >= 0);
  if (volatile.length === 0) return text;

  const rewritten = lines.map((line, row) => {
    if (row === 0 || line === '') return line;
    // Splitting on commas outside quotes is enough: the escape of §5.8 doubles
    // a quote inside a quoted cell and never leaves an unbalanced one.
    const cells = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g) ?? [];
    for (const index of volatile) {
      if (cells[index] === undefined) continue;
      cells[index] = `0${cells[index].endsWith(',') ? ',' : ''}`;
    }
    return cells.join('');
  });

  return `${bom}${rewritten.join('\r\n')}`;
}

const trimText = (text) => {
  const stable = stabiliseCsv(text)
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})/g, STABLE.datetime)
    .replace(RFC_822, STABLE_RFC_822)
    .replace(/filename="([a-z-]+)-\d{4}-\d{2}-\d{2}\.csv"/g, `filename="$1-${STABLE.date}.csv"`)
    .replace(PREVIEW_TOKEN, `$1${STABLE.token.slice(0, 32)}`);

  if (stable.length <= MAX_TEXT) return stable;
  // Cut at a line break so the sample never ends mid-element, and say so.
  const cut = stable.slice(0, MAX_TEXT);
  const lastBreak = cut.lastIndexOf('\n');
  return `${lastBreak > 0 ? cut.slice(0, lastBreak) : cut}\n\n[… trimmed for this example]`;
};

/* ------------------------------------------------------------------ *
 * HTTP
 * ------------------------------------------------------------------ */

/** The endpoints whose body is not JSON. */
const TEXT_SHAPES = new Set(['Csv', 'Xml', 'Text']);

/** Fields a `PATCH` example may set without moving anything else. */
const SAFE_PATCH_FIELDS = ['isActive', 'isFeatured', 'showOnHome', 'showOnAbout'];

/**
 * The `PATCH` body the capture sends for one group.
 *
 * A `PATCH { order }` is a position, and the API answers it by renumbering the
 * whole collection `1..n` (§5.8) — a change that outlives the throwaway record
 * it was made on, so two runs of the generator would disagree about every
 * `order` in the seed. The reorder is documented in `05_BUSINESS_RULES.md` and
 * in the side effects of §5.8 instead; what the example shows is the other
 * thing a `PATCH` is for, a partial update of one field.
 *
 * @param {string} group a registry group
 * @param {object} spec its `WRITABLE` entry
 * @returns {object} a body that changes one field and nothing around it
 */
function capturePatch(group, spec) {
  const kept = Object.entries(spec.patch ?? {}).filter(([field]) => field !== 'order');
  if (kept.length > 0) return Object.fromEntries(kept);

  const model = MODELS[collectionOfGroup(group)];
  const safe = SAFE_PATCH_FIELDS.find((field) => model?.fields?.[field]);
  if (safe) return { [safe]: true };

  const status = model?.fields?.status?.enum;
  if (status) return { status: status.includes('published') ? 'published' : status[0] };

  return { ...spec.patch };
}

/** What a response shape is asked for with. */
const ACCEPT = { Xml: 'text/xml', Text: 'text/plain', Csv: 'text/csv' };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** The longest the capture will wait out a rate-limit window, in seconds. */
const MAX_RETRY_WAIT = 65;

/**
 * One request against the mock.
 *
 * A 429 is waited out once. Signing in is limited to a handful of attempts a
 * minute (§5.11) and the capture spends three of them, so two generator runs
 * inside a minute legitimately hit the limit — that is the API working, and the
 * honest response is to wait rather than to give up half way through a package.
 */
async function request(baseUrl, method, path, { token, body, accept, retry = true } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Accept: accept ?? 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  if (response.status === 429 && retry) {
    const wait = Math.min(Number(response.headers.get('retry-after')) || 60, MAX_RETRY_WAIT);
    await sleep((wait + 1) * 1000);
    return request(baseUrl, method, path, { token, body, accept, retry: false });
  }

  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  return {
    status: response.status,
    contentType: (response.headers.get('content-type') ?? '').split(';')[0].trim(),
    disposition: response.headers.get('content-disposition'),
    text,
    json,
  };
}

/* ------------------------------------------------------------------ *
 * The walk
 * ------------------------------------------------------------------ */

/**
 * Runs the capture.
 *
 * @param {object} options
 * @param {string} options.baseUrl the API base, e.g. `http://localhost:4000/api`
 * @param {object} options.accounts `{ admin, manager, sales }` credentials
 * @param {(message: string) => void} [options.log]
 * @returns {Promise<{examples: object, failures: Array<object>}>}
 */
async function captureExamples({ baseUrl, accounts, log = () => {} }) {
  const api = (method, path, init) => request(baseUrl, method, path, init);

  const health = await api('GET', '/health').catch(() => null);
  if (!health || health.status !== 200) {
    throw new Error(
      `No API answered at ${baseUrl}.\n` +
        '  Start the mock in another terminal:  npm run mock\n' +
        '  Then run the generator again:        npm run generate:backend-guidelines\n' +
        '  Or regenerate without examples:      npm run generate:backend-guidelines -- --skip-capture'
    );
  }

  /**
   * A seed that is unique inside the run and identical between runs: the walk
   * is a fixed sequence, so a counter per group is as deterministic as a
   * constant and still gives every created record its own slug and e-mail.
   */
  const seeds = {};
  const nextSeed = (group) => {
    seeds[group] = (seeds[group] ?? 0) + 1;
    return `example-${group.toLowerCase()}-${seeds[group]}`;
  };

  const tokens = {};
  for (const [role, account] of Object.entries(accounts)) {
    const session = await api('POST', '/auth/login', { body: account });
    if (session.status !== 200 || !session.json?.data?.token) {
      throw new Error(`Cannot sign in as ${role} (${account.email}): ${session.status}`);
    }
    tokens[role] = session.json.data.token;
  }
  log(`signed in as ${Object.keys(tokens).join(', ')}`);

  /** Records the run created, newest first. */
  const created = [];
  /** One live record per writable group, reused by PUT, PATCH and DELETE. */
  const fixtures = {};
  const failures = [];

  /** The body each fixture was created with — the account one needs its password. */
  const fixtureBodies = {};

  const makeFixture = async (group) => {
    const spec = WRITABLE[group];
    const seed = nextSeed(group);
    const body = {
      ...sampleBody(schemas.getSchema(spec.schema), seed, { now: NOW }),
      ...(spec.overrides?.(seed) ?? {}),
    };
    const response = await api('POST', spec.path, { token: tokens.admin, body });
    if (response.status !== 201 || !response.json?.data) {
      failures.push({
        key: `fixture:${group}`,
        status: response.status,
        note: response.text.slice(0, 200),
      });
      return null;
    }
    fixtureBodies[group] = body;
    created.unshift(`${spec.path}/${response.json.data.id}`);
    return response.json.data;
  };

  /** The note the documented `DELETE …/notes/:noteId` takes away. */
  let noteId = null;

  /**
   * Creates one live record per writable resource.
   *
   * It runs **after** every read has been captured, so that no list example in
   * the package contains a record this run invented — an `llms.txt` sample
   * naming a locality called "Smoke name" is worse than no sample at all.
   */
  const makeFixtures = async () => {
    for (const group of Object.keys(WRITABLE)) {
      // eslint-disable-next-line no-await-in-loop -- the fixtures are a sequence
      fixtures[group] = await makeFixture(group);
    }

    const lead = await api('POST', '/leads', {
      body: {
        name: 'Priya Raghavan',
        phone: '9876543210',
        email: 'priya.raghavan@example.com',
        source: 'property-enquiry',
        propertyId: 1,
        message: 'I would like to schedule a site visit this weekend.',
        consent: true,
      },
    });
    if (lead.status === 201) {
      fixtures.adminLeads = lead.json.data;
      created.unshift(`/admin/leads/${lead.json.data.id}`);
    }

    const note = fixtures.adminLeads
      ? await api('POST', `/admin/leads/${fixtures.adminLeads.id}/notes`, {
          token: tokens.admin,
          body: { text: 'Called the enquirer; a site visit is booked for Saturday.' },
        })
      : null;
    noteId = note?.json?.data?.notes?.at(-1)?.id ?? null;

    const application = fixtures.adminJobs
      ? await api('POST', `/jobs/${fixtures.adminJobs.id}/apply`, {
          body: {
            name: 'Rahul Menon',
            email: 'rahul.menon@example.com',
            phone: '9876543211',
            resumeUrl: 'https://example.com/resume.pdf',
          },
        })
      : null;
    if (application?.status === 201) {
      fixtures.adminJobApplications = application.json.data;
      created.unshift(`/admin/job-applications/${application.json.data.id}`);
    }

    const subscriber = await api('POST', '/newsletter/subscribe', {
      body: { email: 'example.subscriber@example.com', name: 'Example Subscriber' },
    });
    if (subscriber.status === 201 && subscriber.json?.data?.id) {
      fixtures.adminNewsletterSubscribers = subscriber.json.data;
      created.unshift(`/admin/newsletter-subscribers/${subscriber.json.data.id}`);
    }

    // `PUT /auth/profile` renames whoever makes it, so it is made by the
    // throwaway account this run created and deletes again — the seed's three
    // users have to read the same on the next run.
    const account = fixtureBodies.adminUsers;
    if (account) {
      const session = await api('POST', '/auth/login', {
        body: { email: account.email, password: account.password },
      });
      if (session.status === 200) tokens.throwaway = session.json.data.token;
    }
  };

  /**
   * The three groups whose records arrive through a public form rather than an
   * admin `POST`. Their `DELETE` still needs a record of its own, so each one
   * knows how to produce another throwaway.
   */
  const publicFixture = async (group) => {
    const seed = nextSeed(group);
    if (group === 'adminLeads') {
      const response = await api('POST', '/leads', {
        body: { name: 'Example Lead', phone: '9876543210', source: 'contact-page' },
      });
      return response.json?.data ?? null;
    }
    if (group === 'adminNewsletterSubscribers') {
      const response = await api('POST', '/newsletter/subscribe', {
        body: { email: `${seed}@example.com` },
      });
      return response.json?.data ?? null;
    }
    if (group === 'adminJobApplications' && fixtures.adminJobs) {
      const response = await api('POST', `/jobs/${fixtures.adminJobs.id}/apply`, {
        body: {
          name: 'Example Applicant',
          email: `${seed}@example.com`,
          phone: '9876543211',
          resumeUrl: 'https://example.com/resume.pdf',
        },
      });
      return response.json?.data ?? null;
    }
    return fixtures[group] ?? null;
  };

  /**
   * The endpoints a generic plan cannot reach: the ones that need a query to
   * mean anything, the ones that would revoke the token making the call, and
   * the ones whose example reads better small.
   */
  const SPECIAL = {
    'properties.list': () => ({ path: '/properties?perPage=2&listingType=sale' }),
    'properties.counts': () => ({
      path: '/properties/counts?by=segment,listingType,propertyTypeId',
    }),
    'properties.featured': () => ({ path: '/properties/featured?perPage=2' }),
    'properties.similar': () => ({ path: '/properties/1/similar?perPage=2' }),
    'properties.view': () => ({ body: {} }),
    // The token is the one the run's own enquiry about listing 1 was answered
    // with (`makeFixtures`); the example shows it normalised, like every token.
    'properties.documentAccess': () => ({
      path: '/properties/1/documents/access',
      body: { token: fixtures.adminLeads?.access?.token },
      skip: fixtures.adminLeads?.access?.token ? false : 'the run’s lead carried no access token',
    }),
    'properties.suggestions': () => ({ path: '/properties/suggestions?q=whitefield' }),
    'localities.list': () => ({ path: '/localities?perPage=2' }),
    'developers.list': () => ({ path: '/developers?perPage=2' }),
    'articles.list': () => ({ path: '/articles?perPage=2' }),
    'leads.create': () => ({ skip: 'captured from the fixture the run created' }),
    'newsletter.subscribe': () => ({
      body: { email: 'example.subscriber@example.com' },
    }),
    'jobs.apply': () => ({ skip: 'captured from the fixture the run created' }),
    'auth.login': () => ({ body: accounts.admin }),
    'auth.logout': async () => {
      const session = await api('POST', '/auth/login', { body: accounts.sales });
      return { token: session.json?.data?.token };
    },
    'auth.profile': () => ({ token: tokens.throwaway ?? tokens.sales }),
    'auth.updateProfile': () => ({
      token: tokens.throwaway,
      body: { name: 'Anita Rao', phone: '9876543212', avatarUrl: null },
      skip: tokens.throwaway ? false : 'the run could not create an account of its own',
    }),
    'auth.updatePassword': () => ({
      skip: 'a password change would invalidate the run’s own session',
    }),
    'adminProperties.list': () => ({ path: '/admin/properties?perPage=2' }),
    'adminLeads.list': () => ({ path: '/admin/leads?perPage=2' }),
    'adminLeads.claim': () => ({
      path: `/admin/leads/${fixtures.adminLeads?.id ?? 1}/claim`,
      token: tokens.sales,
    }),
    'adminLeads.addNote': () => ({
      path: `/admin/leads/${fixtures.adminLeads?.id ?? 1}/notes`,
      body: { text: 'Called the enquirer; a site visit is booked for Saturday.' },
    }),
    // A sales user may withdraw their own note and nobody else's (prompt 29),
    // and the note the run has to spare was written by the admin — so this is
    // the one lead endpoint whose example is captured as the admin.
    'adminLeads.removeNote': () => ({
      path: `/admin/leads/${fixtures.adminLeads?.id ?? 1}/notes/${noteId}`,
      token: tokens.admin,
      skip: noteId ? false : 'no note was created',
    }),
    'adminLeads.exportCsv': () => ({ path: '/admin/leads/export?status=new' }),
    // The desk's own entry (prompt 51): a walk-in, with the note it arrives
    // with. The capture deletes the lead again with the other throwaways.
    'adminLeads.create': () => ({
      body: {
        name: 'Example Walk-in',
        phone: '9876543213',
        source: 'walk-in',
        propertyId: 1,
        note: 'Walked in after seeing the hoarding; wants a 3 BHK near the lake.',
      },
    }),
    // A call logged on the run's own lead, not on one of the seed's.
    'adminLeads.logActivity': () => ({
      path: `/admin/leads/${fixtures.adminLeads?.id ?? 1}/activities`,
      body: {
        type: 'call',
        outcome: 'Interested — wants a site visit',
        note: 'Asked for the floor plans of the 3 BHK.',
      },
    }),
    'adminNewsletterSubscribers.exportCsv': () => ({
      path: '/admin/newsletter-subscribers/export',
    }),
    'adminSeo.overview': () => ({ path: '/admin/seo/overview?type=property&perPage=2' }),
    'adminSeo.updateSettings': async () => {
      const current = await api('GET', '/admin/seo/settings', { token: tokens.admin });
      return { body: { separator: current.json?.data?.separator ?? '|' } };
    },
    'adminSettings.update': async () => {
      const current = await api('GET', '/admin/settings', { token: tokens.admin });
      return { body: { general: { siteName: current.json?.data?.general?.siteName } } };
    },
    'adminRedirects.import': () => ({
      body: {
        rows: [
          {
            fromPath: fixtures.adminRedirects?.fromPath ?? '/old-path',
            toPath: '/properties',
            statusCode: 301,
          },
        ],
      },
    }),
    'redirects.resolve': () => ({ path: '/redirects/resolve?path=/blog' }),
    'adminNewsletterSubscribers.patch': () => ({ body: { status: 'unsubscribed' } }),
    'notFound.report': () => ({
      body: { path: '/flats-in-hebal', referrer: 'https://www.google.com/' },
    }),
    // The example dismisses the address the capture itself reported.
    'adminSeo.dismissNotFound': async () => {
      await api('POST', '/not-found', { body: { path: '/old-brochure-2019' } });
      const listed = await api('GET', '/admin/seo/not-found?q=old-brochure-2019', {
        token: tokens.admin,
      });
      const line = (listed.json?.data ?? []).find((entry) => entry.path === '/old-brochure-2019');
      return line
        ? { path: `/admin/seo/not-found/${line.id}` }
        : { skip: 'the reported address was not listed' };
    },
    'adminMedia.list': () => ({ path: '/admin/media?perPage=2' }),
    // The run's own file is filed first (uncaptured), so the rename moves it
    // and nothing of the seed's.
    'adminMedia.renameFolder': async () => {
      const file = fixtures.adminMedia;
      if (!file) return { skip: 'the run could not create a file of its own' };
      await api('PATCH', `/admin/media/${file.id}`, {
        token: tokens.admin,
        body: { folder: 'examples/brochures' },
      });
      return { body: { from: 'examples/brochures', to: 'examples/archive' } };
    },
    'adminUsers.list': () => ({ path: '/admin/users?perPage=2' }),
  };

  /** Fills `:id`, `:slug` and `:noteId`. */
  const resolvePath = (endpoint) => {
    const group = groupOf(endpoint);
    const fixture = fixtures[group];
    const write = ['PUT', 'PATCH', 'DELETE'].includes(endpoint.method);
    return endpoint.path
      .replace(/:id/g, () => String(write && fixture ? fixture.id : (endpoint.example ?? 1)))
      .replace(/:noteId/g, () => String(noteId ?? 1))
      .replace(/:slug/g, () => String(endpoint.example ?? ''));
  };

  const plan = async (endpoint) => {
    const group = groupOf(endpoint);
    const spec = WRITABLE[group];
    const base = {
      method: endpoint.method,
      path: resolvePath(endpoint),
      role: TOKEN_FOR[endpoint.auth] ?? 'admin',
      body: undefined,
    };

    if (endpoint.path.endsWith('/bulk')) {
      // `activate` reads better than `delete` in a document, and every model
      // with an `isActive` column accepts it; `delete` is the one action the
      // rest share, and an id nothing matches makes it a safe no-op (§5.8).
      const collection = MODELS[collectionOfGroup(group)];
      if (collection?.fields?.isActive) {
        // `affected` counts the records that change (QA-55): activating an
        // active record is "0 updated", which documents nothing. The record is
        // switched off first, uncaptured, and the example switches it back on —
        // given, on the way, whatever its group asks of a record going live.
        const id = fixtures[group]?.id ?? 1;
        await api('PATCH', `${endpoint.path.replace(/\/bulk$/, '')}/${id}`, {
          token: tokens.admin,
          body: { ...(spec?.ready ?? {}), isActive: false },
        });
        base.body = { ids: [id], action: 'activate' };
      } else {
        base.body = { ids: [999999], action: 'delete' };
      }
    } else if (endpoint.path.endsWith('/check-slug')) {
      base.path = `${endpoint.path}?slug=lakeview-heights-3-bhk-whitefield`;
    } else if (spec && (endpoint.method === 'POST' || endpoint.method === 'PUT')) {
      const seed = nextSeed(group);
      base.body = {
        ...sampleBody(schemas.getSchema(spec.schema), seed, { now: NOW }),
        ...(spec.overrides?.(seed) ?? {}),
      };
    } else if (spec && endpoint.method === 'PATCH') {
      base.body = capturePatch(group, spec);
    }

    // A documented `DELETE` must not take the seed away, and it must not take
    // away the fixture the endpoints after it still need: every one of them is
    // pointed at a copy made for it alone — unless its plan makes its own.
    if (endpoint.method === 'DELETE' && endpoint.path.endsWith('/:id') && !SPECIAL[endpoint.key]) {
      const victim = spec ? await makeFixture(group) : await publicFixture(group);
      if (!victim) return { skip: `no ${group} record to delete` };
      base.path = endpoint.path.replace(':id', String(victim.id));
    }

    const special = SPECIAL[endpoint.key];
    if (!special) return base;
    return { ...base, ...(await special(endpoint)) };
  };

  const examples = {};
  let done = 0;

  const capture = async (endpoint) => {
    // eslint-disable-next-line no-await-in-loop -- the walk is a sequence on purpose
    const step = await plan(endpoint);
    done += 1;

    if (step.skip) {
      examples[endpoint.key] = { skipped: step.skip };
      return;
    }

    const token = step.token ?? (step.role ? tokens[step.role] : undefined);
    const response = await api(step.method, step.path, {
      token,
      body: step.body,
      accept: ACCEPT[endpoint.response],
    });

    const [path, query = ''] = step.path.split('?');
    const isText = TEXT_SHAPES.has(endpoint.response) || !response.json;

    examples[endpoint.key] = {
      request: {
        method: step.method,
        path,
        query: query || null,
        auth: endpoint.auth === 'public' ? null : (step.role ?? 'admin'),
        body: step.body === undefined ? null : trim(step.body),
      },
      response: {
        status: response.status,
        contentType: response.contentType || 'application/json',
        ...(response.disposition ? { disposition: trimText(response.disposition) } : {}),
        ...(isText ? { text: trimText(response.text) } : { body: trim(response.json) }),
      },
    };

    if (response.status >= 400) {
      failures.push({
        key: endpoint.key,
        status: response.status,
        note: response.text.slice(0, 200),
      });
    }

    // A create's record lives under its group's path — or, for a group with no
    // fixture of its own (the desk's `POST /admin/leads`), under the create's.
    const madeBy =
      WRITABLE[groupOf(endpoint)]?.path ?? (endpoint.path.includes(':') ? null : endpoint.path);
    if (isCreate(endpoint) && madeBy && response.json?.data?.id) {
      created.unshift(`${madeBy}/${response.json.data.id}`);
    }

    if (done % 40 === 0) log(`captured ${done} endpoints`);
  };

  // Pass one: every read, against the untouched seed.
  const endpoints = allEndpoints();
  for (const endpoint of endpoints.filter((entry) => entry.method === 'GET')) {
    // eslint-disable-next-line no-await-in-loop -- the walk is a sequence on purpose
    await capture(endpoint);
  }

  // Pass two: the writes, against copies made for them.
  await makeFixtures();
  for (const endpoint of endpoints.filter((entry) => entry.method !== 'GET')) {
    // eslint-disable-next-line no-await-in-loop -- as above
    await capture(endpoint);
  }

  log(`captured ${done} endpoints, removing ${created.length} throwaway records`);
  for (const path of created) {
    // eslint-disable-next-line no-await-in-loop -- cleanup unwinds in order
    const removed = await api('DELETE', `${path}?force=true`, { token: tokens.admin });
    if (removed.status !== 200 && removed.status !== 404) {
      failures.push({
        key: `cleanup:${path}`,
        status: removed.status,
        note: removed.text.slice(0, 160),
      });
    }
  }

  return { examples, failures };
}

module.exports = {
  captureExamples,
  MAX_ITEMS,
  MAX_STRING,
  MAX_TEXT,
  NOW,
  STABLE,
  trim,
  trimText,
};
