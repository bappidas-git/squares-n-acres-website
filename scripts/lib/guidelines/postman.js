/**
 * The Postman collection of the handover package (prompt 47 §2).
 *
 * One request per entry of `src/services/endpoints.js`, grouped module →
 * registry group, with the captured response saved as a Postman example and a
 * test that asserts the status the registry promises and the envelope of §5.2.
 * Sign in once and the login's test script writes `{{token}}` into the
 * environment; every other request inherits it from the collection's bearer
 * auth.
 *
 * Run whole, the collection is a sequence that works (prompt 51): the order,
 * the variables, the lookups before a request and the clean-up after it come
 * from `postmanPlan.js`, which the generator also performs as a dry run
 * against the mock — so a collection that would not run green is never
 * written.
 *
 * Nothing here is random: the ids are hashes of the names, so regenerating the
 * package produces the same file.
 */

const crypto = require('crypto');

const { TOKEN_FOR } = require('./fixtures');
const { buildPlan, rawBody } = require('./postmanPlan');

const SCHEMA = 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json';

/** A stable UUID: the same name always yields the same id. */
function stableId(name) {
  const hash = crypto.createHash('sha1').update(`squares-n-acres:${name}`).digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `8${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join('-');
}

/** The request line a reader recognises: `GET /properties/slug/:slug`. */
const title = (endpoint) => `${endpoint.method} ${endpoint.path}`;

/** Postman's url object for one step of the run: its path and query, variables and all. */
function urlOf(step) {
  const path = step.path.replace(/^\//, '');
  const segments = path.split('/').filter(Boolean);
  const query = step.query
    .replace(/^\?/, '')
    .split('&')
    .filter(Boolean)
    .map((pair) => {
      const [key, value = ''] = pair.split('=');
      return { key, value };
    });
  const endpoint = step.endpoint;

  // Everything the registry allows, switched off, so a reader can turn a
  // filter on in the UI instead of looking it up (§5.6, §5.7).
  const declared = Object.keys(endpoint.query ?? {})
    .sort()
    .filter((key) => !query.some((entry) => entry.key === key))
    .map((key) => ({ key, value: '', disabled: true, description: endpoint.query[key] }));

  const all = [...query, ...declared];
  const raw = `{{baseUrl}}/${path}`;

  return {
    raw: query.length > 0 ? `${raw}?${query.map((e) => `${e.key}=${e.value}`).join('&')}` : raw,
    host: ['{{baseUrl}}'],
    path: segments,
    ...(all.length > 0 ? { query: all } : {}),
  };
}

/* ------------------------------------------------------------------ *
 * The run's scripts, from the plan's actions
 * ------------------------------------------------------------------ */

/**
 * A dotted-path reader, written into every script that saves a value. A step
 * past the end reads `null` — `== null` covers both absences, and keeps the
 * collection free of the word `check:guidelines` treats as a rendering hole.
 */
const PICK = [
  'var pick = function (value, path) {',
  "  return String(path).split('.').reduce(function (at, key) {",
  '    if (at == null) { return null; }',
  '    var index = Number(key);',
  '    return Array.isArray(at) && Number.isInteger(index) ? at[index < 0 ? at.length + index : index] : at[key];',
  '  }, value);',
  '};',
];

/** A JavaScript string literal of any text. */
const quote = (text) =>
  `'${String(text)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')}'`;

/** `pm.collectionVariables.set` for each `name: path` of a response. */
function saveLines(source, saves = {}, { asJson = false, scope = 'collectionVariables' } = {}) {
  return Object.entries(saves).map(([name, path]) => {
    const value = `pick(${source}, ${quote(path)})`;
    return `pm.${scope}.set(${quote(name)}, ${asJson ? `JSON.stringify(${value} == null ? null : ${value})` : value});`;
  });
}

/**
 * The JavaScript of a list of actions: each request nested in the callback of
 * the one before, so the next reads what the last one saved.
 *
 * @param {Array<object>} actions
 * @param {'prepares'|'cleans up'} verb how a request's own assertion reads
 * @returns {string[]}
 */
