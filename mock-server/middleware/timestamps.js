/**
 * Ids, timestamps and the difference between `PUT` and `PATCH`
 * (00_MASTER_CONTEXT.md §5.5, §5.8; decision D14).
 *
 *   POST  → `id = max(id) + 1`, `createdAt = updatedAt = now`
 *   PUT   → replaces the record: model defaults first, then the body; the id,
 *           `createdAt` and every server-managed value survive
 *   PATCH → merges only what it sends, one level deep for the object fields,
 *           so `PATCH { seo: { title } }` keeps the rest of `seo`
 *
 * Read-only fields are dropped from every body rather than rejected (§5.5):
 * `id`, `createdAt`, `updatedAt`, `viewCount`, `enquiryCount`,
 * `readingTimeMinutes`, `wordCount`, `contentText`, the counters
 * (`propertyCount`, `articleCount`) and the embedded read objects
 * (`locality`, `city`, `propertyType`, `developer`, `amenities`, `badges`,
 * `property`, `assignedUser`, `category`, `author`, `tags`, `job`). The list is
 * not hard-coded: a field is read-only exactly when its descriptor says
 * `read` or `serverManaged`, which is also why `media.tags` — a writable array
 * of strings that happens to share a name with the article embed — survives.
 */

const { nextId } = require('../lib/ids');

/**
 * Object fields merged one level deep on `PATCH`, so a partial object does not
 * wipe the keys it leaves out.
 */
const DEEP_MERGE_FIELDS = new Set([
  'pricing',
  'area',
  'location',
  'configuration',
  'project',
  'sectionVisibility',
  'seo',
  'agent',
]);

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isReadOnly = (descriptor) => Boolean(descriptor?.read || descriptor?.serverManaged);

/** A structural copy, so a default can never be shared between two records. */
const clone = (value) =>
  value === null || typeof value !== 'object' ? value : JSON.parse(JSON.stringify(value));

/**
 * Keeps only the keys the schema knows and the client is allowed to send.
 * Unknown keys are dropped silently — a `PATCH` carrying a typo stores nothing
 * and still answers 200 (§7 of prompt 06).
 */
function sanitize(body, shape) {
  if (!isPlainObject(body)) return {};
  const clean = {};

  for (const [field, descriptor] of Object.entries(shape)) {
    if (isReadOnly(descriptor)) continue;
    if (!Object.prototype.hasOwnProperty.call(body, field)) continue;

    const value = body[field];
    if (descriptor.type === 'object' && descriptor.shape && isPlainObject(value)) {
      clean[field] = sanitize(value, descriptor.shape);
      continue;
    }
    clean[field] = value;
  }

  return clean;
}

/**
 * The record a `PUT` starts from: every optional field at its documented
 * default, so a body that omits one stores the default instead of `undefined`.
 *
 * An object field that declares both a `shape` and a `default` gets the shape's
 * defaults with the declared default applied on top — that is how `agent`
 * arrives complete rather than as the bare `{ showOnListing: false }` the
 * table in §6.1 abbreviates it to.
 *
 * @param {Record<string, object>} shape
 * @returns {object}
 */
function buildDefaults(shape) {
  const defaults = {};

  for (const [field, descriptor] of Object.entries(shape)) {
    if (descriptor.read) continue;
    const declared = Object.prototype.hasOwnProperty.call(descriptor, 'default');

    if (descriptor.type === 'object' && descriptor.shape) {
      // A declared object default refines the shape's defaults; a declared
      // `null` (`lead.requirement`, `lead.utm`) replaces them outright.
      if (declared && !isPlainObject(descriptor.default)) {
        defaults[field] = clone(descriptor.default);
        continue;
      }
      const nested = buildDefaults(descriptor.shape);
      const merged = declared ? { ...nested, ...clone(descriptor.default) } : nested;
      if (Object.keys(merged).length > 0) defaults[field] = merged;
      continue;
    }
    if (declared) {
      defaults[field] = clone(descriptor.default);
      continue;
    }
    if (descriptor.type === 'array' && !descriptor.required) defaults[field] = [];
  }

  return defaults;
}

/**
 * Layers a body over the defaults, descending into objects so that a `PUT`
 * sending `pricing: { price }` keeps `pricing.currency` rather than dropping
 * every key it did not mention (§5.8).
 */
function mergeDefaults(defaults, body) {
  const merged = { ...defaults };

  for (const [field, value] of Object.entries(body)) {
    merged[field] =
      isPlainObject(value) && isPlainObject(defaults[field])
        ? mergeDefaults(defaults[field], value)
        : value;
  }

  return merged;
}

/** The server-managed values of an existing record, which a `PUT` may not reset. */
function serverManagedValues(record, shape) {
  const kept = {};
  for (const [field, descriptor] of Object.entries(shape)) {
    if (!descriptor.serverManaged) continue;
    if (Object.prototype.hasOwnProperty.call(record, field)) kept[field] = record[field];
  }
  return kept;
}

/**
 * One level of merging for the object fields listed in {@link DEEP_MERGE_FIELDS}.
 *
 * `everyField` widens that to every object branch, which is what a singleton
 * needs: `siteSettings`' top-level keys are its object fields, so a
 * `PATCH { newsletter: { title } }` must keep the rest of `newsletter`.
 */
function deepPatch(existing, body, everyField = false) {
  const patched = {};
  for (const [field, value] of Object.entries(body)) {
    const merge = everyField || DEEP_MERGE_FIELDS.has(field);
    patched[field] =
      merge && isPlainObject(value) && isPlainObject(existing?.[field])
        ? { ...existing[field], ...value }
        : value;
  }
  return patched;
}

/**
 * Rewrites the body of every write that reaches the generic JSON Server router.
 *
 * @param {{getModel: Function, getCollection: Function, getSingleton: Function}} deps
 * @returns {import('express').RequestHandler}
 */
function timestamps({ getModel, getCollection, getSingleton }) {
  return (req, res, next) => {
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
      next();
      return;
    }

    const segments = req.path.split('/').filter(Boolean);
    if (segments.length === 0 || segments.length > 2) {
      next();
      return;
    }

    const [name, id] = segments;
    const model = getModel(name);
    if (!model) {
      next();
      return;
    }

    const now = new Date().toISOString();
    const body = sanitize(req.body, model.fields);

    if (model.singleton) {
      // A singleton is merged into, never replaced: `PUT /admin/settings`
      // deep-merges the known keys (§5.14), and so does `PATCH`.
      req.body = { ...deepPatch(getSingleton(name) ?? {}, body, true), updatedAt: now };
      next();
      return;
    }

    const rows = getCollection(name);

    if (req.method === 'POST') {
      req.body = {
        ...mergeDefaults(buildDefaults(model.fields), body),
        id: nextId(rows),
        createdAt: now,
        updatedAt: now,
      };
      next();
      return;
    }

    const existing = rows.find((record) => String(record?.id) === String(id));
    if (!existing) {
      // Nothing to update: the router answers 404 on its own.
      next();
      return;
    }

    req.body =
      req.method === 'PUT'
        ? {
            ...mergeDefaults(
              {
                ...buildDefaults(model.fields),
                ...serverManagedValues(existing, model.fields),
              },
              body
            ),
            id: existing.id,
            createdAt: existing.createdAt,
            updatedAt: now,
          }
        : { ...deepPatch(existing, body), updatedAt: now };

    next();
  };
}

module.exports = {
  timestamps,
  buildDefaults,
  mergeDefaults,
  sanitize,
  deepPatch,
  serverManagedValues,
  DEEP_MERGE_FIELDS,
};
