/**
 * MySQL 8 DDL for the handover package (prompt 47 §4.2).
 *
 * The tables come from `mock-server/schemas/models.js` — the same descriptors
 * the mock validates with — plus the relational mapping rules below, which say
 * which of the nested arrays and objects of §6 become their own tables, which
 * are flattened into columns, and which stay `JSON`.
 *
 * The prose explanation lives in `docs/backend-notes/04_relational_mapping.md`;
 * the rules themselves live here so the notes, `04_DATA_MODELS.md` and
 * `schema.sql` cannot drift apart.
 */

const { MODELS } = require('../../../mock-server/schemas/models');
const { snakeCase, tableOf, referencedCollection } = require('./rules');

/** `ON DELETE` for a reference into master data a property depends on. */
const RESTRICT = 'RESTRICT';
/** `ON DELETE` for a row that has no meaning without its parent. */
const CASCADE = 'CASCADE';
/** `ON DELETE` for an optional pointer: the row survives, the pointer empties. */
const SET_NULL = 'SET NULL';

/** Collections that keep a `deleted_at` column (§4.2 of prompt 47). */
const SOFT_DELETED = new Set(['properties', 'articles', 'pages', 'leads']);

/** Foreign keys whose `ON DELETE` is not the default `RESTRICT`. */
const ON_DELETE = {
  assignedTo: SET_NULL,
  createdBy: SET_NULL,
  updatedBy: SET_NULL,
  authorId: SET_NULL,
  teamMemberId: SET_NULL,
  developerId: SET_NULL,
  propertyId: SET_NULL,
  articleId: SET_NULL,
  userId: CASCADE,
  jobId: CASCADE,
  propertyTypeId: RESTRICT,
  localityId: RESTRICT,
  cityId: RESTRICT,
  categoryId: RESTRICT,
};

/**
 * A child table extracted from a nested array.
 *
 * `parent` is added as `<parent_singular>_id` with `ON DELETE CASCADE`, and an
 * `order` column keeps the array's order, because SQL rows have none.
 */
const child = (table, field, { ordered = true } = {}) => ({ table, field, ordered });

/**
 * A many-to-many pivot extracted from an id array.
 *
 * `position` preserves the order the admin chose, which `similarPropertyIds`
 * and `tagIds` both rely on.
 */
const pivot = (table, field, target, { positioned = false } = {}) => ({
  table,
  field,
  target,
  positioned,
});

/**
 * How each collection's nested structures are stored.
 *
 *   children  arrays of objects that become their own table
 *   pivots    arrays of ids that become a join table
 *   json      fields kept as a `JSON` column (their shape is the contract, but
 *             nothing queries inside them)
 *   flatten   objects unpacked into columns; `prefix` is prepended to every key
 *             unless the key appears in `aliases`
 *   stored    fields the API computes but stores, so they are columns after all
 *   types     a column type the descriptor cannot express
 *   omit      fields that never reach the database
 */
