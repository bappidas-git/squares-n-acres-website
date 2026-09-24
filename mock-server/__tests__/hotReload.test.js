/**
 * Keeping a running mock on the code on disk (`lib/hotReload.js`, QA-58).
 *
 * Master data → Segments and Pages → Header menu answered 403 to the admin for
 * as long as a mock started before them kept running: the web app had the new
 * screens, the process had the old route map. These suites pin the reload
 * itself, over module trees written to a temporary folder, and then the whole
 * of it end to end: `server.js` started over a route map without a rule for
 * segments, the rule arriving on disk the way a pull brings it, and the same
 * process answering 200 without being restarted.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { spawn } = require('node:child_process');
const { describe, it } = require('node:test');

const {
  changedModules,
  createHotReload,
  isOwnModule,
  revisionOf,
  snapshotModules,
} = require('../lib/hotReload');

/** A module tree in a temporary folder, standing for a checkout. */
function makeTree() {
  // The real path, as `require.cache` keys a module: a temporary folder is a
  // symbolic link on macOS.
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sna-hot-')));
  const file = (name, content) => {
    const full = path.join(root, ...name.split('/'));
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
    return full;
  };
  const cleanup = () => {
    Object.keys(require.cache)
      .filter((cached) => cached.startsWith(`${root}${path.sep}`))
      .forEach((cached) => delete require.cache[cached]);
    fs.rmSync(root, { recursive: true, force: true });
  };
  return { root, file, cleanup };
}

/**
 * A tree whose `api.js` answers with the text `version.js` exports. A request
 * with `hold: true` is answered only when the test calls `req.answer()`.
 */
function makeApi(version = 'v1') {
  const tree = makeTree();
  tree.file(
    'api.js',
    [
      "const version = require('./version');",
      'module.exports = () => (req, res) => {',
      '  if (req.hold) req.answer = () => res.end(version);',
      '  else res.end(version);',
      '};',
    ].join('\n')
  );
  const versionFile = tree.file('version.js', `module.exports = '${version}';`);
  const apiFile = path.join(tree.root, 'api.js');
  let loads = 0;
  const load = () => {
    loads += 1;
    return require(apiFile)();
  };
  return { ...tree, versionFile, load, loads: () => loads };
}

/** A request and a response the reloader can serve, and the answer as a promise. */
function exchange(extra = {}) {
  const req = { ...extra };
  const res = new EventEmitter();
  res.body = undefined;
  res.end = (body) => {
    res.body = body;
    res.emit('finish');
    res.emit('close');
  };
  const answered = new Promise((resolve) => res.once('finish', () => resolve(res.body)));
  return { req, res, answered };
}

/** The reloader over a fresh `makeApi()`, checking on every request and settling at once. */
function startReloader(api, { deps = {}, keep = [], log = () => {}, warn = () => {} } = {}) {
  const app = api.load();
  const snapshot = snapshotModules({ root: api.root });
  return createHotReload({
    root: api.root,
    app,
    snapshot,
    load: api.load,
    keep,
    log,
    warn,
    deps: { intervalMs: 0, settleMs: 0, retryMs: 60000, ...deps },
  });
}

const serve = (hot, extra) => {
  const call = exchange(extra);
  hot.handle(call.req, call.res);
  return call;
};

