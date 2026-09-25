/**
 * The document builders of the handover package (prompt 47 §4.2).
 *
 * Each exported function returns the `{{token}}` values one template needs.
 * Everything they return comes from the registry, the schema descriptors, the
 * model descriptors, the RBAC matrix or the captured examples — the generator
 * writes no prose of its own, and every sentence a person wrote lives in
 * `docs/backend-notes/`.
 */

const fs = require('fs');
const path = require('path');

const enums = require('../../../src/config/enums');
const { PERMISSIONS, ROUTE_PERMISSIONS } = require('../../../src/config/rbac');
const { allEndpoints } = require('../../../src/services/endpoints');
const schemas = require('../../../src/services/schemas');
const { MODELS } = require('../../../mock-server/schemas/models');
const { resolvePermission } = require('../../../mock-server/lib/routePermissions');
const { blocks, code, facts, list, mono, table } = require('./markdown');
const { collectionOfGroup, groupOf } = require('./fixtures');
const { isShape } = require('./openapi');
const { describeDefault, describeType, rulesFor, tableOf } = require('./rules');
const { buildSchema, MAPPING, mappingRows } = require('./sql');

const ROOT = path.resolve(__dirname, '..', '..', '..');

/** Reads a repository file. */
const readRepo = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

/**
 * The lines of a Markdown file between two headings, the first included and
 * the second not — how §5 of the master context is copied verbatim.
 */
function sliceBetween(text, startsWith, endsWith) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const from = lines.findIndex((line) => line.startsWith(startsWith));
  const to = lines.findIndex((line, index) => index > from && line.startsWith(endsWith));
  if (from === -1) throw new Error(`cannot find "${startsWith}"`);
  return lines
    .slice(from, to === -1 ? lines.length : to)
    .join('\n')
    .trim();
}

/** A heading's link target inside the generated document. */
const endpointAnchor = (endpoint) =>
  `${endpoint.method.toLowerCase()}-${endpoint.path
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()}`;

/** One captured example rendered as a fenced block, or a plain note. */
function exampleBlock(example, { showRequest = true } = {}) {
  if (!example) return '_No example was captured for this endpoint._';
  if (example.skipped) return `_Not captured: ${example.skipped}._`;

  const parts = [];
  const { request, response } = example;

  if (showRequest) {
    const line = `${request.method} ${request.path}${request.query ? `?${request.query}` : ''}`;
    const headers = [
      'Accept: application/json',
      ...(request.auth ? [`Authorization: Bearer <a ${request.auth} token>`] : []),
      ...(request.body ? ['Content-Type: application/json'] : []),
    ];
    parts.push(
      code(
        [
          line,
          ...headers,
          ...(request.body ? ['', JSON.stringify(request.body, null, 2)] : []),
        ].join('\n'),
        'http'
      )
    );
  }

  const body = response.text !== undefined ? response.text : JSON.stringify(response.body, null, 2);
  const language = response.contentType.includes('json')
    ? 'json'
    : response.contentType.includes('xml')
      ? 'xml'
      : 'text';

  parts.push(`**${response.status}** \`${response.contentType}\``);
  parts.push(code(body, language));
  return blocks(...parts);
}

/* ------------------------------------------------------------------ *
 * 01 — the contract
 * ------------------------------------------------------------------ */

function apiContract({ generatedFrom, examples }) {
  const master = readRepo('prompts/00_MASTER_CONTEXT.md');
  const contract = readRepo('docs/API_CONTRACT.md');

  return {
    generatedFrom,
    contract: sliceBetween(master, '### 5.1 Base URL and paths', '### 5.14 Endpoint catalogue'),
    shapes: sliceBetween(contract, '## Response shapes', '## Captured examples'),
    exampleList: exampleBlock(examples['properties.list']),
    exampleSingle: exampleBlock(examples['properties.bySlug']),
    exampleAction: exampleBlock(examples['adminProperties.remove']),
    exampleError: code(
      JSON.stringify(
        {
          message: 'The given data was invalid.',
          errors: {
            title: ['The title must be at least 10 characters.'],
            'location.localityId': ['The selected locality is invalid.'],
            'images.0.alt': ['The alt text is required.'],
          },
        },
        null,
        2
      ),
      'json'
    ),
  };
}

/* ------------------------------------------------------------------ *
 * 02 — auth and RBAC
 * ------------------------------------------------------------------ */

