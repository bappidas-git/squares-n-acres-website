#!/usr/bin/env node
/**
 * `npm run mock` — starts the mock API on `MOCK_PORT` (default 4000).
 *
 * Everything the API does lives in `app.js`; this file claims the port,
 * prepares the runtime database, opens the socket and turns a startup failure
 * into a message a developer can act on instead of a stack trace.
 *
 * The port is claimed first. When an older copy of the mock still holds it —
 * and the web app would go on talking to that copy, whose route map refuses
 * every screen added since it started (QA-54, QA-57) — it is stopped and this
 * process takes its place (`lib/takeover.js`). That happens before the runtime
 * database is read, because the old process rewrites the whole file from memory
 * on its next write and would undo what `ensureRuntimeDb` adds to it.
 *
 * Once it serves, the process keeps to the code on disk: when a pull changes
 * the API's code, the next request reloads it in place (`lib/hotReload.js`,
 * QA-58), so a mock that nobody restarts cannot fall behind the web app. Every
 * answer names the code that gave it (`X-Mock-Revision`), which is how the web
 * app tells this mock from an older one still answering on the port
 * (`src/services/staleApi.js`).
 */

const http = require('http');
const path = require('path');

const config = require('./config');
const { createApp } = require('./app');
const { ensureRuntimeDb, createRouter } = require('./db');
const { createHotReload, revisionOf, snapshotModules } = require('./lib/hotReload');
const { APP_ID, controlRoutes, takeOver } = require('./lib/takeover');

/** The repository root. */
const ROOT = path.join(__dirname, '..');

/**
 * The header every answer carries: the revision of the code that gave it. The
 * web app reads it (`src/services/staleApi.js`) across origins, so CORS
 * exposes it.
 */
const REVISION_HEADER = 'X-Mock-Revision';

/** The shell: the modules that hold the port, which a reload leaves as they are. */
const SHELL = [__filename, require.resolve('./lib/hotReload'), require.resolve('./lib/takeover')];

/** How long a stopped mock gets to let go of the port. */
const RELEASE_TIMEOUT_MS = 10000;

/** `mock-server/.runtime/db.json`, relative to the repository root. */
const relative = (file) => path.relative(ROOT, file).split(path.sep).join('/');

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/** One `listen`, as a promise that rejects with the socket error (`EADDRINUSE`, …). */
function listen(server, port) {
  return new Promise((resolve, reject) => {
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };
    const onError = (error) => {
      server.off('listening', onListening);
      reject(error);
    };
    server.once('listening', onListening);
    server.once('error', onError);
    server.listen(port);
  });
}

/**
 * Listens on the port, taking it over from an older mock when one holds it.
 *
 * @returns {Promise<{status: 'listening'|'took-over'|'same'|'stuck'|'foreign', holder?: object}>}
 */
async function claimPort(server, port, revision) {
  try {
    await listen(server, port);
    return { status: 'listening' };
  } catch (error) {
    if (error.code !== 'EADDRINUSE') throw error;
  }

  const holder = await takeOver({ port, revision, root: ROOT });
  if (holder.outcome !== 'stopped') return { status: holder.outcome, holder };

  const deadline = Date.now() + RELEASE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(200);
    try {
      await listen(server, port);
      return { status: 'took-over', holder };
    } catch (error) {
      if (error.code !== 'EADDRINUSE') throw error;
    }
  }
  return { status: 'stuck', holder };
}

/** Why a new admin screen answers 403 while an older mock serves the port. */
const STALE_MOCK_EFFECT =
  'The web app talks to whatever answers there, and an older copy refuses the screens it does ' +
  'not know yet: they say the API is older than the web app.';

/**
 * The API as the modules on disk build it now: what a reload serves. The
 * runtime database gains what the seed gained since, as it does on a start.
 * `require` here loads each module afresh, because `lib/hotReload.js` has
 * dropped them from the cache before it calls this.
 */
function loadApi() {
  const freshConfig = require('./config');
  const db = require('./db');
  const { added } = db.ensureRuntimeDb({ fresh: false });
  if (added.length > 0) {
    console.info(`Runtime db gained ${added.join(', ')} from ${relative(freshConfig.seedPath)}`);
  }
  return require('./app').createApp({ router: db.createRouter(), config: freshConfig });
}

