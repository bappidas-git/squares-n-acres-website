/**
 * Pages — the CMS (00_MASTER_CONTEXT.md §5.14, §6.10; decision D28).
 *
 *   GET /api/pages?showInHeader=&showInFooter=   the navigation list
 *   GET /api/pages/slug/:slug                    published, or any status with a token
 *   …and the admin CRUD, `bulk`, `check-slug` and `preview-token` of §5.14.
 *
 * The navigation list exists because the header and the footer are built from
 * data (prompt 27): an editor who adds a service page decides where it appears
 * by ticking `showInHeader` and picking a `headerMenu` — any of the header's
 * menus, and one of its submenus (`headerSubmenu`, QA-56) — and no menu is
 * spelled out in the frontend. It answers the six fields a link needs and
 * nothing else — a menu is not a reason to download fifteen pages of blocks.
 *
 * Some pages are **protected** (`src/config/pages.js`, QA-56): the built-in
 * pages the site generates (template `system`) and the written pages its own
 * templates link to by address. They are never deleted and keep their slug; a
 * built-in page is never a draft and carries no blocks.
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

const PATHS = require('../../src/routes/paths');
const {
  SYSTEM_TEMPLATE,
  deleteRefusal,
  homeRedirectRefusal,
  isHomePage,
  isSystemPage,
  slugRefusal,
  unpublishRefusal,
} = require('../../src/config/pages');
const { ApiError, notFound, validation } = require('../middleware/errors');
const { issueToken, verifyToken } = require('../lib/previewTokens');
const { makeCrudRouter } = require('../lib/crud');
const { maxId } = require('../lib/ids');
const { omit } = require('../lib/scope');
const { paginate, toPositiveInt } = require('../lib/paginate');
const { slugifyPath } = require('../lib/slug');
const { toBool } = require('../lib/filters');

const { isReservedPath } = PATHS;

/** Block types whose `data.html` is rendered as markup (§6.10). */
const HTML_BLOCKS = new Set(['richText', 'html']);

/** `POST /admin/pages/bulk` (§4.5); `delete` comes for free. */
const BULK_ACTIONS = {
  publish: { status: 'published' },
  unpublish: { status: 'draft' },
};

const first = (value) => (Array.isArray(value) ? value[0] : value);

const sameId = (left, right) => String(left) === String(right);

/** The six fields a navigation link is built from. */
const navShape = (page) => ({
  slug: page.slug,
  title: page.title,
  headerMenu: page.headerMenu ?? null,
  headerSubmenu: page.headerSubmenu ?? null,
  footerColumn: page.footerColumn ?? null,
  order: Number.isFinite(page.order) ? page.order : 0,
});

/**
 * The rules of the protected and the built-in pages (`src/config/pages.js`,
 * QA-56), and the check that a submenu belongs to the menu a page names.
 *
 *   - `system` is the template of the pages that come with the site: no page
 *     is created with it, none is moved into or out of it;
 *   - a protected page keeps its address — an empty slug on a `PUT`, which
 *     would otherwise be derived afresh from the title (§5.9), keeps it too;
 *   - a built-in page is never a draft and carries no blocks: its route
 *     answers whatever the record says, and its content is generated;
 *   - the home page is never redirected: its address is `/`, where every
 *     visitor arrives, and its SEO panel would write that rule on save;
 *   - `headerSubmenu` names one of the submenus of `headerMenu`, and goes when
 *     the page has no menu.
 *
 * @param {object} body the request body, copied by the caller
 * @param {{existing?: object, method?: string, db?: object}} [context]
 * @returns {object} the same body
 * @throws {import('../middleware/errors').ApiError} 422
 */