const MAPPING = {
  properties: {
    children: [
      child('property_images', 'images'),
      child('property_documents', 'documents'),
      child('property_floor_plans', 'floorPlans'),
      child('property_unit_configurations', 'unitConfigurations'),
      child('property_nearby_places', 'nearbyPlaces'),
      child('property_construction_timeline', 'constructionTimeline'),
      child('property_faqs', 'faqs'),
    ],
    pivots: [
      pivot('property_amenity', 'amenityIds', 'amenities'),
      pivot('property_badge', 'badgeIds', 'badges'),
      pivot('property_similar', 'similarPropertyIds', 'properties', { positioned: true }),
    ],
    json: ['highlights', 'specifications', 'constructionSpecs', 'sectionVisibility', 'seo'],
    flatten: {
      location: { prefix: '', json: [] },
      pricing: { prefix: '', json: ['otherCharges'] },
      area: { prefix: '', json: [] },
      configuration: { prefix: '', json: [] },
      project: {
        prefix: 'project_',
        aliases: {
          developerId: 'developer_id',
          landmarkProject: 'is_landmark_project',
          projectAreaAcres: 'project_area_acres',
        },
        json: ['approvals'],
      },
      agent: { prefix: 'agent_', aliases: { teamMemberId: 'agent_team_member_id' }, json: [] },
    },
  },
  localities: { json: ['pincodes', 'highlights', 'connectivity', 'seo'] },
  cities: {},
  propertyTypes: { json: ['seo'] },
  amenities: {},
  badges: {},
  developers: { json: ['reraIds', 'highlights', 'seo'] },
  banks: { json: ['features'] },
  leads: {
    children: [
      child('lead_notes', 'notes', { ordered: false }),
      child('lead_activities', 'activities', { ordered: false }),
    ],
    json: ['requirement', 'utm', 'meta'],
  },
  articles: {
    pivots: [pivot('article_tag', 'tagIds', 'articleTags', { positioned: true })],
    json: ['faqs', 'relatedArticleIds', 'relatedPropertyIds', 'seo'],
    flatten: { featuredImage: { prefix: 'featured_image_', json: [] } },
    // Read-only to a client, but written by the API on every save and stored:
    // `content_text` is what the full-text index and the two counts are built
    // from. The aggregates of the other collections (`propertyCount`,
    // `articleCount`) are counted on read and are not columns.
    stored: ['contentText', 'readingTimeMinutes', 'wordCount'],
    // A whole article in plain text is not 255 characters.
    types: { contentText: 'LONGTEXT', excerpt: 'VARCHAR(300)' },
  },
  articleCategories: { json: ['seo'] },
  articleTags: {},
  authors: { json: ['socialLinks', 'seo'] },
  faqs: {},
  testimonials: {},
  teamMembers: { json: ['socialLinks'] },
  partners: {},
  pages: { children: [child('page_blocks', 'blocks')], json: ['seo'] },
  jobOpenings: { json: ['responsibilities', 'requirements'] },
  jobApplications: {},
  media: { json: ['tags'] },
  siteSettings: { singleton: true },
  seoSettings: { singleton: true },
  redirects: {},
  newsletterSubscribers: {},
  adminUsers: {},
  apiTokens: { table: 'personal_access_tokens', note: 'Laravel Sanctum owns this table' },
  propertyViews: {},
};

/** The singular a child table's foreign key is named after. */
const SINGULAR = {
  properties: 'property',
  leads: 'lead',
  pages: 'page',
  articles: 'article',
  amenities: 'amenity',
  badges: 'badge',
  articleTags: 'article_tag',
};

const parentKey = (collection) => `${SINGULAR[collection] ?? snakeCase(collection)}_id`;

/* ------------------------------------------------------------------ *
 * Column types
 * ------------------------------------------------------------------ */

/** Columns whose numeric precision is not the money default. */
const NUMERIC_PRECISION = {
  latitude: 'DECIMAL(10,7)',
  longitude: 'DECIMAL(10,7)',
  interest_rate_min: 'DECIMAL(5,2)',
  interest_rate_max: 'DECIMAL(5,2)',
  max_ltv_percent: 'DECIMAL(5,2)',
  project_area_acres: 'DECIMAL(10,3)',
  rating: 'DECIMAL(2,1)',
};

/**
 * The MySQL type one descriptor becomes.
 *
 * @param {object} descriptor a field descriptor
 * @param {string} column the snake_case column name
 * @returns {string} a MySQL 8 column type
 */
