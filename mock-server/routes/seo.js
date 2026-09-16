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
 * into one list of `{ id, type, title, slug, url, seo, … }` rows, so the
 * dashboard can rank the whole site by score and the panel can check that a
 * focus keyword is not already taken (§9.1). Scores are computed in the
 * browser by `src/seo` and stored on the record; this endpoint reads them back
 * and never recomputes.
 */

const express = require('express');

const { SEO_ENTITY_TYPES } = require('../lib/enums');
const { absoluteUrl, generateLlms, publicPathOf } = require('../lib/sitemapBuilder');
const { applySettingsUpdate } = require('./settings');
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
      id: record.id,
      type,
      title: ENTITY_SOURCES[type].title(record) ?? null,
      slug: record.slug ?? null,
      url: path ? absoluteUrl(siteUrl, path) : null,
      seo: record.seo ?? null,
      isActive: record.isActive ?? null,
      status: record.status ?? null,
      updatedAt: record.updatedAt ?? null,
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

    let rows = overviewRows(types, siteUrl);

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
