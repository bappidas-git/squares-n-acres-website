/**
 * Custom routers, mounted under `/api` **before** the generic JSON Server
 * router so that a hand-written route always wins over the CRUD fallback
 * (00_MASTER_CONTEXT.md §10).
 *
 * Prompt 07 added `auth.js` (the five `/auth/*` endpoints) and `users.js`
 * (`/admin/users`); prompt 08 added `properties.js` and `leads.js`, which own
 * their prefixes outright — an unknown `/properties/…` or `/leads/…` path is a
 * 404 from the router rather than a generic CRUD answer. Prompt 09 adds the
 * content, SEO and sitemap routers. Each entry is a factory that receives the
 * shared dependencies from `mock-server/app.js` and returns an Express router.
 *
 * @type {Array<(deps: object) => import('express').Router>}
 */
const customRouters = [
  require('./auth'),
  require('./users'),
  require('./properties'),
  require('./leads'),
  require('./masterData'),
  require('./articles'),
  require('./pages'),
  require('./media'),
  require('./settings'),
  require('./seo'),
  require('./dashboard'),
  require('./newsletter'),
  require('./jobs'),
  require('./redirects'),
  require('./sitemap'),
];

module.exports = customRouters;