function actionLines(actions, verb) {
  if (actions.length === 0) return [];
  const [action, ...rest] = actions;

  if (action.set) {
    return [
      ...Object.entries(action.set).map(
        ([name, value]) =>
          `pm.collectionVariables.set(${quote(name)}, pm.variables.replaceIn(${quote(value)}));`
      ),
      ...actionLines(rest, verb),
    ];
  }
  if (action.saveEnv) {
    return [
      ...saveLines('pm.response.json()', action.saveEnv, { scope: 'environment' }),
      ...actionLines(rest, verb),
    ];
  }
  if (!action.send) {
    return [
      ...saveLines('pm.response.json()', action.save),
      ...saveLines('pm.response.json()', action.saveJson, { asJson: true }),
      ...actionLines(rest, verb),
    ];
  }

  const { method, path, body, auth = true, token = 'token' } = action.send;
  const text = rawBody(body, 0);
  const needsJson = Boolean(action.save || action.saveJson || action.find);
  const header = [
    "Accept: 'application/json'",
    ...(text ? ["'Content-Type': 'application/json'"] : []),
    ...(auth ? [`Authorization: 'Bearer ' + pm.variables.get(${quote(token)})`] : []),
  ].join(', ');

  const inner = [
    `  pm.test(${quote(`${verb}: ${method} ${path}`)}, function () {`,
    '    pm.expect(err).to.eql(null);',
    '    pm.expect(res.code).to.be.within(200, 299);',
    '  });',
    ...(needsJson ? ['  var json = res.json();'] : []),
    ...saveLines('json', action.save).map((line) => `  ${line}`),
    ...saveLines('json', action.saveJson, { asJson: true }).map((line) => `  ${line}`),
    ...(action.find
      ? [
          `  var rows = pick(json, ${quote(action.find.list)}) || [];`,
          '  var row = rows.find(function (entry) {',
          `    return ${Object.entries(action.find.where)
            .map(
              ([field, value]) =>
                `entry[${quote(field)}] === pm.variables.replaceIn(${quote(value)})`
            )
            .join(' && ')};`,
          '  });',
          ...Object.entries(action.find.save).map(
            ([name, field]) =>
              `  pm.collectionVariables.set(${quote(name)}, row ? row[${quote(field)}] : '');`
          ),
        ]
      : []),
    ...actionLines(rest, verb).map((line) => `  ${line}`),
  ];

  return [
    'pm.sendRequest({',
    `  url: pm.variables.replaceIn('{{baseUrl}}' + ${quote(path)}),`,
    `  method: ${quote(method)},`,
    `  header: { ${header} },`,
    ...(text ? [`  body: { mode: 'raw', raw: pm.variables.replaceIn(${quote(text)}) },`] : []),
    '}, function (err, res) {',
    ...inner,
    '});',
  ];
}

/** Whether a list of actions reads a value out of a response. */
const picks = (actions) =>
  actions.some((action) => action.save || action.saveJson || action.saveEnv || action.find);

/** The test script every request carries. */
function testScript(step) {
  const { endpoint, expect: expectedStatus } = step;
  const lines = [
    `pm.test('${expectedStatus} — the status the contract promises', function () {`,
    `  pm.response.to.have.status(${expectedStatus});`,
    '});',
    '',
  ];

  if (endpoint.response === 'Xml') {
    lines.push(
      "pm.test('an XML document (§5.13)', function () {",
      '  pm.expect(pm.response.text().trimStart()).to.match(/^<\\?xml/);',
      '});'
    );
  } else if (endpoint.response === 'Csv') {
    lines.push(
      "pm.test('a UTF-8 BOM so Excel reads the accents (§5.8)', function () {",
      '  pm.expect(pm.response.text().charCodeAt(0)).to.eql(0xfeff);',
      '});'
    );
  } else if (endpoint.response === 'Text') {
    lines.push(
      "pm.test('a non-empty text document (§5.13)', function () {",
      "  pm.expect(pm.response.text().trim()).to.not.eql('');",
      '});'
    );
  } else if (endpoint.response === 'NoContent') {
    lines.push(
      "pm.test('no body (prompt 51)', function () {",
      "  pm.expect(pm.response.text()).to.eql('');",
      '});'
    );
  } else if (endpoint.response === 'Null') {
    lines.push(
      "pm.test('an action envelope: null data and a message (§5.2)', function () {",
      '  var body = pm.response.json();',
      "  pm.expect(body).to.have.property('data', null);",
      "  pm.expect(body.message).to.be.a('string');",
      '});'
    );
  } else if (endpoint.response.endsWith('List')) {
    lines.push(
      "pm.test('a list envelope with pagination meta (§5.2)', function () {",
      '  var body = pm.response.json();',
      "  pm.expect(body.data).to.be.an('array');",
      "  ['page', 'perPage', 'total', 'totalPages'].forEach(function (key) {",
      "    pm.expect(body.meta[key], 'meta.' + key).to.be.a('number');",
      '  });',
      '});'
    );
    if (endpoint.key === 'properties.list' || endpoint.key === 'adminProperties.list') {
      lines.push(
        '',
        "pm.test('a property list carries facets (§5.7)', function () {",
        "  pm.expect(pm.response.json().meta.facets).to.be.an('object');",
        '});'
      );
    }
  } else {
    lines.push(
      "pm.test('a single-resource envelope (§5.2)', function () {",
      '  var body = pm.response.json();',
      "  pm.expect(body).to.have.property('data');",
      '});'
    );
  }

  if (endpoint.key === 'auth.login') {
    lines.push(
      '',
      '// The one request the rest of the collection depends on: it puts the',
      '// bearer token into the environment, and the collection sends it.'
    );
  }

  if (step.after.length > 0) {
    lines.push(
      '',
      '// What the run needs from this answer, and what it made that goes again.',
      ...(picks(step.after) ? PICK : []),
      ...actionLines(step.after, 'cleans up')
    );
  }

  return lines;
}

