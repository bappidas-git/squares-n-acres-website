#!/usr/bin/env node
/**
 * `npm run mock:reset` — throws away `mock-server/.runtime/db.json` and copies
 * the committed seed over it.
 *
 * This is the way back from a runtime database that experiments, a failed
 * import or a half-written file have made useless; the seed itself is never
 * touched.
 *
 * It refuses while the mock is **running**, and that refusal is the whole
 * point of the check (prompt 48 §4.3). JSON Server's lowdb adapter reads the
 * database into memory once and flushes the whole object back on every write,
 * so a server that is up does not see the restored file and overwrites it from
 * its own stale copy on the next request. Before this check, that produced the
 * worst possible outcome: "Runtime db restored from db.json" on the terminal
 * and nothing restored anywhere — silently, and precisely in the documented
 * workflow, where `npm run dev` holds the mock in the other terminal.
 */

const fs = require('fs');

const config = require('./config');
const { ensureRuntimeDb } = require('./db');

/**
 * Whether our mock is answering on the configured port.
 *
 * Asks `/api/health` rather than opening a socket, so an unrelated process on
 * port 4000 does not stop a reset it has nothing to do with. Any failure —
 * refused, timed out, not our shape — is read as "not running", which is the
 * safe direction: the reset then goes ahead and the file it writes is the file
 * the next `npm run mock` reads.
 */
async function mockIsRunning() {
  try {
    const response = await fetch(`http://localhost:${config.port}/api/health`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return false;
    const body = await response.json();
    return body?.data?.status === 'ok';
  } catch {
    return false;
  }
}

async function main() {
  if (await mockIsRunning()) {
    console.error(
      `The mock is running on port ${config.port}, so a reset would not survive it.\n` +
        'It keeps the database in memory and rewrites the whole file on the next\n' +
        'request, which would put the old data straight back.\n\n' +
        'Stop it, reset, start it again:\n' +
        '  (Ctrl+C in the terminal running `npm run mock` or `npm run dev`)\n' +
        '  npm run mock:reset\n' +
        '  npm run mock\n\n' +
        'Or skip the reset entirely — `MOCK_FRESH=1 npm run mock` re-seeds on start.'
    );
    process.exitCode = 1;
    return;
  }

  try {
    if (fs.existsSync(config.runtimePath)) fs.rmSync(config.runtimePath);
    ensureRuntimeDb({ fresh: true });
    console.info('Runtime db restored from db.json');
  } catch (error) {
    console.error(`Could not restore the runtime db.\n${error.message}`);
    process.exitCode = 1;
  }
}

main();
