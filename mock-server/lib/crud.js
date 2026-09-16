/**
 * The CRUD factory (00_MASTER_CONTEXT.md §5.6, §5.8, §5.9, §5.14).
 *
 * Twenty of the contract's resources are the same endpoint eight times over: a
 * public list, a public slug lookup, an admin list that adds `isActive` and
 * `perPage=all`, `POST`, `GET /:id`, `PUT`, `PATCH`, `DELETE`, `bulk` and
 * `check-slug`. Writing them twenty times would mean twenty chances to spell
 * `meta.totalPages` differently, so they are written once here and configured
 * per resource in `mock-server/routes/masterData.js`.
 *
 * What a resource still owns is the part that is actually its own: which
 * filters it accepts, what it embeds, what it counts, what a save derives
 * (`beforeSave`) and what stops a delete (`deleteGuard`). Everything a
 * hand-written router would have repeated — the §5.8 write semantics, the
 * slug rules of §5.9, the envelope, the 404s — comes from here.
 *
 *   makeCrudRouter({ db, model, basePath: 'localities', schema: 'locality', … })
 *
 * The router it returns is mounted under `/api` like any other custom router,
 * so it is authenticated and role-checked by `mock-server/app.js` before it
 * runs.
 */

const express = require('express');

const schemas = require('../../src/services/schemas');
const { checkSlug, ensureUniqueSlug, slugify } = require('./slug');
const { conflict, notFound } = require('../middleware/errors');
const { describeUsages, findUsages, USAGE_COLLECTIONS } = require('./usage');
const { inCsv, matchesQ, toBool } = require('./filters');
const { nextId } = require('./ids');
const { omit } = require('./scope');
const {
  paginate,
  toPositiveInt,
  DEFAULT_PER_PAGE_ADMIN,
  DEFAULT_PER_PAGE_PUBLIC,
} = require('./paginate');
const { sortItems } = require('./sort');
const { validateBody } = require('../middleware/validate');
const {
  buildDefaults,
  deepPatch,
  mergeDefaults,
  sanitize,
  serverManagedValues,
} = require('../middleware/timestamps');

const first = (value) => (Array.isArray(value) ? value[0] : value);

const sameId = (left, right) => String(left) === String(right);

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Normalises a sort shorthand.
 *
 * `'order,name'` sorts ascending by both; `'-propertyCount'` defaults to
 * descending and still honours an explicit `order=asc`.
 *
 * @param {string|{spec: string, order?: string}} entry
 * @returns {{spec: string, order: 'asc'|'desc'}}
 */
function parseSortEntry(entry) {
  if (isPlainObject(entry)) {
    return { spec: entry.spec, order: entry.order === 'desc' ? 'desc' : 'asc' };
  }

  const text = String(entry);
  return text.startsWith('-')
    ? { spec: text.slice(1), order: 'desc' }
    : { spec: text, order: 'asc' };
}

/**
 * Applies one declarative filter descriptor.
 *
 * A descriptor is either a field name with a type — `'string'`, `'int'`,
 * `'bool'`, `'csv'` — or a predicate `(record, value, context) => boolean` for
 * the handful of filters that compare something computed.
 */
function matchesFilter(record, descriptor, raw, context) {
  if (typeof descriptor === 'function') return descriptor(record, raw, context);

  const { field, type = 'string' } = descriptor;
  const value = field.split('.').reduce((step, key) => step?.[key], record);

  if (type === 'bool') {
    const wanted = toBool(raw);
    return wanted === undefined ? true : Boolean(value) === wanted;
  }
  if (type === 'csv') {
    const wanted = inCsv(raw);
    return wanted.length === 0 || wanted.includes(String(value));
  }
  if (type === 'csvArray') {
    const wanted = inCsv(raw);
    if (wanted.length === 0) return true;
    return Array.isArray(value) && value.some((entry) => wanted.includes(String(entry)));
  }
  return String(value ?? '') === String(first(raw));
}

