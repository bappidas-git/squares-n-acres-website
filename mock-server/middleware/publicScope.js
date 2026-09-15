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
 *   - a collection with no public endpoint at all (`publicRead: false` — leads,
 *     media, users, tokens…) answers 404 on the public prefix.
 *
 * Authentication and the role matrix arrive with prompt 07; until then the
 * admin prefix is open, which `mock-server/README.md` states plainly.
 */

const { notFound } = require('./errors');

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

    // `publicRead: false` hides the collection from public *reads*; the public
    // writes the contract does define (`POST /leads`, `POST /newsletter/
    // subscribe`, `POST /jobs/:id/apply`) stay reachable.
    if (model.publicRead === false && req.method === 'GET') {
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

module.exports = { publicScope, adminPrefix };
