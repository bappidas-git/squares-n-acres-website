/**
 * Public versus admin reads (00_MASTER_CONTEXT.md §5.10).
 *
 * `/api/<collection>` is what a visitor sees; `/api/admin/<collection>` is what
 * an editor sees. The two are the same JSON Server router, so the difference
 * has to be made here:
 *
 *   - `/admin` is stripped from the path and remembered on `res.locals.admin`,
 *     which is what makes `/api/admin/properties` reach the `properties` route
 *     at all;
 *   - a public list is forced into the collection's `publicScope`
 *     (`isActive=true`, or `status=published` for articles and pages) and a
 *     public detail read of a record outside it answers 404
 *     (`mock-server/middleware/envelope.js`);
 *   - a collection with no public endpoint at all ({@link PRIVATE_COLLECTIONS}
 *     — leads, media, users, tokens…) answers 404 on the public prefix.
 *
 * The admin prefix itself is guarded by `mock-server/middleware/auth.js` and
 * `role.js`, which `mock-server/app.js` mounts on `/api/admin` before any
 * router: everything below is about what a request **without** a token sees.
 */

const { notFound } = require('./errors');

/**
 * Collections that exist only behind `/api/admin` (§5.10, §6.14).
 *
 * A public request for one answers 404 — not 403, because the existence of the
 * collection is not public information either. The list repeats what the
 * descriptors say with `publicRead: false`; naming them here is what makes
 * `GET /api/adminUsers` and `GET /api/apiTokens` a stated rule rather than a
 * property of a schema file somebody could edit.
 */
const PRIVATE_COLLECTIONS = new Set([
  'adminUsers',
  'apiTokens',
  'media',
  'leads',
  'jobApplications',
  'newsletterSubscribers',
  'propertyViews',
]);

/**
 * The public writes the contract defines on a private collection (§5.11,
 * §5.14): the lead form posts to `/leads` without a token. `/newsletter/
 * subscribe` and `/jobs/:id/apply` are their own paths and need no exception.
 */
const PUBLIC_WRITES = { leads: ['POST'] };

/** True when a request without a token may not touch this collection at all. */
function isPrivate(name, model, method) {
  if (!PRIVATE_COLLECTIONS.has(name) && model?.publicRead !== false) return false;
  return !(PUBLIC_WRITES[name] ?? []).includes(method);
}

/**
 * Strips the `/admin` prefix and records that the request came in through it.
 *
 * @type {import('express').RequestHandler}
 */
function adminPrefix(req, res, next) {
  if (req.url === '/admin' || req.url.startsWith('/admin/') || req.url.startsWith('/admin?')) {
    res.locals.admin = true;
    req.url = req.url.slice('/admin'.length) || '/';
  }
  next();
}

/**
 * Applies the public scope of the collection the request addresses.
 *
 * @param {{getModel: Function}} deps
 * @returns {import('express').RequestHandler}
 */
function publicScope({ getModel }) {
  return (req, res, next) => {
    const segments = req.path.split('/').filter(Boolean);
    const model = segments.length >= 1 ? getModel(segments[0]) : null;
    if (!model) {
      next();
      return;
    }

    res.locals.model = model;

    if (res.locals.admin) {
      next();
      return;
    }

    if (isPrivate(segments[0], model, req.method)) {
      next(notFound());
      return;
    }

    res.locals.public = true;

    // A list is scoped by the query; a detail read is scoped by `renderEnvelope`,
    // because JSON Server looks a record up by id without consulting the query.
    if (req.method === 'GET' && segments.length === 1 && model.publicScope) {
      for (const [field, value] of Object.entries(model.publicScope)) {
        req.query[field] = String(value);
      }
    }

    next();
  };
}

module.exports = { publicScope, adminPrefix, isPrivate, PRIVATE_COLLECTIONS, PUBLIC_WRITES };
