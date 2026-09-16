/**
 * The test harness of the mock server.
 *
 * Every suite drives the **real** application: `createApp()` over a private
 * copy of the committed seed in `os.tmpdir()`, listening on an ephemeral port,
 * called over HTTP. Nothing here stubs a route or reaches into a module — a
 * test passes only if a client would have got that answer.
 *
 * A copy per test keeps `db.json` and `mock-server/.runtime/db.json` untouched
 * and gives each test a fresh rate-limit counter, which is what makes the 429
 * of the login and of the lead form testable at all.
 *
 * The copy is made from **`./fixtures/starter-db.json`**, a frozen copy of the
 * prompt-06 starter seed, not from the committed `db.json`. The suites pin
 * exact ids, totals and facet counts — "`?bedrooms=3` returns listings 1 and
 * 2" — and those assertions describe the *behaviour of the filters*, not the
 * contents of the shipped dataset. Reading the live seed would make every one
 * of them fail the moment an editor adds a listing, which is the wrong
 * failure. The shipped seed is exercised end to end by `npm run smoke`
 * instead, against a running server.
 *
 * Node's test runner only collects files whose name says they are tests
 * (`*.test.js`), so this module is a library rather than a suite.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const jsonServer = require('json-server');

const defaultConfig = require('../config');
const { createApp } = require('../app');
const { getModel } = require('../lib/models');

/** The frozen starter fixture, read once and copied per test. */
const SEED = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures', 'starter-db.json'), 'utf8')
);

/** The seed the application actually ships, for the few tests that want it. */
const LIVE_SEED = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'db.json'), 'utf8'));

/** The three seed accounts (§6.14). */
const ADMIN = { email: 'admin@squaresnacres.com', password: 'Admin@123' };
const MANAGER = { email: 'manager@squaresnacres.com', password: 'Manager@123' };
const SALES = { email: 'sales@squaresnacres.com', password: 'Sales@123' };

/** Every temporary database this process created. */
const temporaryFiles = [];

/** The request logger writes a line per call; the test output is assertions. */
function silenceRequestLog() {
  console.info = () => {};
}

/**
 * The runtime-database interface of `mock-server/db.js`, over a private file.
 *
 * @param {string} file
 * @returns {{db: object, router: object}}
 */
function createTestDb(file) {
  const router = jsonServer.router(file);
  const value = (name) => router.db.get(name).value();

  const db = {
    getModel,
    getCollection: (name) => (Array.isArray(value(name)) ? value(name) : []),
    getSingleton: (name) => (value(name) && !Array.isArray(value(name)) ? value(name) : null),
    write: () => router.db.write(),
    removeRecord(name, id) {
      const rows = db.getCollection(name);
      const index = rows.findIndex((record) => String(record?.id) === String(id));
      if (index === -1) return false;
      rows.splice(index, 1);
      db.write();
      return true;
    },
  };

  return { db, router };
}

/**
 * Starts the mock on an ephemeral port over a fresh copy of the seed.
 *
 * @param {{tokenTtlHours?: number, seed?: object}} [options] `seed` replaces
 *   the committed fixture for tests that need a different starting state
 * @returns {Promise<{request: Function, login: Function, db: object, origin: string, close: Function}>}
 */
async function startServer({ tokenTtlHours = 24, seed = SEED } = {}) {
  const file = path.join(os.tmpdir(), `sna-mock-${randomUUID()}.json`);
  fs.writeFileSync(file, JSON.stringify(seed), 'utf8');
  temporaryFiles.push(file);

  const { db, router } = createTestDb(file);
  const config = { ...defaultConfig, tokenTtlHours, delayMs: 0, runtimePath: file };
  const app = createApp({ router, config, db });

  const server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const base = `${origin}/api`;

  /**
   * One request against the running mock.
   *
   * @param {string} method
   * @param {string} endpoint the path below `/api`
   * @param {{token?: string, body?: object}} [options]
   * @returns {Promise<{status: number, body: object|null, text: string, headers: Headers}>}
   */
  const request = async (method, endpoint, { token, body } = {}) => {
    const response = await fetch(`${base}${endpoint}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    // `Response.text()` strips a leading BOM, and the CSV export is specified to
    // carry one (§5.14), so the body is decoded here with the BOM left in.
    const buffer = await response.arrayBuffer();
    const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(buffer);

    let parsed = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null; // CSV, XML and plain text answer here too.
    }

    return { status: response.status, text, body: parsed, headers: response.headers };
  };

  /** Signs in and returns the token, failing the test when the login failed. */
  const login = async (credentials) => {
    const response = await request('POST', '/auth/login', { body: credentials });
    assert.equal(response.status, 200, `login failed: ${response.text}`);
    return response.body.data.token;
  };

  return {
    request,
    login,
    db,
    /** The server's root, for the SEO files the mock also mirrors there (D21). */
    origin,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

/**
 * Runs `body` against a freshly started server and always closes it.
 *
 * Called either as `withServer(fn)` or as `withServer(options, fn)`.
 *
 * @param {object|Function} options
 * @param {Function} [body]
 */
async function withServer(options, body) {
  const run = typeof options === 'function' ? options : body;
  const server = await startServer(typeof options === 'function' ? {} : options);

  try {
    await run(server);
  } finally {
    await server.close();
  }
}

/** Removes every temporary database this process created. */
function cleanupTempFiles() {
  for (const file of temporaryFiles) fs.rmSync(file, { force: true });
  temporaryFiles.length = 0;
}

module.exports = {
  startServer,
  withServer,
  cleanupTempFiles,
  silenceRequestLog,
  createTestDb,
  SEED,
  LIVE_SEED,
  ADMIN,
  MANAGER,
  SALES,
};
