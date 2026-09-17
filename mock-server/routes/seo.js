/**
 * SEO settings and the SEO desk (00_MASTER_CONTEXT.md §5.14, §6.14, §9).
 *
 *   GET      /api/seo/settings          what the public site renders
 *   GET, PUT /api/admin/seo/settings    the whole singleton, deep-merged
 *   GET      /api/admin/seo/overview    one row per optimisable entity
 *   GET      /api/admin/seo/llms-preview  the generated llms.txt, unsaved
 *
 * `seoSettings` is public in full (§4.8 of this prompt): the site has to render
 * the verification tags, `customHeadHtml` and the knowledge graph itself, the
 * `robotsTxt` and `llmsTxt` documents are already served as files at
 * `/robots.txt` and `/llms.txt`, and nothing in the model is a secret. Saying
 * so once here is clearer than a subset nobody can justify later.
 *
 * The **overview** is the SEO Manager's index: eight entity types flattened
 * into one list of `{ key, id, type, title, slug, url, seo, duplicateOf, … }`
 * rows, so the dashboard can rank the whole site by score and the panel can
 * check that a focus keyword is not already taken (§9.1). Scores are computed
 * in the browser by `src/seo` and stored on the record; this endpoint reads
 * them back and never recomputes.
 *
 * `duplicateOf` is computed **here** rather than in the dashboard: finding the
 * records that share a title, a description or a focus keyword is a pairwise
 * comparison, and doing it in the browser over every row of eight collections
 * is the O(n²) the SEO desk would pay on every render. The server groups by
 * value once, in one pass, and each row carries the keys of the records it
 * collides with. Empty values never collide — two records nobody has written a
 * description for are not duplicates of each other.
 */

const express = require('express');

const { SEO_ENTITY_TYPES } = require('../lib/enums');
const { absoluteUrl, generateLlms, publicPathOf } = require('../lib/sitemapBuilder');
const { applySettingsUpdate } = require('./settings');
const { forbidden } = require('../middleware/errors');
const { inCsv, matchesQ, toBool } = require('../lib/filters');
const { paginate, toPositiveInt, DEFAULT_PER_PAGE_ADMIN } = require('../lib/paginate');
const { publicSeoSettings } = require('../lib/scope');
const { sortItems } = require('../lib/sort');

/**
 * The collection behind each SEO entity type, and how to read a row from it.
 *
 * @type {Record<string, {collection: string, title: (record: object) => string}>}
 */
const ENTITY_SOURCES = {
  property: { collection: 'properties', title: (record) => record.title },
  article: { collection: 'articles', title: (record) => record.title },
  page: { collection: 'pages', title: (record) => record.title },
  locality: { collection: 'localities', title: (record) => record.name },
  developer: { collection: 'developers', title: (record) => record.name },
  articleCategory: { collection: 'articleCategories', title: (record) => record.name },
  author: { collection: 'authors', title: (record) => record.name },
  propertyType: { collection: 'propertyTypes', title: (record) => record.name },
};

/** The sorts the overview accepts. */
const OVERVIEW_SORTS = {
  updatedAt: { spec: 'updatedAt', order: 'desc' },
  title: { spec: 'title', order: 'asc' },
  score: { spec: 'seo.score', order: 'desc' },
  type: { spec: 'type,title', order: 'asc' },
};

/** The collections `llms-preview` reads. */
const LLMS_SOURCES = ['properties', 'localities', 'propertyTypes', 'articles'];

const first = (value) => (Array.isArray(value) ? value[0] : value);

/** The three `seo` fields a duplicate is reported for (§4.12 of prompt 37). */
const DUPLICATE_FIELDS = ['title', 'description', 'focusKeyword'];

/** Case and surrounding whitespace do not make two titles different. */
const normaliseValue = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

/**
 * The two fields an editor may not write — §9.3 renders them into the head
 * verbatim, so they are a script tag on every page of the site.
 */
const CUSTOM_HTML_FIELDS = ['customHeadHtml', 'customBodyEndHtml'];

/** `null` and `''` mean the same thing here: nothing is rendered. */
const sameHtml = (left, right) => String(left ?? '') === String(right ?? '');

/**
 * Refuses a manager's attempt to change the custom HTML (§7, §9.3).
 *
 * The SEO area is admin **and** manager, and a manager edits every other field
 * on the screen. These two are different in kind: what they hold is executed in
 * every visitor's browser, which is an administrator's decision. A `PUT` that
 * carries the stored value unchanged — which is what saving another tab of the
 * same form does — is not a change and is allowed through.
 *
 * @param {{role?: string}|undefined} user
 * @param {object} stored the settings as they are
 * @param {object} body the request body
 * @throws {import('../middleware/errors').ApiError} 403
 */
function assertMayWriteCustomHtml(user, stored, body) {
  if (!user || user.role === 'admin') return;

  const changed = CUSTOM_HTML_FIELDS.filter(
    (field) => field in (body ?? {}) && !sameHtml(body[field], stored?.[field])
  );

  if (changed.length > 0) {
    throw forbidden('Only an administrator can change the custom head or body HTML.');
  }
}

/**
 * The SEO router.
 *
 * @param {{db: object, getModel: Function}} deps
 * @returns {import('express').Router}
 */
