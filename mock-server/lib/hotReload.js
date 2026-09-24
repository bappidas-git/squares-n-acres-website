/**
 * Keeping a running mock on the code that is on disk (QA-58).
 *
 * A mock that goes on running after a `git pull` goes on answering with the
 * route map it started with. The web app hot-reloads the new screens, and the
 * API refuses every admin route added since: "You do not have permission to
 * perform this action.", to the admin too, because an admin route without a
 * rule is denied (§7). That is how Master data → Segments and Pages → Header
 * menu went on failing after QA-54 and QA-57. Both of those act when a mock
 * *starts*, and the mock that answered had started before them and was never
 * started again.
 *
 * So a running mock now checks its own code. When a request arrives, and at
 * most every half second, it compares every module it loaded from the
 * repository with the file on disk: size and mtime first, then the content
 * when either moved. When one differs, the mock waits for the files to settle
 * and for the requests in flight to finish, and holds the new ones. Then it
 * loads the API again in the same process: fresh modules, `ensureRuntimeDb` for
 * what the seed gained, a new JSON Server router over the runtime file and a
 * new Express app. The port never closes, and the held requests are answered
 * by the new code.
 *
 * This works wherever the process runs: `npm run mock`, `npm run dev`, or a
 * terminal nobody looks at. It needs no file watcher, so a filesystem that
 * does not report changes (a network drive, a WSL mount of a Windows disk)
 * cannot hide one. `node --watch` still restarts `npm run dev`'s mock outright,
 * and the two do not conflict.
 *
 * The shell around the API is not reloaded: `server.js`, and the modules it
 * holds the port with (this one and `takeover.js`). When one of those changes
 * the mock says so once and keeps serving, and a restart applies the change.
 */

const crypto = require('crypto');
const fs = require('fs');
const Module = require('module');
const path = require('path');

/** How often a request may make the mock look at its files. */
const CHECK_INTERVAL_MS = 500;

/** How long the files must have been left alone before they are loaded: a pull writes many. */
const SETTLE_MS = 300;

/** The longest a reload waits for files that keep changing. */
const MAX_SETTLE_MS = 3000;

/** The longest a reload waits for the requests in flight. */
const DRAIN_TIMEOUT_MS = 5000;

/**
 * How long after a failed reload the same files are tried again. It doubles
 * with each failure, up to `MAX_RETRY_MS`; a further change is tried at once.
 */
const RETRY_MS = 1000;

/** The longest the mock waits before trying files that failed to load again. */
const MAX_RETRY_MS = 30000;

/** `a/b.js` for a file below `root`, on every platform. */
const relativeName = (root, file) => path.relative(root, file).split(path.sep).join('/');

/**
 * Whether a module is the repository's own code: below `root`, and not a
 * dependency installed in `node_modules`.
 *
 * @param {string} file an absolute path, as `require.cache` keys it
 * @param {string} root the checkout
 * @returns {boolean}
 */
function isOwnModule(file, root) {
  const inside = `${path.resolve(root)}${path.sep}`;
  return file.startsWith(inside) && !file.includes(`${path.sep}node_modules${path.sep}`);
}

const digest = (content) => crypto.createHash('sha1').update(content).digest('hex');

/**
 * What the process runs: every module it loaded from the repository, with the
 * content it had when the snapshot was taken.
 *
 * @param {object} options
 * @param {string} options.root the checkout
 * @param {string[]} [options.modules] absolute paths, `require.cache`'s keys by default
 * @param {{statSync: Function, readFileSync: Function}} [options.fileSystem]
 * @returns {Map<string, {name: string, hash: string, mtimeMs: number, size: number}>}
 */
