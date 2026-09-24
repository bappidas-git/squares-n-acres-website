/**
 * Taking the port over from an older mock (`lib/takeover.js`, QA-57).
 *
 * An older mock left on port 4000 made every admin screen added since it
 * started answer 403 to the admin — Master data → Segments, Pages → Header
 * menu — because the web app talked to it while the new mock gave up on the
 * busy port. These suites pin the decisions `server.js` takes from what holds
 * the port, the control routes a running mock answers, and — on a machine
 * with `lsof` or `fuser` — the real lookup and stop of a mock from before
 * the control routes existed.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { describe, it } = require('node:test');

const {
  APP_ID,
  MOCK_COMMAND_RE,
  TAKEOVER_HEADER,
  commandLineOf,
  controlRoutes,
  listeningPids,
  parseNetstat,
  parsePidList,
  sourceRevision,
  takeOver,
} = require('../lib/takeover');

/** Listens on an ephemeral port and resolves it. */
const listenOn = (server) =>
  new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });

const closeServer = (server) =>
  new Promise((resolve) => {
    server.close(() => resolve());
    server.closeAllConnections?.();
  });

/** One raw HTTP call, as `{status, body}`. */
const call = (port, method, url, headers = {}) =>
  new Promise((resolve, reject) => {
    const request = http.request({ host: '127.0.0.1', port, method, path: url, headers }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        raw += chunk;
      });
      res.on('end', () => resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : null }));
    });
    request.on('error', reject);
    request.end();
  });

/** `takeOver`'s dependencies, answering as a scripted port holder would. */
function holderDeps({ identity, shutdown = 202, health, pids = [], commands = {}, pid = 1000 }) {
  const calls = { posts: [], killed: [] };
  const exchange = async (url, options = {}) => {
    if (url.endsWith('/__mock/identity')) {
      return identity ? { status: 200, body: { data: identity } } : { status: 404, body: null };
    }
    if (url.endsWith('/__mock/shutdown')) {
      calls.posts.push(options);
      return { status: shutdown, body: null };
    }
    if (url.endsWith('/api/health')) return health ?? null;
    return null;
  };
  return {
    calls,
    deps: {
      exchange,
      listeningPids: async () => pids,
      commandLineOf: async (candidate) => commands[candidate] ?? null,
      kill: (candidate) => calls.killed.push(candidate),
      pid,
    },
  };
}

const LEGACY_HEALTH = {
  status: 200,
  body: { data: { status: 'ok', time: '2026-09-23T10:00:00.000Z', version: '1.0.0' } },
};