module.exports = ({ db, getModel }) => {
  const router = express.Router();
  const model = getModel('seoSettings');

  const current = () => db.getSingleton('seoSettings') ?? {};

  /**
   * One overview row (`SeoOverviewRow` in `docs/API_CONTRACT.md`).
   *
   * `status` is `null` for the entities that have none — a locality is active
   * or it is not — and `url` is the public page the row is about, so the desk
   * can open it in a tab without knowing the routing rules.
   */
  function overviewRow(type, record, siteUrl) {
    const path = publicPathOf(type, record);

    return {
      // An id is only unique inside its collection, so the row that eight
      // collections share a list with needs a key of its own — and
      // `duplicateOf` points at these, not at bare ids.
      key: `${type}:${record.id}`,
      id: record.id,
      type,
      title: ENTITY_SOURCES[type].title(record) ?? null,
      slug: record.slug ?? null,
      url: path ? absoluteUrl(siteUrl, path) : null,
      seo: record.seo ?? null,
      isActive: record.isActive ?? null,
      status: record.status ?? null,
      updatedAt: record.updatedAt ?? null,
      duplicateOf: { title: [], description: [], focusKeyword: [] },
    };
  }

  /** Every row of every requested type, before filtering. */
  function overviewRows(types, siteUrl) {
    return types.flatMap((type) =>
      db
        .getCollection(ENTITY_SOURCES[type].collection)
        .map((record) => overviewRow(type, record, siteUrl))
    );
  }

  /**
   * Fills every row's `duplicateOf` from the whole site.
   *
   * Always from the whole site, never from the filtered page: "this title is
   * also an article's" is only true if the articles were looked at, and a desk
   * filtered to properties still has to be told.
   *
   * @param {Array<object>} rows every row, of every type
   */
  function markDuplicates(rows) {
    for (const field of DUPLICATE_FIELDS) {
      /** @type {Map<string, Array<object>>} */
      const byValue = new Map();

      for (const row of rows) {
        const value = normaliseValue(row.seo?.[field]);
        if (value === '') continue; // Two blanks are not a collision.
        const group = byValue.get(value);
        if (group) group.push(row);
        else byValue.set(value, [row]);
      }

      for (const group of byValue.values()) {
        if (group.length < 2) continue;
        for (const row of group) {
          row.duplicateOf[field] = group.filter((other) => other !== row).map((other) => other.key);
        }
      }
    }

    return rows;
  }

  /* ---------------------------------------------------------------- *
   * Settings
   * ---------------------------------------------------------------- */

  router.get('/seo/settings', (req, res) => {
    res.ok(publicSeoSettings(current()));
  });

  router.get('/admin/seo/settings', (req, res) => {
    res.ok({ ...current() });
  });

  router.put('/admin/seo/settings', (req, res, next) => {
    try {
      assertMayWriteCustomHtml(req.user, current(), req.body);

      const updated = applySettingsUpdate(current(), req.body, {
        schema: 'seoSettings.update',
        fields: model.fields,
      });

      Object.assign(current(), updated);
      db.write();

      res.ok({ ...current() });
    } catch (error) {
      next(error);
    }
  });

  /* ---------------------------------------------------------------- *
   * The desk
   * ---------------------------------------------------------------- */

  router.get('/admin/seo/overview', (req, res) => {
    const siteUrl = current().siteUrl ?? '';
    const requested = inCsv(req.query.type).filter((type) => SEO_ENTITY_TYPES.has(type));
    const types = requested.length > 0 ? requested : SEO_ENTITY_TYPES.values;

    // The whole site is read whatever the filter asks for, because the
    // duplicate flags are a statement about the site rather than about the page.
    const all = markDuplicates(overviewRows(SEO_ENTITY_TYPES.values, siteUrl));
    let rows =
      types.length === SEO_ENTITY_TYPES.values.length
        ? all
        : all.filter((row) => types.includes(row.type));

    const q = first(req.query.q);
    if (q) rows = rows.filter((row) => matchesQ(row, ['title', 'slug', 'seo.focusKeyword'], q));

    const bands = inCsv(req.query.scoreBand);
    if (bands.length > 0) {
      rows = rows.filter((row) => bands.includes(row.seo?.scoreBand ?? 'none'));
    }

    // `index` reads as the SEO panel labels it — `indexed` or `noindex` — and
    // as the plain boolean the registry declares.
    const index = first(req.query.index);
    if (index !== undefined && index !== '') {
      const wanted = index === 'indexed' ? true : index === 'noindex' ? false : toBool(index);
      if (wanted !== undefined) {
        rows = rows.filter((row) => (row.seo?.robots?.index !== false) === wanted);
      }
    }

    const key = OVERVIEW_SORTS[String(first(req.query.sort) ?? '')]
      ? String(first(req.query.sort))
      : 'updatedAt';
    const { spec, order } = OVERVIEW_SORTS[key];
    const wantedOrder = String(first(req.query.order) ?? '').toLowerCase();
    const sorted = sortItems(
      rows,
      spec,
      wantedOrder === 'asc' || wantedOrder === 'desc' ? wantedOrder : order
    );

    const perPage =
      String(first(req.query.perPage)) === 'all'
        ? null
        : toPositiveInt(first(req.query.perPage), DEFAULT_PER_PAGE_ADMIN);

    const { data, meta } = paginate(sorted, { page: first(req.query.page), perPage });
    res.ok(data, meta);
  });

  router.get('/admin/seo/llms-preview', (req, res) => {
    const data = {
      ...Object.fromEntries(LLMS_SOURCES.map((name) => [name, db.getCollection(name)])),
      seoSettings: current(),
      siteSettings: db.getSingleton('siteSettings') ?? {},
    };

    // The settings UI shows this next to the stored document so an editor can
    // see what "regenerate from data" would write before they accept it.
    res.ok({ llmsTxt: generateLlms(data) });
  });

  return router;
};

module.exports.ENTITY_SOURCES = ENTITY_SOURCES;
module.exports.CUSTOM_HTML_FIELDS = CUSTOM_HTML_FIELDS;
