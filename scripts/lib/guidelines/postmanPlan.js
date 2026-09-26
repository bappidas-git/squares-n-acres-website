/**
 * The Postman collection as a run (prompt 51).
 *
 * Opened one request at a time, the collection only had to be readable. Run
 * whole — the parity check of `08_TESTING_AND_PARITY.md` — it has to be a
 * sequence that works: sign in first and out last, create each record before
 * the requests that read, change or delete it, delete whatever it created, and
 * never touch a record the seed holds. The capture's ids were ids of records
 * the capture had already deleted, and two requests shipped a bare `:id`.
 *
 * So the run is data, here: the order, the path of each request with the
 * variables it reads, its body, the status the registry promises, and the
 * small steps before and after it — "report an address, then look up its id",
 * "delete the copy this request made". `postman.js` renders the collection and
 * its scripts from it, and `postmanRun.js` runs that collection against the
 * mock, which is how the generator proves it green before writing it.
 *
 * A few conventions carry the whole thing:
 *
 *   * `{{name}}` is a variable — the environment's `baseUrl`, `token`, `email`
 *     and `password`, or one a step saved;
 *   * `raw('name')` in a body is a variable written without quotes — an id,
 *     or a value saved as JSON;
 *   * `pmseed` in a sampled body becomes `{{$timestamp}}`, so a second run
 *     names its records differently from the first.
 */

const { allEndpoints } = require('../../../src/services/endpoints');
const schemas = require('../../../src/services/schemas');
const { MODELS } = require('../../../mock-server/schemas/models');
const { NOW } = require('./capture');
const { WRITABLE, collectionOfGroup, groupOf, sampleBody, successStatus } = require('./fixtures');

/** The seed the sampled bodies are written with, replaced by `{{$timestamp}}`. */
const SEED = 'pmseed';

/** A variable written into a JSON body without quotes. */
const raw = (name) => ({ $raw: name });

/** The variable a group's own record is known by. */
const idOf = (group) => `${group}Id`;

/** Fields a `PATCH` may set without moving anything else (as the capture does). */
const SAFE_PATCH_FIELDS = ['isActive', 'isFeatured', 'showOnHome', 'showOnAbout'];

/**
 * A `PATCH` body for a group: its fixture's patch without `order` — a position
 * renumbers the whole collection, which outlives the record it was sent for.
 */
function patchBody(group) {
  const spec = WRITABLE[group];
  const kept = Object.entries(spec?.patch ?? {}).filter(([field]) => field !== 'order');
  if (kept.length > 0) return Object.fromEntries(kept);
  const model = MODELS[collectionOfGroup(group)];
  const safe = SAFE_PATCH_FIELDS.find((field) => model?.fields?.[field]);
  return safe ? { [safe]: true } : {};
}

/** A sampled body for a group's create or replace. */
function sampleFor(group) {
  const spec = WRITABLE[group];
  return {
    ...sampleBody(schemas.getSchema(spec.schema), SEED, { now: NOW }),
    ...(spec.overrides?.(SEED) ?? {}),
  };
}

/**
 * Requests whose query makes the answer mean something, or keeps it small.
 */
const QUERIES = {
  'properties.list': '?perPage=2&listingType=sale',
  'properties.counts': '?by=segment,listingType,propertyTypeId',
  'properties.featured': '?perPage=2',
  'properties.similar': '?perPage=2',
  'properties.suggestions': '?q=whitefield',
  'localities.list': '?perPage=2',
  'developers.list': '?perPage=2',
  'articles.list': '?perPage=2',
  'adminProperties.list': '?perPage=2',
  'adminLeads.list': '?perPage=2',
  'adminLeads.exportCsv': '?status=new',
  'adminMedia.list': '?perPage=2',
  'adminUsers.list': '?perPage=2',
  'adminSeo.overview': '?type=property&perPage=2',
  'redirects.resolve': '?path=/blog',
};

/** The password of the throwaway account the two profile writes are made as. */
const THROWAWAY_PASSWORD = 'Postman@123';

/**
 * An account of the request's own — created, signed in, and afterwards signed
 * out and deleted — for the writes that change the account making them: a
 * run must not rename the admin, and restating the admin's password would sign
 * the admin out everywhere else.
 */
