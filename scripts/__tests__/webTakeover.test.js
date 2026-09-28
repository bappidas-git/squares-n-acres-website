/**
 * Taking port 3000 back from a web dev server left running (`scripts/lib/webTakeover.js`, QA-66).
 *
 * `npm run dev` used to start a web dev server that exited on "Something is
 * already running on port 3000." whenever an earlier session's server still
 * held the port, leaving the browser on whatever that server showed. These
 * suites pin what the claim decides from what holds the port, what it never
 * stops, the control routes a running web dev server answers, and — on a
 * machine with `lsof` or `fuser` — the real lookup and stop of a dev server
 * from before those routes existed.
 *
 * Run with `npm run test:scripts`.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { after, describe, it } = require('node:test');

const express = require('express');

const {
  APP_ID,
  CONTROL_PATH,
  DEV_SERVER_COMMAND_RE,
  TAKEOVER_HEADER,
  applicationNameOf,
  claimWebPort,
  describeClaim,
  devServerAddress,
  isLeftoverDevServer,
  isSiteDevPage,
  mountControlRoutes,
  namesCheckout,
} = require('../lib/webTakeover');

const SITE = 'Squares N Acres';

/** The page `react-scripts start` serves: the template, and the development bundle it adds. */
const devPage = (name = SITE) =>
  '<!doctype html><html><head>' +
  `<meta name="application-name" content="${name}" data-rh="true" />` +
  '<script defer src="/static/js/bundle.js"></script></head>' +
  '<body><div id="root"></div></body></html>';

/** The same site built and served statically: hashed chunks, no development bundle. */
const BUILT_PAGE =
  '<!doctype html><html><head>' +
  `<meta name="application-name" content="${SITE}" data-rh="true"/>` +
  '<script defer="defer" src="/static/js/main.3f2a91c4.js"></script></head></html>';

const ROOT = path.join(os.tmpdir(), 'sna-checkout');
const WINDOWS_ROOT = 'C:\\Users\\dev\\squares-n-acres-website';

const posixDevServer = (root = ROOT) =>
  `/usr/local/bin/node ${root}/node_modules/react-scripts/scripts/start.js`;
const windowsDevServer = (root = WINDOWS_ROOT) =>
  `"C:\\Program Files\\nodejs\\node.exe" ${root}\\node_modules\\react-scripts\\scripts\\start.js`;

/**
 * `claimWebPort`'s dependencies, answering as a scripted port holder would.
 * `busyChecks` is how many times the port reads as held before it is free.
 */
function holderDeps({
  busyChecks = Infinity,
  identity = null,
  identityAnswer,
  shutdown = 202,
  page = null,
  loopback4 = true,
  pids = [],
  commands = {},
  images = {},
  pid = 1000,
  killThrows = false,
}) {
  const calls = { asked: [], posts: [], killed: [], portChecks: 0 };
  let busy = busyChecks;
  let clock = 0;
  const exchange = async (url, options = {}) => {
    calls.asked.push(url);
    if (!loopback4 && url.startsWith('http://127.0.0.1:')) return null;
    if (url.endsWith(`${CONTROL_PATH}/identity`)) {
      if (identityAnswer !== undefined) return identityAnswer;
      return identity
        ? { status: 200, body: { data: identity }, text: JSON.stringify({ data: identity }) }
        : { status: 404, body: null, text: 'Cannot GET /__web/identity' };
    }
    if (url.endsWith(`${CONTROL_PATH}/shutdown`)) {
      calls.posts.push(options);
      return { status: shutdown, body: null, text: '' };
    }
    if (url.endsWith('/')) return page === null ? null : { status: 200, body: null, text: page };
    return null;
  };
  return {
    calls,
    deps: {
      isPortFree: async () => {
        calls.portChecks += 1;
        if (busy > 0) {
          busy -= 1;
          return false;
        }
        return true;
      },
      exchange,
      listeningPids: async () => pids,
      commandLineOf: async (candidate) => commands[candidate] ?? null,
      imageNameOf: async (candidate) => images[candidate] ?? null,
      kill: (candidate) => {
        if (killThrows) throw new Error('EPERM');
        calls.killed.push(candidate);
      },
      pid,
      siteName: SITE,
      sleep: async (ms) => {
        clock += ms;
      },
      now: () => clock,
      releaseTimeoutMs: 1000,
    },
  };
}