function enforcePageRules(body, { existing, method, db } = {}) {
  const errors = {};
  const mentions = (field) => Object.prototype.hasOwnProperty.call(body, field);

  if (!existing) {
    if (body.template === SYSTEM_TEMPLATE) {
      errors.template = ['“Built-in” is kept for the pages that come with the site.'];
    }
  } else {
    const system = isSystemPage(existing);
    if (mentions('template') && (body.template === SYSTEM_TEMPLATE) !== system) {
      errors.template = [
        system
          ? 'A built-in page keeps its template: the site generates it.'
          : '“Built-in” is kept for the pages that come with the site.',
      ];
    }

    const refusal = slugRefusal(existing);
    if (refusal) {
      const sent = typeof body.slug === 'string' ? body.slug.trim() : '';
      if (sent && slugifyPath(sent) !== existing.slug) errors.slug = [refusal];
      else if (method !== 'PATCH' || mentions('slug')) body.slug = existing.slug;
    }

    if (isHomePage(existing) && body.seo?.redirect?.enabled === true) {
      errors['seo.redirect.enabled'] = [homeRedirectRefusal()];
    }

    if (system) {
      if (mentions('status') && body.status !== 'published') {
        errors.status = [unpublishRefusal(existing)];
      }
      if (Array.isArray(body.blocks) && body.blocks.length > 0) {
        errors.blocks = ['A built-in page has no blocks: the site generates its content.'];
      }
    }
  }

  // The submenu belongs to the menu the page will be in once this write lands.
  const menuSlug = mentions('headerMenu') ? body.headerMenu : existing?.headerMenu;
  if (mentions('headerMenu') && !body.headerMenu) body.headerSubmenu = null;
  const submenu = mentions('headerSubmenu') ? body.headerSubmenu : undefined;
  if (typeof submenu === 'string' && submenu !== '') {
    const menu = (db?.getCollection('headerMenus') ?? []).find((row) => row.slug === menuSlug);
    const known = (menu?.submenus ?? []).some((entry) => entry.slug === submenu);
    if (!known) errors.headerSubmenu = ['The selected headerSubmenu is invalid.'];
  } else if (submenu === '') {
    body.headerSubmenu = null;
  }

  if (Object.keys(errors).length > 0) throw validation(errors);
  return body;
}

/**
 * A bulk action that cannot apply to every selected page is refused whole,
 * with the pages in the way named — the rule a single write applies (QA-56).
 * A built-in page is never unpublished; a protected page is never deleted.
 *
 * @param {string} action
 * @param {Array<object>} targets
 * @throws {ApiError} 409 for a delete, 422 for an unpublish
 */
function refuseProtected(action, targets) {
  const reasonOf =
    action === 'delete' ? deleteRefusal : action === 'unpublish' ? unpublishRefusal : null;
  if (!reasonOf) return;

  const refused = targets
    .map((page) => ({ page, reason: reasonOf(page) }))
    .filter(({ reason }) => reason);
  if (refused.length === 0) return;

  const verb = action === 'delete' ? 'deleted' : 'unpublished';
  const message =
    refused.length === 1
      ? refused[0].reason
      : `${refused.length} of the selected pages cannot be ${verb}: ${refused
          .map(({ page }) => `“${page.title}”`)
          .join(', ')}.`;

  throw new ApiError(
    action === 'delete' ? 409 : 422,
    message,
    { ids: refused.map(({ reason }) => reason) },
    {
      refused: refused.map(({ page, reason }) => ({ id: page.id, title: page.title, reason })),
      ...(action === 'delete' ? { usedBy: [] } : {}),
    }
  );
}

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
 * Refuses a slug whose first segment belongs to a static route.
 *
 * `/properties`, `/buy`, `/insights` and the nine other prefixes of
 * `RESERVED_PATH_PREFIXES` are answered by the router before the CMS catch-all
 * is reached, so a page saved under one exists and is never reachable (D11).
 * `PageFormPage` has refused it since prompt 30 — in the browser only, which
 * left the API storing an unreachable page for any other client and left the
 * Laravel port with no rule to generate (MB-04). A page **already** living
 * under a reserved prefix keeps its slug, exactly as the form allows: the
 * seeded awareness page is served by a route that spells its prefix out.
 *
 * @param {object} body the request body, copied by the caller
 * @param {{existing?: object, method?: string}} [context]
 * @returns {object} the same body
 * @throws {import('../middleware/errors').ApiError} 422 keyed `slug`
 */
