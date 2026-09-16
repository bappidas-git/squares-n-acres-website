/**
 * Redirects (00_MASTER_CONTEXT.md §5.14, §6.14, §9.10; decision D30).
 *
 *   GET  /api/redirects                  the active rules, as the SPA needs them
 *   GET  /api/redirects/resolve?path=    one lookup, and a `hits` increment
 *   …plus the admin CRUD, `bulk`, `import` and `export` of §4.12.
 *
 * On a single-page application a redirect is a client-side `<Navigate replace>`
 * (D30): `RedirectHandler` loads the public list once and matches paths in the
 * browser, so the public payload is deliberately tiny — `fromPath`, `toPath`,
 * `statusCode` and nothing else. `resolve` exists for the smoke test and for
 * QA, and is the only place `hits` moves.
 *
 * Four rules keep the table sane, and all four answer 422 rather than storing
 * something that would loop a browser:
 *   - `fromPath` starts with `/` and is unique;
 *   - `toPath` is not empty;
 *   - a rule may not point at itself;
 *   - a rule may not point at the `fromPath` of another **active** rule, which
 *     is the chain a crawler reports as a redirect loop.
 */

const express = require('express');

const { makeCrudRouter } = require('../lib/crud');
const { notFound, validation } = require('../middleware/errors');
const { toCsv } = require('../lib/csv');

/** The public row: what `RedirectHandler` matches on, and no more (§9.10). */
const PUBLIC_FIELDS = ['fromPath', 'toPath', 'statusCode'];

/** The columns of `GET /admin/redirects/export`, in order. */
const CSV_COLUMNS = [
  { key: 'fromPath', label: 'From' },
  { key: 'toPath', label: 'To' },
  { key: 'statusCode', label: 'Status' },
  { key: 'isActive', label: 'Active' },
  { key: 'hits', label: 'Hits' },
  { key: 'note', label: 'Note' },
];

const first = (value) => (Array.isArray(value) ? value[0] : value);

const sameId = (left, right) => String(left) === String(right);

/** A path compares without its query string and without a trailing slash. */
function normalizePath(value) {
  const text = String(value ?? '').trim();
  if (text === '') return '';

  const withoutQuery = text.split('?')[0].split('#')[0];
  return withoutQuery.length > 1 ? withoutQuery.replace(/\/+$/, '') : withoutQuery;
}

/**
 * The rules of §4.12, checked against the table the write would produce.
 *
 * @param {object} body the request body
 * @param {Array<object>} rows the stored redirects
 * @param {object|null} existing the record being updated
 * @throws {import('../middleware/errors').ApiError} 422
 */
function validateRedirect(body, rows, existing) {
  const errors = {};

  const fromPath = body.fromPath === undefined ? existing?.fromPath : normalizePath(body.fromPath);
  const toPath = body.toPath === undefined ? existing?.toPath : normalizePath(body.toPath);

  if (fromPath !== undefined) {
    if (!fromPath.startsWith('/')) {
      errors.fromPath = ['The from path must start with a slash.'];
    } else if (
      rows.some(
        (row) => !sameId(row.id, existing?.id ?? null) && normalizePath(row.fromPath) === fromPath
      )
    ) {
      errors.fromPath = ['A redirect for this path already exists.'];
    }
  }

  if (toPath !== undefined && toPath === '') {
    errors.toPath = ['The to path field is required.'];
  }

  if (fromPath && toPath && fromPath === toPath) {
    errors.toPath = ['A redirect cannot point at itself.'];
  }

  if (!errors.toPath && toPath) {
    const chained = rows.find(
      (row) =>
        row.isActive !== false &&
        !sameId(row.id, existing?.id ?? null) &&
        normalizePath(row.fromPath) === toPath
    );
    if (chained) {
      errors.toPath = [`This target is itself redirected to ${chained.toPath}.`];
    }
  }

  if (Object.keys(errors).length > 0) throw validation(errors);
}

/**
 * The redirects router.
 *
 * @param {{db: object, getModel: Function}} deps
 * @returns {import('express').Router}
 */
module.exports = ({ db, getModel }) => {
  const router = express.Router();
  const rows = () => db.getCollection('redirects');

  /* ---------------------------------------------------------------- *
   * Public
   * ---------------------------------------------------------------- */

  router.get('/redirects/resolve', (req, res, next) => {
    const path = normalizePath(first(req.query.path));
    const match = rows().find((row) => row.isActive && normalizePath(row.fromPath) === path);

    if (!match) {
      next(notFound());
      return;
    }

    // `resolve` is the one server-side hit a redirect gets: the SPA matches
    // the cached list in the browser and never calls back (D30).
    match.hits = (match.hits ?? 0) + 1;
    db.write();

    res.ok({ fromPath: match.fromPath, toPath: match.toPath, statusCode: match.statusCode });
  });

  /* ---------------------------------------------------------------- *
   * Admin
   * ---------------------------------------------------------------- */

  router.get('/admin/redirects/export', (req, res) => {
    const filename = `redirects-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(toCsv(rows(), CSV_COLUMNS));
  });

  router.post('/admin/redirects/import', (req, res, next) => {
    try {
      const incoming = req.body?.rows;
      if (!Array.isArray(incoming)) {
        throw validation({ rows: ['The rows field must be an array.'] });
      }

      const now = new Date().toISOString();
      const summary = { created: 0, updated: 0, skipped: 0 };

      for (const row of incoming) {
        const fromPath = normalizePath(row?.fromPath);
        const toPath = normalizePath(row?.toPath);
        const statusCode = Number(row?.statusCode ?? 301);

        // An import is a bulk paste from a spreadsheet: a row that would be
        // refused is counted and skipped rather than failing the whole file.
        if (!fromPath.startsWith('/') || toPath === '' || fromPath === toPath) {
          summary.skipped += 1;
          continue;
        }
        if (statusCode !== 301 && statusCode !== 302) {
          summary.skipped += 1;
          continue;
        }

        const existing = rows().find((record) => normalizePath(record.fromPath) === fromPath);
        if (existing) {
          Object.assign(existing, { toPath, statusCode, updatedAt: now });
          summary.updated += 1;
          continue;
        }

        rows().push({
          id: Math.max(0, ...rows().map((record) => Number(record.id) || 0)) + 1,
          fromPath,
          toPath,
          statusCode,
          isActive: true,
          hits: 0,
          note: typeof row?.note === 'string' ? row.note : null,
          createdAt: now,
          updatedAt: now,
        });
        summary.created += 1;
      }

      db.write();
      res.ok(summary);
    } catch (error) {
      next(error);
    }
  });

  router.use(
    makeCrudRouter({
      db,
      model: getModel('redirects'),
      basePath: 'redirects',
      schema: 'redirect',
      slugged: false,
      listShape: (record, { admin }) =>
        admin
          ? record
          : Object.fromEntries(PUBLIC_FIELDS.map((field) => [field, record[field] ?? null])),
      beforeValidate: (body, { existing }) => {
        if (typeof body.fromPath === 'string') body.fromPath = normalizePath(body.fromPath);
        if (typeof body.toPath === 'string') body.toPath = normalizePath(body.toPath);
        validateRedirect(body, rows(), existing ?? null);
        return body;
      },
      sorts: { fromPath: 'fromPath', hits: '-hits', createdAt: '-createdAt' },
      defaultSort: 'fromPath',
      noun: { one: 'redirect', many: 'redirects' },
    })
  );

  return router;
};

module.exports.validateRedirect = validateRedirect;
module.exports.normalizePath = normalizePath;
module.exports.CSV_COLUMNS = CSV_COLUMNS;