function snapshotModules({ root, modules = Object.keys(require.cache), fileSystem = fs }) {
  const snapshot = new Map();
  modules
    .filter((file) => isOwnModule(file, root))
    .forEach((file) => {
      try {
        const stat = fileSystem.statSync(file);
        const content = fileSystem.readFileSync(file);
        snapshot.set(file, {
          name: relativeName(root, file),
          hash: digest(content),
          mtimeMs: stat.mtimeMs,
          size: stat.size,
        });
      } catch {
        // A module that is gone from disk has nothing to compare with.
      }
    });
  return snapshot;
}

/**
 * A short digest of a snapshot. The same code in two checkouts has the same
 * revision; any change to a loaded module changes it.
 *
 * @param {Map<string, {name: string, hash: string}>} snapshot
 * @returns {string} 12 hex characters
 */
function revisionOf(snapshot) {
  const hash = crypto.createHash('sha1');
  [...snapshot.values()]
    .sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0))
    .forEach(({ name, hash: content }) => {
      hash.update(name);
      hash.update('\0');
      hash.update(content);
      hash.update('\0');
    });
  return hash.digest('hex').slice(0, 12);
}

/**
 * The snapshot's modules whose file on disk no longer holds what was loaded.
 *
 * A file whose size and mtime are unchanged is not read. One that was only
 * touched (same content, new mtime) is not a change, and its entry takes the
 * new mtime so it is not read again.
 *
 * @param {Map<string, {name: string, hash: string, mtimeMs: number, size: number}>} snapshot
 * @param {{only?: (file: string) => boolean, fileSystem?: object}} [options]
 * @returns {Array<{file: string, name: string, mtimeMs: number}>} `mtimeMs` is
 *   the file's current one, or `0` when it is gone
 */
function changedModules(snapshot, { only = () => true, fileSystem = fs } = {}) {
  const changed = [];
  for (const [file, entry] of snapshot) {
    if (!only(file)) continue;

    let stat;
    try {
      stat = fileSystem.statSync(file);
    } catch {
      changed.push({ file, name: entry.name, mtimeMs: 0 });
      continue;
    }
    if (stat.mtimeMs === entry.mtimeMs && stat.size === entry.size) continue;

    let content;
    try {
      content = fileSystem.readFileSync(file);
    } catch {
      changed.push({ file, name: entry.name, mtimeMs: 0 });
      continue;
    }
    if (digest(content) === entry.hash) {
      entry.mtimeMs = stat.mtimeMs;
      entry.size = stat.size;
      continue;
    }
    changed.push({ file, name: entry.name, mtimeMs: stat.mtimeMs });
  }
  return changed;
}

/** "routes/a.js, routes/b.js and 3 more" — what the log line names. */
function listNames(names, limit = 3) {
  const shown = names.slice(0, limit).join(', ');
  return names.length > limit ? `${shown} and ${names.length - limit} more` : shown;
}

/**
 * A load failure in one line. A syntax error names its file only in the first
 * line of its stack (`/…/routes/pages.js:12`), so that line is added.
 *
 * @param {unknown} error
 * @param {string} root
 * @returns {string}
 */
function describeFailure(error, root) {
  const message = error?.message ?? String(error);
  const where = /^((?:\/|[A-Za-z]:\\)[^\n]*?):(\d+)\s*$/m.exec(String(error?.stack ?? ''));
  return where && isOwnModule(where[1], root)
    ? `${message} (${relativeName(root, where[1])}:${where[2]})`
    : message;
}

/**
 * Serves requests with the API built from the code on disk, reloading it in
 * this process when that code changes.
 *
 * @param {object} options
 * @param {string} options.root the checkout
 * @param {(req: object, res: object) => void} options.app the request listener
 *   the process built at startup
 * @param {Map} options.snapshot `snapshotModules()` of the code `app` was built from
 * @param {() => (req: object, res: object) => void} options.load builds the
 *   request listener again, from modules required afresh; it runs after the
 *   repository's modules are dropped from `require.cache`
 * @param {string[]} [options.keep] modules that are never reloaded (the shell)
 * @param {(message: string) => void} [options.log]
 * @param {(message: string) => void} [options.warn]
 * @param {object} [options.deps] injectable for the tests: `now`, `setTimer`,
 *   `clearTimer`, `fileSystem`, `cache`, `intervalMs`, `settleMs`,
 *   `maxSettleMs`, `drainTimeoutMs`, `retryMs`, `maxRetryMs`
 * @returns {{handle: (req: object, res: object) => void, revision: () => string,
 *   reloads: () => number}}
 */
