/**
 * Response envelopes (00_MASTER_CONTEXT.md §5.2).
 *
 * The contract has exactly three success shapes and no bare arrays or objects:
 *
 *   single  → `{ data: {...} }`
 *   list    → `{ data: [...], meta: { page, perPage, total, totalPages } }`
 *   action  → `{ data: null, message: '…' }`
 *
 * Two entry points produce them. Custom routes (prompts 07–09) call
 * `res.ok()` / `res.created()` / `res.message()`; the generic JSON Server
 * router hands its result to {@link renderEnvelope}, which is installed as
 * `router.render`.
 */

const { buildMeta } = require('../lib/paginate');
const {
  publicAuthor,
  publicProperty,
  publicSettings,
  publicSeoSettings,
  omit,
} = require('../lib/scope');

/** Per-collection public scoping that a `publicOmit` list cannot express. */
const PUBLIC_TRANSFORMS = {
  properties: publicProperty,
  authors: publicAuthor,
  siteSettings: publicSettings,
  seoSettings: publicSeoSettings,
};

/**
 * Installs `res.ok`, `res.created` and `res.message`.
 *
 * @type {import('express').RequestHandler}
 */
function envelope(req, res, next) {
  /** A single resource, or a list when `meta` is given. */
  res.ok = (data, meta) => {
    if (meta === undefined) return res.json({ data });
    return res.json({ data, meta });
  };

  /** A freshly created resource: 201 plus the full record. */
  res.created = (data) => res.status(201).json({ data });

  /** An action that produced no resource. */
  res.message = (message, data = null) => res.json({ data, message });

  next();
}

/** The fields no endpoint ever returns — `adminUsers.password`, `apiTokens.token`. */
function secretFields(model) {
  if (!model?.fields) return [];
  return Object.entries(model.fields)
    .filter(([, descriptor]) => descriptor.secret)
    .map(([field]) => field);
}

/** Applies `publicOmit` and the collection's own public transform. */
function scopeForPublic(record, model) {
  if (!record || !model) return record;
  const transform = PUBLIC_TRANSFORMS[model.collection];
  const scoped = transform ? transform(record) : record;
  return omit(scoped, model.publicOmit ?? []);
}

/** True when a public reader may not see this record (§5.10). */
function isOutOfPublicScope(record, model) {
  const scope = model?.publicScope;
  if (!scope || !record) return false;
  return Object.entries(scope).some(([field, value]) => record[field] !== value);
}

/**
 * `router.render` for the generic JSON Server router.
 *
 * JSON Server leaves its result on `res.locals.data` and sets the status
 * itself (201 for a create, 404 when nothing matched). This turns that into
 * the envelope, using the `X-Total-Count` header JSON Server emits for a
 * paginated list and the translated query on `res.locals.query` for the rest
 * of `meta`.
 *
 * @type {(req: import('express').Request, res: import('express').Response) => void}
 */
function renderEnvelope(req, res) {
  const data = res.locals.data;
  const model = res.locals.model ?? null;
  const isPublic = Boolean(res.locals.public);

  if (res.statusCode === 404 || data === undefined || data === null) {
    res.status(404).json({ message: 'Not found' });
    return;
  }

  const secrets = secretFields(model);
  const present = (record) => {
    const scoped = isPublic ? scopeForPublic(record, model) : record;
    return secrets.length > 0 ? omit(scoped, secrets) : scoped;
  };

  if (Array.isArray(data)) {
    const query = res.locals.query ?? {};
    const header = Number.parseInt(res.getHeader('X-Total-Count'), 10);
    const total = Number.isFinite(header) ? header : data.length;

    res.json({
      data: data.map(present),
      meta: buildMeta({ page: query.page ?? 1, perPage: query.perPage ?? null, total }),
    });
    return;
  }

  // A detail read of a record the public may not see is a 404, not a 403:
  // an inactive listing must not be distinguishable from a missing one.
  if (isPublic && req.method === 'GET' && isOutOfPublicScope(data, model)) {
    res.status(404).json({ message: 'Not found' });
    return;
  }

  res.status(res.statusCode === 201 ? 201 : 200).json({ data: present(data) });
}

module.exports = { envelope, renderEnvelope, scopeForPublic, isOutOfPublicScope };