/** The pre-request script of a step that prepares something first, or `null`. */
function prerequestScript(step) {
  if (step.before.length === 0) return null;
  return [...(picks(step.before) ? PICK : []), ...actionLines(step.before, 'prepares')];
}

/** The saved response Postman shows under a request. */
function savedResponse(step, example) {
  const { endpoint } = step;
  if (!example?.response) return [];
  const { status, contentType } = example.response;
  const body =
    example.response.text !== undefined
      ? example.response.text
      : JSON.stringify(example.response.body, null, 2);

  return [
    {
      id: stableId(`response:${endpoint.key}`),
      name: `${status} — captured from the mock server`,
      // The request as the run sends it: the capture's own ids were of records
      // it had deleted again by the time the package was written.
      originalRequest: {
        method: step.method,
        header: [],
        url: { raw: `{{baseUrl}}${step.path}${step.query}`, host: ['{{baseUrl}}'] },
      },
      status: status === 201 ? 'Created' : status === 204 ? 'No Content' : 'OK',
      code: status,
      _postman_previewlanguage: contentType.includes('json') ? 'json' : 'text',
      header: [{ key: 'Content-Type', value: contentType }],
      cookie: [],
      body,
    },
  ];
}

/** The line that says whose token a request is sent with, when it is not the admin's. */
function sentAs(step, role) {
  const as = step.token === 'token' ? null : step.token.replace(/Token$/, '');
  if (as === 'throwaway') {
    return '- Sent as a throwaway account the request creates and signs in first, then signs out and deletes — the run never renames the admin or signs the admin out.';
  }
  if (as) {
    return `- Sent as **${as}**: the run signs that account in for this request (\`{{${as}Email}}\`) and out again.`;
  }
  return role && role !== 'admin'
    ? `- Sign in as **${role}** first to see this as the least privileged role that may call it.`
    : null;
}

/** One Postman request item, for one step of the run. */
function itemOf(step, example) {
  const { endpoint } = step;
  const role = TOKEN_FOR[endpoint.auth];
  const body = rawBody(step.body);

  const description = [
    endpoint.description,
    '',
    `- **Registry key** \`${endpoint.key}\``,
    `- **Auth** ${endpoint.auth === 'public' ? 'none' : `bearer token, minimum role \`${endpoint.auth}\``}`,
    `- **Success** ${step.expect}`,
    `- **Response shape** \`${endpoint.response}\` — see \`01_API_CONTRACT.md\``,
    endpoint.body ? `- **Body schema** \`${endpoint.body}\` — see \`03_ENDPOINTS.md\`` : null,
    sentAs(step, role),
  ]
    .filter((line) => line !== null)
    .join('\n');

  const prerequest = prerequestScript(step);
  const auth =
    endpoint.auth === 'public'
      ? { auth: { type: 'noauth' } }
      : step.token !== 'token'
        ? {
            auth: {
              type: 'bearer',
              bearer: [{ key: 'token', value: `{{${step.token}}}`, type: 'string' }],
            },
          }
        : {};

  return {
    id: stableId(`item:${endpoint.key}`),
    name: `${title(endpoint)} — ${endpoint.description}`,
    request: {
      method: endpoint.method,
      ...auth,
      header: [
        { key: 'Accept', value: 'application/json' },
        ...(body ? [{ key: 'Content-Type', value: 'application/json' }] : []),
      ],
      ...(body ? { body: { mode: 'raw', raw: body, options: { raw: { language: 'json' } } } } : {}),
      url: urlOf(step),
      description,
    },
    event: [
      ...(prerequest
        ? [
            {
              listen: 'prerequest',
              script: {
                id: stableId(`prerequest:${endpoint.key}`),
                type: 'text/javascript',
                exec: prerequest,
              },
            },
          ]
        : []),
      {
        listen: 'test',
        script: {
          id: stableId(`test:${endpoint.key}`),
          type: 'text/javascript',
          exec: testScript(step),
        },
      },
    ],
    response: savedResponse(step, example),
  };
}

