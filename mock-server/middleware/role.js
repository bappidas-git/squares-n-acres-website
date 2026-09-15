/**
 * The role matrix, enforced by the API (00_MASTER_CONTEXT.md §7).
 *
 * This is the third of the three places the matrix is applied — after the
 * route guards and the navigation — and the only one that matters: the other
 * two hide a button, this one refuses the request. All three read the same
 * `src/config/rbac.js`, so there is one matrix and no copy of it.
 *
 * Three middlewares, in increasing order of precision:
 *
 *   role('admin', 'manager')      the roles are named on the route
 *   can('leads', 'delete')        the route names the permission it needs
 *   adminPermission()             the permission is derived from the path
 *
 * The last one is mounted on `/api/admin` in `mock-server/app.js` and covers
 * every admin route at once, including the collections the generic JSON Server
 * router serves. A path `mock-server/lib/routePermissions.js` has no rule for
 * is **denied**, so a new admin route is protected before it is written.
 */

const { can: canRole } = require('../../src/config/rbac');
const { resolvePermission } = require('../lib/routePermissions');
const { forbidden, unauthorized } = require('./errors');

/** The message every 403 of the admin API carries (§5.3). */
const FORBIDDEN_MESSAGE = 'You do not have permission to perform this action.';

/** The 403 an unauthorised request gets, whichever middleware produced it. */
const denied = () => forbidden(FORBIDDEN_MESSAGE);

/**
 * Restricts a route to the named roles.
 *
 * @param {...string} roles
 * @returns {import('express').RequestHandler}
 */
function role(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      next(unauthorized());
      return;
    }
    next(roles.includes(req.user.role) ? undefined : denied());
  };
}

/**
 * Restricts a route to the roles the matrix allows for one permission.
 *
 * @param {string} area a key of `PERMISSIONS`
 * @param {string} action an action of that area
 * @returns {import('express').RequestHandler}
 */
function can(area, action) {
  return (req, res, next) => {
    if (!req.user) {
      next(unauthorized());
      return;
    }
    next(canRole(req.user.role, area, action) ? undefined : denied());
  };
}

/**
 * Applies the matrix to every admin route, deriving the permission from the
 * path and the method.
 *
 * Mounted at `/api/admin`, so `req.path` is already the part that names the
 * resource (`/properties/1`).
 *
 * @returns {import('express').RequestHandler}
 */
function adminPermission() {
  return (req, res, next) => {
    if (!req.user) {
      next(unauthorized());
      return;
    }

    const permission = resolvePermission(req.path, req.method);
    if (!permission) {
      next(denied());
      return;
    }

    res.locals.permission = permission;
    next(canRole(req.user.role, permission.area, permission.action) ? undefined : denied());
  };
}

module.exports = { role, can, adminPermission, FORBIDDEN_MESSAGE };