function rejectReservedSlug(body, { existing, method } = {}) {
  const sent = typeof body.slug === 'string' ? body.slug.trim() : '';
  const mentionsSlug = Object.prototype.hasOwnProperty.call(body, 'slug');

  // What the write will be stored under: the slug the client chose, or — when
  // it sent an empty one, which asks the API to derive it (§5.9) — the slug
  // the title makes. A `PATCH` that never mentions the slug keeps the old one.
  let effective;
  if (sent) effective = slugifyPath(sent);
  else if (method === 'PATCH' && !mentionsSlug) effective = String(existing?.slug ?? '');
  else effective = slugifyPath(String(body.title ?? existing?.title ?? ''));

  if (!effective || effective === existing?.slug || !isReservedPath(effective)) return body;

  throw validation({
    slug: [`Reserved path — “${effective.split('/')[0]}” belongs to the site’s own pages.`],
  });
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

  // The navigation list. Unpaginated by default — a menu is a whole menu or
  // it is wrong — while still honouring an explicit `page`/`perPage` (§5.2
  // covers an unpaginated list's `meta`).
  router.get('/pages', (req, res) => {
    const wantsHeader = toBool(first(req.query.showInHeader));
    const wantsFooter = toBool(first(req.query.showInFooter));

    const matching = rows()
      .filter((row) => row.status === 'published')
      .filter((row) => wantsHeader === undefined || Boolean(row.showInHeader) === wantsHeader)
      .filter((row) => wantsFooter === undefined || Boolean(row.showInFooter) === wantsFooter)
      .sort(
        (left, right) =>
          (left.order ?? 0) - (right.order ?? 0) ||
          String(left.title ?? '').localeCompare(String(right.title ?? ''))
      );

    const { data, meta } = paginate(matching, {
      page: first(req.query.page),
      perPage: toPositiveInt(first(req.query.perPage), null),
    });

    res.ok(data.map(navShape), meta);
  });

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

    // A hidden block is the editor's, not the visitor's (prompt 51): the
    // public read leaves it out, and the page renders what is left. Who wrote
    // and saved the page is the panel's business too.
    res.ok({
      ...omit(page, getModel('pages').publicOmit ?? []),
      blocks: (Array.isArray(page.blocks) ? page.blocks : []).filter(
        (block) => block?.hidden !== true
      ),
    });
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
    // `PATHS.page`, so the home record's link is the site root (QA-56).
    const path = PATHS.page(page.slug);
    res.ok({ token, expiresAt, url: `${siteUrl()}${path}?preview=${token}` });
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
      // A page's slug is a URL path, so its separators survive slugification
      // and `check-slug` answers about the whole path (§6.10).
      pathSlug: true,
      beforeValidate: (body, context) =>
        rejectReservedSlug(
          enforcePageRules(rejectScripts(normaliseBlocks(body)), context),
          context
        ),
      // A protected page is never deleted (`src/config/pages.js`, QA-56); a
      // bulk action is refused whole, naming the pages in the way.
      protect: deleteRefusal,
      beforeBulk: refuseProtected,
      adminFilters: {
        status: { field: 'status', type: 'csv' },
        template: { field: 'template', type: 'csv' },
      },
      sorts: { order: 'order,title', title: 'title', updatedAt: '-updatedAt' },
      defaultSort: 'order',
      bulkActions: BULK_ACTIONS,
      noun: { one: 'page', many: 'pages' },
      // A form opened before somebody else's save is refused (prompt 51).
      staleGuard: 'page',
    })
  );

  return router;
};

module.exports.normaliseBlocks = normaliseBlocks;
module.exports.rejectScripts = rejectScripts;
module.exports.rejectReservedSlug = rejectReservedSlug;
module.exports.enforcePageRules = enforcePageRules;
module.exports.refuseProtected = refuseProtected;