const throwaway = {
  before: [
    {
      send: {
        method: 'POST',
        path: '/admin/users',
        body: {
          name: 'Postman Throwaway',
          email: 'postman.throwaway.{{$timestamp}}@example.com',
          password: THROWAWAY_PASSWORD,
          role: 'sales',
        },
      },
      save: { throwawayId: 'data.id', throwawayEmail: 'data.email' },
    },
    {
      send: {
        method: 'POST',
        path: '/auth/login',
        auth: false,
        body: { email: '{{throwawayEmail}}', password: THROWAWAY_PASSWORD },
      },
      save: { throwawayToken: 'data.token' },
    },
  ],
  after: [
    { send: { method: 'POST', path: '/auth/logout', token: 'throwawayToken' } },
    { send: { method: 'DELETE', path: '/admin/users/{{throwawayId}}' } },
  ],
};

/**
 * What the generic rules below cannot say: the bodies, the lookups before a
 * request and the clean-up after it.
 */
const SPECIAL = {
  'auth.login': {
    body: { email: '{{email}}', password: '{{password}}' },
    after: [{ saveEnv: { token: 'data.token', tokenExpiresAt: 'data.expiresAt' } }],
  },
  'auth.updateProfile': {
    ...throwaway,
    token: 'throwawayToken',
    body: { name: 'Postman Throwaway, renamed', phone: '9876543212', avatarUrl: null },
  },
  'auth.updatePassword': {
    ...throwaway,
    token: 'throwawayToken',
    body: { currentPassword: THROWAWAY_PASSWORD, newPassword: `${THROWAWAY_PASSWORD}4` },
  },

  'properties.view': { body: {} },
  // A lead about listing 1 is what the files open to; the lead goes after.
  'properties.documentAccess': {
    before: [
      {
        send: {
          method: 'POST',
          path: '/leads',
          auth: false,
          body: {
            name: 'Postman Document Lead',
            phone: '9876543210',
            source: 'document-request',
            propertyId: 1,
            message: 'Created by the Postman collection; deleted by it.',
          },
        },
        save: { documentLeadId: 'data.id', documentToken: 'data.access.token' },
      },
    ],
    body: { token: '{{documentToken}}' },
    after: [{ send: { method: 'DELETE', path: '/admin/leads/{{documentLeadId}}' } }],
  },

  'leads.create': {
    body: {
      name: 'Postman Lead',
      phone: '9876543210',
      email: 'postman.lead@example.com',
      source: 'contact-page',
      message: 'Created by the Postman collection; deleted by it.',
    },
    after: [
      { save: { publicLeadId: 'data.id' } },
      { send: { method: 'DELETE', path: '/admin/leads/{{publicLeadId}}' } },
    ],
  },
  // An address the seed already holds: the 200 the registry documents, and
  // nothing written.
  'newsletter.subscribe': { body: { email: 'subscriber.one@example.com' } },
  'jobs.apply': {
    body: {
      name: 'Postman Applicant',
      email: 'postman.applicant.{{$timestamp}}@example.com',
      phone: '9876543211',
      resumeUrl: 'https://example.com/resume.pdf',
    },
    after: [
      { save: { publicApplicationId: 'data.id' } },
      { send: { method: 'DELETE', path: '/admin/job-applications/{{publicApplicationId}}' } },
    ],
  },

  'adminLeads.create': {
    body: {
      name: 'Postman Desk Lead',
      phone: '9876543211',
      source: 'walk-in',
      note: 'Created by the Postman collection; deleted by it.',
    },
    after: [{ save: { adminLeadsId: 'data.id' } }],
  },
  'adminLeads.logActivity': {
    body: { type: 'call', outcome: 'Logged by the Postman collection' },
  },
  'adminLeads.patch': { body: { priority: 'high' } },
  // Claiming is the sales desk's: the lead the group's create made is claimed
  // by the sales account, signed in for it and out again.
  'adminLeads.claim': { as: 'sales' },
  'adminLeads.addNote': {
    body: { text: 'Note added by the Postman collection.' },
    after: [{ save: { adminLeadsNoteId: 'data.notes.-1.id' } }],
  },

  // The groups whose records arrive through a public form: the first request
  // that needs one files it.
  'adminJobApplications.patch': {
    before: [
      {
        send: {
          method: 'POST',
          path: '/jobs/1/apply',
          auth: false,
          body: {
            name: 'Postman Applicant',
            email: 'postman.application.{{$timestamp}}@example.com',
            phone: '9876543211',
            resumeUrl: 'https://example.com/resume.pdf',
          },
        },
        save: { adminJobApplicationsId: 'data.id' },
      },
    ],
    body: { status: 'shortlisted' },
  },
  'adminNewsletterSubscribers.patch': {
    before: [
      {
        send: {
          method: 'POST',
          path: '/newsletter/subscribe',
          auth: false,
          body: { email: 'postman.subscriber.{{$timestamp}}@example.com' },
        },
        save: { adminNewsletterSubscribersId: 'data.id' },
      },
    ],
    body: { status: 'unsubscribed' },
  },

  // A folder of the run's own, renamed, and its one file removed.
  'adminMedia.renameFolder': {
    before: [
      {
        send: {
          method: 'POST',
          path: '/admin/media',
          body: {
            url: 'https://picsum.photos/seed/postman-rename-{{$timestamp}}/1200/800',
            alt: 'A file whose folder the Postman collection renames',
            folder: 'postman-folder-{{$timestamp}}',
          },
        },
        save: { renameMediaId: 'data.id', renameFolder: 'data.folder' },
      },
    ],
    body: { from: '{{renameFolder}}', to: '{{renameFolder}}-renamed' },
    after: [{ send: { method: 'DELETE', path: '/admin/media/{{renameMediaId}}?force=true' } }],
  },

  'adminProperties.duplicate': {
    after: [
      { save: { duplicateId: 'data.id' } },
      { send: { method: 'DELETE', path: '/admin/properties/{{duplicateId}}' } },
    ],
  },

  // The import upserts the rule the group's create made.
  'adminRedirects.import': {
    body: {
      rows: [{ fromPath: '{{adminRedirectsFromPath}}', toPath: '/properties', statusCode: 301 }],
    },
  },

  // Settings are restated as they are: a run changes no setting.
  'adminSeo.updateSettings': {
    before: [
      {
        send: { method: 'GET', path: '/admin/seo/settings' },
        saveJson: { seoSeparator: 'data.separator' },
      },
    ],
    body: { separator: raw('seoSeparator') },
  },
  'adminSettings.update': {
    before: [
      {
        send: { method: 'GET', path: '/admin/settings' },
        saveJson: { siteName: 'data.general.siteName' },
      },
    ],
    body: { general: { siteName: raw('siteName') } },
  },

  // An address of the run's own is reported, looked up, and dismissed.
  'adminSeo.dismissNotFound': {
    before: [
      { set: { notFoundPath: '/postman-missing-{{$timestamp}}' } },
      {
        send: {
          method: 'POST',
          path: '/not-found',
          auth: false,
          body: { path: '{{notFoundPath}}' },
        },
      },
      {
        send: { method: 'GET', path: '/admin/seo/not-found?perPage=100' },
        find: { list: 'data', where: { path: '{{notFoundPath}}' }, save: { notFoundId: 'id' } },
      },
    ],
  },
  'notFound.report': {
    before: [{ set: { reportedPath: '/postman-reported-{{$timestamp}}' } }],
    body: { path: '{{reportedPath}}', referrer: 'https://www.google.com/' },
    after: [
      {
        send: { method: 'GET', path: '/admin/seo/not-found?perPage=100' },
        find: { list: 'data', where: { path: '{{reportedPath}}' }, save: { reportedId: 'id' } },
      },
      { send: { method: 'DELETE', path: '/admin/seo/not-found/{{reportedId}}' } },
    ],
  },
  // A rule the seed holds, looked up rather than assumed.
  'redirects.hit': {
    before: [
      {
        send: { method: 'GET', path: '/redirects', auth: false },
        save: { redirectId: 'data.0.id' },
      },
    ],
  },
};