const ROLES = ['admin', 'manager', 'sales'];

function authAndRbac({ generatedFrom, examples }) {
  const permissionRows = [];
  for (const [area, actions] of Object.entries(PERMISSIONS)) {
    for (const [action, roles] of Object.entries(actions)) {
      permissionRows.push([
        mono(area),
        action === '*' ? '_every action_' : mono(action),
        ...ROLES.map((role) => (roles.includes(role) ? 'yes' : '—')),
      ]);
    }
  }

  const routeRows = Object.entries(ROUTE_PERMISSIONS).map(([route, roles]) => [
    mono(route),
    ...ROLES.map((role) => (roles.includes(role) ? 'yes' : '—')),
  ]);

  const endpointRows = allEndpoints()
    .filter((endpoint) => endpoint.path.startsWith('/admin/'))
    .map((endpoint) => {
      const permission = resolvePermission(
        endpoint.path.replace(/^\/admin/, '').replace(/:[a-zA-Z]+/g, '1'),
        endpoint.method
      );
      const roles = permission
        ? (PERMISSIONS[permission.area]?.[permission.action] ??
          PERMISSIONS[permission.area]?.['*'] ??
          [])
        : [];
      return [
        mono(`${endpoint.method} ${endpoint.path}`),
        permission ? mono(`${permission.area}.${permission.action}`) : '—',
        ...ROLES.map((role) => (roles.includes(role) ? 'yes' : '—')),
      ];
    });

  const publicRows = allEndpoints()
    .filter((endpoint) => endpoint.auth === 'public')
    .map((endpoint) => [mono(`${endpoint.method} ${endpoint.path}`), endpoint.description]);

  const userRows = allEndpoints()
    .filter((endpoint) => endpoint.auth !== 'public' && !endpoint.path.startsWith('/admin/'))
    .map((endpoint) => [
      mono(`${endpoint.method} ${endpoint.path}`),
      mono(endpoint.auth),
      endpoint.description,
    ]);

  return {
    generatedFrom,
    permissionMatrix: table(['Area', 'Action', ...ROLES.map((r) => `\`${r}\``)], permissionRows),
    routeMatrix: table(['Admin route', ...ROLES.map((r) => `\`${r}\``)], routeRows),
    endpointMatrix: table(
      ['Endpoint', 'Permission', ...ROLES.map((r) => `\`${r}\``)],
      endpointRows
    ),
    publicEndpoints: table(['Endpoint', 'Purpose'], publicRows),
    userEndpoints: table(['Endpoint', 'Minimum role', 'Purpose'], userRows),
    seedUsers: table(
      ['Name', 'E-mail', 'Password (mock only)', 'Role'],
      (readSeed().adminUsers ?? []).map((user) => [
        user.name,
        mono(user.email),
        mono(user.password ?? '—'),
        mono(user.role),
      ])
    ),
    loginExample: exampleBlock(examples['auth.login']),
    profileExample: exampleBlock(examples['auth.profile']),
    forbiddenExample: code(
      JSON.stringify({ message: 'You do not have permission to perform this action.' }, null, 2),
      'json'
    ),
  };
}

let seedCache = null;
/** The seed, read once. */
function readSeed() {
  if (!seedCache) seedCache = JSON.parse(readRepo('db.json'));
  return seedCache;
}

/* ------------------------------------------------------------------ *
 * 03 — endpoints
 * ------------------------------------------------------------------ */

/** The query-parameter table of one endpoint. */
function queryTable(endpoint) {
  const rows = Object.entries(endpoint.query ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, descriptor]) => {
      const allowed = descriptor.startsWith('csv:enum:')
        ? descriptor.slice('csv:enum:'.length).split(',').map(mono).join(', ')
        : descriptor.startsWith('enum:')
          ? descriptor.slice(5).split(',').map(mono).join(', ')
          : '—';
      const type = descriptor.startsWith('csv:')
        ? `${descriptor.startsWith('csv:enum:') ? 'enum' : descriptor.slice(4)}, comma-separated`
        : descriptor.startsWith('enum:')
          ? 'enum'
          : descriptor;
      return [mono(name), type, DEFAULTS[name] ?? '—', allowed];
    });

  return table(['Parameter', 'Type', 'Default', 'Allowed values'], rows);
}

