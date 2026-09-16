/**
 * Pages — the CMS (00_MASTER_CONTEXT.md §5.14, §6.10; decision D28).
 *
 *   GET /api/pages/slug/:slug            published, or any status with a token
 *   …and the admin CRUD, `bulk`, `check-slug` and `preview-token` of §5.14.
 *
 * A page is a list of blocks, and the two things the API owes the editor are
 * about that list: every block gets an id the moment it is saved — the same
 * rule the property form's nested arrays follow (§5.5) — and the `order`
 * values are renumbered `1…n` so a drag-and-drop that leaves gaps or ties
 * still round-trips exactly.
 *
 * Sanitising rich text is the frontend's job (`dompurify`), but a payload with
 * a `<script` in it never reached a browser in the first place, so the API
 * refuses it: 422 on `blocks.<n>.data.html`. That is a second line of defence,
 * not the first.
 */

const express = require('express');

const { issueToken, verifyToken } = require('../lib/previewTokens');
const { makeCrudRouter } = require('../lib/crud');
const { maxId } = require('../lib/ids');
const { notFound, validation } = require('../middleware/errors');

/** Block types whose `data.html` is rendered as markup (§6.10). */
const HTML_BLOCKS = new Set(['richText', 'html']);

/** `POST /admin/pages/bulk` (§4.5); `delete` comes for free. */
const BULK_ACTIONS = {
  publish: { status: 'published' },
  unpublish: { status: 'draft' },
};

const first = (value) => (Array.isArray(value) ? value[0] : value);

const sameId = (left, right) => String(left) === String(right);

/**
 * Gives every block an id and renumbers `order` as `1…n`.
 *
 * Blocks already carrying an `order` keep their relative sequence; the ones
 * that do not fall in where the array put them.
 *
 * @param {object} body the request body, copied by the caller
 * @returns {object} the same body
 */
function normaliseBlocks(body) {
  if (!Array.isArray(body.blocks)) return body;

  let highest = maxId(body.blocks);
  const withIds = body.blocks.map((block, index) => {
    if (!block || typeof block !== 'object') return block;
    const id = Number.isInteger(block.id) ? block.id : (highest += 1);
    return { ...block, id, order: Number.isFinite(block.order) ? block.order : index + 1 };
  });

  body.blocks = withIds
    .map((block, index) => ({ block, index }))
    .sort(
      (left, right) =>
        (left.block?.order ?? 0) - (right.block?.order ?? 0) || left.index - right.index
    )
    .map(({ block }, index) =>
      block && typeof block === 'object' ? { ...block, order: index + 1 } : block
    );

  return body;
}

/**
 * Refuses a block whose HTML carries a script tag.
 *
 * @param {object} body
 * @returns {object} the same body
 * @throws {import('../middleware/errors').ApiError} 422, keyed by block index
 */
function rejectScripts(body) {
  if (!Array.isArray(body.blocks)) return body;
  const errors = {};

  body.blocks.forEach((block, index) => {
    if (!HTML_BLOCKS.has(block?.type)) return;
    const html = block?.data?.html;
    if (typeof html === 'string' && /<script\b/i.test(html)) {
      errors[`blocks.${index}.data.html`] = ['Script tags are not allowed in page content.'];
    }
  });

  if (Object.keys(errors).length > 0) throw validation(errors);
  return body;
}

/**
 * The pages router.
 *
 * @param {{db: object, getModel: Function}} deps
 * @returns {import('express').Router}
 */
module.exports = ({ db, getModel }) => {
  const router = express.Router();
  const rows = () => db.getCollection('pages');

  /** The site URL a preview link is built on (§9.1). */
  function siteUrl() {
    const seo = db.getSingleton('seoSettings');
    const settings = db.getSingleton('siteSettings');
    return String(seo?.siteUrl ?? settings?.general?.siteUrl ?? '').replace(/\/+$/, '');
  }

  /* ---------------------------------------------------------------- *
   * Public
   * ---------------------------------------------------------------- */

  // A page's slug is a URL path (§6.10): `buyer-assistance/home-loan`. The
  // `(*)` makes the parameter greedy so the whole remainder of the path is the
  // slug rather than only its first segment.
  router.get('/pages/slug/:slug(*)', (req, res, next) => {
    const page = rows().find((row) => row.slug === req.params.slug);
    if (!page) {
      next(notFound());
      return;
    }

    const previewing = verifyToken(first(req.query.preview), 'page', page.id);
    if (page.status !== 'published' && !previewing) {
      next(notFound());
      return;
    }

    res.ok({ ...page });
  });

  /* ---------------------------------------------------------------- *
   * Admin
   * ---------------------------------------------------------------- */

  router.get('/admin/pages/:id/preview-token', (req, res, next) => {
    const page = rows().find((row) => sameId(row.id, req.params.id));
    if (!page) {
      next(notFound());
      return;
    }

    const { token, expiresAt } = issueToken('page', page.id);
    res.ok({ token, expiresAt, url: `${siteUrl()}/${page.slug}?preview=${token}` });
  });

  router.use(
    makeCrudRouter({
      db,
      model: getModel('pages'),
      basePath: 'pages',
      schema: 'page',
      // The slug lookup above owns the public half: it is the one public read
      // a page has, and it has to understand `?preview=`.
      publicPath: false,
      beforeValidate: (body) => rejectScripts(normaliseBlocks(body)),
      adminFilters: {
        status: { field: 'status', type: 'csv' },
        template: { field: 'template', type: 'csv' },
      },
      sorts: { order: 'order,title', title: 'title', updatedAt: '-updatedAt' },
      defaultSort: 'order',
      bulkActions: BULK_ACTIONS,
      noun: { one: 'page', many: 'pages' },
    })
  );

  return router;
};

module.exports.normaliseBlocks = normaliseBlocks;
module.exports.rejectScripts = rejectScripts;
