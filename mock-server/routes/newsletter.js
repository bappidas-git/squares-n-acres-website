/**
 * Newsletter (00_MASTER_CONTEXT.md §5.11, §5.14, §6.14).
 *
 *   POST   /api/newsletter/subscribe                  the footer form
 *   GET    /api/admin/newsletter-subscribers          filters `status`, `q`
 *   GET    /api/admin/newsletter-subscribers/export   CSV, UTF-8 with a BOM
 *   DELETE /api/admin/newsletter-subscribers/:id
 *
 * Subscribing twice is not an error (§5.14): the second attempt answers
 * `200 { data: null, message: 'Already subscribed' }` so the form can say
 * something friendly instead of showing a 409 to somebody who did nothing
 * wrong. An address that had unsubscribed is re-subscribed rather than
 * duplicated, which keeps `email` genuinely unique.
 *
 * Like every public write it is throttled to ten a minute per IP and honours
 * the `website` honeypot: a filled one answers 200 and stores nothing.
 */

const express = require('express');

const schemas = require('../../src/services/schemas');
const { LEAD_SOURCES } = require('../lib/enums');
const { makeCrudRouter } = require('../lib/crud');
const { matchesQ } = require('../lib/filters');
const { nextId } = require('../lib/ids');
const { rateLimit } = require('../middleware/rateLimit');
const { toCsv } = require('../lib/csv');
const { validateBody } = require('../middleware/validate');

/** §5.11: ten submissions a minute per IP, on every public write. */
const SUBMISSIONS_PER_MINUTE = 10;

/** The columns of the export, in order (§4.10 of this prompt). */
const CSV_COLUMNS = [
  { key: 'email', label: 'Email' },
  { key: 'name', label: 'Name' },
  { key: 'source', label: 'Source' },
  { key: 'status', label: 'Status' },
  { key: 'createdAt', label: 'Subscribed At' },
];

const first = (value) => (Array.isArray(value) ? value[0] : value);

/** An address compares case-insensitively and without surrounding spaces. */
const normalizeEmail = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

/**
 * The newsletter router.
 *
 * @param {{db: object, getModel: Function}} deps
 * @returns {import('express').Router}
 */
module.exports = ({ db, getModel }) => {
  const router = express.Router();
  const rows = () => db.getCollection('newsletterSubscribers');

  /* ---------------------------------------------------------------- *
   * Public
   * ---------------------------------------------------------------- */

  router.post(
    '/newsletter/subscribe',
    rateLimit({ max: SUBMISSIONS_PER_MINUTE }),
    (req, res, next) => {
      try {
        const body = { ...(req.body ?? {}) };

        // The honeypot is invisible to a human, so anything in it is a robot:
        // answer as if the form had been accepted and store nothing (§5.11).
        if (typeof body.website === 'string' && body.website.trim() !== '') {
          res.message('ok');
          return;
        }

        if (body.email !== undefined) body.email = normalizeEmail(body.email);
        validateBody(schemas.getSchema('newsletter.subscribe'), body, { fillDefaults: true });

        const now = new Date().toISOString();
        const existing = rows().find((row) => normalizeEmail(row.email) === body.email);

        if (existing) {
          if (existing.status === 'subscribed') {
            res.message('Already subscribed');
            return;
          }

          // Coming back is a new subscription, not a resurrection of the old
          // one: the source that brought them back is the one worth keeping.
          existing.status = 'subscribed';
          existing.source = LEAD_SOURCES.has(body.source) ? body.source : existing.source;
          if (body.name) existing.name = body.name;
          existing.updatedAt = now;
          db.write();

          res.message('Subscribed', { ...existing });
          return;
        }

        const record = {
          id: nextId(rows()),
          email: body.email,
          name: body.name ?? null,
          source: LEAD_SOURCES.has(body.source) ? body.source : 'newsletter',
          status: 'subscribed',
          createdAt: now,
          updatedAt: now,
        };

        rows().push(record);
        db.write();

        res.created(record);
      } catch (error) {
        next(error);
      }
    }
  );

  /* ---------------------------------------------------------------- *
   * Admin
   * ---------------------------------------------------------------- */

  // Registered before the CRUD router so `/export` is not read as an id.
  router.get('/admin/newsletter-subscribers/export', (req, res) => {
    const status = first(req.query.status);
    const q = first(req.query.q);

    const matching = rows()
      .filter((row) => (status ? row.status === status : true))
      .filter((row) => matchesQ(row, ['email', 'name'], q ?? ''))
      .sort((left, right) => Date.parse(right.createdAt ?? 0) - Date.parse(left.createdAt ?? 0));

    const filename = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(toCsv(matching, CSV_COLUMNS));
  });

  router.use(
    makeCrudRouter({
      db,
      model: getModel('newsletterSubscribers'),
      basePath: 'newsletter-subscribers',
      schema: 'newsletterSubscriber',
      // A subscriber is created by the public form and removed by an editor;
      // there is nothing to edit in between, so the contract has no write
      // endpoints here (§5.14) and neither does the router.
      routes: ['adminList', 'remove'],
      publicPath: false,
      slugged: false,
      adminFilters: {
        status: { field: 'status', type: 'csv' },
        source: { field: 'source', type: 'csv' },
      },
      sorts: { createdAt: '-createdAt', email: 'email', status: 'status' },
      defaultSort: 'createdAt',
      noun: { one: 'subscriber', many: 'subscribers' },
    })
  );

  return router;
};

module.exports.normalizeEmail = normalizeEmail;
module.exports.CSV_COLUMNS = CSV_COLUMNS;
