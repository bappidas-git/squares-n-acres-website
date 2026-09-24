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
const { checkSlug, ensureUniqueSlug, slugify, slugifyPath } = require('./slug');
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
const { compareValues, getPath, sortItems } = require('./sort');
const { stripHtml } = require('./html');
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

/** A value as a string whatever order its keys were written in. */
const canonical = (value) =>
  JSON.stringify(value, (_key, entry) =>
    isPlainObject(entry)
      ? Object.fromEntries(
          Object.keys(entry)
            .sort()
            .map((key) => [key, entry[key]])
        )
      : entry
  );

/** The two audit fields every write moves, and nothing else is. */
const AUDIT_FIELDS = ['updatedAt', 'updatedBy'];

/**
 * Whether a write would store exactly what is already stored (QA-55).
 *
 * A save that changes nothing — the article form's Save pressed twice, a
 * Ctrl+S out of habit — used to be written anyway, and moving `updatedAt`
 * moved the record to the top of every list sorted by it and changed the
 * `lastmod` its sitemap entry reports. Eloquent writes nothing for a model
 * with no dirty attributes, and neither does this.
 *
 * @param {object} existing the stored record
 * @param {object} record the record the write would store
 * @returns {boolean}
 */
function unchanged(existing, record) {
  const strip = (source) =>
    Object.fromEntries(Object.entries(source ?? {}).filter(([key]) => !AUDIT_FIELDS.includes(key)));
  return canonical(strip(existing)) === canonical(strip(record));
}

/**
 * Settles a collection's `order` after an `order` PATCH (§5.8, D98).
 *
 * A reorder sends **one** write — the moved record's new position — and the
 * API works out what everything else becomes: the collection is sorted by
 * `order`, ties are broken in favour of the record that was just touched, and
 * the result is renumbered `1..n`.
 *
 * That is what lets an editor drag a row while the table is filtered. The
 * rows on screen are a slice of the collection, so the client can only say
 * "put it where this other one is" — `order = neighbour.order` to land before
 * it, `neighbour.order + 1` to land after it — and the records it cannot see
 * keep their relative positions either way.
 *
 * The touched record is named rather than guessed (QA-59). It used to be "the
 * newest `updatedAt`", and every other tie was broken the same way, so three
 * FAQs created at `order` 0 — listed A, B, C by question — were renumbered
 * newest first the moment anything moved, and the editor watched two rows they
 * never touched swap places. The rest of a tie now keeps the order the list
 * shows it in (`tieBreak`, the resource's own `order` sort).
 *
 * @param {Array<object>} list the collection, mutated in place
 * @param {object} [options]
 * @param {number|string|null} [options.touchedId] the record this write placed,
 *   which goes first among the records sharing its number; without one the
 *   collection is only made dense, in the order it already reads
 * @param {Array<string>} [options.tieBreak] the fields that order a tie after
 *   that — `['question']` for FAQs, whose list reads `order,question`
 * @returns {boolean} whether any record's `order` changed
 */
function renumberOrder(list, { touchedId = null, tieBreak = [] } = {}) {
  const position = (record) => (Number.isFinite(Number(record?.order)) ? Number(record.order) : 0);
  const touched = (record) =>
    touchedId !== null && touchedId !== undefined && sameId(record?.id, touchedId);

  const positioned = list
    .map((record, index) => ({ record, index }))
    .sort((left, right) => {
      const a = position(left.record);
      const b = position(right.record);
      if (a !== b) return a - b;

      if (touched(left.record) !== touched(right.record)) return touched(left.record) ? -1 : 1;

      for (const field of tieBreak) {
        const result = compareValues(getPath(left.record, field), getPath(right.record, field));
        if (result !== 0) return result;
      }
      return left.index - right.index;
    });

  let changed = false;
  positioned.forEach(({ record }, index) => {
    if (record.order !== index + 1) changed = true;
    record.order = index + 1;
  });
  return changed;
}

/**
 * The fields after `order` in a resource's own `order` sort — what orders a
 * tie on screen, and so what a renumber keeps a tie in (QA-59).
 *
 * @param {object} sorts the resource's `sorts`
 * @returns {Array<string>} `['question']` for `order,question`
 */
