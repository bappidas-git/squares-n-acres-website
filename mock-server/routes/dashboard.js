/**
 * `GET /api/admin/dashboard` (00_MASTER_CONTEXT.md §5.14, §6.16).
 *
 * One read, one shape, every role: the aggregation lives in
 * `mock-server/lib/dashboard.js` and this router only decides **whose** data it
 * runs over. A sales user's lead figures cover their own and the unassigned
 * ones (D15); everything about properties, articles and SEO is the site's.
 *
 * The permission is `dashboard.view`, which the §7 matrix gives to all three
 * roles, so `mock-server/middleware/role.js` has already let the request
 * through by the time this runs.
 */

const express = require('express');

const { buildDashboard } = require('../lib/dashboard');

/** The collections the dashboard aggregates. */
const SOURCES = [
  'properties',
  'leads',
  'articles',
  'pages',
  'localities',
  'developers',
  'propertyViews',
  'newsletterSubscribers',
  'adminUsers',
];

/**
 * The dashboard router.
 *
 * @param {{db: object}} deps
 * @returns {import('express').Router}
 */
module.exports = ({ db }) => {
  const router = express.Router();

  router.get('/admin/dashboard', (req, res) => {
    const state = Object.fromEntries(SOURCES.map((name) => [name, db.getCollection(name)]));
    // `range` — 7, 30 or 90 days of trend (prompt 51); anything else is 30.
    const range = Array.isArray(req.query.range) ? req.query.range[0] : req.query.range;
    res.ok(buildDashboard(state, { user: req.user, range }));
  });

  return router;
};