/**
 * Builds a resource's router.
 *
 * @param {object} options
 * @param {object} options.db the runtime database module
 * @param {object} options.model the collection descriptor (`schemas/models.js`)
 * @param {string} options.basePath the admin path segment (`'article-tags'`)
 * @param {string} options.schema the `src/services/schemas` key prefix
 * @param {string|false} [options.publicPath] the public path segment; `false`
 *   for an admin-only resource (media)
 * @param {boolean} [options.slugged] defaults to "the model has a slug field"
 * @param {Array<string>} [options.collections] collections `afterRead` needs
 * @param {Function} [options.afterRead] `(record, {admin, collections, query, list}) => record`
 *   — the embeds and computed counters of §5.5
 * @param {Function} [options.publicTransform] `(record) => record`
 * @param {Function} [options.listShape] `(record, {admin}) => record` — the
 *   trimmed row a list returns
 * @param {object} [options.publicFilters] `{ param: descriptor }`
 * @param {object} [options.adminFilters] added to the public ones on `/admin`
 * @param {object} [options.sorts] `{ alias: 'field' | '-field' | 'a,b' }`
 * @param {string} [options.defaultSort] a key of `sorts`
 * @param {string} [options.publicDefaultSort] when the public default differs
 * @param {Function} [options.beforeValidate] `(body, ctx) => body` — runs on
 *   the request body before the 422 checks, for the ids and inferred values a
 *   client is not expected to send
 * @param {Function} [options.beforeSave] `(record, ctx) => record`
 * @param {Function} [options.afterSave] `(record, ctx) => void`
 * @param {Function} [options.beforeDelete] `(record, ctx) => void`
 * @param {string|false} [options.deleteGuard] a `lib/usage.js` type
 * @param {object} [options.bulkActions] extra actions, `{ name: changes|null }`
 * @param {{one: string, many: string}} [options.noun] for the bulk message
 * @param {boolean} [options.publicScoped] force the public active scope on/off
 * @param {Array<string>} [options.routes] the subset to build — `list`,
 *   `bySlug`, `adminList`, `create`, `get`, `update`, `patch`, `remove`,
 *   `bulk`, `checkSlug`. All of them by default; a resource whose contract
 *   stops short (job applications have no `PUT`) names what it has.
 * @returns {import('express').Router}
 */