function tieBreakOf(sorts) {
  const entry = sorts?.order;
  if (!entry) return [];
  return parseSortEntry(entry)
    .spec.split(',')
    .map((field) => field.trim())
    .filter((field) => field && field !== 'order');
}

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
 * @param {Function} [options.beforeDelete] `(record, ctx) => void`, where `ctx`
 *   is `{ user, db, query, collections }` — throw to refuse the delete
 * @param {Function} [options.beforeBulk] `(action, targets, ctx) => void`, where
 *   `ctx` is `{ user, db }` — throw to refuse a bulk action whole, before any
 *   record is touched (an article's publish rules, QA-55)
 * @param {string|false} [options.deleteGuard] a `lib/usage.js` type
 * @param {(record: object) => string|null} [options.protect] why this record
 *   can never be deleted, or `null` — a built-in segment (QA-52). Checked
 *   before the usage guard, for a single delete and a bulk one alike
 * @param {object} [options.bulkActions] extra actions, `{ name: changes|null }`
 * @param {{one: string, many: string}} [options.noun] for the bulk message
 * @param {boolean} [options.pathSlug] the slug is a URL path rather than one
 *   segment — only the CMS pages, whose `buyer-assistance/home-loan` must keep
 *   its separator (§6.10)
 * @param {boolean} [options.publicScoped] force the public active scope on/off
 * @param {boolean} [options.settleOrder] a `POST`, and a `PUT` that moves
 *   `order`, settle the collection `1..n` the way an `order` PATCH does, with
 *   the written record placed at the position it names (QA-59). Without it two
 *   records can share a number, and a reorder dropped next to them lands in
 *   the wrong place: "before the one holding 0" is before every one of them
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
    beforeBulk,
    deleteGuard = false,
    protect,
    bulkActions = {},
    noun = { one: 'record', many: 'records' },
    pathSlug = false,
    publicScoped = Boolean(model.publicScope),
    settleOrder = false,
    routes = null,
  } = options;

  const router = express.Router();
  const name = model.collection;
  /** Whether this resource declares a route (§5.14 differs per resource). */
  const has = (route) => routes === null || routes.includes(route);
  const searchable = model.searchable ?? [];
  const hasField = (field) => Object.prototype.hasOwnProperty.call(model.fields, field);

  /**
   * A record as `q` reads it: an HTML field by its text (QA-59). A FAQ's
   * answer is stored as markup, so "p>" found every FAQ, and a link or a bold
   * word made "href", "strong" or "blank" find the answers that held one —
   * while "R&D" found nothing, the editor having written `R&amp;D`.
   */
  const htmlSearchable = searchable.filter((field) => model.fields?.[field]?.type === 'html');
  const searchView = (record) =>
    htmlSearchable.length === 0
      ? record
      : {
          ...record,
          ...Object.fromEntries(htmlSearchable.map((field) => [field, stripHtml(record[field])])),
        };

  /**
   * Renumbers the collection `1..n` around the record a write just placed,
   * keeping a tie in the order the list shows it (QA-59).
   *
   * @returns {boolean} whether anything was renumbered
   */
  const settle = (touchedId) => renumberOrder(rows(), { touchedId, tieBreak: tieBreakOf(sorts) });

  /** How this resource turns text into its slug (§5.9, §6.10). */
  const toSlug = pathSlug ? slugifyPath : slugify;

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
    if (q) result = result.filter((record) => matchesQ(searchView(record), searchable, q));

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
    const requested = toSlug(body?.slug ?? '');
    const excludeId = existing?.id ?? null;

    if (requested) {
      const { available } = checkSlug(rows(), requested, excludeId, model.slugField, toSlug);
      if (!available) {
        throw conflict('The slug has already been taken.', {
          slug: ['The slug has already been taken.'],
        });
      }
      return requested;
    }

    const fallback = body?.name ?? body?.title ?? existing?.name ?? existing?.title ?? '';
    return ensureUniqueSlug(rows(), toSlug(fallback), excludeId, model.slugField, toSlug);
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

  /**
   * `?withUsage=true` on a single read: what a delete would refuse over.
   *
   * The same lookup the 409 uses, offered **before** a change rather than
   * after it, so a form can warn that twelve listings point at the record it
   * is about to move (D88, §5.14).
   */
  function usageOf(record, query) {
    if (!deleteGuard || toBool(first(query.withUsage)) !== true) return {};
    return { usedBy: findUsages(deleteGuard, record.id, usageSource()) };
  }

  /**
   * The 409 of a delete that is still referenced (D88), or of a record the
   * resource never lets go of — which says why, and has nothing to unlink.
   */
  function guardDelete(record) {
    const reason = protect ? protect(record) : null;
    if (reason) throw conflict(reason, { id: [reason] }, { usedBy: [] });

    if (!deleteGuard) return;
    const usedBy = findUsages(deleteGuard, record.id, usageSource());
    if (usedBy.length === 0) return;

    throw conflict('This item is in use.', { id: [describeUsages(usedBy)] }, { usedBy });
  }

  /**
   * The row a reorder was dropped next to: `{ before: id }` or `{ after: id }`
   * beside the `order` of §5.8 (QA-59).
   *
   * The number alone could not say where a row landed once two records shared
   * it — "before the one holding 0" was before every one of them — nor once it
   * was stale: a second move sent before the list had re-read carried the
   * numbers of the first. The neighbour's id says both. An anchor that names
   * nothing (deleted meanwhile) or the record itself is no anchor, and the
   * number is used as it always was.
   *
   * @param {object} body the request body
   * @param {object} existing the record being moved
   * @returns {{record: object, after: boolean}|null}
   */
  function anchorOf(body, existing) {
    const after = body?.after !== undefined && body?.after !== null && body?.after !== '';
    const raw = after ? body.after : body?.before;
    if (raw === undefined || raw === null || raw === '') return null;
    const record = find(raw);
    if (!record || sameId(record.id, existing.id)) return null;
    return { record, after };
  }

  /** What a refusal calls a record: its name, its title or its question. */
  const labelOf = (record) =>
    record?.name ?? record?.title ?? record?.question ?? record?.email ?? `#${record?.id}`;

  /**
   * The 409 of a bulk delete, naming **every** selected record that is in the
   * way and what holds each one (QA-59).
   *
   * It used to stop at the first one and answer that record's usages alone,
   * as "This item is in use." — and the list said "Used by 1 page" over three
   * selected FAQs without saying which of them, or which page. `usedBy` is
   * still the union, so a client reading it the old way sees every holder.
   *
   * @param {Array<object>} targets the records the bulk delete names
   * @throws {import('../middleware/errors').ApiError} 409 when any is held
   */
  function guardBulkDelete(targets) {
    const refused = [];
    for (const record of targets) {
      const reason = protect ? protect(record) : null;
      const usedBy =
        !reason && deleteGuard ? findUsages(deleteGuard, record.id, usageSource()) : [];
      if (reason || usedBy.length > 0) {
        refused.push({
          id: record.id,
          label: labelOf(record),
          reason: reason ?? describeUsages(usedBy),
          usedBy,
        });
      }
    }
    if (refused.length === 0) return;

    const usedBy = [];
    const seen = new Set();
    for (const usage of refused.flatMap((entry) => entry.usedBy)) {
      const key = `${usage.type}:${usage.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      usedBy.push(usage);
    }

    // One record selected is the single delete's answer, word for word.
    if (targets.length === 1) {
      const [only] = refused;
      const protectedReason = protect ? protect(targets[0]) : null;
      throw conflict(
        protectedReason ?? 'This item is in use.',
        { id: [only.reason] },
        { usedBy, refused }
      );
    }

    // A protected record is not "in use"; it simply cannot go.
    const inUse = refused.every((entry) => entry.usedBy.length > 0);
    const verb = refused.length === 1 ? 'is' : 'are';
    const why = inUse ? `${verb} still in use` : 'cannot be deleted';
    throw conflict(
      `${refused.length} of the selected ${noun.many} ${why}, so none was deleted.`,
      { id: refused.map((entry) => `${entry.label}: ${entry.reason}`) },
      { usedBy, refused }
    );
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
      res.ok(checkSlug(rows(), slug, excludeId, model.slugField, toSlug));
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

        if (beforeBulk) beforeBulk(body.action, targets, { user: req.user, db });

        let affected = 0;
        if (body.action === 'delete') {
          // All or nothing: a bulk delete that would strand a reference is
          // refused whole, so the editor sees one list of what is in the way.
          guardBulkDelete(targets);
          for (const record of targets) {
            if (beforeDelete) beforeDelete(record, { user: req.user, db });
            db.removeRecord(name, record.id);
          }
          affected = targets.length;
        } else {
          const now = new Date().toISOString();
          const changes = actions[body.action];
          for (const record of targets) {
            // `affected` is the records that changed (`05_business_rules.md`):
            // featuring an article that is already featured is not an update,
            // and it does not move `updatedAt` either (QA-55).
            const differs = Object.entries(changes).some(
              ([field, value]) => record[field] !== value
            );
            if (!differs) continue;
            Object.assign(record, changes, { updatedAt: now });
            if (afterSave)
              afterSave(record, { method: 'BULK', action: body.action, user: req.user, db });
            affected += 1;
          }
          if (affected > 0) db.write();
        }

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
          lookup: db.getCollection,
        });

        const record = buildRecord(body, { method: 'POST', user: req.user });
        if (slugged) applySlug(record, resolveSlug(body, null));

        store(record, null);
        // The new record takes the position it names, and nothing shares it.
        if (settleOrder && hasField('order') && settle(record.id)) db.write();
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
      res.ok({
        ...present(record, { admin: true, query: req.query }),
        ...usageOf(record, req.query),
      });
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
          lookup: db.getCollection,
        });

        const record = buildRecord(body, { existing, method: 'PUT', user: req.user });
        if (slugged) applySlug(record, resolveSlug(body, existing));

        if (unchanged(existing, record)) {
          res.ok(present(existing, { admin: true, query: req.query }));
          return;
        }

        const moved = hasField('order') && Number(record.order) !== Number(existing.order);
        store(record, existing);
        // A form that changes the number is moving the record to that position.
        if (settleOrder && moved && settle(record.id)) db.write();
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
          lookup: db.getCollection,
        });

        // A reorder that names the row it was dropped next to is placed by
        // that row: the collection is made dense in the order it reads, and
        // the position is read off the neighbour then — whatever numbers the
        // client last saw, and however many records shared one (QA-59).
        const anchor = hasField('order') ? anchorOf(body, existing) : null;
        const densified = anchor ? renumberOrder(rows(), { tieBreak: tieBreakOf(sorts) }) : false;
        if (anchor) body.order = Number(anchor.record.order) + (anchor.after ? 1 : 0);

        const record = buildRecord(body, { existing, method: 'PATCH', user: req.user });

        // A `PATCH` re-slugs only when it says so: renaming a record must not
        // silently move its public URL (§5.9).
        if (slugged && body[model.slugField] !== undefined) {
          applySlug(record, resolveSlug({ [model.slugField]: body[model.slugField] }, existing));
        }

        const ordering = hasField('order') && body.order !== undefined;

        if (unchanged(existing, record)) {
          // A position that is already the record's own still settles a tie:
          // two rows sharing 3, the second dragged above the first, sends
          // `order: 3` — the number it has — and was answered with nothing
          // moving at all (QA-59).
          if ((ordering && settle(existing.id)) || densified) db.write();
          res.ok(present(existing, { admin: true, query: req.query }));
          return;
        }

        store(record, existing);

        // Moving one record moves the collection: a `PATCH { order }` is a
        // position, and the API is what turns it back into `1..n` (§5.8).
        if (ordering) {
          settle(record.id);
          db.write();
        }

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
        // The same context `afterRead` gets, plus the query: a resource whose
        // delete rule depends on a parameter — media's `?force=true` (§5) —
        // needs to read one.
        if (beforeDelete) {
          beforeDelete(existing, {
            user: req.user,
            db,
            query: req.query,
            collections: source(),
          });
        }

        db.removeRecord(name, existing.id);
        res.message('Deleted');
      } catch (error) {
        next(error);
      }
    });
  }

  return router;
}

module.exports = { makeCrudRouter, parseSortEntry, matchesFilter, renumberOrder };