const claim = (deps, root = ROOT) => claimWebPort({ port: 3000, host: '0.0.0.0', root, deps });

describe('claimWebPort — what holds the port decides', () => {
  it('does nothing on a free port', async () => {
    const { deps, calls } = holderDeps({ busyChecks: 0 });
    assert.deepEqual(await claim(deps), { outcome: 'free' });
    assert.deepEqual(calls.asked, []);
  });

  it('asks this project’s dev server to stop, with the takeover header, and waits for the port', async () => {
    const other = path.join(os.tmpdir(), 'another-checkout');
    const { deps, calls } = holderDeps({
      busyChecks: 3,
      identity: { app: APP_ID, pid: 41, root: other },
    });
    assert.deepEqual(await claim(deps), { outcome: 'stopped', pid: 41, root: other });
    assert.equal(calls.posts.length, 1);
    assert.equal(calls.posts[0].method, 'POST');
    assert.equal(calls.posts[0].headers[TAKEOVER_HEADER], '1');
    assert.deepEqual(calls.posts[0].body, { pid: 1000 });
    assert.deepEqual(calls.killed, []);
  });

  it('reports a dev server that refuses to stop, or never lets go of the port, as stuck', async () => {
    const refused = holderDeps({ identity: { app: APP_ID, pid: 41, root: ROOT }, shutdown: 403 });
    assert.deepEqual(await claim(refused.deps), { outcome: 'stuck', pid: 41, root: ROOT });

    const holding = holderDeps({ identity: { app: APP_ID, pid: 41, root: ROOT } });
    assert.deepEqual(await claim(holding.deps), { outcome: 'stuck', pid: 41, root: ROOT });
    assert.ok(holding.calls.portChecks > 3, 'the port was watched until the deadline');
  });

  it('asks on [::1] when nothing answers on 127.0.0.1', async () => {
    const { deps, calls } = holderDeps({
      busyChecks: 1,
      loopback4: false,
      identity: { app: APP_ID, pid: 41, root: ROOT },
    });
    assert.equal((await claim(deps)).outcome, 'stopped');
    assert.ok(calls.asked.includes(`http://[::1]:3000${CONTROL_PATH}/shutdown`));
  });

  it('stops a dev server from before the control routes that serves this site', async () => {
    for (const command of [posixDevServer('/elsewhere'), windowsDevServer('D:\\other')]) {
      const { deps, calls } = holderDeps({
        busyChecks: 2,
        page: devPage(),
        pids: [1000, 52],
        commands: { 1000: 'node scripts/claim-web-port.js', 52: command },
      });
      assert.deepEqual(await claim(deps), { outcome: 'stopped', pid: 52 }, command);
      assert.deepEqual(calls.killed, [52], 'never this process');
    }
  });

  it('stops one whose page cannot be read when its command line names this checkout', async () => {
    // A dev server mid-compile holds every request until the bundle is ready.
    const posix = holderDeps({ busyChecks: 1, pids: [52], commands: { 52: posixDevServer() } });
    assert.deepEqual(await claim(posix.deps), { outcome: 'stopped', pid: 52 });

    const windows = holderDeps({
      busyChecks: 1,
      pids: [52],
      commands: { 52: windowsDevServer('c:\\users\\DEV\\squares-n-acres-website\\') },
    });
    assert.deepEqual(await claim(windows.deps, WINDOWS_ROOT), { outcome: 'stopped', pid: 52 });
  });

  it('stops one whose command line cannot be read when it is Node and serves this site', async () => {
    // Windows without a working PowerShell or `wmic` (QA-58): only the image name is known.
    const { deps, calls } = holderDeps({
      busyChecks: 1,
      page: devPage(),
      pids: [52],
      images: { 52: 'node.exe' },
    });
    assert.deepEqual(await claim(deps), { outcome: 'stopped', pid: 52 });
    assert.deepEqual(calls.killed, [52]);
  });

  it('never stops another project’s dev server', async () => {
    const { deps, calls } = holderDeps({
      page: devPage('Another App'),
      pids: [77],
      commands: { 77: posixDevServer('/home/dev/another-app') },
    });
    assert.deepEqual(await claim(deps), {
      outcome: 'foreign',
      pid: 77,
      command: posixDevServer('/home/dev/another-app'),
      devServer: true,
    });
    assert.deepEqual(calls.killed, []);
  });

  it('never stops a program that is not a dev server, even one serving this site', async () => {
    for (const [page, command] of [
      [BUILT_PAGE, 'node /usr/lib/node_modules/serve/build/main.js -s build -l 3000'],
      [devPage(), 'python3 -m http.server 3000'],
      [null, 'C:\\Windows\\System32\\svchost.exe -k netsvcs'],
    ]) {
      const { deps, calls } = holderDeps({ page, pids: [77], commands: { 77: command } });
      const result = await claim(deps);
      assert.equal(result.outcome, 'foreign', command);
      assert.equal(result.devServer, false, command);
      assert.deepEqual(calls.killed, [], command);
    }
  });

  it('never stops an unreadable process unless it is Node serving this site’s dev page', async () => {
    for (const [page, image] of [
      [devPage(), 'java.exe'],
      [devPage(), null],
      [BUILT_PAGE, 'node.exe'],
      [devPage('Another App'), 'node.exe'],
      [null, 'node.exe'],
    ]) {
      const { deps, calls } = holderDeps({ page, pids: [52], images: { 52: image } });
      const result = await claim(deps);
      assert.deepEqual(
        result,
        { outcome: 'foreign', pid: 52, command: null, devServer: false },
        `${image}`
      );
      assert.deepEqual(calls.killed, [], `${image}`);
    }
  });

  it('says it cannot tell when the port is held by no process it can find', async () => {
    const { deps } = holderDeps({ page: devPage(), pids: [] });
    assert.deepEqual(await claim(deps), { outcome: 'unknown' });
  });

  it('reports a dev server it may not stop as stuck', async () => {
    const { deps } = holderDeps({
      page: devPage(),
      pids: [52],
      commands: { 52: posixDevServer() },
      killThrows: true,
    });
    assert.deepEqual(await claim(deps), { outcome: 'stuck', pid: 52 });
  });
});

