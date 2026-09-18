/**
 * Field descriptors → Laravel validation rules and MySQL column types
 * (prompt 47 §4.2; the mini-language is documented in
 * `mock-server/schemas/README.md`).
 *
 * One descriptor is one rule string, assembled in the order the README
 * promises: presence → nullability → type → bounds → relations. Nested
 * descriptors keep the dotted path Laravel and the 422 body of §5.3 use —
 * `images.*.alt`, `location.localityId`.
 */

/** `db.json` collection → MySQL table (§4.2 of prompt 47: snake_case, plural). */
const snakeCase = (name) =>
  String(name)
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();

/** The table a collection is stored in. */
const tableOf = (collection) => snakeCase(collection);

/** Irregular plurals the `Id` → collection guess cannot reach. */
const PLURALS = {
  city: 'cities',
  amenity: 'amenities',
  property: 'properties',
  category: 'categories',
  company: 'companies',
};

const pluralise = (word) => {
  if (PLURALS[word]) return PLURALS[word];
  if (/[^aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/.test(word)) return `${word}es`;
  return `${word}s`;
};

/**
 * Foreign keys whose name does not spell out the collection it points at.
 * Everything else is derived: `localityId` → `localities`, `amenityIds.*` →
 * `amenities`, `propertyTypeId` → `property_types`.
 */
const FOREIGN_KEYS = {
  assignedTo: 'adminUsers',
  createdBy: 'adminUsers',
  updatedBy: 'adminUsers',
  userId: 'adminUsers',
  categoryId: 'articleCategories',
  tagIds: 'articleTags',
  jobId: 'jobOpenings',
  memberIds: 'teamMembers',
  teamMemberId: 'teamMembers',
  relatedArticleIds: 'articles',
  relatedPropertyIds: 'properties',
  similarPropertyIds: 'properties',
  excludeId: null,
};

/**
 * The collection a field name references, or `null` when it references nothing.
 *
 * @param {string} field the field name, without its dotted path
 * @returns {string|null} a `db.json` collection name
 */
function referencedCollection(field) {
  if (!field) return null;
  if (field in FOREIGN_KEYS) return FOREIGN_KEYS[field];

  const single = /^([a-zA-Z]+?)Id$/.exec(field);
  if (single) return pluralise(single[1]);

  const many = /^([a-zA-Z]+?)Ids$/.exec(field);
  if (many) return pluralise(many[1]);

  return null;
}

/** The type rule each descriptor type contributes. */
const TYPE_RULES = {
  string: 'string',
  html: 'string',
  int: 'integer',
  number: 'numeric',
  bool: 'boolean',
  date: 'date_format:Y-m-d',
  datetime: 'date',
  email: 'email',
  phone: 'regex:/^(\\+91)?[6-9]\\d{9}$/',
  url: 'url',
  slug: 'regex:/^[a-z0-9-]+$/',
  array: 'array',
  object: 'array',
};

/** Types whose `min`/`max` are lengths rather than magnitudes. */
const LENGTH_TYPES = new Set(['string', 'html', 'slug', 'email', 'url', 'array']);

/**
 * The Laravel rule string for one descriptor.
 *
 * @param {object} descriptor a field descriptor
 * @param {{field?: string, collection?: string, path?: string}} [context]
 *        `field` the key's own name, `collection` the collection being written
 *        (for `unique:`), `path` the dotted path for nested keys
 * @returns {string} e.g. `required|string|max:300`
 */
function laravelRule(descriptor, context = {}) {
  if (!descriptor || typeof descriptor !== 'object') return 'nullable';

  const { field, collection } = context;
  const parts = [];

  if (descriptor.required) parts.push('required');
  else if (descriptor.requiredIf) {
    const { field: other, in: values } = descriptor.requiredIf;
    parts.push(`required_if:${other},${(values ?? []).join(',')}`);
  }

  // A slug may always be sent empty: the API generates one from the title and
  // de-duplicates it (§5.9), so the column is optional even where it is not
  // declared nullable.
  if (descriptor.nullable || (!descriptor.required && descriptor.type === 'slug')) {
    parts.push('nullable');
  }

  if (descriptor.type === 'enum') {
    parts.push(`in:${(descriptor.enum ?? []).join(',')}`);
  } else if (TYPE_RULES[descriptor.type]) {
    parts.push(TYPE_RULES[descriptor.type]);
  }

  const isLength = LENGTH_TYPES.has(descriptor.type);
  if (typeof descriptor.min === 'number') parts.push(`min:${descriptor.min}`);
  if (typeof descriptor.max === 'number' && isLength) parts.push(`max:${descriptor.max}`);
  else if (typeof descriptor.max === 'number') parts.push(`max:${descriptor.max}`);
  if (typeof descriptor.maxLength === 'number') parts.push(`max:${descriptor.maxLength}`);
  if (descriptor.pattern && descriptor.type !== 'slug') parts.push(`regex:/${descriptor.pattern}/`);

  const references = referencedCollection(field);
  if (references && (descriptor.type === 'int' || descriptor.type === 'number')) {
    parts.push(`exists:${tableOf(references)},id`);
  }

  if ((descriptor.unique || descriptor.type === 'slug') && collection) {
    parts.push(`unique:${tableOf(collection)},${snakeCase(field ?? 'id')}`);
  }

  return parts.join('|') || 'nullable';
}

/**
 * Every rule a shape produces, nested keys included, in declaration order.
 *
 * `array` items become `<path>.*`, `object` shapes become `<path>.<key>`, which
 * is the notation Laravel validates with and the 422 body of §5.3 reports.
 *
 * @param {object} shape `{ field: descriptor }`
 * @param {{collection?: string, prefix?: string}} [context]
 * @returns {Array<{path: string, rule: string, descriptor: object}>}
 */
function rulesFor(shape, context = {}) {
  const { collection, prefix = '' } = context;
  const out = [];

  for (const [field, descriptor] of Object.entries(shape ?? {})) {
    if (!descriptor || descriptor.read || descriptor.serverManaged) continue;

    const path = prefix ? `${prefix}.${field}` : field;
    out.push({ path, rule: laravelRule(descriptor, { field, collection }), descriptor });

    if (descriptor.type === 'array' && descriptor.items) {
      const item = descriptor.items;
      out.push({
        path: `${path}.*`,
        rule: laravelRule(item, { field, collection }),
        descriptor: item,
      });
      if (item.type === 'object' && item.shape) {
        out.push(...rulesFor(item.shape, { collection, prefix: `${path}.*` }));
      }
    }

    if (descriptor.type === 'object' && descriptor.shape) {
      out.push(...rulesFor(descriptor.shape, { collection, prefix: path }));
    }
  }

  return out;
}

/** A human summary of a descriptor's type, for the documentation tables. */
function describeType(descriptor) {
  if (!descriptor) return '—';
  if (descriptor.type === 'enum') return `enum (${(descriptor.enum ?? []).join(', ')})`;
  if (descriptor.type === 'array') {
    const item = descriptor.items;
    if (!item) return 'array';
    if (item.type === 'object') return 'object[]';
    return `${item.type}[]`;
  }
  return descriptor.type ?? '—';
}

/** How a default is written in a table: `[]`, `{}`, `null`, `''`, or the value. */
function describeDefault(descriptor) {
  if (!descriptor || !('default' in descriptor)) return '—';
  const value = descriptor.default;
  if (value === null) return '`null`';
  if (value === '') return "`''`";
  if (Array.isArray(value)) return value.length === 0 ? '`[]`' : `\`${JSON.stringify(value)}\``;
  if (typeof value === 'object') return '`{}`';
  return `\`${JSON.stringify(value)}\``;
}

module.exports = {
  describeDefault,
  describeType,
  laravelRule,
  pluralise,
  referencedCollection,
  rulesFor,
  snakeCase,
  tableOf,
  TYPE_RULES,
};
