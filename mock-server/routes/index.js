/**
 * Custom routers, mounted under `/api` **before** the generic JSON Server
 * router so that a hand-written route always wins over the CRUD fallback
 * (00_MASTER_CONTEXT.md §10).
 *
 * The list is empty today: prompt 07 adds `auth.js`, prompt 08 `properties.js`
 * and `leads.js`, prompt 09 the content, SEO and sitemap routers. Each entry is
 * an Express router that receives the shared dependencies from
 * `mock-server/app.js`.
 *
 * @type {Array<(deps: object) => import('express').Router>}
 */
const customRouters = [];

module.exports = customRouters;