describe('snapshots — what a process runs', () => {
  it('holds the repository’s own modules, by path and content', () => {
    const { root, file, cleanup } = makeTree();
    try {
      const route = file('mock-server/routes/a.js', 'module.exports = 1;');
      const vendored = file('node_modules/pkg/index.js', 'module.exports = 2;');
      const outside = path.join(os.tmpdir(), 'not-in-the-checkout.js');

      const snapshot = snapshotModules({ root, modules: [route, vendored, outside] });
      assert.deepEqual([...snapshot.keys()], [route]);
      assert.equal(snapshot.get(route).name, 'mock-server/routes/a.js');
      assert.ok(isOwnModule(route, root));
      assert.ok(!isOwnModule(vendored, root));
      assert.ok(!isOwnModule(outside, root));
    } finally {
      cleanup();
    }
  });

  it('has one revision for the same code in two checkouts, and another for other code', () => {
    const one = makeTree();
    const two = makeTree();
    try {
      const a = one.file('mock-server/app.js', 'x');
      const b = two.file('mock-server/app.js', 'x');
      const first = revisionOf(snapshotModules({ root: one.root, modules: [a] }));
      assert.match(first, /^[0-9a-f]{12}$/);
      assert.equal(revisionOf(snapshotModules({ root: two.root, modules: [b] })), first);

      fs.writeFileSync(b, 'y');
      assert.notEqual(revisionOf(snapshotModules({ root: two.root, modules: [b] })), first);
    } finally {
      one.cleanup();
      two.cleanup();
    }
  });

  it('tells a changed file from a touched one, and notices a deleted one', () => {
    const { root, file, cleanup } = makeTree();
    try {
      const kept = file('a.js', 'module.exports = 1;');
      const touched = file('b.js', 'module.exports = 2;');
      const edited = file('c.js', 'module.exports = 3;');
      const deleted = file('d.js', 'module.exports = 4;');
      const snapshot = snapshotModules({ root, modules: [kept, touched, edited, deleted] });
      assert.deepEqual(changedModules(snapshot), []);

      const later = new Date(Date.now() + 5000);
      fs.utimesSync(touched, later, later);
      fs.writeFileSync(edited, 'module.exports = 30;');
      fs.rmSync(deleted);

      const changed = changedModules(snapshot);
      assert.deepEqual(changed.map((entry) => entry.name).sort(), ['c.js', 'd.js']);
      assert.equal(changed.find((entry) => entry.name === 'd.js').mtimeMs, 0);
      // The touched file is not read a second time.
      assert.equal(snapshot.get(touched).mtimeMs, fs.statSync(touched).mtimeMs);
      assert.deepEqual(changedModules(snapshot, { only: (candidate) => candidate === kept }), []);
    } finally {
      cleanup();
    }
  });
});