describe('recognising a leftover dev server', () => {
  it('reads the application name a page declares', () => {
    assert.equal(applicationNameOf(devPage()), SITE);
    assert.equal(applicationNameOf('<html></html>'), null);
    assert.equal(applicationNameOf(null), null);
  });

  it('knows this site’s development page from a build and from another app', () => {
    assert.equal(isSiteDevPage(devPage(), SITE), true);
    assert.equal(isSiteDevPage(BUILT_PAGE, SITE), false);
    assert.equal(isSiteDevPage(devPage('Another App'), SITE), false);
    assert.equal(isSiteDevPage(devPage(), null), false, 'no template name, no match');
    assert.equal(isSiteDevPage(null, SITE), false);
  });

  it('matches `react-scripts start` and nothing else', () => {
    for (const command of [
      posixDevServer(),
      windowsDevServer(),
      'node node_modules/.bin/react-scripts start',
      '"C:\\x\\node_modules\\.bin\\react-scripts.cmd" start',
    ]) {
      assert.match(command, DEV_SERVER_COMMAND_RE, command);
    }
    for (const command of [
      'node node_modules/.bin/react-scripts build',
      'node /x/node_modules/react-scripts/scripts/test.js --watchAll=false',
      'node scripts/start-server.js',
    ]) {
      assert.doesNotMatch(command, DEV_SERVER_COMMAND_RE, command);
    }
  });

  it('tells this checkout’s react-scripts from another’s, in any spelling of the path', () => {
    assert.equal(namesCheckout(posixDevServer(), ROOT), true);
    assert.equal(namesCheckout(posixDevServer(), `${ROOT}/`), true);
    assert.equal(namesCheckout(posixDevServer('/elsewhere'), ROOT), false);
    assert.equal(namesCheckout(windowsDevServer(), WINDOWS_ROOT.toLowerCase()), true);
    assert.equal(namesCheckout(windowsDevServer(), 'C:\\Users\\dev\\squares-n-acres'), false);
    assert.equal(namesCheckout(posixDevServer(), ''), false);
  });

  it('asks for the command line first, and for the page or the checkout with it', () => {
    const base = { root: ROOT, image: 'node' };
    assert.equal(
      isLeftoverDevServer({ ...base, command: posixDevServer(), servesSite: false }),
      true
    );
    assert.equal(
      isLeftoverDevServer({ ...base, command: posixDevServer('/x'), servesSite: true }),
      true
    );
    assert.equal(
      isLeftoverDevServer({ ...base, command: posixDevServer('/x'), servesSite: false }),
      false
    );
    assert.equal(isLeftoverDevServer({ ...base, command: 'node x.js', servesSite: true }), false);
    assert.equal(isLeftoverDevServer({ ...base, command: null, servesSite: true }), true);
    assert.equal(isLeftoverDevServer({ ...base, command: null, servesSite: false }), false);
  });
});

