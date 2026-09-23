/**
 * The runtime database (00_MASTER_CONTEXT.md §10; decision D9).
 *
 * The committed `db.json` is a **seed**: the server copies it to
 * `mock-server/.runtime/db.json` (git-ignored) on first run and works there, so
 * a `POST` from the admin panel can never dirty the file under version control.
 * The copy survives restarts; `npm run mock:reset` and `MOCK_FRESH=1` restore
 * it.
 *
 * JSON Server 0.17.4 is used as a **library**, not as the CLI: the router it
 * builds is an Express router backed by lowdb's `FileSync` adapter, which
 * rewrites the runtime file after every mutation.
 */

const fs = require('fs');
const path = require('path');
const jsonServer = require('json-server');

const config = require('./config');
const { getModel } = require('./lib/models');

/** @type {import('express').Router & {db: object, render: Function}|null} */
let router = null;

/**
 * Reads and parses the seed, failing with a message that names the file and
 * the syntax error rather than a bare `SyntaxError` from deep inside `require`.
 *
 * @param {string} file
 * @returns {object}
 */
function readJson(file) {
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (error) {
    throw new Error(`Cannot read ${file}: ${error.message}`);
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `${file} is not valid JSON: ${error.message}\n` +
        'Fix the file, or run `npm run mock:reset` to restore the runtime copy from db.json.'
    );
  }
}

/**
 * Makes sure `mock-server/.runtime/db.json` exists and is usable.
 *
 * A runtime copy made before a collection joined the seed — `segments` did,
 * after 1.0.0 (QA-52) — gains that collection as seeded, and keeps everything
 * else it holds. Without it the collection reads as an empty list that no
 * write can reach (`getCollection` answers a fresh `[]` for a missing key), so
 * every listing would fail the check that its segment exists.
 *
 * @param {{fresh?: boolean}} [options] `fresh` re-copies the seed over an
 *   existing runtime database (`MOCK_FRESH=1`)
 * @returns {{created: boolean, path: string, added: Array<string>}} `added`
 *   names the collections a kept copy gained
 */
function ensureRuntimeDb({ fresh = false } = {}) {
  const { seedPath, runtimePath } = config;
  const seed = readJson(seedPath);

  fs.mkdirSync(path.dirname(runtimePath), { recursive: true });

  const exists = fs.existsSync(runtimePath);
  if (exists && !fresh) {
    // A corrupt runtime copy is a dead end for JSON Server, so say so here.
    const runtime = readJson(runtimePath);
    const added = Object.keys(seed).filter(
      (key) => !Object.prototype.hasOwnProperty.call(runtime, key)
    );
    if (added.length > 0) {
      for (const key of added) runtime[key] = seed[key];
      fs.writeFileSync(runtimePath, `${JSON.stringify(runtime, null, 2)}\n`, 'utf8');
    }
    return { created: false, path: runtimePath, added };
  }

  fs.writeFileSync(runtimePath, `${JSON.stringify(seed, null, 2)}\n`, 'utf8');
  return { created: true, path: runtimePath, added: [] };
}

/**
 * The JSON Server router over the runtime database, created once.
 *
 * @returns {import('express').Router & {db: object, render: Function}}
 */
function createRouter() {
  if (!router) router = jsonServer.router(config.runtimePath);
  return router;
}

/** The lowdb instance behind the router. */
const getDb = () => createRouter().db;

/** The whole database as a plain object. */
const getState = () => getDb().getState();

/**
 * A collection's rows as a plain array.
 *
 * @param {string} name a `db.json` key
 * @returns {Array<object>} empty when the key is missing or is a singleton
 */
function getCollection(name) {
  const value = getDb().get(name).value();
  return Array.isArray(value) ? value : [];
}

/**
 * A singleton's object (`siteSettings`, `seoSettings`).
 *
 * @param {string} name
 * @returns {object|null}
 */
function getSingleton(name) {
  const value = getDb().get(name).value();
  return value && !Array.isArray(value) ? value : null;
}

/** Flushes lowdb to `mock-server/.runtime/db.json`. */
const write = () => getDb().write();

/**
 * Removes one record and persists the change.
 *
 * The generic `DELETE` is handled here rather than by JSON Server, whose
 * `destroy` additionally drops every record whose foreign key no longer
 * resolves — which, for a model where `lead.propertyId` is legitimately
 * `null`, means deleting one row would take unrelated rows with it.
 *
 * @param {string} name
 * @param {number|string} id
 * @returns {boolean} false when no record had that id
 */
function removeRecord(name, id) {
  const rows = getCollection(name);
  const index = rows.findIndex((record) => String(record?.id) === String(id));
  if (index === -1) return false;

  rows.splice(index, 1);
  write();
  return true;
}

module.exports = {
  ensureRuntimeDb,
  createRouter,
  getDb,
  getState,
  getCollection,
  getSingleton,
  getModel,
  removeRecord,
  write,
  readJson,
  /** The router, created on first access. */
  get router() {
    return createRouter();
  },
  /** The lowdb instance, created on first access. */
  get db() {
    return getDb();
  },
};