function columnType(descriptor, column, { references = null } = {}) {
  switch (descriptor.type) {
    case 'int':
      return column.endsWith('_id') || column === 'id' || references ? 'BIGINT UNSIGNED' : 'INT';
    case 'number':
      return NUMERIC_PRECISION[column] ?? 'DECIMAL(14,2)';
    case 'bool':
      return 'TINYINT(1)';
    case 'date':
      return 'DATE';
    case 'datetime':
      return 'DATETIME';
    case 'email':
      return 'VARCHAR(191)';
    case 'phone':
      return 'VARCHAR(20)';
    case 'url':
      return 'VARCHAR(500)';
    case 'slug':
      return `VARCHAR(${descriptor.maxLength ?? 75})`;
    case 'enum':
      return 'VARCHAR(40)';
    case 'html':
      return 'LONGTEXT';
    case 'array':
    case 'object':
      return 'JSON';
    case 'string':
    default: {
      const length = descriptor.maxLength ?? 255;
      return length > 1000 ? 'TEXT' : `VARCHAR(${length})`;
    }
  }
}

/** The SQL literal for a descriptor's default, or `null` when there is none. */
function defaultLiteral(descriptor, column, type) {
  if (type === 'JSON' || type === 'LONGTEXT' || type === 'TEXT') return null;
  if (!('default' in descriptor)) return descriptor.nullable ? 'NULL' : null;

  const value = descriptor.default;
  if (value === null) return 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
  return null;
}

/** One column definition, ready to be rendered. */
function makeColumn(name, descriptor, { collection, comment, column: forced } = {}) {
  const column = forced ?? snakeCase(name);
  const references = descriptor.type === 'int' ? referencedCollection(name) : null;
  const type = columnType(descriptor, column, { references });
  const unique = Boolean(descriptor.unique) || descriptor.type === 'slug';
  const notes = [];

  if (descriptor.type === 'enum') notes.push((descriptor.enum ?? []).join('|'));
  if (comment) notes.push(comment);
  if (descriptor.note) notes.push(descriptor.note);

  // A column is `NOT NULL` when the descriptor promises a value: either the
  // write contract requires one, or the API substitutes a default. The wide
  // types cannot carry a default in MySQL, so they stay nullable.
  const wide = type === 'JSON' || type === 'TEXT' || type === 'LONGTEXT';
  const nullable = descriptor.nullable
    ? true
    : wide
      ? !descriptor.required
      : !descriptor.required && !('default' in descriptor);

  return {
    column,
    field: name,
    type,
    nullable,
    default: unique ? null : defaultLiteral(descriptor, column, type),
    comment: notes.join(' · '),
    references,
    onDelete: ON_DELETE[name] ?? RESTRICT,
    unique,
    collection,
  };
}

/* ------------------------------------------------------------------ *
 * Tables
 * ------------------------------------------------------------------ */

const TIMESTAMP_COLUMNS = [
  { column: 'created_at', type: 'DATETIME', nullable: true, default: null, comment: '' },
  { column: 'updated_at', type: 'DATETIME', nullable: true, default: null, comment: '' },
];

/** Indexes every listable table earns, on top of the per-collection ones. */
const INDEXED_COLUMNS = [
  'locality_id',
  'city_id',
  'property_type_id',
  'developer_id',
  'category_id',
  'author_id',
  'assigned_to',
  'listing_type',
  'segment',
  'construction_status',
  'availability',
  'is_active',
  'is_featured',
  'price',
  'rent_per_month',
  'published_at',
  'status',
  'priority',
  'source',
  'order',
];

/** Full-text indexes (prompt 47 §3). */
const FULLTEXT = {
  properties: ['title', 'project_name', 'short_description'],
  articles: ['title', 'content_text'],
};

/** Flattens one object field into columns. */
function flattenObject(name, descriptor, rule, collection) {
  const columns = [];
  const prefix = rule.prefix ?? `${snakeCase(name)}_`;

  for (const [key, child_] of Object.entries(descriptor.shape ?? {})) {
    if (child_.read || child_.serverManaged) continue;

    const alias = rule.aliases?.[key];
    const column = alias ?? `${prefix}${snakeCase(key)}`;
    const asJson = (rule.json ?? []).includes(key);
    // The descriptor's own key decides what it references (`developerId` →
    // `developers`), while the column keeps the aliased name.
    const made = makeColumn(key, asJson ? { ...child_, type: 'object' } : child_, {
      collection,
      column,
      comment: `${name}.${key}`,
    });
    made.field = `${name}.${key}`;
    if (made.references) made.type = 'BIGINT UNSIGNED';
    columns.push(made);
  }

  return columns;
}