describe('createHotReload — answering with the code on disk', () => {
  it('answers with the new code once it changes, in the same process', async () => {
    const api = makeApi('v1');
    const logs = [];
    try {
      const hot = startReloader(api, { log: (line) => logs.push(line) });
      const before = hot.revision();
      assert.equal(await serve(hot).answered, 'v1');

      fs.writeFileSync(api.versionFile, "module.exports = 'v2';");
      assert.equal(await serve(hot).answered, 'v2');
      assert.equal(hot.reloads(), 1);
      assert.notEqual(hot.revision(), before);
      assert.equal(logs.length, 1);
      assert.match(logs[0], /version\.js.*reloaded it in \d+ms/);

      // Nothing changed since: no further reload.
      assert.equal(await serve(hot).answered, 'v2');
      assert.equal(api.loads(), 2);
    } finally {
      api.cleanup();
    }
  });

  it('reports, after a reload, the revision a fresh start would have', () => {
    const api = makeApi('v1');
    try {
      const hot = startReloader(api);
      fs.writeFileSync(api.versionFile, "module.exports = 'v2';");
      serve(hot);
      const fresh = revisionOf(snapshotModules({ root: api.root }));
      assert.equal(hot.revision(), fresh);
    } finally {
      api.cleanup();
    }
  });

  it('lets the requests in flight finish on the old code, and holds the new ones', async () => {
    const api = makeApi('v1');
    try {
      const hot = startReloader(api);
      const first = serve(hot, { hold: true });

      fs.writeFileSync(api.versionFile, "module.exports = 'v2';");
      const second = serve(hot);
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(second.res.body, undefined, 'held while the first is in flight');
      assert.equal(hot.reloads(), 0);

      first.req.answer();
      assert.equal(await first.answered, 'v1');
      assert.equal(await second.answered, 'v2');
      assert.equal(hot.reloads(), 1);
    } finally {
      api.cleanup();
    }
  });

  it('reloads without waiting for a request that never finishes, after the drain timeout', async () => {
    const api = makeApi('v1');
    try {
      const hot = startReloader(api, { deps: { drainTimeoutMs: 50 } });
      serve(hot, { hold: true });

      fs.writeFileSync(api.versionFile, "module.exports = 'v2';");
      assert.equal(await serve(hot).answered, 'v2');
    } finally {
      api.cleanup();
    }
  });

  it('waits for files that are still being written', async () => {
    const api = makeApi('v1');
    try {
      const hot = startReloader(api, { deps: { settleMs: 150 } });
      fs.writeFileSync(api.versionFile, "module.exports = 'v2';");
      const started = Date.now();
      const call = serve(hot);
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(call.res.body, undefined, 'held while the files settle');
      assert.equal(await call.answered, 'v2');
      assert.ok(Date.now() - started >= 100, 'answered after the files settled');
    } finally {
      api.cleanup();
    }
  });

  it('keeps the previous code answering while the new code does not load, and says so once', async () => {
    const api = makeApi('v1');
    const warnings = [];
    try {
      const hot = startReloader(api, { warn: (line) => warnings.push(line) });

      fs.writeFileSync(api.versionFile, "module.exports = 'v2' (;");
      assert.equal(await serve(hot).answered, 'v1');
      assert.equal(warnings.length, 1);
      assert.match(warnings[0], /version\.js.*does not load yet.*previous code goes on answering/);
      assert.match(warnings[0], /\(version\.js:1\)/, 'names the file and line');
      const attempts = api.loads();

      // The same broken files are not tried on every request.
      assert.equal(await serve(hot).answered, 'v1');
      assert.equal(api.loads(), attempts);
      assert.equal(warnings.length, 1);

      // The next change is tried at once.
      fs.writeFileSync(api.versionFile, "module.exports = 'v3';");
      assert.equal(await serve(hot).answered, 'v3');
      assert.equal(hot.reloads(), 1);
    } finally {
      api.cleanup();
    }
  });

  it('tries files that failed again once their retry is due, without repeating the warning', async () => {
    const api = makeApi('v1');
    const warnings = [];
    try {
      const hot = startReloader(api, {
        deps: { retryMs: 0 },
        warn: (line) => warnings.push(line),
      });
      fs.writeFileSync(api.versionFile, 'module.exports = (;');
      await serve(hot).answered;
      await serve(hot).answered;
      assert.equal(api.loads(), 3, 'the start and two attempts');
      assert.equal(warnings.length, 1);
    } finally {
      api.cleanup();
    }
  });

  it('puts the running generation back when a reload fails, so its lazy requires still work', async () => {
    const api = makeApi('v1');
    try {
      const hot = startReloader(api);
      const versionBefore = require.cache[api.versionFile];
      fs.writeFileSync(api.versionFile, 'module.exports = (;');
      await serve(hot).answered;
      assert.equal(require.cache[api.versionFile], versionBefore);
    } finally {
      api.cleanup();
    }
  });

  it('leaves the shell alone, and says once that a change to it needs a restart', async () => {
    const api = makeApi('v1');
    const warnings = [];
    try {
      const shellFile = api.file('mock-server/server.js', 'module.exports = 1;');
      require(shellFile);
      const hot = startReloader(api, { keep: [shellFile], warn: (line) => warnings.push(line) });

      fs.writeFileSync(shellFile, 'module.exports = 2;');
      assert.equal(await serve(hot).answered, 'v1');
      assert.equal(await serve(hot).answered, 'v1');
      assert.equal(hot.reloads(), 0);
      assert.equal(warnings.length, 1);
      assert.match(warnings[0], /^mock-server\/server\.js changed on disk.*restarted/);
    } finally {
      api.cleanup();
    }
  });

  it('finds a module again after it moved into a folder of the same name', async () => {
    const api = makeApi('v1');
    try {
      fs.writeFileSync(
        path.join(api.root, 'api.js'),
        [
          "const part = require('./part');",
          'module.exports = () => (req, res) => res.end(part);',
        ].join('\n')
      );
      const partFile = api.file('part.js', "module.exports = 'flat';");
      const hot = startReloader(api);
      assert.equal(await serve(hot).answered, 'flat');

      fs.rmSync(partFile);
      api.file('part/index.js', "module.exports = 'folder';");
      assert.equal(await serve(hot).answered, 'folder');
    } finally {
      api.cleanup();
    }
  });

  it('does not keep the generations it replaced', async () => {
    const api = makeApi('v0');
    try {
      const hot = startReloader(api);
      for (let version = 1; version <= 5; version += 1) {
        fs.writeFileSync(api.versionFile, `module.exports = 'v${version}';`);
        assert.equal(await serve(hot).answered, `v${version}`);
      }
      const retained = module.children.filter((child) => child.id.startsWith(api.root));
      assert.equal(retained.length, 1, 'only the generation that serves');
      assert.equal(retained[0], require.cache[path.join(api.root, 'api.js')]);
    } finally {
      api.cleanup();
    }
  });

  it('looks at the files at most once per interval', async () => {
    const api = makeApi('v1');
    let now = 0;
    try {
      const hot = startReloader(api, { deps: { intervalMs: 500, now: () => now } });
      fs.writeFileSync(api.versionFile, "module.exports = 'v2';");
      now = 100;
      // The first request checks; the change is found at once.
      assert.equal(await serve(hot).answered, 'v2');

      fs.writeFileSync(api.versionFile, "module.exports = 'v3';");
      now = 300;
      assert.equal(await serve(hot).answered, 'v2', 'inside the interval');
      now = 700;
      assert.equal(await serve(hot).answered, 'v3');
    } finally {
      api.cleanup();
    }
  });
});