/** The `:id` a group's requests use: its own record's variable, or `null` for the example. */
function chainOf(group) {
  if (WRITABLE[group]) return idOf(group);
  if (['adminLeads', 'adminJobApplications', 'adminNewsletterSubscribers'].includes(group)) {
    return idOf(group);
  }
  if (group === 'adminSeo') return 'notFoundId';
  if (group === 'redirects') return 'redirectId';
  return null;
}

/** The path of one request, its parameters filled. */
function pathOf(endpoint) {
  const group = groupOf(endpoint);
  const chain =
    endpoint.path.startsWith('/admin/') || group === 'redirects' ? chainOf(group) : null;
  return endpoint.path
    .replace(/:id\b/g, () => (chain ? `{{${chain}}}` : String(endpoint.example ?? 1)))
    .replace(/:noteId\b/g, '{{adminLeadsNoteId}}')
    .replace(/:slug\b/g, () => String(endpoint.example ?? ''));
}

/** The body of one request, when the generic rules have one. */
function genericBody(endpoint) {
  const group = groupOf(endpoint);
  if (endpoint.path.endsWith('/bulk')) return { ids: [999999], action: 'delete' };
  if (!WRITABLE[group]) return undefined;
  if (endpoint.method === 'POST' && endpoint.path === WRITABLE[group].path) return sampleFor(group);
  if (endpoint.method === 'PUT') return sampleFor(group);
  if (endpoint.method === 'PATCH') return patchBody(group);
  return undefined;
}