/** The columns and indexes of one collection's own table. */
function mainTable(collection, model) {
  const rule = MAPPING[collection] ?? {};
  const table = rule.table ?? tableOf(collection);
  const columns = [];
  const childFields = new Set((rule.children ?? []).map((entry) => entry.field));
  const pivotFields = new Set((rule.pivots ?? []).map((entry) => entry.field));

  if (rule.singleton) {
    columns.push({
      column: 'id',
      type: 'TINYINT UNSIGNED',
      nullable: false,
      default: '1',
      comment: 'always 1 — one row per installation',
      primary: true,
    });
  } else {
    columns.push({
      column: 'id',
      type: 'BIGINT UNSIGNED',
      nullable: false,
      default: null,
      comment: '',
      autoIncrement: true,
      primary: true,
    });
  }

  const stored = new Set(rule.stored ?? []);

  for (const [name, descriptor] of Object.entries(model.fields ?? {})) {
    if (name === 'id' || name === 'createdAt' || name === 'updatedAt') continue;
    if (descriptor.read && !stored.has(name)) continue;
    if (childFields.has(name) || pivotFields.has(name)) continue;

    const asJson = (rule.json ?? []).includes(name) || rule.singleton;
    if (!asJson && descriptor.type === 'object' && rule.flatten?.[name]) {
      columns.push(...flattenObject(name, descriptor, rule.flatten[name], collection));
      continue;
    }

    const column = makeColumn(name, asJson ? { ...descriptor, type: 'object' } : descriptor, {
      collection,
    });

    const override = rule.types?.[name];
    if (override) {
      column.type = override;
      // The wide types carry no default in MySQL, so the column becomes
      // nullable rather than `NOT NULL` with nothing to put in it.
      if (['JSON', 'TEXT', 'LONGTEXT', 'MEDIUMTEXT'].includes(override)) {
        column.default = null;
        column.nullable = true;
      }
    }

    columns.push(column);
  }

  columns.push(...TIMESTAMP_COLUMNS);
  if (SOFT_DELETED.has(collection)) {
    columns.push({
      column: 'deleted_at',
      type: 'DATETIME',
      nullable: true,
      default: null,
      comment: 'soft delete',
    });
  }

  const names = new Set(columns.map((entry) => entry.column));
  const indexes = INDEXED_COLUMNS.filter((column) => names.has(column)).map((column) => ({
    column,
    kind: 'index',
  }));
  const unique = columns.filter((entry) => entry.unique).map((entry) => entry.column);
  const fullText = FULLTEXT[collection]?.filter((column) => names.has(column)) ?? [];

  return { table, collection, columns, indexes, unique, fullText, note: rule.note ?? '' };
}

/** A child table extracted from a nested array of objects. */
function childTable(collection, model, entry) {
  const descriptor = model.fields[entry.field];
  const shape = descriptor?.items?.shape ?? {};
  const columns = [
    {
      column: 'id',
      type: 'BIGINT UNSIGNED',
      nullable: false,
      default: null,
      comment: '',
      autoIncrement: true,
      primary: true,
    },
    {
      column: parentKey(collection),
      type: 'BIGINT UNSIGNED',
      nullable: false,
      default: null,
      comment: '',
      references: collection,
      onDelete: CASCADE,
    },
  ];

  for (const [key, child_] of Object.entries(shape)) {
    if (key === 'id' || child_.read) continue;
    columns.push(makeColumn(key, child_, { collection }));
  }

  if (entry.ordered && !columns.some((column) => column.column === 'order')) {
    columns.push({
      column: 'order',
      type: 'INT',
      nullable: false,
      default: '0',
      comment: 'position inside the parent array',
    });
  }
  // A note carries its own `createdAt`; only the timestamps the shape does not
  // already declare are added.
  const declared = new Set(columns.map((column) => column.column));
  columns.push(...TIMESTAMP_COLUMNS.filter((column) => !declared.has(column.column)));

  const names = new Set(columns.map((column) => column.column));
  return {
    table: entry.table,
    collection,
    parentOf: entry.field,
    columns,
    indexes: [{ column: parentKey(collection), kind: 'index' }].concat(
      names.has('order') ? [{ column: 'order', kind: 'index' }] : []
    ),
    unique: [],
    fullText: [],
    note: `rows of ${collection}.${entry.field}`,
  };
}