describe('takeOver — what holds the port decides', () => {
  const root = path.join(os.tmpdir(), 'checkout');

  it('leaves this checkout’s mock alone when it runs this very code', async () => {
    const { deps, calls } = holderDeps({
      identity: { app: APP_ID, revision: 'abc', pid: 41, root },
    });
    const result = await takeOver({ port: 4000, revision: 'abc', root, deps });
    assert.deepEqual(result, { outcome: 'same', pid: 41, root });
    assert.equal(calls.posts.length, 0);
  });

  it('asks a mock running other code to stop, with the takeover header', async () => {
    const { deps, calls } = holderDeps({
      identity: { app: APP_ID, revision: 'old', pid: 41, root },
    });
    const result = await takeOver({ port: 4000, revision: 'new', root, deps });
    assert.equal(result.outcome, 'stopped');
    assert.equal(result.pid, 41);
    assert.equal(calls.posts.length, 1);
    assert.equal(calls.posts[0].method, 'POST');
    assert.equal(calls.posts[0].headers[TAKEOVER_HEADER], '1');
    assert.deepEqual(calls.posts[0].body, { pid: 1000, revision: 'new' });
  });

  it('replaces the mock of another checkout even when the code is the same', async () => {
    const { deps, calls } = holderDeps({
      identity: { app: APP_ID, revision: 'abc', pid: 41, root: path.join(os.tmpdir(), 'other') },
    });
    const result = await takeOver({ port: 4000, revision: 'abc', root, deps });
    assert.equal(result.outcome, 'stopped');
    assert.equal(calls.posts.length, 1);
  });

  it('reports a mock that refuses to stop as stuck', async () => {
    const { deps } = holderDeps({
      identity: { app: APP_ID, revision: 'old', pid: 41, root },
      shutdown: 403,
    });
    const result = await takeOver({ port: 4000, revision: 'new', root, deps });
    assert.equal(result.outcome, 'stuck');
    assert.equal(result.pid, 41);
  });

  it('stops a mock from before the control routes by its process, never this one', async () => {
    const { deps, calls } = holderDeps({
      health: LEGACY_HEALTH,
      pids: [1000, 52],
      commands: {
        1000: 'node mock-server/server.js',
        52: 'C:\\Program Files\\nodejs\\node.exe mock-server\\server.js',
      },
    });
    const result = await takeOver({ port: 4000, revision: 'new', root, deps });
    assert.deepEqual(result, { outcome: 'stopped', pid: 52 });
    assert.deepEqual(calls.killed, [52]);
  });

  it('does not stop a process whose command line is not the mock', async () => {
    const { deps, calls } = holderDeps({
      health: LEGACY_HEALTH,
      pids: [77],
      commands: { 77: 'python -m http.server 4000' },
    });
    const result = await takeOver({ port: 4000, revision: 'new', root, deps });
    assert.deepEqual(result, { outcome: 'stuck', pid: 77 });
    assert.deepEqual(calls.killed, []);
  });

  it('treats a port whose holder does not answer like the mock as foreign', async () => {
    for (const health of [
      null,
      { status: 200, body: { status: 'ok' } },
      { status: 404, body: { message: 'Not found' } },
    ]) {
      const { deps, calls } = holderDeps({ health, pids: [77], commands: { 77: 'node x.js' } });
      const result = await takeOver({ port: 4000, revision: 'new', root, deps });
      assert.deepEqual(result, { outcome: 'foreign' });
      assert.deepEqual(calls.killed, []);
    }
  });
});

describe('controlRoutes — what a running mock answers', () => {
  const start = async () => {
    const stops = [];
    const routes = controlRoutes({
      identity: () => ({ app: APP_ID, revision: 'abc', pid: process.pid }),
      onShutdown: (requester) => stops.push(requester),
    });
    const server = http.createServer((req, res) => {
      if (routes.handles(req.url)) routes(req, res);
      else {
        res.writeHead(418);
        res.end();
      }
    });
    const port = await listenOn(server);
    return { server, port, stops };
  };

  it('answers who it is', async () => {
    const { server, port } = await start();
    try {
      const response = await call(port, 'GET', '/__mock/identity');
      assert.equal(response.status, 200);
      assert.deepEqual(response.body.data, { app: APP_ID, revision: 'abc', pid: process.pid });
    } finally {
      await closeServer(server);
    }
  });

  it('refuses a shutdown from a browser or without the takeover header', async () => {
    const { server, port, stops } = await start();
    try {
      const bare = await call(port, 'POST', '/__mock/shutdown');
      assert.equal(bare.status, 403);
      const fromPage = await call(port, 'POST', '/__mock/shutdown', {
        [TAKEOVER_HEADER]: '1',
        Origin: 'https://example.com',
      });
      assert.equal(fromPage.status, 403);
      const asGet = await call(port, 'GET', '/__mock/shutdown', { [TAKEOVER_HEADER]: '1' });
      assert.equal(asGet.status, 404);
      assert.deepEqual(stops, []);
    } finally {
      await closeServer(server);
    }
  });

  it('only claims its own paths', () => {
    const routes = controlRoutes({ identity: () => ({}), onShutdown: () => {} });
    assert.equal(routes.handles('/__mock/identity'), true);
    assert.equal(routes.handles('/api/health'), false);
    assert.equal(routes.handles('/__mockery'), false);
  });

  it('stops for a newer mock, after answering it', async () => {
    const { server, port, stops } = await start();
    try {
      const result = await takeOver({
        port,
        revision: 'def',
        deps: { listeningPids: async () => [], pid: 4242 },
      });
      assert.equal(result.outcome, 'stopped');
      assert.deepEqual(stops, [{ pid: 4242, revision: 'def' }]);
    } finally {
      await closeServer(server);
    }
  });
});

