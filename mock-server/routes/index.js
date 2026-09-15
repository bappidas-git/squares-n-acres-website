/**
 * Custom routers, mounted under `/api` **before** the generic JSON Server
 * router so that a hand-written route always wins over the CRUD fallback
 * (00_MASTER_CONTEXT.md §10).
 *
 * Prompt 07 added `auth.js` (the five `/auth/*` endpoints) and `users.js`
 * (`/admin/users`); prompt 08 adds `properties.js` and `leads.js`, prompt 09
 * the content, SEO and sitemap routers. Each entry is a factory that receives
 * the shared dependencies from `mock-server/app.js` and returns an Express
 * router.
 *
 * @type {Array<(deps: object) => import('express').Router>}
 */
const customRouters = [require('./auth'), require('./users')];

module.exports = customRouters;