/** The documented defaults of §5.6. */
const DEFAULTS = {
  page: '`1`',
  perPage: '`12` public, `20` admin, max `100`',
  order: '`desc`',
  sort: 'per endpoint',
};

/** The body table of one endpoint: dotted path, Laravel rule, default. */
function bodyTable(endpoint) {
  if (!endpoint.body) return '_This endpoint takes no request body._';

  const shape = schemas.getSchema(endpoint.body);
  if (!isShape(shape)) return `_The schema \`${endpoint.body}\` is not a body shape._`;

  const collection = MODELS[collectionOfGroup(groupOf(endpoint))]
    ? collectionOfGroup(groupOf(endpoint))
    : undefined;
  const rows = rulesFor(shape, { collection }).map(({ path: dotted, rule, descriptor }) => [
    mono(dotted),
    describeType(descriptor),
    mono(rule),
    describeDefault(descriptor),
  ]);

  return blocks(
    `Schema \`${endpoint.body}\` (\`src/services/schemas/\`).`,
    table(['Field', 'Type', 'Laravel rule', 'Default'], rows)
  );
}

/** The error cases an endpoint can answer with. */
function errorList(endpoint) {
  const items = [];
  if (endpoint.auth !== 'public') {
    items.push('`401` — the token is missing, expired or revoked (§5.4)');
    items.push(`\`403\` — the role may not do this; minimum \`${endpoint.auth}\` (§7)`);
  }
  if (/:[a-zA-Z]+/.test(endpoint.path)) {
    items.push('`404` — no such record, or it is outside the caller’s scope (§5.10)');
  }
  if (endpoint.body) items.push('`422` — validation failed, `errors` keyed by field (§5.3)');
  if (endpoint.key.endsWith('.create') || endpoint.key.endsWith('.update')) {
    items.push('`409` — the slug or e-mail is taken (§5.9)');
  }
  if (endpoint.method === 'DELETE' && endpoint.module === 'masterData') {
    items.push('`409` — the record is still in use; `data.usedBy` lists what uses it');
  }
  if (endpoint.path === '/leads' || endpoint.path === '/newsletter/subscribe') {
    items.push('`429` — more than ten a minute from one IP (§5.11)');
  }
  if (endpoint.key === 'properties.documentAccess') {
    items.push(
      '`403` — the token is unknown, expired, issued for another listing, or its lead was deleted'
    );
  }
  items.push('`500` — the §5.3 envelope, never a stack trace');
  return list(items);
}

/** What an endpoint changes besides answering. */
const SIDE_EFFECTS = {
  'properties.view': [
    'Increments `viewCount`, once per IP per property per hour.',
    'Appends a `propertyViews` row, which the dashboard trend reads.',
  ],
  'leads.create': [
    'Sets `status: "new"` and `priority` from `siteSettings.leads.defaultPriority`.',
    'Appends the `created` activity.',
    'Increments the named property’s `enquiryCount`.',
    'Auto-assigns round-robin when `siteSettings.leads.autoAssign` says so.',
    'Stores `utm`, `pageUrl`, `ipAddress` and `userAgent`.',
    'Answers a lead about an active listing with `access.token`, which opens that listing’s gated files for 24 hours (`POST /properties/:id/documents/access`). The token is never stored on the lead.',
  ],
  'properties.documentAccess': [
    'None — it reads. The files are the listing’s own; the token only decides whether their addresses are handed over.',
  ],
  'adminLeads.patch': ['Appends one activity per field that actually changed.'],
  'adminLeads.claim': ['Sets `assignedTo` to the caller, and appends an `assigned` activity.'],
  'adminLeads.addNote': ['Appends the note and a `note-added` activity.'],
  'adminProperties.duplicate': [
    'Creates an inactive copy with a `-copy` slug and the counters reset.',
    'Copies every child row and both pivots.',
  ],
  'newsletter.subscribe': [
    'Re-subscribes an address that had unsubscribed, rather than adding a row.',
  ],
  'jobs.apply': ['Creates a job application with `status: "new"`.'],
  'auth.login': [
    'Stamps `lastLoginAt`.',
    'Issues a new token and revokes none: an account may be signed in on several devices, and its other sessions keep working until they sign out or expire, or a password change, a reset or a deactivation ends them.',
  ],
  'auth.logout': ['Revokes the token the call was made with.'],
  'auth.updatePassword': [
    'Revokes every other token of the account.',
    'Throttled to five attempts a minute per account (429, QA-65).',
  ],
  'adminSettings.update': [
    'Deep-merges the known keys and stamps `updatedAt`; the admin sends only what changed (QA-64).',
  ],
  'adminUsers.create': ['Refuses a password of letters only or digits only (422 on `password`).'],
  'adminUsers.update': [
    'Keeps the caller’s own role, whatever the body says.',
    'A `password` revokes every token of the account — the caller’s own excepted, when it is theirs.',
    'Deactivating the account revokes its tokens.',
  ],
  'adminUsers.patch': [
    'A `password` revokes every token of the account — the caller’s own excepted, when it is theirs.',
    'Deactivating the account revokes its tokens.',
  ],
  'adminUsers.remove': [
    'Unassigns the user’s leads, each with an `assigned` activity "Unassigned (user deleted)".',
    'Revokes every token of the account.',
  ],
  'adminSeo.updateSettings': ['Deep-merges the known keys and stamps `updatedAt`.'],
  'redirects.resolve': ['Increments the redirect’s `hits`.'],
};