function makeCrudRouter(options) {
  const {
    db,
    model,
    basePath,
    schema,
    publicPath = basePath,
    slugged = Boolean(model.slugField),
    collections: needed = [],
    afterRead,
    publicTransform,
    listShape,
    publicFilters = {},
    adminFilters = {},
    sorts = {},
    defaultSort,
    publicDefaultSort,
    beforeValidate,
    beforeSave,
    afterSave,
    beforeDelete,
    deleteGuard = false,
    bulkActions = {},
    noun = { one: 'record', many: 'records' },
    publicScoped = Boolean(model.publicScope),
    routes = null,
  } = options;

  const router = express.Router();
  const name = model.collection;
  /** Whether this resource declares a route (§5.14 differs per resource). */
  const has = (route) => routes === null || routes.includes(route);
  const searchable = model.searchable ?? [];
  const hasField = (field) => Object.prototype.hasOwnProperty.call(model.fields, field);

  const rows = () => db.getCollection(name);
  const find = (id) => rows().find((record) => sameId(record?.id, id));

  /**
   * The collections `afterRead` resolves ids against, read fresh per request.
   * A name that is a singleton (`siteSettings`) arrives as the object.
   */
  const source = () =>
    Object.fromEntries(needed.map((key) => [key, db.getSingleton(key) ?? db.getCollection(key)]));

  /**
   * The collections the delete guard searches.
   *
   * Built from `db` rather than read off the runtime database directly, so a
   * test driving its own copy of the seed guards against that copy.
   */
  const usageSource = () =>
    Object.fromEntries(
      USAGE_COLLECTIONS.map((key) => [
        key,
        key === 'siteSettings' ? db.getSingleton(key) : db.getCollection(key),
      ])
    );

  /** The §5.8 bulk actions this resource supports. */
  const actions = {
    ...(hasField('isActive')
      ? { activate: { isActive: true }, deactivate: { isActive: false } }
      : {}),
    ...(hasField('isFeatured')
      ? { feature: { isFeatured: true }, unfeature: { isFeatured: false } }
      : {}),
    delete: null,
    ...bulkActions,
  };

  /** True when a public reader may see this record (§5.10). */
  function inPublicScope(record) {
    if (!publicScoped || !model.publicScope) return true;
    return Object.entries(model.publicScope).every(([field, value]) => record[field] === value);
  }

  /**
   * A record as a response returns it: the embeds and counters of `afterRead`,
   * then — on the public prefix — the model's `publicOmit` list and whatever
   * else the resource strips (§5.10), then the list trim.
   */
  function scope(record, { admin, list }) {
    if (admin) return list && listShape ? listShape(record, { admin }) : record;
    let output = omit(record, model.publicOmit ?? []);
    if (publicTransform) output = publicTransform(output);
    return list && listShape ? listShape(output, { admin }) : output;
  }

  /** One record as a response returns it. */
  function present(record, { admin, collections = source(), query = {}, list = false } = {}) {
    const context = { admin, collections, query, list };
    const read = afterRead ? afterRead(record, context) : { ...record };
    return scope(read, { admin, list });
  }

  /** Every row a request may see, decorated so counts are filterable and sortable. */
  function decoratedRows({ admin, collections, query }) {
    const visible = admin ? rows() : rows().filter(inPublicScope);
    const context = { admin, collections, query, list: true };
    return visible.map((record) => (afterRead ? afterRead(record, context) : { ...record }));
  }

  /** Filters, `q` and `ids`, in the order §5.6 applies them. */
  function applyFilters(items, query, { admin, collections }) {
    const descriptors = admin ? { ...publicFilters, ...adminFilters } : publicFilters;
    const context = { admin, collections, query, db };

    let result = items;

    for (const [param, descriptor] of Object.entries(descriptors)) {
      const raw = query[param];
      if (raw === undefined || raw === '') continue;
      result = result.filter((record) => matchesFilter(record, descriptor, raw, context));
    }

    if (admin && hasField('isActive')) {
      const wanted = toBool(query.isActive);
      if (wanted !== undefined)
        result = result.filter((record) => Boolean(record.isActive) === wanted);
    }

    const q = first(query.q);
    if (q) result = result.filter((record) => matchesQ(record, searchable, q));

    const ids = inCsv(query.ids);
    if (ids.length > 0) {
      // `ids` asks for those records in that order (§5.7).
      return ids.map((id) => result.find((record) => sameId(record.id, id))).filter(Boolean);
    }

    return result;
  }

  /** The §5.6 sort, falling back to the resource's documented default. */
  function applySort(items, query, { admin }) {
    if (inCsv(query.ids).length > 0) return items;

    const fallback = (admin ? defaultSort : (publicDefaultSort ?? defaultSort)) ?? null;
    const requested = String(first(query.sort) ?? '');
    const key = Object.prototype.hasOwnProperty.call(sorts, requested) ? requested : fallback;
    if (!key || !sorts[key]) return items;

    const { spec, order } = parseSortEntry(sorts[key]);
    const wanted = String(first(query.order) ?? '').toLowerCase();
    return sortItems(items, spec, wanted === 'asc' || wanted === 'desc' ? wanted : order);
  }

  /** `perPage`, with `all` reserved for the admin routes (§5.6). */
  function pageSize(query, admin) {
    if (admin && String(first(query.perPage)) === 'all') return null;
    return toPositiveInt(
      first(query.perPage),
      admin ? DEFAULT_PER_PAGE_ADMIN : DEFAULT_PER_PAGE_PUBLIC
    );
  }

  /** The `{ data, meta }` of a list response. */
  function listResponse(req, res, { admin }) {
    const collections = source();
    const filtered = applyFilters(
      decoratedRows({ admin, collections, query: req.query }),
      req.query,
      {
        admin,
        collections,
      }
    );
    const sorted = applySort(filtered, req.query, { admin });
    const { data, meta } = paginate(sorted, {
      page: first(req.query.page),
      perPage: pageSize(req.query, admin),
    });

    res.ok(
      data.map((record) => scope(record, { admin, list: true })),
      meta
    );
  }

  /**
   * The slug of a write: the one the client chose, or one made from the title.
   * An explicit duplicate is a 409 (§5.9); an empty one is de-duplicated.
   */
  function resolveSlug(body, existing) {
    const requested = slugify(body?.slug ?? '');
    const excludeId = existing?.id ?? null;

    if (requested) {
      const { available } = checkSlug(rows(), requested, excludeId, model.slugField);
      if (!available) {
        throw conflict('The slug has already been taken.', {
          slug: ['The slug has already been taken.'],
        });
      }
      return requested;
    }

    const fallback = body?.name ?? body?.title ?? existing?.name ?? existing?.title ?? '';
    return ensureUniqueSlug(rows(), slugify(fallback), excludeId, model.slugField);
  }

  /** The entity slug and `seo.slug` are always the same string (§5.9, D34). */
  function applySlug(record, slug) {
    if (!slugged) return record;
    record[model.slugField] = slug;
    if (hasField('seo')) record.seo = { ...(record.seo ?? {}), slug };
    return record;
  }

  /** The request body a write starts from, after the resource's own pass. */
  function prepare(body, context) {
    const copy = { ...(body ?? {}) };
    return beforeValidate ? beforeValidate(copy, { ...context, db }) : copy;
  }

  /**
   * Turns a request body into a stored record, per the §5.8 semantics:
   * `POST` starts from the model defaults, `PUT` from the defaults plus the
   * server-managed values it may not reset, `PATCH` from the record itself.
   */
  function buildRecord(body, { existing = null, method, user }) {
    const clean = sanitize({ ...body }, model.fields);
    const now = new Date().toISOString();
    const audit = hasField('createdBy') ? { updatedBy: user?.id ?? null } : {};

    let record;
    if (method === 'POST') {
      record = {
        ...mergeDefaults(buildDefaults(model.fields), clean),
        ...(hasField('createdBy') ? { createdBy: user?.id ?? null } : {}),
        ...audit,
        id: nextId(rows()),
        createdAt: now,
        updatedAt: now,
      };
    } else if (method === 'PUT') {
      record = {
        ...mergeDefaults(
          { ...buildDefaults(model.fields), ...serverManagedValues(existing, model.fields) },
          clean
        ),
        ...(hasField('createdBy') ? { createdBy: existing.createdBy ?? null } : {}),
        ...audit,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: now,
      };
    } else {
      record = { ...existing, ...deepPatch(existing, clean), ...audit, updatedAt: now };
    }

    return beforeSave ? beforeSave(record, { existing, method, user, body, db }) : record;
  }

  /** Writes one record into the collection, replacing `existing` when given. */
  function store(record, existing) {
    const list = rows();
    if (existing) list[list.indexOf(existing)] = record;
    else list.push(record);
    db.write();
    return record;
  }

  /** The 409 of a delete that is still referenced (D88). */
  function guardDelete(record) {
    if (!deleteGuard) return;
    const usedBy = findUsages(deleteGuard, record.id, usageSource());
    if (usedBy.length === 0) return;

    throw conflict('This item is in use.', { id: [describeUsages(usedBy)] }, { usedBy });
  }

  /* ------------------------------------------------------------------ *
   * Public
   * ------------------------------------------------------------------ */

  if (publicPath) {
    if (has('list')) {
      router.get(`/${publicPath}`, (req, res) => listResponse(req, res, { admin: false }));
    }

    if (slugged && has('bySlug')) {
      router.get(`/${publicPath}/slug/:slug`, (req, res, next) => {
        const record = rows().find(
          (row) => row[model.slugField] === req.params.slug && inPublicScope(row)
        );
        if (!record) {
          next(notFound());
          return;
        }
        res.ok(present(record, { admin: false, query: req.query }));
      });
    }
  }

  /* ------------------------------------------------------------------ *
   * Admin
   * ------------------------------------------------------------------ */

  if (has('adminList')) {
    router.get(`/admin/${basePath}`, (req, res) => listResponse(req, res, { admin: true }));
  }

  if (slugged && has('checkSlug')) {
    router.get(`/admin/${basePath}/check-slug`, (req, res) => {
      const slug = String(first(req.query.slug) ?? '');
      const excludeId = first(req.query.excludeId) ?? null;
      res.ok(checkSlug(rows(), slug, excludeId, model.slugField));
    });
  }

  if (has('bulk')) {
    router.post(`/admin/${basePath}/bulk`, (req, res, next) => {
      try {
        const body = { ...(req.body ?? {}) };
        validateBody(
          { ...schemas.bulk, action: { type: 'enum', enum: Object.keys(actions), required: true } },
          body
        );

        const ids = body.ids.map(String);
        const targets = rows().filter((record) => ids.includes(String(record.id)));

        if (body.action === 'delete') {
          // All or nothing: a bulk delete that would strand a reference is
          // refused whole, so the editor sees one list of what is in the way.
          for (const record of targets) guardDelete(record);
          for (const record of targets) {
            if (beforeDelete) beforeDelete(record, { user: req.user, db });
            db.removeRecord(name, record.id);
          }
        } else {
          const now = new Date().toISOString();
          for (const record of targets) {
            Object.assign(record, actions[body.action], { updatedAt: now });
            if (afterSave)
              afterSave(record, { method: 'BULK', action: body.action, user: req.user, db });
          }
          db.write();
        }

        const affected = targets.length;
        const label = affected === 1 ? noun.one : noun.many;
        res.message(`${affected} ${label} ${body.action === 'delete' ? 'deleted' : 'updated'}.`, {
          affected,
        });
      } catch (error) {
        next(error);
      }
    });
  }

  if (has('create')) {
    router.post(`/admin/${basePath}`, (req, res, next) => {
      try {
        const body = prepare(req.body, { method: 'POST' });
        validateBody(schemas.getSchema(`${schema}.create`), body, {
          fillDefaults: true,
          collection: rows(),
        });

        const record = buildRecord(body, { method: 'POST', user: req.user });
        if (slugged) applySlug(record, resolveSlug(body, null));

        store(record, null);
        if (afterSave) afterSave(record, { method: 'POST', user: req.user, db });

        res.created(present(record, { admin: true, query: req.query }));
      } catch (error) {
        next(error);
      }
    });
  }

  if (has('get')) {
    router.get(`/admin/${basePath}/:id`, (req, res, next) => {
      const record = find(req.params.id);
      if (!record) {
        next(notFound());
        return;
      }
      res.ok(present(record, { admin: true, query: req.query }));
    });
  }

  if (has('update')) {
    router.put(`/admin/${basePath}/:id`, (req, res, next) => {
      try {
        const existing = find(req.params.id);
        if (!existing) throw notFound();

        const body = prepare(req.body, { existing, method: 'PUT' });
        validateBody(schemas.getSchema(`${schema}.update`), body, {
          collection: rows(),
          excludeId: existing.id,
        });

        const record = buildRecord(body, { existing, method: 'PUT', user: req.user });
        if (slugged) applySlug(record, resolveSlug(body, existing));

        store(record, existing);
        if (afterSave) afterSave(record, { existing, method: 'PUT', user: req.user, db });

        res.ok(present(record, { admin: true, query: req.query }));
      } catch (error) {
        next(error);
      }
    });
  }

  if (has('patch')) {
    router.patch(`/admin/${basePath}/:id`, (req, res, next) => {
      try {
        const existing = find(req.params.id);
        if (!existing) throw notFound();

        const body = prepare(req.body, { existing, method: 'PATCH' });
        validateBody(schemas.getSchema(`${schema}.patch`), body, {
          partial: true,
          collection: rows(),
          excludeId: existing.id,
        });

        const record = buildRecord(body, { existing, method: 'PATCH', user: req.user });

        // A `PATCH` re-slugs only when it says so: renaming a record must not
        // silently move its public URL (§5.9).
        if (slugged && body[model.slugField] !== undefined) {
          applySlug(record, resolveSlug({ [model.slugField]: body[model.slugField] }, existing));
        }

        store(record, existing);
        if (afterSave) afterSave(record, { existing, method: 'PATCH', user: req.user, db });

        res.ok(present(record, { admin: true, query: req.query }));
      } catch (error) {
        next(error);
      }
    });
  }

  if (has('remove')) {
    router.delete(`/admin/${basePath}/:id`, (req, res, next) => {
      try {
        const existing = find(req.params.id);
        if (!existing) throw notFound();

        guardDelete(existing);
        if (beforeDelete) beforeDelete(existing, { user: req.user, db });

        db.removeRecord(name, existing.id);
        res.message('Deleted');
      } catch (error) {
        next(error);
      }
    });
  }

  return router;
}

module.exports = { makeCrudRouter, parseSortEntry, matchesFilter };