/** The line that says what to do about a port this process could not claim. */
function portMessage({ status, holder }, port) {
  const pid = holder?.pid ? ` (pid ${holder.pid})` : '';
  if (status === 'stuck') {
    const stop = holder?.pid
      ? `\`kill ${holder.pid}\` on macOS/Linux, \`Stop-Process -Id ${holder.pid}\` in PowerShell`
      : 'README → Troubleshooting';
    return (
      `Port ${port} is held by an older mock API${pid} that could not be stopped automatically. ` +
      `${STALE_MOCK_EFFECT} Stop it (${stop}), then start the mock again.`
    );
  }
  return (
    `Port ${port} is already in use by a program that is not this mock API. Stop it ` +
    '(README → Troubleshooting), or run the mock on another port with MOCK_PORT and point ' +
    'REACT_APP_API_URL at it.'
  );
}

async function start() {
  // Every module the API is built from is loaded by now: what this process runs.
  const snapshot = snapshotModules({ root: ROOT });
  const revision = revisionOf(snapshot);
  const startedAt = new Date().toISOString();

  // A request that arrives while the database is still loading waits for it
  // rather than failing: after a takeover the web app is usually mid-poll.
  let handle = null;
  const waiting = [];
  const server = http.createServer((req, res) => {
    if (handle) handle(req, res);
    else waiting.push([req, res]);
  });

  const claim = await claimPort(server, config.port, revision);
  if (claim.status === 'same') {
    console.info(
      `The mock API is already running this code on port ${config.port}` +
        `${claim.holder?.pid ? ` (pid ${claim.holder.pid})` : ''}; the web app is talking to it. ` +
        'Nothing to start.'
    );
    process.exit(0);
  }
  if (claim.status === 'stuck' || claim.status === 'foreign') {
    console.error(portMessage(claim, config.port));
    process.exit(1);
  }
  if (claim.status === 'took-over') {
    const from =
      claim.holder.root && claim.holder.root !== ROOT ? `, from ${claim.holder.root}` : '';
    console.info(
      `Stopped an older mock API (pid ${claim.holder.pid}${from}) that was still answering on ` +
        `port ${config.port}. ${STALE_MOCK_EFFECT} This one serves the port now.`
    );
  }

  const { created, added } = ensureRuntimeDb({ fresh: config.fresh });
  if (created) {
    console.info(`Runtime db seeded from ${relative(config.seedPath)}`);
  } else if (added.length > 0) {
    console.info(`Runtime db gained ${added.join(', ')} from ${relative(config.seedPath)}`);
  }

  const stop = () => {
    server.close(() => process.exit(0));
    // Keep-alive connections would hold `close` open; a browser keeps several.
    server.closeAllConnections?.();
    setTimeout(() => process.exit(0), 1000).unref();
  };

  /** Every answer names the code that gave it, read when the answer starts. */
  const withRevision = (api) => (req, res) => {
    res.setHeader(REVISION_HEADER, hot.revision());
    res.setHeader('Access-Control-Expose-Headers', REVISION_HEADER);
    api(req, res);
  };

  const hot = createHotReload({
    root: ROOT,
    app: withRevision(createApp({ router: createRouter(), config })),
    snapshot,
    load: () => withRevision(loadApi()),
    keep: SHELL,
  });
  const control = controlRoutes({
    identity: () => ({
      app: APP_ID,
      revision: hot.revision(),
      pid: process.pid,
      port: config.port,
      root: ROOT,
      startedAt,
    }),
    onShutdown: (requester) => {
      console.info(
        `A newer mock API${requester?.pid ? ` (pid ${requester.pid})` : ''} is taking over ` +
          `port ${config.port}; this one is stopping.`
      );
      stop();
    },
  });

  handle = (req, res) => (control.handles(req.url) ? control(req, res) : hot.handle(req, res));
  waiting.splice(0).forEach(([req, res]) => handle(req, res));

  console.info(
    `Mock API: http://localhost:${config.port}/api (runtime db: ${relative(config.runtimePath)})`
  );
  if (config.delayMs > 0) console.info(`Artificial latency: ${config.delayMs}ms per response`);

  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

start().catch((error) => {
  console.error(`Mock server failed to start.\n${error.message}`);
  process.exit(1);
});
