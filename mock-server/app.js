/**
 * The Express application (00_MASTER_CONTEXT.md §10; decision D9).
 *
 * `createApp()` is exported rather than a listening server so that the smoke
 * tests of prompt 09 and any future unit test can drive the API in-process.
 *
 * Request pipeline, in order:
 *
 *   CORS → JSON body (5 MB) → request log → optional latency → envelope helpers
 *   → `/api/health`
 *   → bearer token + role matrix     (`/api/admin/*` and the private `/auth/*`)
 *   → custom routers            (prompts 07–09; hand-written routes win,
 *                                and `routes/sitemap.js` answers the SEO files)
 *   → admin prefix → query translation → public scoping → validation
 *   → ids & timestamps → generic DELETE → JSON Server's CRUD router
 *   → 404 → error handler
 *
 * The root mirrors of the SEO files (`/sitemap.xml`, `/robots.txt`, …) are
 * rewritten onto `/api/...` before anything else runs, so the mock answers on
 * both paths exactly as Nginx will in production (decision D21).
 */

const cors = require('cors');
const express = require('express');

const defaultConfig = require('./config');
const dbModule = require('./db');
const customRouters = require('./routes');
const { version } = require('../package.json');
const { adminPermission } = require('./middleware/role');
const { envelope, renderEnvelope } = require('./middleware/envelope');
const { errorHandler, notFound } = require('./middleware/errors');
const { publicScope, adminPrefix } = require('./middleware/publicScope');
const { requireAuth } = require('./middleware/auth');
const { queryTranslate } = require('./middleware/queryTranslate');
const { requestLog } = require('./middleware/requestLog');
const { timestamps } = require('./middleware/timestamps');
const { validateWrite } = require('./middleware/validate');

/** The files served both under `/api` and at the root (§5.13, D21). */
const SEO_FILE_RE = /^\/(sitemap\.xml|sitemap-[a-z0-9-]+\.xml|robots\.txt|rss\.xml|llms\.txt)$/;

/** The `/auth/*` endpoints that need a token; `login` is the only public one. */
const PRIVATE_AUTH_PATHS = [
  '/api/auth/logout',
  '/api/auth/profile',
  '/api/auth/password',
  '/api/auth/refresh',
];

/** Artificial latency, used to review skeletons and spinners (`MOCK_DELAY_MS`). */
function delay(ms) {
  return (req, res, next) => {
    setTimeout(next, ms);
  };
}

/**
 * Handles `DELETE /<collection>/:id` before JSON Server sees it.
 *
 * @param {typeof dbModule} db
 * @returns {import('express').RequestHandler}
 */
function genericDelete(db) {
  return (req, res, next) => {
    if (req.method !== 'DELETE') {
      next();
      return;
    }

    const segments = req.path.split('/').filter(Boolean);
    if (segments.length !== 2) {
      next();
      return;
    }

    const [name, id] = segments;
    const model = db.getModel(name);
    if (!model || model.singleton) {
      next();
      return;
    }

    // Deleting something that is already gone is a 404, not a silent success.
    if (!db.removeRecord(name, id)) {
      next(notFound());
      return;
    }

    res.message('Deleted');
  };
}

/**
 * Builds the application.
 *
 * @param {{router?: object, config?: object, db?: object}} [options]
 *   `router` is the JSON Server router (created from the runtime database when
 *   omitted), `config` the resolved environment, `db` the runtime-database
 *   module — all three are injectable so tests can supply their own.
 * @returns {import('express').Express}
 */
function createApp({ router, config = defaultConfig, db = dbModule } = {}) {
  const app = express();
  const jsonServerRouter = router ?? db.createRouter();
  const deps = {
    db,
    config,
    getModel: db.getModel,
    getCollection: db.getCollection,
    getSingleton: db.getSingleton,
  };

  app.disable('x-powered-by');
  app.set('json spaces', 0);

  app.use(cors({ origin: config.corsOrigins, credentials: false }));
  app.use(express.json({ limit: '5mb' }));
  app.use(requestLog);
  if (config.delayMs > 0) app.use(delay(config.delayMs));
  app.use(envelope);

  // Root mirrors: `/sitemap.xml` is rewritten onto `/api/sitemap.xml`, so the
  // sitemap router below answers both spellings from one implementation (D21).
  app.use((req, res, next) => {
    if (req.method === 'GET' && SEO_FILE_RE.test(req.path)) {
      req.url = `/api${req.url}`;
      // The index names its children where it was fetched (prompt 51).
      req.seoFileAtRoot = true;
    }
    next();
  });

  app.get('/api/health', (req, res) => {
    res.ok({ status: 'ok', time: new Date().toISOString(), version });
  });

  // Authentication and the role matrix run before every router that could
  // answer an admin request — the hand-written ones and the generic CRUD
  // fallback alike — so a route cannot be added without being covered (§7).
  const authenticate = requireAuth(deps);
  app.use('/api/admin', authenticate, adminPermission());
  app.use(PRIVATE_AUTH_PATHS, authenticate);

  for (const createRouter of customRouters) app.use('/api', createRouter(deps));

  app.use(
    '/api',
    adminPrefix,
    queryTranslate(deps),
    publicScope(deps),
    validateWrite(deps),
    timestamps(deps),
    genericDelete(db),
    jsonServerRouter
  );

  app.use((req, res) => {
    res.status(404).json({ message: 'Not found' });
  });
  app.use(errorHandler);

  jsonServerRouter.render = renderEnvelope;

  return app;
}

module.exports = { createApp, SEO_FILE_RE };
