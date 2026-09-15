#!/usr/bin/env node
/**
 * `npm run mock:reset` — throws away `mock-server/.runtime/db.json` and copies
 * the committed seed over it.
 *
 * This is the way back from a runtime database that experiments, a failed
 * import or a half-written file have made useless; the seed itself is never
 * touched.
 */

const fs = require('fs');

const config = require('./config');
const { ensureRuntimeDb } = require('./db');

try {
  if (fs.existsSync(config.runtimePath)) fs.rmSync(config.runtimePath);
  ensureRuntimeDb({ fresh: true });
  console.info('Runtime db restored from db.json');
} catch (error) {
  console.error(`Could not restore the runtime db.\n${error.message}`);
  process.exit(1);
}
