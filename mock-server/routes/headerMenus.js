/**
 * The header's menus (`docs/DECISIONS.md`, QA-56).
 *
 *   GET /api/header-menus            the active menus, left to right, unpaginated
 *   …and the admin CRUD, `bulk` and `check-slug` of §5.14 under /admin/header-menus.
 *
 * The header was a list in `src/config/navigation.js`, and a page could join
 * one of three of its menus. Every menu is a record now: an editor renames,
 * reorders, hides and adds them, gives them submenus, and places pages and
 * links in them. A page names its menu by the menu's slug (`headerMenu`) and a
 * group of it by the submenu's slug (`headerSubmenu`).
 *
 * The rules this file owns are the ones a slug reference needs:
 *
 *   - a menu keeps its slug once it exists (pages are filed under it), and its
 *     `source` too — a `custom` menu is made of pages and links, while `buy`,
 *     `rent` and `commercial` are the site's generated mega menus, which come
 *     with the site, are never created by a client and are never deleted;
 *   - a menu's name is unique in the header, and a submenu's within its menu,
 *     ignoring case: two "Company" labels side by side, or two groups under
 *     one heading, are a mistake a visitor cannot tell apart;
 *   - a submenu's slug is unique within its menu and is derived from its name
 *     when sent empty; a link may name one of the menu's submenus or none;
 *   - deleting a custom menu takes its pages out of the header rather than
 *     leaving them pointing at nothing, and removing a submenu moves its pages
 *     into the menu's own list — both write the pages they touch.
 */

const express = require('express');

const { GENERATED_MENU_SOURCES, isGeneratedMenu } = require('../../src/config/headerMenus');
const { makeCrudRouter } = require('../lib/crud');
const { paginate, toPositiveInt } = require('../lib/paginate');
const { slugify } = require('../lib/slug');
const { validation } = require('../middleware/errors');

const first = (value) => (Array.isArray(value) ? value[0] : value);

/** A name as two of them are compared: trimmed, one space, any case. */
const nameKey = (value) =>
  String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

const byOrder = (left, right) =>
  (left.order ?? 0) - (right.order ?? 0) ||
  String(left.name ?? '').localeCompare(String(right.name ?? ''));

/**
 * The submenus as they will be stored: every one with a slug, derived from its
 * name when it came without one, and no slug twice.
 *
 * @param {Array<object>} submenus
 * @returns {Array<object>}
 * @throws {import('../middleware/errors').ApiError} 422 on a slug sent twice
 */
function settleSubmenus(submenus) {
  if (!Array.isArray(submenus)) return submenus;

  const taken = new Set(
    submenus
      .map((entry) => (typeof entry?.slug === 'string' ? entry.slug.trim() : ''))
      .filter(Boolean)
  );
  const errors = {};
  const seen = new Set();

  const names = new Map();

  const settled = submenus.map((entry, index) => {
    if (!entry || typeof entry !== 'object') return entry;
    let slug = typeof entry.slug === 'string' ? entry.slug.trim() : '';

    const name = nameKey(entry.name);
    if (name && names.has(name)) {
      errors[`submenus.${index}.name`] = ['Two submenus of one menu cannot share a name.'];
    }
    names.set(name, index);

    if (!slug) {
      const base = slugify(entry.name ?? '') || 'group';
      slug = base;
      for (let suffix = 2; taken.has(slug) || seen.has(slug); suffix += 1) {
        slug = `${base}-${suffix}`;
      }
    } else if (seen.has(slug)) {
      errors[`submenus.${index}.slug`] = ['Two submenus of one menu cannot share a key.'];
    }

    seen.add(slug);
    return { ...entry, slug };
  });

  if (Object.keys(errors).length > 0) throw validation(errors);
  return settled;
}

/**
 * The header menus router.
 *
 * @param {{db: object, getModel: Function}} deps
 * @returns {import('express').Router}
 */
