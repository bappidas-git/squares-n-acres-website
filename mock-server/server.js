#!/usr/bin/env node
/**
 * `npm run mock` — starts the mock API on `MOCK_PORT` (default 4000).
 *
 * Everything the server does lives in `app.js`; this file only prepares the
 * runtime database, opens the socket and turns a startup failure into a message
 * a developer can act on instead of a stack trace.
 */

const path = require('path');

const config = require('./config');
const { createApp } = require('./app');
const { ensureRuntimeDb, createRouter } = require('./db');

/** `mock-server/.runtime/db.json`, relative to the repository root. */
const relative = (file) =>
  path.relative(path.join(__dirname, '..'), file).split(path.sep).join('/');

function start() {
  const { created, added } = ensureRuntimeDb({ fresh: config.fresh });
  if (created) {
    console.info(`Runtime db seeded from ${relative(config.seedPath)}`);
  } else if (added.length > 0) {
    console.info(`Runtime db gained ${added.join(', ')} from ${relative(config.seedPath)}`);
  }

  const app = createApp({ router: createRouter(), config });

  const server = app.listen(config.port, () => {
    console.info(
      `Mock API: http://localhost:${config.port}/api (runtime db: ${relative(config.runtimePath)})`
    );
    if (config.delayMs > 0) console.info(`Artificial latency: ${config.delayMs}ms per response`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      // Usually a mock left running by an earlier session — and the web app
      // keeps talking to it, so this checkout's API changes never arrive: a
      // screen added since then is refused with a 403 (§7: a route the matrix
      // does not know is denied).
      console.error(
        `Port ${config.port} is already in use, most likely by a mock API still running from ` +
          'an earlier `npm run dev` or `npm run mock`. The web app talks to whatever answers ' +
          'there, and an older copy refuses the screens it does not know yet ("You do not have ' +
          'permission to perform this action."). Stop that process (README → Troubleshooting), ' +
          'or set MOCK_PORT.'
      );
      process.exit(1);
    }
    throw error;
  });

  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

try {
  start();
} catch (error) {
  console.error(`Mock server failed to start.\n${error.message}`);
  process.exit(1);
}