describe('describeClaim — what `npm run dev` prints, and how it exits', () => {
  it('stays quiet on a free port', () => {
    assert.deepEqual(describeClaim({ outcome: 'free' }, { port: 3000 }), {
      exitCode: 0,
      level: null,
      message: null,
    });
  });

  it('says what it stopped, and where from when that was another checkout', () => {
    const same = describeClaim(
      { outcome: 'stopped', pid: 41, root: ROOT },
      { port: 3000, root: ROOT }
    );
    assert.equal(same.exitCode, 0);
    assert.equal(
      same.message,
      'Stopped an older web dev server (pid 41) that was still answering on port 3000. ' +
        'The new one starts now.'
    );
    const other = describeClaim(
      { outcome: 'stopped', pid: 41, root: '/home/dev/old-copy' },
      { port: 3000, root: ROOT }
    );
    assert.match(other.message, /\(pid 41, from \/home\/dev\/old-copy\)/);
  });

  it('fails with the process and how to stop it when it must not or could not stop it', () => {
    const stuck = describeClaim({ outcome: 'stuck', pid: 52 }, { port: 3000 });
    assert.equal(stuck.exitCode, 1);
    assert.match(stuck.message, /could not be stopped automatically/);
    assert.match(stuck.message, /`kill 52` on macOS\/Linux, `Stop-Process -Id 52` in PowerShell/);

    const foreign = describeClaim(
      { outcome: 'foreign', pid: 77, command: 'python3 -m http.server 3000', devServer: false },
      { port: 3000 }
    );
    assert.equal(foreign.exitCode, 1);
    assert.match(foreign.message, /not this project's web dev server \(pid 77: python3 -m http/);
    assert.match(foreign.message, /then run `npm run dev` again\.$/);

    const otherApp = describeClaim(
      { outcome: 'foreign', pid: 77, command: posixDevServer('/x'), devServer: true },
      { port: 3000 }
    );
    assert.match(otherApp.message, /another project's Create React App dev server/);
  });

  it('leaves a port it cannot account for to react-scripts, with a hint', () => {
    const unknown = describeClaim({ outcome: 'unknown' }, { port: 3000 });
    assert.equal(unknown.exitCode, 0);
    assert.equal(unknown.level, 'warn');
    assert.match(unknown.message, /Something is already running on port 3000\./);
  });
});

describe('devServerAddress — the port react-scripts start will use', () => {
  const roots = [];
  after(() => {
    for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
  });
  const project = (files) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sna-web-port-'));
    roots.push(root);
    for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(root, name), text);
    return root;
  };

  it('defaults to 3000 on every interface', () => {
    assert.deepEqual(devServerAddress({ root: project({}), env: {} }), {
      port: 3000,
      host: '0.0.0.0',
    });
  });

  it('reads PORT and HOST as CRA does: the environment, then the development env files', () => {
    const root = project({
      '.env': 'PORT=3001\nHOST=127.0.0.1\n',
      '.env.development': 'PORT=3002\n',
      '.env.local': 'PORT=3003\n',
      '.env.development.local': '# nothing here\n',
      '.env.production': 'PORT=4444\n',
    });
    assert.deepEqual(devServerAddress({ root, env: {} }), { port: 3003, host: '127.0.0.1' });
    assert.deepEqual(devServerAddress({ root, env: { PORT: '3100' } }), {
      port: 3100,
      host: '127.0.0.1',
    });
    assert.equal(devServerAddress({ root, env: { PORT: 'not-a-port' } }).port, 3000);
  });
});