/* ------------------------------------------------------------------ *
 * End to end: `server.js`, an older route map, and a pull
 * ------------------------------------------------------------------ */

const REPO = path.join(__dirname, '..', '..');

/**
 * A checkout that holds what `server.js` runs: every repository module the API
 * loads, the shell, the seed and `package.json`, with the dependencies linked
 * from this checkout.
 */
function makeCheckout() {
  require('../app');
  const shell = ['server.js', 'lib/takeover.js', 'lib/hotReload.js'].map((name) =>
    path.join(REPO, 'mock-server', name)
  );
  const files = new Set([
    ...Object.keys(require.cache).filter(
      (file) => isOwnModule(file, REPO) && !file.includes(`${path.sep}__tests__${path.sep}`)
    ),
    ...shell,
    path.join(REPO, 'db.json'),
    path.join(REPO, 'package.json'),
  ]);

  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sna-checkout-')));
  files.forEach((file) => {
    const target = path.join(root, path.relative(REPO, file));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(file, target);
  });
  fs.symlinkSync(path.join(REPO, 'node_modules'), path.join(root, 'node_modules'), 'junction');
  return root;
}

/** A port nothing listens on, from the operating system. */
const freePort = () =>
  new Promise((resolve, reject) => {
    const probe = http.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });

/** Starts `node mock-server/server.js` in a checkout and resolves once it serves. */
function startMock(root, port) {
  const child = spawn(process.execPath, ['mock-server/server.js'], {
    cwd: root,
    env: { ...process.env, MOCK_PORT: String(port), MOCK_FRESH: '0', MOCK_DELAY_MS: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  const exited = new Promise((resolve) => child.once('exit', (code) => resolve(code)));
  const ready = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`no start:\n${output}`)), 20000);
    const read = (chunk) => {
      output += chunk;
      if (output.includes('Mock API:') || output.includes('Nothing to start')) {
        clearTimeout(timeout);
        resolve();
      }
    };
    child.stdout.setEncoding('utf8').on('data', read);
    child.stderr.setEncoding('utf8').on('data', read);
    exited.then(() => {
      clearTimeout(timeout);
      resolve();
    });
  });
  return { child, ready, exited, output: () => output };
}

describe('a running mock whose route map falls behind the web app', () => {
  it('answers the new route once the rule for it arrives on disk, without a restart', async () => {
    const root = makeCheckout();
    const port = await freePort();
    const permissions = path.join(root, 'mock-server', 'lib', 'routePermissions.js');
    const current = fs.readFileSync(permissions, 'utf8');
    assert.match(current, /^ {2}segments: 'masterData',$/m);
    // The route map from before QA-52: no rule for segments.
    fs.writeFileSync(permissions, current.replace(/^ {2}segments: 'masterData',\n/m, ''));

    const mock = startMock(root, port);
    try {
      await mock.ready;
      const base = `http://127.0.0.1:${port}/api`;
      const login = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@squaresnacres.com', password: 'Admin@123' }),
      });
      const { token } = (await login.json()).data;
      const segments = () =>
        fetch(`${base}/admin/segments`, { headers: { Authorization: `Bearer ${token}` } });

      const refused = await segments();
      assert.equal(refused.status, 403);
      const oldRevision = refused.headers.get('x-mock-revision');
      assert.match(oldRevision, /^[0-9a-f]{12}$/);
      assert.match(refused.headers.get('access-control-expose-headers'), /X-Mock-Revision/i);

      // The pull.
      fs.writeFileSync(permissions, current);
      let answer = refused;
      const deadline = Date.now() + 10000;
      while (answer.status !== 200 && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        answer = await segments();
      }
      assert.equal(answer.status, 200, mock.output());
      assert.equal((await answer.json()).data.length > 0, true);
      assert.notEqual(answer.headers.get('x-mock-revision'), oldRevision);
      assert.match(mock.output(), /routePermissions\.js\); the API reloaded it/);

      // What it runs now is what a fresh start runs: a second start leaves it be.
      const second = startMock(root, port);
      assert.equal(await second.exited, 0);
      assert.match(second.output(), /already running this code/);
    } finally {
      mock.child.kill('SIGTERM');
      await mock.exited;
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