/** A many-to-many table extracted from an array of ids. */
function pivotTable(collection, entry) {
  const left = parentKey(collection);
  const right =
    entry.target === collection
      ? `similar_${parentKey(collection)}`
      : `${SINGULAR[entry.target] ?? snakeCase(entry.target).replace(/s$/, '')}_id`;

  const columns = [
    {
      column: left,
      type: 'BIGINT UNSIGNED',
      nullable: false,
      default: null,
      comment: '',
      references: collection,
      onDelete: CASCADE,
    },
    {
      column: right,
      type: 'BIGINT UNSIGNED',
      nullable: false,
      default: null,
      comment: '',
      references: entry.target,
      onDelete: CASCADE,
    },
  ];

  if (entry.positioned) {
    columns.push({
      column: 'position',
      type: 'INT',
      nullable: false,
      default: '0',
      comment: 'the order the admin chose',
    });
  }

  return {
    table: entry.table,
    collection,
    parentOf: entry.field,
    pivot: true,
    columns,
    primaryKey: [left, right],
    indexes: [{ column: right, kind: 'index' }],
    unique: [],
    fullText: [],
    note: `${collection}.${entry.field}`,
  };
}

/**
 * Every table of the schema, in creation order: master data first, then the
 * tables that reference it, then the children and pivots that reference those.
 *
 * @returns {Array<object>} table descriptors
 */
function buildSchema() {
  const order = [
    'cities',
    'localities',
    'propertyTypes',
    'amenities',
    'badges',
    'developers',
    'banks',
    'adminUsers',
    'teamMembers',
    'articleCategories',
    'articleTags',
    'authors',
    'properties',
    'articles',
    'pages',
    'faqs',
    'testimonials',
    'partners',
    'jobOpenings',
    'jobApplications',
    'leads',
    'media',
    'redirects',
    'newsletterSubscribers',
    'siteSettings',
    'seoSettings',
    'propertyViews',
    'apiTokens',
  ];

  const missing = Object.keys(MODELS).filter((name) => !order.includes(name));
  const tables = [];

  for (const collection of [...order.filter((name) => MODELS[name]), ...missing]) {
    const model = MODELS[collection];
    const rule = MAPPING[collection] ?? {};

    tables.push(mainTable(collection, model));
    for (const entry of rule.children ?? []) tables.push(childTable(collection, model, entry));
    for (const entry of rule.pivots ?? []) tables.push(pivotTable(collection, entry));
  }

  return tables;
}

/* ------------------------------------------------------------------ *
 * Rendering
 * ------------------------------------------------------------------ */

const TABLE_SUFFIX = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';

const quote = (name) => `\`${name}\``;