/** Listens on an ephemeral loopback port and resolves it. */
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
      res.on('end', () => {
        let body = null;
        try {
          body = raw ? JSON.parse(raw) : null;
        } catch {
          body = raw;
        }
        resolve({ status: res.statusCode, body });
      });
    });
    request.on('error', reject);
    request.end();
  });

describe('mountControlRoutes — what a running web dev server answers', () => {
  const start = async () => {
    const stops = [];
    const logs = [];
    const app = express();
    mountControlRoutes(app, {
      root: ROOT,
      log: (line) => logs.push(line),
      stop: () => stops.push(Date.now()),
    });
    app.use((req, res) => res.status(200).send('the app'));
    const server = http.createServer(app);
    const port = await listenOn(server);
    return { server, port, stops, logs };
  };

  it('answers who it is, and leaves every other path to the dev server', async () => {
    const { server, port } = await start();
    try {
      const identity = await call(port, 'GET', `${CONTROL_PATH}/identity`);
      assert.equal(identity.status, 200);
      assert.equal(identity.body.data.app, APP_ID);
      assert.equal(identity.body.data.pid, process.pid);
      assert.equal(identity.body.data.root, ROOT);
      assert.equal((await call(port, 'GET', '/properties')).body, 'the app');
      assert.equal((await call(port, 'GET', '/__webpack_hmr')).body, 'the app');
    } finally {
      await closeServer(server);
    }
  });

  it('refuses a shutdown from a browser or without the takeover header', async () => {
    const { server, port, stops } = await start();
    try {
      assert.equal((await call(port, 'POST', `${CONTROL_PATH}/shutdown`)).status, 403);
      const fromPage = await call(port, 'POST', `${CONTROL_PATH}/shutdown`, {
        [TAKEOVER_HEADER]: '1',
        Origin: 'https://example.com',
      });
      assert.equal(fromPage.status, 403);
      const mockHeader = await call(port, 'POST', `${CONTROL_PATH}/shutdown`, {
        'x-mock-takeover': '1',
      });
      assert.equal(mockHeader.status, 403, "the mock's header is not this server's");
      assert.deepEqual(stops, []);
    } finally {
      await closeServer(server);
    }
  });

  it('stops for a newer `npm run dev`, after answering it', async () => {
    const { server, port, stops, logs } = await start();
    try {
      let checks = 0;
      const result = await claimWebPort({
        port,
        host: '127.0.0.1',
        root: ROOT,
        deps: {
          // Held until the server has been asked to stop.
          isPortFree: async () => {
            checks += 1;
            return stops.length > 0 && checks > 1;
          },
          listeningPids: async () => [],
          pid: 4242,
          // Yields to I/O, so the server's side of the exchange runs between checks.
          sleep: () => new Promise((resolve) => setImmediate(resolve)),
        },
      });
      assert.deepEqual(result, { outcome: 'stopped', pid: process.pid, root: ROOT });
      assert.equal(stops.length, 1);
      assert.match(logs[0], /\(pid 4242\) is taking this port over/);
    } finally {
      await closeServer(server);
    }
  });
});

