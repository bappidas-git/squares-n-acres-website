/**
 * Sitemaps, robots.txt, RSS and llms.txt (00_MASTER_CONTEXT.md §5.13, §9.8;
 * decision D21).
 *
 *   GET /api/sitemap.xml                the index of the five below
 *   GET /api/sitemap-properties.xml     active listings, with their images
 *   GET /api/sitemap-localities.xml
 *   GET /api/sitemap-developers.xml
 *   GET /api/sitemap-articles.xml       published articles + category/tag/author
 *   GET /api/sitemap-pages.xml          published pages + the static routes
 *   GET /api/robots.txt
 *   GET /api/rss.xml                    the latest 20 articles
 *   GET /api/llms.txt
 *
 * These are **files**, not resources: no envelope, no pagination, no auth — a
 * crawler gets `text/xml` or `text/plain` and an hour of cache. Every one of
 * them is also served at the root (`/sitemap.xml`), which is where Nginx will
 * proxy it in production and where Search Console will look for it;
 * `mock-server/app.js` rewrites the root path onto this router so there is one
 * implementation rather than two.
 *
 * The documents themselves are built by `mock-server/lib/sitemapBuilder.js`.
 */

const express = require('express');

const {
  CHILD_SITEMAPS,
  absoluteUrl,
  renderLlms,
  renderRobots,
  renderRss,
  renderSitemapIndex,
  renderUrlSet,
  sitemapIndexChildren,
  sitemapSets,
} = require('../lib/sitemapBuilder');
const { sitemapBase } = require('../lib/sitemapHost');

/** An hour, which is long enough to matter and short enough to iterate on. */
const CACHE_CONTROL = 'public, max-age=3600';

/** The collections and singletons the documents are built from. */
const SOURCES = [
  'properties',
  'localities',
  'developers',
  'articles',
  'articleCategories',
  'articleTags',
  'authors',
  'pages',
  'propertyTypes',
  'segments',
];

/**
 * The sitemap router.
 *
 * @param {{db: object}} deps
 * @returns {import('express').Router}
 */
module.exports = ({ db, config }) => {
  const router = express.Router();

  /** Everything the builders read, gathered fresh for each request. */
  const data = () => ({
    ...Object.fromEntries(SOURCES.map((name) => [name, db.getCollection(name)])),
    seoSettings: db.getSingleton('seoSettings') ?? {},
    siteSettings: db.getSingleton('siteSettings') ?? {},
  });

  /** Sends a document with the right type and no envelope (§5.13). */
  const send = (res, body, type) => {
    res.setHeader('Content-Type', `${type}; charset=utf-8`);
    res.setHeader('Cache-Control', CACHE_CONTROL);
    res.send(body);
  };

  const sendXml = (res, body) => send(res, body, 'text/xml');
  const sendText = (res, body) => send(res, body, 'text/plain');

  /**
   * The address the index and robots.txt name the child sitemaps on: the one
   * the request came in on, when it is allowed (`lib/sitemapHost.js`).
   */
  const baseOf = (req, state) =>
    sitemapBase(req, {
      siteUrl: state.seoSettings?.siteUrl ?? '',
      apiUrl: config?.apiUrl ?? null,
      // `/sitemap.xml` at the root is rewritten onto this router (app.js),
      // and marked so: its children are at the root too.
      prefix: req.seoFileAtRoot ? '' : req.baseUrl,
    });

  router.get('/sitemap.xml', (req, res) => {
    const state = data();
    const children = sitemapIndexChildren(state, Date.now(), baseOf(req, state)).map(
      ({ loc, lastmod }) => ({ loc, lastmod })
    );
    sendXml(res, renderSitemapIndex(children));
  });

  for (const name of CHILD_SITEMAPS) {
    router.get(`/sitemap-${name}.xml`, (req, res) => {
      sendXml(res, renderUrlSet(sitemapSets(data())[name] ?? []));
    });
  }

  router.get('/robots.txt', (req, res) => {
    const state = data();
    sendText(res, renderRobots(state, baseOf(req, state)));
  });

  router.get('/rss.xml', (req, res) => {
    sendXml(res, renderRss(data()));
  });

  router.get('/llms.txt', (req, res) => {
    sendText(res, renderLlms(data()));
  });

  return router;
};

module.exports.CACHE_CONTROL = CACHE_CONTROL;
module.exports.absoluteUrl = absoluteUrl;