/**
 * Builds the collection.
 *
 * @param {{generatedFrom: string, examples: object}} context
 * @returns {object} a Postman v2.1 collection
 */
function buildCollection({ generatedFrom, examples = {} }) {
  const item = buildPlan().map((folder) => ({
    id: stableId(`folder:${folder.module}`),
    name: folder.module,
    description:
      folder.module === 'sign out'
        ? 'Last: signing out revokes the token every request before it was sent with.'
        : `Every endpoint of the ${folder.module} module.`,
    item: folder.groups.map((group) => ({
      id: stableId(`folder:${folder.module}:${group.group}`),
      name: group.group,
      item: group.steps.map((step) => itemOf(step, examples[step.key])),
    })),
  }));

  return {
    info: {
      _postman_id: stableId('collection'),
      name: 'Squares N Acres API',
      description: [
        'Every endpoint of the contract, generated from `src/services/endpoints.js`.',
        '',
        '**Start here:** select the *Squares N Acres — Local mock* environment, open',
        '`auth › auth › POST /auth/login` and send it. Its test script writes',
        '`{{token}}` into the environment and every other request inherits it.',
        'To work as another role, change `email` and `password` in the environment',
        '(the manager and sales values are there, disabled) and sign in again.',
        '',
        '**Running the whole collection** (the Runner, in this order) is the parity',
        'check of `08_TESTING_AND_PARITY.md`: it checks health, signs in, creates each',
        'record before the requests that use it and deletes it after them, restates',
        'every setting it touches, and signs out last — every test green against a',
        'fresh mock, and against the Laravel API once it is equal to the mock.',
        '**It writes: run it against the mock or staging, never production.**',
        '',
        `generatedFrom: ${generatedFrom}`,
      ].join('\n'),
      schema: SCHEMA,
    },
    auth: { type: 'bearer', bearer: [{ key: 'token', value: '{{token}}', type: 'string' }] },
    event: [
      {
        listen: 'prerequest',
        script: {
          id: stableId('collection:prerequest'),
          type: 'text/javascript',
          exec: [
            "if (!pm.environment.get('baseUrl')) {",
            "  throw new Error('Select an environment first: baseUrl is not set.');",
            '}',
          ],
        },
      },
    ],
    item,
    variable: [
      { key: 'baseUrl', value: 'http://localhost:4000/api', type: 'string' },
      { key: 'token', value: '', type: 'string' },
    ],
  };
}

/**
 * The environment file: the local mock, with staging and the production values
 * alongside it, disabled. Postman uses the last enabled row of a key, so
 * enabling the staging `baseUrl` and disabling the local one switches the whole
 * collection over — the same one-line switch the frontend makes (BDG-03). The
 * collection writes, so a run belongs on the mock or staging (prompt 51).
 *
 * @param {{generatedFrom: string}} context
 * @returns {object} a Postman environment
 */
function buildEnvironment({ generatedFrom }) {
  const value = (key, val, { enabled = true, type = 'default' } = {}) => ({
    key,
    value: val,
    type,
    enabled,
  });

  return {
    id: stableId('environment'),
    name: 'Squares N Acres — Local mock',
    // The collection writes: it runs against the mock or staging. The two
    // production rows — one host (Layout A of 07_DEPLOYMENT.md) or two
    // (Layout B) — are there for sending a single read by hand.
    values: [
      value('baseUrl', 'http://localhost:4000/api'),
      value('baseUrl', 'https://staging.example/api', { enabled: false }),
      value('baseUrl', 'https://www.squaresnacres.com/api', { enabled: false }),
      value('baseUrl', 'https://api.squaresnacres.com/api', { enabled: false }),
      value('siteUrl', 'http://localhost:3000'),
      value('siteUrl', 'https://staging.example', { enabled: false }),
      value('siteUrl', 'https://www.squaresnacres.com', { enabled: false }),
      value('email', 'admin@squaresnacres.com'),
      value('password', 'Admin@123', { type: 'secret' }),
      value('email', 'manager@squaresnacres.com', { enabled: false }),
      value('password', 'Manager@123', { enabled: false, type: 'secret' }),
      value('email', 'sales@squaresnacres.com', { enabled: false }),
      value('password', 'Sales@123', { enabled: false, type: 'secret' }),
      // The one request of a run that is the sales desk's signs this account in.
      value('salesEmail', 'sales@squaresnacres.com'),
      value('salesPassword', 'Sales@123', { type: 'secret' }),
      value('token', '', { type: 'secret' }),
      value('tokenExpiresAt', ''),
    ],
    _postman_variable_scope: 'environment',
    _postman_exported_using: `generatedFrom: ${generatedFrom}`,
  };
}

module.exports = { buildCollection, buildEnvironment, stableId };