/** What a group's create saves for the requests after it. */
function createSaves(endpoint) {
  const group = groupOf(endpoint);
  if (!WRITABLE[group] || endpoint.method !== 'POST' || endpoint.path !== WRITABLE[group].path) {
    return [];
  }
  const saves = { [idOf(group)]: 'data.id' };
  if (group === 'adminRedirects') saves.adminRedirectsFromPath = 'data.fromPath';
  return [{ save: saves }];
}

/** Signing in as another role for one request, and out again after it. */
const signInAs = (role) => ({
  send: {
    method: 'POST',
    path: '/auth/login',
    auth: false,
    body: { email: `{{${role}Email}}`, password: `{{${role}Password}}` },
  },
  save: { [`${role}Token`]: 'data.token' },
});
const signOutAs = (role) => ({
  send: { method: 'POST', path: '/auth/logout', token: `${role}Token` },
});

/** One step of the run. */
function stepOf(endpoint) {
  const special = SPECIAL[endpoint.key] ?? {};
  const as = special.as ?? null;
  const query = endpoint.path.endsWith('/check-slug')
    ? '?slug=lakeview-heights-3-bhk-whitefield'
    : (QUERIES[endpoint.key] ?? '');

  return {
    endpoint,
    key: endpoint.key,
    method: endpoint.method,
    path: pathOf(endpoint),
    query,
    auth: endpoint.auth !== 'public',
    // The variable the bearer token is read from: the admin's `token`, the role
    // this one request is sent as, or an account the request made for itself.
    token: special.token ?? (as ? `${as}Token` : 'token'),
    body: special.body !== undefined ? special.body : genericBody(endpoint),
    expect: successStatus(endpoint),
    before: [...(as ? [signInAs(as)] : []), ...(special.before ?? [])],
    after: [...createSaves(endpoint), ...(special.after ?? []), ...(as ? [signOutAs(as)] : [])],
  };
}

/** Modules in the order the run takes them: health, then signing in, then the rest. */
const FIRST_MODULES = ['system', 'auth'];

/**
 * The run: folders of steps, in order — the module, then its registry groups,
 * each group's delete after everything that uses its record, and signing out
 * alone at the very end.
 *
 * @returns {Array<{module: string, groups: Array<{group: string, steps: Array<object>}>}>}
 */
function buildPlan() {
  const byModule = new Map();
  for (const endpoint of allEndpoints()) {
    const group = groupOf(endpoint);
    if (!byModule.has(endpoint.module)) byModule.set(endpoint.module, new Map());
    const groups = byModule.get(endpoint.module);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(endpoint);
  }

  const moduleNames = [...byModule.keys()].sort((a, b) => {
    const rank = (name) => (FIRST_MODULES.includes(name) ? FIRST_MODULES.indexOf(name) : 99);
    return rank(a) - rank(b) || a.localeCompare(b);
  });

  let signOut = null;
  const plan = moduleNames.map((module) => ({
    module,
    groups: [...byModule.get(module).entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([group, endpoints]) => {
        const removes = endpoints.filter((endpoint) => endpoint.key === `${group}.remove`);
        const ordered = [
          ...endpoints.filter((endpoint) => !removes.includes(endpoint)),
          ...removes,
        ];
        const steps = [];
        for (const endpoint of ordered) {
          // Signing out revokes the token everything else is sent with.
          if (endpoint.key === 'auth.logout') signOut = stepOf(endpoint);
          else steps.push(stepOf(endpoint));
        }
        return { group, steps };
      }),
  }));

  if (signOut) plan.push({ module: 'sign out', groups: [{ group: 'auth', steps: [signOut] }] });
  return plan;
}

/* ------------------------------------------------------------------ *
 * Bodies as JSON text
 * ------------------------------------------------------------------ */

/**
 * A body as the raw JSON the collection sends: `raw()` markers unquoted, the
 * sampling seed made `{{$timestamp}}`.
 *
 * @param {object|undefined} body
 * @param {number} [indent] 2 for a request a reader opens; 0 inside a script
 * @returns {string|null}
 */
function rawBody(body, indent = 2) {
  if (body === undefined || body === null) return null;
  const text = JSON.stringify(
    body,
    (key, value) =>
      value && typeof value === 'object' && typeof value.$raw === 'string'
        ? `__RAW__${value.$raw}__`
        : value,
    indent || undefined
  );
  return text.replace(/"__RAW__([A-Za-z0-9_]+)__"/g, '{{$1}}').replace(/pmseed/g, '{{$timestamp}}');
}

module.exports = { SEED, buildPlan, rawBody };