/** Toggling `isActive` on a publishable record stamps `publishedAt`. */
const PUBLISHES = new Set([
  'adminProperties.patch',
  'adminProperties.update',
  'adminProperties.create',
]);

function sideEffects(endpoint) {
  const items = [...(SIDE_EFFECTS[endpoint.key] ?? [])];
  if (PUBLISHES.has(endpoint.key)) {
    items.push('Stamps `publishedAt` the first time `isActive` becomes true.');
  }
  if (endpoint.path.endsWith('/bulk')) {
    items.push(
      'Applies one action to every id, in one transaction; `affected` counts what changed.'
    );
  }
  const model = MODELS[collectionOfGroup(groupOf(endpoint))];
  if (endpoint.method === 'PATCH' && model?.fields?.order) {
    items.push('An `order` change renumbers the whole collection `1..n` (§5.8).');
  }
  if (endpoint.method === 'DELETE' && model?.slugField && endpoint.path.endsWith('/:id')) {
    items.push('The slug is freed, and the public URL starts answering 404 (§5.9).');
  }
  return items.length === 0 ? '_None beyond writing the record._' : list(items);
}

function endpointsDocument({ generatedFrom, examples }) {
  const endpoints = allEndpoints();
  const byModule = new Map();
  for (const endpoint of endpoints) {
    if (!byModule.has(endpoint.module)) byModule.set(endpoint.module, []);
    byModule.get(endpoint.module).push(endpoint);
  }

  const index = [...byModule.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([module, items]) =>
      blocks(
        `### ${module}`,
        table(
          ['Endpoint', 'Auth', 'Key', 'Purpose'],
          items.map((endpoint) => [
            `[\`${endpoint.method} ${endpoint.path}\`](#${endpointAnchor(endpoint)})`,
            mono(endpoint.auth),
            mono(endpoint.key),
            endpoint.description,
          ])
        )
      )
    )
    .join('\n\n');

  const sections = [...byModule.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([module, items]) =>
      blocks(
        `## Module: ${module}`,
        ...items.map((endpoint) =>
          blocks(
            `### ${endpoint.method} ${endpoint.path}`,
            `> ${endpoint.description}`,
            facts([
              ['Registry key', mono(endpoint.key)],
              ['Minimum role', endpoint.auth === 'public' ? 'none — public' : mono(endpoint.auth)],
              ['Response shape', mono(endpoint.response)],
              ['Body schema', endpoint.body ? mono(endpoint.body) : 'none'],
            ]),
            '**Query parameters**',
            queryTable(endpoint),
            '**Request body**',
            bodyTable(endpoint),
            '**Example**',
            exampleBlock(examples[endpoint.key]),
            '**Error cases**',
            errorList(endpoint),
            '**Side effects**',
            sideEffects(endpoint)
          )
        )
      )
    )
    .join('\n\n---\n\n');

  return { generatedFrom, index, sections, endpointCount: String(endpoints.length) };
}

/* ------------------------------------------------------------------ *
 * 04 — data models
 * ------------------------------------------------------------------ */

