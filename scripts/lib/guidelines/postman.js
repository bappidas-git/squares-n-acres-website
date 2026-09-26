/**
 * The Postman collection of the handover package (prompt 47 §2).
 *
 * One request per entry of `src/services/endpoints.js`, grouped module →
 * registry group, with the captured response saved as a Postman example and a
 * test that asserts the status and the envelope of §5.2. Sign in once and the
 * login's test script writes `{{token}}` into the environment; every other
 * request inherits it from the collection's bearer auth.
 *
 * Nothing here is random: the ids are hashes of the names, so regenerating the
 * package produces the same file.
 */

const crypto = require('crypto');

const { allEndpoints } = require('../../../src/services/endpoints');
const { TOKEN_FOR } = require('./fixtures');

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

/** Postman's url object, with `:param` filled from the registry's `example`. */
function urlOf(endpoint, example) {
  const captured = example?.request;
  const path = (captured?.path ?? endpoint.path).replace(/^\//, '');
  const segments = path.split('/').filter(Boolean);
  const query = (captured?.query ?? '')
    .split('&')
    .filter(Boolean)
    .map((pair) => {
      const [key, value = ''] = pair.split('=');
      return { key, value };
    });

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

/** The test script every request carries. */
function testScript(endpoint, expectedStatus) {
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
      '// bearer token into the environment, and the collection sends it.',
      "pm.environment.set('token', pm.response.json().data.token);",
      "pm.environment.set('tokenExpiresAt', pm.response.json().data.expiresAt);"
    );
  }

  return lines;
}

/** The saved response Postman shows under a request. */
function savedResponse(endpoint, example) {
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
      originalRequest: {
        method: example.request.method,
        header: [],
        url: { raw: `{{baseUrl}}${example.request.path}`, host: ['{{baseUrl}}'] },
      },
      status: status === 201 ? 'Created' : 'OK',
      code: status,
      _postman_previewlanguage: contentType.includes('json') ? 'json' : 'text',
      header: [{ key: 'Content-Type', value: contentType }],
      cookie: [],
      body,
    },
  ];
}

/** One Postman request item. */
function itemOf(endpoint, example) {
  // A report the API only takes note of answers 204 with no body (prompt 51).
  const expectedStatus =
    endpoint.response === 'NoContent'
      ? 204
      : endpoint.method === 'POST' && endpoint.key.endsWith('.create')
        ? 201
        : 200;
  const role = TOKEN_FOR[endpoint.auth];
  // The credentials belong to the environment, not to the collection: changing
  // `email` and `password` there is how a reader signs in as another role.
  const body =
    endpoint.key === 'auth.login'
      ? { email: '{{email}}', password: '{{password}}' }
      : example?.request?.body;

  const description = [
    endpoint.description,
    '',
    `- **Registry key** \`${endpoint.key}\``,
    `- **Auth** ${endpoint.auth === 'public' ? 'none' : `bearer token, minimum role \`${endpoint.auth}\``}`,
    `- **Response shape** \`${endpoint.response}\` — see \`01_API_CONTRACT.md\``,
    endpoint.body ? `- **Body schema** \`${endpoint.body}\` — see \`03_ENDPOINTS.md\`` : null,
    role && role !== 'admin'
      ? `- Sign in as **${role}** first to see this as the least privileged role that may call it.`
      : null,
  ]
    .filter((line) => line !== null)
    .join('\n');

  return {
    id: stableId(`item:${endpoint.key}`),
    name: `${title(endpoint)} — ${endpoint.description}`,
    request: {
      method: endpoint.method,
      ...(endpoint.auth === 'public' ? { auth: { type: 'noauth' } } : {}),
      header: [
        { key: 'Accept', value: 'application/json' },
        ...(body ? [{ key: 'Content-Type', value: 'application/json' }] : []),
      ],
      ...(body
        ? {
            body: {
              mode: 'raw',
              raw: JSON.stringify(body, null, 2),
              options: { raw: { language: 'json' } },
            },
          }
        : {}),
      url: urlOf(endpoint, example),
      description,
    },
    event: [
      {
        listen: 'test',
        script: {
          id: stableId(`test:${endpoint.key}`),
          type: 'text/javascript',
          exec: testScript(endpoint, expectedStatus),
        },
      },
    ],
    response: savedResponse(endpoint, example),
  };
}

/**
 * Builds the collection.
 *
 * @param {{generatedFrom: string, examples: object}} context
 * @returns {object} a Postman v2.1 collection
 */
function buildCollection({ generatedFrom, examples = {} }) {
  const byModule = new Map();

  for (const endpoint of allEndpoints()) {
    const group = String(endpoint.key).split('.')[0];
    if (!byModule.has(endpoint.module)) byModule.set(endpoint.module, new Map());
    const groups = byModule.get(endpoint.module);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(itemOf(endpoint, examples[endpoint.key]));
  }

  const item = [...byModule.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([module, groups]) => ({
      id: stableId(`folder:${module}`),
      name: module,
      description: `Every endpoint of the ${module} module.`,
      item: [...groups.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([group, items]) => ({
          id: stableId(`folder:${module}:${group}`),
          name: group,
          item: items,
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
        'Running the whole collection is the parity check of `08_TESTING_AND_PARITY.md`:',
        'point `{{baseUrl}}` at the Laravel API and every test that passes against',
        'the mock must pass against it.',
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
 * The environment file: the local mock, with the production values alongside
 * it, disabled. Postman uses the last enabled row of a key, so enabling the
 * production `baseUrl` and disabling the local one switches the whole
 * collection over — the same one-line switch the frontend makes (BDG-03).
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
    values: [
      value('baseUrl', 'http://localhost:4000/api'),
      value('baseUrl', 'https://api.squaresnacres.com/api', { enabled: false }),
      value('siteUrl', 'http://localhost:3000'),
      value('siteUrl', 'https://www.squaresnacres.com', { enabled: false }),
      value('email', 'admin@squaresnacres.com'),
      value('password', 'Admin@123', { type: 'secret' }),
      value('email', 'manager@squaresnacres.com', { enabled: false }),
      value('password', 'Manager@123', { enabled: false, type: 'secret' }),
      value('email', 'sales@squaresnacres.com', { enabled: false }),
      value('password', 'Sales@123', { enabled: false, type: 'secret' }),
      value('token', '', { type: 'secret' }),
      value('tokenExpiresAt', ''),
    ],
    _postman_variable_scope: 'environment',
    _postman_exported_using: `generatedFrom: ${generatedFrom}`,
  };
}

module.exports = { buildCollection, buildEnvironment, stableId };