/* ------------------------------------------------------------------ *
 * Real processes: a dev server from before the control routes
 * ------------------------------------------------------------------ */

/** Whether this machine can say which process listens on a port (as `takeover.test.js` asks). */
const canFindListeners =
  process.platform !== 'win32' &&
  ['lsof', 'fuser', 'ss'].some((tool) => !spawnSync(tool, ['-v']).error);

/**
 * A stand-in for `react-scripts start` from before this change, in a
 * throwaway checkout: its command line runs
 * `<root>/node_modules/react-scripts/scripts/start.js`, it serves `page` on
 * every path and it has no control routes.
 */
function spawnLegacyDevServer(page) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sna-legacy-web-'));
  const scripts = path.join(root, 'node_modules', 'react-scripts', 'scripts');
  fs.mkdirSync(scripts, { recursive: true });
  fs.writeFileSync(path.join(root, 'page.html'), page);
  fs.writeFileSync(
    path.join(scripts, 'start.js'),
    [
      "const fs = require('fs');",
      "const http = require('http');",
      "const path = require('path');",
      "const page = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'page.html'), 'utf8');",
      'const server = http.createServer((req, res) => {',
      "  res.writeHead(200, { 'Content-Type': 'text/html' });",
      '  res.end(page);',
      '});',
      "server.listen(0, '0.0.0.0', () => console.log(server.address().port));",
      "process.on('SIGTERM', () => process.exit(0));",
    ].join('\n')
  );
  const child = spawn(process.execPath, [path.join(scripts, 'start.js')], {
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const port = new Promise((resolve, reject) => {
    child.stdout.once('data', (chunk) => resolve(Number.parseInt(String(chunk), 10)));
    child.once('exit', (code) => reject(new Error(`the stand-in exited early (${code})`)));
  });
  const exited = new Promise((resolve) => child.once('exit', () => resolve(true)));
  return { root, child, port, exited };
}

describe('claimWebPort — real processes', () => {
  const skip = canFindListeners ? false : 'needs lsof, fuser or ss';
  const spawned = [];
  after(() => {
    for (const { child, root } of spawned) {
      if (child.exitCode === null) child.kill('SIGKILL');
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('stops this project’s dev server from before the control routes', { skip }, async () => {
    const legacy = spawnLegacyDevServer(devPage());
    spawned.push(legacy);
    const port = await legacy.port;
    const result = await claimWebPort({
      port,
      host: '0.0.0.0',
      root: legacy.root,
      deps: { siteName: SITE },
    });
    assert.deepEqual(result, { outcome: 'stopped', pid: legacy.child.pid });
    assert.equal(await legacy.exited, true);
  });

  it('leaves another project’s dev server running', { skip }, async () => {
    const other = spawnLegacyDevServer(devPage('Another App'));
    spawned.push(other);
    const port = await other.port;
    const result = await claimWebPort({
      port,
      host: '0.0.0.0',
      root: path.join(os.tmpdir(), 'sna-not-this-one'),
      deps: { siteName: SITE },
    });
    assert.equal(result.outcome, 'foreign');
    assert.equal(result.pid, other.child.pid);
    assert.equal(result.devServer, true);
    assert.equal(other.child.exitCode, null, 'still running');
  });
});