/** One collection's field table. */
function fieldTable(collection, model) {
  const rows = [];

  const walk = (shape, prefix) => {
    for (const [name, descriptor] of Object.entries(shape ?? {})) {
      const dotted = prefix ? `${prefix}.${name}` : name;
      const flags = [
        descriptor.required ? 'required' : null,
        descriptor.nullable ? 'nullable' : null,
        descriptor.read ? 'read-only' : null,
        descriptor.serverManaged ? 'server-managed' : null,
        descriptor.unique ? 'unique' : null,
        descriptor.secret ? 'never returned' : null,
      ].filter(Boolean);

      rows.push([
        mono(dotted),
        describeType(descriptor),
        descriptor.nullable ? 'Y' : 'N',
        describeDefault(descriptor),
        flags.join(', ') || (descriptor.note ?? '—'),
      ]);

      if (descriptor.type === 'object' && descriptor.shape) walk(descriptor.shape, dotted);
      if (descriptor.type === 'array' && descriptor.items?.shape) {
        walk(descriptor.items.shape, `${dotted}[]`);
      }
    }
  };

  walk(model.fields, '');

  const meta = [
    ['Table', mono(MAPPING[collection]?.table ?? tableOf(collection))],
    ['Slug field', model.slugField ? mono(model.slugField) : '—'],
    [
      'Public scope',
      model.publicScope
        ? mono(JSON.stringify(model.publicScope))
        : (model.publicNote ?? 'none — admin only'),
    ],
    ['Stripped from public reads', (model.publicOmit ?? []).map(mono).join(', ') || '—'],
    ['`q` searches', (model.searchable ?? []).map(mono).join(', ') || '—'],
    ['`sort` accepts', (model.sortable ?? []).map(mono).join(', ') || '—'],
    [
      'Default sort',
      model.defaultSort ? mono(`${model.defaultSort.field} ${model.defaultSort.order}`) : '—',
    ],
  ];

  return blocks(
    `### \`${collection}\``,
    facts(meta),
    table(['Field', 'Type', 'Null', 'Default', 'Notes'], rows)
  );
}

function dataModels({ generatedFrom }) {
  const collections = Object.entries(MODELS)
    .map(([collection, model]) => fieldTable(collection, model))
    .join('\n\n');

  const enumRows = Object.entries(enums)
    .filter(([, value]) => value && Array.isArray(value.values))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => [mono(name), value.values.map(mono).join(', ')]);

  return {
    generatedFrom,
    collections,
    collectionCount: String(Object.keys(MODELS).length),
    tableCount: String(buildSchema().length),
    mappingTable: table(['Collection', 'JSON field', 'Table', 'Column', 'Type'], mappingRows()),
    enumTable: table(['Enum', 'Values'], enumRows),
  };
}

/* ------------------------------------------------------------------ *
 * seed-mapping
 * ------------------------------------------------------------------ */

function seedMapping({ generatedFrom }) {
  const seed = readSeed();
  const tables = buildSchema();

  const counts = Object.entries(MODELS).map(([collection]) => {
    const value = seed[collection];
    return [
      mono(collection),
      mono(MAPPING[collection]?.table ?? tableOf(collection)),
      Array.isArray(value) ? String(value.length) : value ? '1 (singleton)' : '0',
    ];
  });

  const order = tables
    .filter((entry) => !entry.parentOf)
    .map((entry, index) => [String(index + 1), mono(entry.table), mono(entry.collection)]);

  const children = tables
    .filter((entry) => entry.parentOf)
    .map((entry) => [
      mono(entry.table),
      mono(`${entry.collection}.${entry.parentOf}`),
      entry.pivot ? 'pivot — ids only' : 'child rows',
    ]);

  const json = [];
  for (const [collection, rule] of Object.entries(MAPPING)) {
    for (const field of rule.json ?? []) json.push([mono(collection), mono(field)]);
    for (const [object, flatten] of Object.entries(rule.flatten ?? {})) {
      for (const field of flatten.json ?? [])
        json.push([mono(collection), mono(`${object}.${field}`)]);
    }
    if (rule.singleton) json.push([mono(collection), 'every group — one JSON column each']);
  }

  return {
    generatedFrom,
    seedCounts: table(['Collection', 'Table', 'Records in `db.json`'], counts),
    importOrder: table(['#', 'Table', 'Collection'], order),
    childTables: table(['Table', 'Comes from', 'Kind'], children),
    jsonColumns: table(['Collection', 'Stays JSON'], json),
  };
}

module.exports = {
  apiContract,
  authAndRbac,
  dataModels,
  endpointAnchor,
  endpointsDocument,
  exampleBlock,
  seedMapping,
  sliceBetween,
};
