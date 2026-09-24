/**
 * The OpenAPI 3.1 description of the contract (prompt 47 §2).
 *
 * Every path, parameter and body comes from the same three sources the
 * frontend itself uses — `src/services/endpoints.js`, `src/services/schemas/`
 * and `mock-server/schemas/models.js` — so the specification cannot describe an
 * endpoint the application does not call, or a field the mock does not accept.
 *
 * It is written with the hand-rolled emitter in `./yaml.js`: no dependency, and
 * an output that is identical on every run.
 */

const { MODELS } = require('../../../mock-server/schemas/models');
const { allEndpoints } = require('../../../src/services/endpoints');
const schemas = require('../../../src/services/schemas');
const { document } = require('./yaml');

/** The response shape names that are a collection of §6. */
const SHAPE_COLLECTIONS = {
  Property: 'properties',
  Locality: 'localities',
  City: 'cities',
  PropertyType: 'propertyTypes',
  Amenity: 'amenities',
  Badge: 'badges',
  Developer: 'developers',
  Bank: 'banks',
  Lead: 'leads',
  Article: 'articles',
  ArticleCategory: 'articleCategories',
  ArticleTag: 'articleTags',
  Author: 'authors',
  Faq: 'faqs',
  Testimonial: 'testimonials',
  TeamMember: 'teamMembers',
  Partner: 'partners',
  Page: 'pages',
  HeaderMenu: 'headerMenus',
  Job: 'jobOpenings',
  JobApplication: 'jobApplications',
  Media: 'media',
  Redirect: 'redirects',
  NewsletterSubscriber: 'newsletterSubscribers',
  User: 'adminUsers',
  Settings: 'siteSettings',
  SeoSettings: 'seoSettings',
};

/** Shapes that are not JSON at all. */
const TEXT_SHAPES = {
  Csv: { contentType: 'text/csv', description: 'UTF-8 with a byte-order mark (§5.8)' },
  Xml: { contentType: 'text/xml', description: 'an XML document, no envelope (§5.13)' },
  Text: { contentType: 'text/plain', description: 'plain text, no envelope (§5.13)' },
};