module.exports = ({ db, getModel }) => {
  const router = express.Router();
  const rows = () => db.getCollection('headerMenus');

  /** The pages placed in a menu, whatever their status. */
  const pagesIn = (slug) => db.getCollection('pages').filter((page) => page.headerMenu === slug);

  /**
   * The identity rules and the submenu/link checks, before the 422 pass.
   *
   * @param {object} body the request body, copied by the caller
   * @param {{existing?: object, method: string}} context
   * @returns {object}
   */
  function prepare(body, { existing, method }) {
    if (existing) {
      const sent = body.slug;
      if (sent !== undefined && sent !== null && sent !== '' && sent !== existing.slug) {
        throw validation({ slug: ['A menu keeps its key: its pages are filed under it.'] });
      }
      // A `PUT` that leaves the key out keeps it rather than deriving a new one
      // from the new name.
      if (method !== 'PATCH' || sent !== undefined) body.slug = existing.slug;

      if (body.source !== undefined && body.source !== existing.source) {
        throw validation({
          source: [
            isGeneratedMenu(existing)
              ? 'A generated menu keeps what it is built from.'
              : 'A menu of pages and links cannot become a generated one.',
          ],
        });
      }
    } else if (body.source !== undefined && body.source !== 'custom') {
      throw validation({
        source: ['The generated menus come with the site; a new menu is made of pages and links.'],
      });
    }

    // One label per menu in the header, whatever its case.
    if (typeof body.name === 'string' && body.name.trim()) {
      const clash = rows().find(
        (row) =>
          String(row.id) !== String(existing?.id ?? '') && nameKey(row.name) === nameKey(body.name)
      );
      if (clash) {
        throw validation({
          name: [
            `The header already has a menu called “${clash.name}”. Give this one another name.`,
          ],
        });
      }
    }

    if (Array.isArray(body.submenus)) body.submenus = settleSubmenus(body.submenus);

    // A link names one of this menu's submenus, or none.
    const submenus = Array.isArray(body.submenus) ? body.submenus : (existing?.submenus ?? []);
    const known = new Set(submenus.map((entry) => entry?.slug).filter(Boolean));
    if (Array.isArray(body.links)) {
      const errors = {};
      body.links = body.links.map((entry, index) => {
        if (!entry || typeof entry !== 'object') return entry;
        const submenu = typeof entry.submenu === 'string' ? entry.submenu.trim() : entry.submenu;
        if (submenu && !known.has(submenu)) {
          errors[`links.${index}.submenu`] = ['The selected submenu is invalid.'];
        }
        return { ...entry, submenu: submenu || null };
      });
      if (Object.keys(errors).length > 0) throw validation(errors);
    }

    return body;
  }

  /**
   * Moves the pages of the submenus a write removed into the menu's own list,
   * and follows nothing else: a page keeps its menu.
   */
  function releaseRemovedSubmenus(record, existing) {
    if (!existing) return;
    const kept = new Set((record.submenus ?? []).map((entry) => entry.slug));
    const removed = (existing.submenus ?? [])
      .map((entry) => entry.slug)
      .filter((slug) => !kept.has(slug));
    if (removed.length === 0) return;

    const now = new Date().toISOString();
    let changed = false;
    for (const page of pagesIn(existing.slug)) {
      if (!removed.includes(page.headerSubmenu)) continue;
      page.headerSubmenu = null;
      page.updatedAt = now;
      changed = true;
    }
    if (changed) db.write();
  }

  /* ---------------------------------------------------------------- *
   * Public
   * ---------------------------------------------------------------- */

  // Unpaginated by default, like the navigation list of the pages: a header is
  // a whole header or it is wrong (§5.2 covers an unpaginated list's `meta`).
  router.get('/header-menus', (req, res) => {
    const active = rows()
      .filter((menu) => menu.isActive !== false)
      .slice()
      .sort(byOrder)
      .map((menu) => ({ ...menu, builtIn: isGeneratedMenu(menu) }));

    const { data, meta } = paginate(active, {
      page: first(req.query.page),
      perPage: toPositiveInt(first(req.query.perPage), null),
    });
    res.ok(data, meta);
  });

  /* ---------------------------------------------------------------- *
   * Admin
   * ---------------------------------------------------------------- */

  router.use(
    makeCrudRouter({
      db,
      model: getModel('headerMenus'),
      basePath: 'header-menus',
      schema: 'headerMenu',
      // The public list above owns the public half: it has no pages and no
      // read by slug — a menu has no page of its own.
      publicPath: false,
      beforeValidate: prepare,
      protect: (record) =>
        isGeneratedMenu(record)
          ? `“${record.name}” is generated by the site and cannot be deleted. Hide it instead.`
          : null,
      afterRead: (record) => ({ ...record, builtIn: isGeneratedMenu(record) }),
      afterSave: (record, { existing, method }) => {
        if (method === 'PUT' || method === 'PATCH') releaseRemovedSubmenus(record, existing);
      },
      // A deleted menu takes its pages out of the header rather than leaving
      // them filed under a key that no longer exists.
      beforeDelete: (record) => {
        const now = new Date().toISOString();
        let changed = false;
        for (const page of pagesIn(record.slug)) {
          page.showInHeader = false;
          page.headerMenu = null;
          page.headerSubmenu = null;
          page.updatedAt = now;
          changed = true;
        }
        if (changed) db.write();
      },
      sorts: { order: 'order,name', name: 'name' },
      defaultSort: 'order',
      noun: { one: 'menu', many: 'menus' },
    })
  );

  return router;
};

module.exports.settleSubmenus = settleSubmenus;
module.exports.GENERATED_MENU_SOURCES = GENERATED_MENU_SOURCES;