/** One `CREATE TABLE` statement. */
function renderTable(table, byCollection) {
  const lines = [];
  const definitions = [];

  for (const column of table.columns) {
    const parts = [quote(column.column), column.type];
    if (column.autoIncrement) parts.push('NOT NULL AUTO_INCREMENT');
    else if (!column.nullable) parts.push('NOT NULL');
    else parts.push('NULL');
    if (column.default !== null && column.default !== undefined && !column.autoIncrement) {
      parts.push(`DEFAULT ${column.default}`);
    }
    if (column.comment) parts.push(`COMMENT '${column.comment.replace(/'/g, "''")}'`);
    definitions.push(`  ${parts.join(' ')}`);
  }

  if (table.primaryKey)
    definitions.push(`  PRIMARY KEY (${table.primaryKey.map(quote).join(', ')})`);
  else definitions.push('  PRIMARY KEY (`id`)');

  for (const column of table.unique) {
    definitions.push(`  UNIQUE KEY ${quote(`${table.table}_${column}_unique`)} (${quote(column)})`);
  }
  for (const index of table.indexes) {
    definitions.push(
      `  KEY ${quote(`${table.table}_${index.column}_index`)} (${quote(index.column)})`
    );
  }
  if (table.fullText.length > 0) {
    // one combined index, which is what `MATCH … AGAINST` needs
    definitions.push(
      `  FULLTEXT KEY ${quote(`${table.table}_fulltext`)} (${table.fullText.map(quote).join(', ')})`
    );
  }

  for (const column of table.columns) {
    if (!column.references) continue;
    const target = byCollection[column.references];
    if (!target) continue;
    definitions.push(
      `  CONSTRAINT ${quote(`${table.table}_${column.column}_foreign`)} FOREIGN KEY (${quote(
        column.column
      )}) REFERENCES ${quote(target)} (\`id\`) ON DELETE ${column.onDelete ?? RESTRICT}`
    );
  }

  lines.push(`-- collection: ${table.collection}${table.note ? ` — ${table.note}` : ''}`);
  lines.push(`CREATE TABLE ${quote(table.table)} (`);
  lines.push(definitions.join(',\n'));
  lines.push(`) ${TABLE_SUFFIX};`);

  return lines.join('\n');
}

/**
 * The whole `schema.sql`.
 *
 * @param {{generatedFrom: string}} context
 * @returns {string} MySQL 8 DDL, LF line endings, no trailing whitespace
 */
function renderDdl({ generatedFrom }) {
  const tables = buildSchema();
  const byCollection = {};
  for (const table of tables) {
    if (!table.parentOf && !byCollection[table.collection])
      byCollection[table.collection] = table.table;
  }

  const header = [
    '-- Squares N Acres — MySQL 8 schema for the Laravel API',
    '--',
    '-- Generated by `npm run generate:backend-guidelines` from',
    '-- `mock-server/schemas/models.js` and the relational mapping rules of',
    '-- `scripts/lib/guidelines/sql.js`. Do not edit this file by hand.',
    `-- generatedFrom: ${generatedFrom}`,
    '--',
    '-- Conventions:',
    '--   * utf8mb4 / utf8mb4_unicode_ci, InnoDB, `id` BIGINT UNSIGNED AUTO_INCREMENT',
    '--   * every timestamp is UTC; the API renders ISO-8601 (§5.5)',
    '--   * enum columns are VARCHAR with the allowed values in the comment; the',
    '--     application validates them against `src/config/enums.js`',
    '--   * `ON DELETE RESTRICT` for master data a listing depends on,',
    '--     `ON DELETE CASCADE` for the rows of a nested array,',
    '--     `ON DELETE SET NULL` for an optional pointer such as `assigned_to`',
    '--   * `deleted_at` marks the four soft-deleted tables',
    '',
    'SET NAMES utf8mb4;',
    'SET FOREIGN_KEY_CHECKS = 0;',
    '',
  ].join('\n');

  const body = tables.map((table) => renderTable(table, byCollection)).join('\n\n');

  return `${header}\n${body}\n\nSET FOREIGN_KEY_CHECKS = 1;\n`;
}

/** Rows for the camelCase → snake_case mapping table of `04_DATA_MODELS.md`. */
function mappingRows() {
  const rows = [];
  for (const table of buildSchema()) {
    for (const column of table.columns) {
      if (!column.field) continue;
      rows.push([table.collection, column.field, table.table, column.column, column.type]);
    }
  }
  return rows;
}

module.exports = {
  MAPPING,
  buildSchema,
  columnType,
  mappingRows,
  parentKey,
  renderDdl,
  SOFT_DELETED,
};