describe('parsing what the operating system says', () => {
  it('reads the listeners of a port from Windows’ netstat, in any language', () => {
    const english = [
      '',
      'Active Connections',
      '',
      '  Proto  Local Address          Foreign Address        State           PID',
      '  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       1060',
      '  TCP    0.0.0.0:4000           0.0.0.0:0              LISTENING       9120',
      '  TCP    127.0.0.1:4000         127.0.0.1:53211        ESTABLISHED     9120',
      '  TCP    127.0.0.1:53211        127.0.0.1:4000         ESTABLISHED     7004',
      '  TCP    [::]:4000              [::]:0                 LISTENING       9120',
      '  TCP    [::]:40000             [::]:0                 LISTENING       3333',
      '  UDP    0.0.0.0:4000           *:*                                    5555',
    ].join('\r\n');
    assert.deepEqual(parseNetstat(english, 4000), [9120]);

    const german =
      '  TCP    [::]:4000              [::]:0                 ABHÖREN         8124\r\n';
    assert.deepEqual(parseNetstat(german, 4000), [8124]);
    assert.deepEqual(parseNetstat('', 4000), []);
  });

  it('reads the process ids that lsof and fuser print', () => {
    assert.deepEqual(parsePidList('2252\n2253\n2252\n'), [2252, 2253]);
    assert.deepEqual(parsePidList(' 2252 2310'), [2252, 2310]);
    assert.deepEqual(parsePidList(''), []);
    assert.deepEqual(parsePidList(null), []);
  });

  it('asks netstat on Windows and lsof elsewhere, falling back to fuser', async () => {
    const runs = [];
    const run = (answers) => async (file, args) => {
      runs.push([file, ...args].join(' '));
      return answers[file] === undefined ? null : answers[file];
    };

    const windows = await listeningPids(4000, {
      platform: 'win32',
      run: run({ netstat: '  TCP    0.0.0.0:4000   0.0.0.0:0   LISTENING   9120' }),
    });
    assert.deepEqual(windows, [9120]);

    const mac = await listeningPids(4000, { platform: 'darwin', run: run({ lsof: '321\n' }) });
    assert.deepEqual(mac, [321]);

    const bareLinux = await listeningPids(4000, { platform: 'linux', run: run({ fuser: ' 654' }) });
    assert.deepEqual(bareLinux, [654]);
    assert.ok(runs.includes('lsof -nP -iTCP:4000 -sTCP:LISTEN -t'));
    assert.ok(runs.includes('fuser -n tcp 4000'));
  });

  it('reads a command line from /proc on Linux, ps elsewhere, CIM on Windows', async () => {
    const linux = await commandLineOf(12, {
      platform: 'linux',
      readFile: () => 'node\0--watch-preserve-output\0mock-server/server.js\0',
      run: async () => null,
    });
    assert.equal(linux, 'node --watch-preserve-output mock-server/server.js');

    const mac = await commandLineOf(12, {
      platform: 'darwin',
      run: async (file) => (file === 'ps' ? 'node mock-server/server.js\n' : null),
    });
    assert.equal(mac, 'node mock-server/server.js');

    const windows = await commandLineOf(12, {
      platform: 'win32',
      run: async (file, args) =>
        file === 'powershell.exe' && args.join(' ').includes("'ProcessId=12'")
          ? '"C:\\Program Files\\nodejs\\node.exe" mock-server/server.js\r\n'
          : null,
    });
    assert.equal(windows, '"C:\\Program Files\\nodejs\\node.exe" mock-server/server.js');
  });

  it('recognises the mock in a command line, and nothing else', () => {
    for (const command of [
      'node mock-server/server.js',
      '/opt/node22/bin/node --watch-preserve-output mock-server/server.js',
      '"C:\\Program Files\\nodejs\\node.exe" mock-server\\server.js',
      'node /home/dev/squares-n-acres-website/mock-server/server.js',
    ]) {
      assert.ok(MOCK_COMMAND_RE.test(command), command);
    }
    for (const command of [
      'node server.js',
      'node mock-server/reset.js',
      'node mock-server/server.jsx',
    ]) {
      assert.ok(!MOCK_COMMAND_RE.test(command), command);
    }
  });
});