function createHotReload({
  root,
  app,
  snapshot,
  load,
  keep = [],
  log = console.info,
  warn = console.error,
  deps = {},
}) {
  const {
    now = Date.now,
    setTimer = setTimeout,
    clearTimer = clearTimeout,
    fileSystem = fs,
    cache = require.cache,
    intervalMs = CHECK_INTERVAL_MS,
    settleMs = SETTLE_MS,
    maxSettleMs = MAX_SETTLE_MS,
    drainTimeoutMs = DRAIN_TIMEOUT_MS,
    retryMs = RETRY_MS,
    maxRetryMs = MAX_RETRY_MS,
  } = deps;

  const shell = new Set(keep.map((file) => path.resolve(file)));
  const reloadable = (file) => !shell.has(file);

  let current = app;
  let loaded = snapshot;
  let revision = revisionOf(loaded);
  let reloads = 0;

  /** `serving`, or `waiting` while a reload waits for the files and the requests in flight. */
  let state = 'serving';
  const held = [];
  let inFlight = 0;
  let lastCheck = -Infinity;
  let timer = null;
  let waitStarted = 0;
  let pending = [];
  const reportedShell = new Set();

  /** The last reload that failed: which files, as they were, and when to try them again. */
  let failure = null;

  /** The changed files as they are now, to tell a new change from the one that failed. */
  const signatureOf = (changed) =>
    changed
      .map((entry) => `${entry.name}@${entry.mtimeMs}`)
      .sort()
      .join('|');

  const schedule = (ms) => {
    if (timer) clearTimer(timer);
    timer = setTimer(
      () => {
        timer = null;
        proceed();
      },
      Math.max(0, ms)
    );
  };

  function dispatch(req, res) {
    inFlight += 1;
    let done = false;
    const finished = () => {
      if (done) return;
      done = true;
      inFlight -= 1;
      if (state === 'waiting' && inFlight === 0) proceed();
    };
    res.once('finish', finished);
    res.once('close', finished);
    current(req, res);
  }

  function release() {
    state = 'serving';
    held.splice(0).forEach(([req, res]) => dispatch(req, res));
  }

  /** Every module below the root that is not the shell, as `require.cache` holds it now. */
  const ownEntries = () =>
    Object.keys(cache).filter((file) => isOwnModule(file, root) && reloadable(file));

  /**
   * Drops what a module required from its `children` once the cache no longer
   * holds it: the shell's `require` records every generation it loads, and
   * each one would stay in memory for good.
   */
  function pruneChildren() {
    Object.values(cache).forEach((entry) => {
      if (Array.isArray(entry?.children)) {
        entry.children = entry.children.filter((child) => cache[child.id] === child);
      }
    });
  }

  /** Node remembers where a request string resolved; a moved file must be looked up again. */
  function forgetResolutions() {
    const paths = Module._pathCache;
    if (!paths || typeof paths !== 'object') return;
    Object.keys(paths).forEach((key) => {
      if (isOwnModule(String(paths[key]), root)) delete paths[key];
    });
  }

  function reload() {
    const names = pending.map((entry) => entry.name);
    const signature = signatureOf(pending);
    pending = [];
    const started = now();

    const previous = new Map();
    ownEntries().forEach((file) => {
      previous.set(file, cache[file]);
      delete cache[file];
    });
    forgetResolutions();

    let next;
    try {
      next = load();
      if (typeof next !== 'function') throw new Error('the reload did not produce an app');
    } catch (error) {
      // The code that was running goes on serving: its modules go back into
      // the cache, so a lazy `require` inside them still finds its own
      // generation, and the half-loaded new one is dropped.
      ownEntries().forEach((file) => delete cache[file]);
      previous.forEach((entry, file) => {
        cache[file] = entry;
      });
      forgetResolutions();
      pruneChildren();
      const message = describeFailure(error, root);
      const attempts = failure?.signature === signature ? failure.attempts + 1 : 1;
      if (message !== failure?.message) {
        warn(
          `The mock's code changed on disk (${listNames(names)}), but it does not load yet, so ` +
            `the previous code goes on answering: ${message}`
        );
      }
      failure = {
        signature,
        message,
        attempts,
        retryAt: now() + Math.min(retryMs * 2 ** (attempts - 1), maxRetryMs),
      };
      release();
      return;
    }

    const fresh = snapshotModules({ root, modules: ownEntries(), fileSystem });
    loaded.forEach((entry, file) => {
      if (!reloadable(file)) fresh.set(file, entry);
    });
    loaded = fresh;
    revision = revisionOf(loaded);
    current = next;
    reloads += 1;
    failure = null;
    pruneChildren();

    log(
      `The mock's code changed on disk (${listNames(names)}); the API reloaded it in ` +
        `${Math.max(0, Math.round(now() - started))}ms and answers with it now.`
    );
    release();
  }

  /** Moves a waiting reload on: once the files settle and nothing is in flight. */
  function proceed() {
    if (state !== 'waiting') return;
    const time = now();

    if (inFlight > 0 && time - waitStarted < drainTimeoutMs) {
      schedule(waitStarted + drainTimeoutMs - time);
      return;
    }

    const changed = changedModules(loaded, { only: reloadable, fileSystem });
    if (changed.length === 0) {
      // Changed back before it was loaded (a branch switched and switched back).
      if (timer) {
        clearTimer(timer);
        timer = null;
      }
      pending = [];
      release();
      return;
    }
    pending = changed;

    // A file dated in the future (a clock that disagrees) counts as written just now.
    const newest = Math.max(...changed.map((entry) => entry.mtimeMs));
    const quietFor = Math.max(0, time - newest);
    if (settleMs > 0 && quietFor < settleMs && time - waitStarted < maxSettleMs) {
      schedule(settleMs - quietFor);
      return;
    }

    if (timer) {
      clearTimer(timer);
      timer = null;
    }
    reload();
  }

  /** Says once that a shell module changed, which only a restart applies. */
  function reportShell() {
    changedModules(loaded, { only: (file) => !reloadable(file), fileSystem }).forEach((entry) => {
      if (reportedShell.has(entry.file)) return;
      reportedShell.add(entry.file);
      warn(
        `${entry.name} changed on disk. The API reloads on its own, but this file only takes ` +
          'effect when the mock is restarted.'
      );
    });
  }

  function handle(req, res) {
    if (state !== 'serving') {
      held.push([req, res]);
      return;
    }

    const time = now();
    if (time - lastCheck >= intervalMs) {
      lastCheck = time;
      const changed = changedModules(loaded, { only: reloadable, fileSystem });
      if (shell.size > 0) reportShell();
      // Files that failed to load wait for their retry; a new change is tried at once.
      const retrying = failure?.signature === signatureOf(changed) && time < failure.retryAt;
      if (changed.length > 0 && !retrying) {
        state = 'waiting';
        waitStarted = time;
        pending = changed;
        held.push([req, res]);
        proceed();
        return;
      }
    }

    dispatch(req, res);
  }

  return {
    handle,
    revision: () => revision,
    reloads: () => reloads,
  };
}

module.exports = {
  CHECK_INTERVAL_MS,
  SETTLE_MS,
  MAX_SETTLE_MS,
  DRAIN_TIMEOUT_MS,
  RETRY_MS,
  MAX_RETRY_MS,
  isOwnModule,
  snapshotModules,
  revisionOf,
  changedModules,
  createHotReload,
};