/** The literal schemas for the shapes no collection describes. */
const EXTRA_SCHEMAS = {
  BulkResult: {
    type: 'object',
    properties: {
      affected: { type: 'integer', description: 'how many records the action changed' },
    },
    required: ['affected'],
  },
  SlugCheck: {
    type: 'object',
    properties: {
      available: { type: 'boolean' },
      suggestion: {
        type: ['string', 'null'],
        description: 'a free slug when the asked-for one is taken',
      },
    },
    required: ['available'],
  },
  PreviewToken: {
    type: 'object',
    properties: {
      token: { type: 'string', description: 'valid for 24 hours' },
      url: { type: 'string', format: 'uri' },
    },
    required: ['token', 'url'],
  },
  ViewCount: {
    type: 'object',
    properties: { viewCount: { type: 'integer' } },
    required: ['viewCount'],
  },
  DocumentAccess: {
    type: 'object',
    description:
      'Every file of the listing with its address — the ones a public read leaves without one, and the open ones: the brochure, the documents, and the drawings and PDFs of the floor plans and of the active unit configurations.',
    properties: {
      brochureUrl: { type: ['string', 'null'], format: 'uri' },
      documents: {
        type: 'array',
        items: {
          type: 'object',
          properties: { id: { type: 'integer' }, url: { type: 'string', format: 'uri' } },
          required: ['id', 'url'],
        },
      },
      floorPlans: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            imageUrl: { type: ['string', 'null'], format: 'uri' },
            pdfUrl: { type: ['string', 'null'], format: 'uri' },
          },
          required: ['id', 'imageUrl', 'pdfUrl'],
        },
      },
      unitConfigurations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            floorPlanImageUrl: { type: ['string', 'null'], format: 'uri' },
            floorPlanPdfUrl: { type: ['string', 'null'], format: 'uri' },
          },
          required: ['id', 'floorPlanImageUrl', 'floorPlanPdfUrl'],
        },
      },
    },
    required: ['brochureUrl', 'documents', 'floorPlans', 'unitConfigurations'],
  },
  LeadCreated: {
    description: 'The stored lead, plus the token that opens the listing’s gated files.',
    allOf: [
      { $ref: '#/components/schemas/Lead' },
      {
        type: 'object',
        properties: {
          access: {
            type: ['object', 'null'],
            description:
              'Present when the lead names an active listing; send `token` to `POST /properties/:id/documents/access`. Valid for 24 hours.',
            properties: {
              token: { type: 'string' },
              expiresAt: { type: 'string', format: 'date-time' },
            },
            required: ['token', 'expiresAt'],
          },
        },
        required: ['access'],
      },
    ],
  },
  AuthSession: {
    type: 'object',
    properties: {
      token: { type: 'string', description: 'send as `Authorization: Bearer <token>`' },
      expiresAt: { type: 'string', format: 'date-time' },
      user: { $ref: '#/components/schemas/User' },
    },
    required: ['token', 'expiresAt', 'user'],
  },
  Suggestions: {
    type: 'object',
    description: 'At most five of each (§5.14).',
    properties: {
      localities: { type: 'array', items: { type: 'object' } },
      properties: { type: 'array', items: { type: 'object' } },
      propertyTypes: { type: 'array', items: { type: 'object' } },
      developers: { type: 'array', items: { type: 'object' } },
    },
  },
  ArticleAdjacent: {
    type: 'object',
    properties: {
      previous: { oneOf: [{ $ref: '#/components/schemas/Article' }, { type: 'null' }] },
      next: { oneOf: [{ $ref: '#/components/schemas/Article' }, { type: 'null' }] },
    },
  },
  RedirectImportSummary: {
    type: 'object',
    properties: {
      created: { type: 'integer' },
      updated: { type: 'integer' },
      skipped: { type: 'integer' },
      errors: { type: 'array', items: { type: 'object' } },
    },
  },
  LlmsPreview: {
    type: 'object',
    properties: { content: { type: 'string', description: 'the generated llms.txt' } },
  },
  SeoOverviewRow: {
    type: 'object',
    description: 'One lightweight row of the SEO desk (§5.14).',
    properties: {
      id: { type: 'integer' },
      type: { type: 'string' },
      title: { type: 'string' },
      slug: { type: 'string' },
      url: { type: 'string' },
      seo: { type: 'object' },
      isActive: { type: 'boolean' },
      status: { type: ['string', 'null'] },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  DashboardData: {
    type: 'object',
    description: 'The admin dashboard (§6.16). Sales users see lead figures scoped to themselves.',
    properties: {
      stats: { type: 'object', additionalProperties: { type: 'number' } },
      trends: {
        type: 'object',
        properties: {
          leadsByDay: { type: 'array', items: { type: 'object' } },
          leadsBySource: { type: 'array', items: { type: 'object' } },
          leadsByStatus: { type: 'array', items: { type: 'object' } },
          viewsByDay: { type: 'array', items: { type: 'object' } },
        },
      },
      recentLeads: { type: 'array', items: { type: 'object' } },
      topProperties: { type: 'array', items: { type: 'object' } },
      seoHealth: { type: 'object' },
      upcomingFollowUps: { type: 'array', items: { type: 'object' } },
    },
  },
  PageNav: {
    type: 'object',
    description: 'A CMS page as the header and footer need it.',
    properties: {
      id: { type: 'integer' },
      title: { type: 'string' },
      slug: { type: 'string' },
      showInHeader: { type: 'boolean' },
      headerMenu: { type: ['string', 'null'] },
      showInFooter: { type: 'boolean' },
      footerColumn: { type: ['string', 'null'] },
      order: { type: 'integer' },
    },
  },
  ListMeta: {
    type: 'object',
    description: 'The pagination block of §5.2. Property lists add `facets` (§5.7).',
    properties: {
      page: { type: 'integer' },
      perPage: { type: 'integer' },
      total: { type: 'integer' },
      totalPages: { type: 'integer' },
      facets: { type: 'object' },
    },
    required: ['page', 'perPage', 'total', 'totalPages'],
  },
  Error: {
    type: 'object',
    description: 'The error envelope of §5.3.',
    properties: {
      message: { type: 'string' },
      errors: {
        type: 'object',
        additionalProperties: { type: 'array', items: { type: 'string' } },
        description: 'field name → messages; nested keys are dotted (`location.localityId`)',
      },
    },
    required: ['message'],
  },
};

/* ------------------------------------------------------------------ *
 * Descriptors → JSON Schema
 * ------------------------------------------------------------------ */

/** One field descriptor as a JSON Schema node. */
function toJsonSchema(descriptor) {
  const nullable = Boolean(descriptor.nullable);
  const withNull = (type) => (nullable ? [type, 'null'] : type);
  const node = {};

  switch (descriptor.type) {
    case 'int':
      node.type = withNull('integer');
      break;
    case 'number':
      node.type = withNull('number');
      break;
    case 'bool':
      node.type = withNull('boolean');
      break;
    case 'enum':
      node.type = withNull('string');
      node.enum = nullable ? [...(descriptor.enum ?? []), null] : [...(descriptor.enum ?? [])];
      break;
    case 'date':
      node.type = withNull('string');
      node.format = 'date';
      break;
    case 'datetime':
      node.type = withNull('string');
      node.format = 'date-time';
      break;
    case 'email':
      node.type = withNull('string');
      node.format = 'email';
      break;
    case 'url':
      node.type = withNull('string');
      node.format = 'uri';
      break;
    case 'phone':
      node.type = withNull('string');
      node.pattern = '^(\\+91)?[6-9]\\d{9}$';
      break;
    case 'slug':
      node.type = withNull('string');
      node.pattern = '^[a-z0-9-]+$';
      break;
    case 'html':
      node.type = withNull('string');
      node.description = 'sanitised HTML';
      break;
    case 'array':
      node.type = withNull('array');
      node.items = descriptor.items ? toJsonSchema(descriptor.items) : {};
      break;
    case 'object':
      node.type = withNull('object');
      if (descriptor.shape) {
        node.properties = shapeToProperties(descriptor.shape);
        const required = requiredOf(descriptor.shape);
        if (required.length > 0) node.required = required;
      }
      break;
    default:
      node.type = withNull('string');
  }

  if (typeof descriptor.maxLength === 'number') node.maxLength = descriptor.maxLength;
  if (typeof descriptor.min === 'number') {
    if (node.type === 'integer' || node.type === 'number') node.minimum = descriptor.min;
    else if (descriptor.type === 'array') node.minItems = descriptor.min;
    else node.minLength = descriptor.min;
  }
  if (typeof descriptor.max === 'number') {
    if (descriptor.type === 'array') node.maxItems = descriptor.max;
    else if (node.type === 'integer' || node.type === 'number') node.maximum = descriptor.max;
  }
  if ('default' in descriptor && descriptor.default !== undefined)
    node.default = descriptor.default;
  if (descriptor.note && !node.description) node.description = descriptor.note;
  if (descriptor.read) node.readOnly = true;

  return node;
}

const shapeToProperties = (shape) =>
  Object.fromEntries(Object.entries(shape).map(([name, d]) => [name, toJsonSchema(d)]));

/**
 * Whether a registry entry is a body shape at all.
 *
 * `src/services/schemas/index.js` registers every export of every group, and
 * `page.js` exports two constants next to its shapes (`PATH_SLUG_PATTERN`,
 * `PATH_SLUG_MAX_LENGTH`) — they belong to the page form, not to the contract.
 */
const isShape = (value) =>
  Boolean(value) &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.values(value).every(
    (d) => d && typeof d === 'object' && !Array.isArray(d) && typeof d.type === 'string'
  );

const requiredOf = (shape) =>
  Object.entries(shape)
    .filter(([, d]) => d.required && !d.serverManaged)
    .map(([name]) => name);

/** A `components.schemas` name for a request-body key (`property.create`). */
const bodySchemaName = (key) =>
  key
    .split('.')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');

/* ------------------------------------------------------------------ *
 * Parameters
 * ------------------------------------------------------------------ */

/** A query descriptor of the registry as a parameter schema. */
function queryParameter(name, descriptor) {
  const parameter = { name, in: 'query', required: false };

  if (descriptor.startsWith('csv:enum:')) {
    const values = descriptor.slice('csv:enum:'.length).split(',');
    parameter.description = `comma-separated; each of ${values.join(', ')} (§5.6)`;
    parameter.schema = { type: 'string' };
  } else if (descriptor.startsWith('csv:')) {
    parameter.description = `comma-separated ${descriptor.slice(4)} values (§5.6)`;
    parameter.schema = { type: 'string' };
  } else if (descriptor.startsWith('enum:')) {
    parameter.schema = { type: 'string', enum: descriptor.slice(5).split(',') };
  } else if (descriptor === 'int') {
    parameter.schema = { type: 'integer' };
  } else if (descriptor === 'number') {
    parameter.schema = { type: 'number' };
  } else if (descriptor === 'bool') {
    parameter.schema = { type: 'string', enum: ['true', 'false'] };
  } else if (descriptor === 'date') {
    parameter.schema = { type: 'string', format: 'date' };
  } else {
    parameter.schema = { type: 'string' };
  }

  return parameter;
}

/* ------------------------------------------------------------------ *
 * The document
 * ------------------------------------------------------------------ */

/** `/properties/slug/:slug` → `/properties/slug/{slug}` */
const templated = (path) => path.replace(/:([a-zA-Z]+)/g, '{$1}');

/** The path parameters an endpoint declares. */
const pathParameters = (endpoint) =>
  (endpoint.path.match(/:([a-zA-Z]+)/g) ?? []).map((raw) => {
    const name = raw.slice(1);
    return {
      name,
      in: 'path',
      required: true,
      description: name === 'slug' ? 'the public slug of the record' : `the ${name} of the record`,
      schema: name === 'slug' ? { type: 'string' } : { type: 'integer' },
      example: name === 'slug' ? String(endpoint.example) : Number(endpoint.example) || 1,
    };
  });

/** The responses an endpoint can answer with. */
function responsesFor(endpoint, example) {
  const ok = endpoint.method === 'POST' && endpoint.key.endsWith('.create') ? '201' : '200';
  const text = TEXT_SHAPES[endpoint.response];
  const responses = {};

  const error = (description) => ({
    description,
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
  });

  if (text) {
    responses[ok] = {
      description: text.description,
      content: { [text.contentType]: { schema: { type: 'string' } } },
    };
  } else {
    const schema = envelopeSchema(endpoint.response);
    const content = { 'application/json': { schema } };
    if (example && example.response && example.response.body !== undefined) {
      content['application/json'].example = example.response.body;
    }
    responses[ok] = { description: `${endpoint.response} (§5.2)`, content };
  }

  if (endpoint.auth !== 'public') {
    responses['401'] = error('the token is missing, expired or revoked (§5.4)');
    responses['403'] = error('the role may not do this (§7)');
  }
  if (/:[a-zA-Z]+/.test(endpoint.path)) responses['404'] = error('no such record (§5.10)');
  if (endpoint.body) responses['422'] = error('validation failed (§5.3)');
  if (endpoint.path === '/leads' || endpoint.path === '/newsletter/subscribe') {
    responses['429'] = error('rate limited — ten per minute per IP (§5.11)');
  }

  return responses;
}

/** The `{ data, meta }` wrapper a response shape gets (§5.2). */
function envelopeSchema(shape) {
  if (shape === 'Null') {
    return {
      type: 'object',
      properties: { data: { type: 'null' }, message: { type: 'string' } },
      required: ['data', 'message'],
    };
  }

  if (shape.endsWith('List')) {
    const item = shape.slice(0, -4);
    const ref = knownSchema(item) ? { $ref: `#/components/schemas/${item}` } : { type: 'object' };
    return {
      type: 'object',
      properties: {
        data: { type: 'array', items: ref },
        meta: { $ref: '#/components/schemas/ListMeta' },
      },
      required: ['data', 'meta'],
    };
  }

  const ref = knownSchema(shape) ? { $ref: `#/components/schemas/${shape}` } : { type: 'object' };
  return { type: 'object', properties: { data: ref }, required: ['data'] };
}

const knownSchema = (name) =>
  Boolean(SHAPE_COLLECTIONS[name]) || Boolean(EXTRA_SCHEMAS[name]) || name === 'PageNav';

/**
 * Builds the whole specification.
 *
 * @param {{generatedFrom: string, version: string, examples: object}} context
 * @returns {object} the OpenAPI document, ready for the YAML emitter
 */
function buildSpec({ generatedFrom, version, examples = {} }) {
  const endpoints = allEndpoints();
  const modules = [...new Set(endpoints.map((endpoint) => endpoint.module))].sort();

  const paths = {};
  for (const endpoint of endpoints) {
    const path = templated(endpoint.path);
    const item = (paths[path] ??= {});
    const method = endpoint.method.toLowerCase();
    const example = examples[endpoint.key];

    const parameters = [
      ...pathParameters(endpoint),
      ...Object.entries(endpoint.query ?? {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, descriptor]) => queryParameter(name, descriptor)),
    ];

    const operation = {
      operationId: endpoint.key,
      tags: [endpoint.module],
      summary: endpoint.description,
      description: `Minimum role: \`${endpoint.auth}\` (§7). Registry key \`${endpoint.key}\`.`,
      security: endpoint.auth === 'public' ? [] : [{ bearerAuth: [] }],
    };

    if (parameters.length > 0) operation.parameters = parameters;

    if (endpoint.body) {
      const name = bodySchemaName(endpoint.body);
      const content = {
        'application/json': { schema: { $ref: `#/components/schemas/${name}` } },
      };
      if (example?.request?.body) content['application/json'].example = example.request.body;
      operation.requestBody = { required: true, content };
    }

    operation.responses = responsesFor(endpoint, example);
    item[method] = operation;
  }

  const bodySchemas = {};
  for (const key of schemas.schemaKeys()) {
    const shape = schemas.getSchema(key);
    if (!isShape(shape)) continue;
    const name = bodySchemaName(key);
    bodySchemas[name] = {
      type: 'object',
      description: `Request body \`${key}\` (\`src/services/schemas/\`).`,
      properties: shapeToProperties(shape),
      ...(requiredOf(shape).length > 0 ? { required: requiredOf(shape) } : {}),
    };
  }

  const modelSchemas = {};
  for (const [name, collection] of Object.entries(SHAPE_COLLECTIONS)) {
    const model = MODELS[collection];
    if (!model) continue;
    modelSchemas[name] = {
      type: 'object',
      description: `The \`${collection}\` collection (§6). Read-only keys are marked.`,
      properties: shapeToProperties(model.fields),
    };
  }

  const sorted = (object) =>
    Object.fromEntries(Object.entries(object).sort(([a], [b]) => a.localeCompare(b)));

  return {
    openapi: '3.1.0',
    info: {
      title: 'Squares N Acres API',
      version,
      summary: 'The contract the React frontend calls and the Laravel API must answer.',
      description: [
        'Generated by `npm run generate:backend-guidelines` from',
        '`src/services/endpoints.js`, `src/services/schemas/` and',
        '`mock-server/schemas/models.js`. Do not edit by hand.',
        '',
        `generatedFrom: ${generatedFrom}`,
        '',
        'Read `01_API_CONTRACT.md` first: the envelopes of §5.2, the error body',
        'of §5.3 and the pagination of §5.6 apply to every operation below and',
        'are not repeated on each one.',
      ].join('\n'),
      contact: { name: 'Squares N Acres', url: 'https://www.squaresnacres.com' },
    },
    servers: [
      { url: 'http://localhost:4000/api', description: 'Local mock server (`npm run mock`)' },
      { url: 'https://api.squaresnacres.com/api', description: 'Production' },
    ],
    tags: modules.map((name) => ({ name, description: `Endpoints of the ${name} module` })),
    paths: sorted(paths),
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'A Sanctum personal access token: `Authorization: Bearer <token>` (§5.4).',
        },
      },
      schemas: sorted({ ...modelSchemas, ...EXTRA_SCHEMAS, ...bodySchemas }),
    },
  };
}

/** The whole `openapi.yaml`. */
const renderOpenApi = (context) => document(buildSpec(context));

module.exports = {
  SHAPE_COLLECTIONS,
  bodySchemaName,
  buildSpec,
  isShape,
  renderOpenApi,
  toJsonSchema,
};