describe('sourceRevision — the code a process runs', () => {
  const makeTree = () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sna-revision-'));
    const file = (name, content) => {
      const full = path.join(root, ...name.split('/'));
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content);
      return full;
    };
    return { root, file };
  };

  it('changes with the code it loaded, and only with that code', () => {
    const { root, file } = makeTree();
    try {
      const route = file('mock-server/routes/a.js', 'module.exports = 1;');
      const shared = file('src/config/rbac.js', 'module.exports = {};');
      const vendored = file('node_modules/pkg/index.js', 'module.exports = 2;');
      const outside = path.join(os.tmpdir(), 'not-in-the-checkout.js');

      const modules = [route, shared, vendored, outside];
      const first = sourceRevision({ root, modules });
      assert.match(first, /^[0-9a-f]{12}$/);
      assert.equal(sourceRevision({ root, modules: [...modules].reverse() }), first);

      fs.writeFileSync(vendored, 'module.exports = 3;');
      assert.equal(sourceRevision({ root, modules }), first, 'node_modules is not the mock’s code');

      fs.writeFileSync(route, 'module.exports = 4;');
      assert.notEqual(sourceRevision({ root, modules }), first);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('is the same for the same code in two checkouts', () => {
    const one = makeTree();
    const two = makeTree();
    try {
      const a = one.file('mock-server/app.js', 'x');
      const b = two.file('mock-server/app.js', 'x');
      assert.equal(
        sourceRevision({ root: one.root, modules: [a] }),
        sourceRevision({ root: two.root, modules: [b] })
      );
    } finally {
      fs.rmSync(one.root, { recursive: true, force: true });
      fs.rmSync(two.root, { recursive: true, force: true });
    }
  });
});

/** Whether this machine can say which process listens on a port. */
const canFindListeners =
  process.platform !== 'win32' && ['lsof', 'fuser'].some((tool) => !spawnSync(tool, ['-v']).error);

describe('a mock from before the control routes', () => {
  it(
    'is found by its port, recognised by its command line and stopped',
    { skip: canFindListeners ? false : 'needs lsof or fuser' },
    async () => {
      // What an older mock looks like from outside: `node mock-server/server.js`,
      // an `/api/health` like every mock's, and no `/__mock/identity`.
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sna-legacy-mock-'));
      fs.mkdirSync(path.join(dir, 'mock-server'));
      fs.writeFileSync(
        path.join(dir, 'mock-server', 'server.js'),
        [
          "const http = require('http');",
          'const server = http.createServer((req, res) => {',
          "  res.setHeader('Content-Type', 'application/json');",
          "  if (req.url === '/api/health') {",
          "    res.end(JSON.stringify({ data: { status: 'ok', time: new Date().toISOString(), version: '1.0.0' } }));",
          '  } else {',
          '    res.statusCode = 404;',
          "    res.end(JSON.stringify({ message: 'Not found' }));",
          '  }',
          '});',
          "server.listen(0, () => process.stdout.write(String(server.address().port) + '\\n'));",
          "process.on('SIGTERM', () => server.close(() => process.exit(0)));",
        ].join('\n')
      );

      const child = spawn(process.execPath, ['mock-server/server.js'], {
        cwd: dir,
        stdio: ['ignore', 'pipe', 'inherit'],
      });
      const exited = new Promise((resolve) =>
        child.once('exit', (code, signal) => resolve({ code, signal }))
      );
      try {
        const port = await new Promise((resolve, reject) => {
          child.stdout.once('data', (chunk) => resolve(Number.parseInt(String(chunk), 10)));
          child.once('error', reject);
        });

        const result = await takeOver({ port, revision: 'new', root: dir });
        assert.deepEqual(result, { outcome: 'stopped', pid: child.pid });
        const { code } = await exited;
        assert.equal(code, 0);
      } finally {
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  );
});
