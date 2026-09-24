/**
 * Taking the mock's port over from an older copy of the mock (QA-57).
 *
 * The web app talks to whatever answers on `MOCK_PORT`. A mock left running by
 * an earlier session — an `npm run dev` whose Ctrl+C never reached its child
 * (common on Windows), a second terminal, an `npm run mock` started before a
 * `git pull` — keeps the port, and a new mock used to stop at "Port 4000 is
 * already in use" while the web app went on talking to the old one. Every admin
 * screen added since that process started then failed with a 403, even for the
 * admin, because the route map it runs has no rule for them (§7). That is how
 * Master data → Segments (QA-54) and Pages → Header menu (QA-57) broke.
 *
 * So a new mock looks at what holds the port before giving up:
 *
 *   - a mock that answers `GET /__mock/identity` with this process's revision
 *     runs this very code, so there is nothing to replace;
 *   - one with another revision is asked to stop (`POST /__mock/shutdown`);
 *   - one from before this protocol (it answers `/api/health` like the mock
 *     but has no `/__mock/identity`) cannot be asked, so the process listening
 *     on the port is looked up (`lsof`/`fuser`/`ss`, `netstat` on Windows) and
 *     stopped, and only once it is known to be the mock: its command line runs
 *     `mock-server/server.js`, or — when it answers exactly as every mock
 *     answers a path it does not know — it is a Node process running a
 *     `server.js`, or a Node process whose command line cannot be read
 *     (QA-58: on Windows that takes PowerShell or `wmic`, and either can be
 *     missing or too slow);
 *   - anything else is not the mock, and is left alone.
 *
 * The `/__mock/*` routes are the standalone server's, not the API's: they sit
 * outside `/api`, so the contract, the endpoint registry and the Laravel API
 * know nothing of them.
 */

const fs = require('fs');
const http = require('http');
const path = require('path');
const { execFile } = require('child_process');

const { revisionOf, snapshotModules } = require('./hotReload');

/** What `/__mock/identity` calls this server, so another program is never taken for it. */
const APP_ID = 'squares-n-acres-mock';

/** The control routes, below the server root. */
const CONTROL_PATH = '/__mock';

/** The header a shutdown request carries. A browser cannot send it without a preflight. */
const TAKEOVER_HEADER = 'x-mock-takeover';

/** How a process that runs the mock appears in its command line. */
const MOCK_COMMAND_RE = /mock-server[\\/]+server\.js\b/;

/** Node, by its executable's name or at the head of a command line. */
const NODE_RE = /^"?(?:[^"]*[\\/])?node(?:\.exe)?"?(?:\s|$)/i;

/** A command line that runs a script called `server.js`, as `node server.js` inside `mock-server/` does. */
const SERVER_SCRIPT_RE = /(?:^|[\s"'\\/])server\.js(?:["']|\s|$)/;

/** How long PowerShell may take to start: a cold one on a busy Windows machine takes seconds. */
const POWERSHELL_TIMEOUT_MS = 15000;

/** Addresses a shutdown request may come from: this machine only. */
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/**
 * A short digest of the code this process runs.
 *
 * Every module it loaded from the repository (`require.cache`, `node_modules`
 * aside), by path relative to the root and by content. Two processes with the
 * same revision answer every request alike; a pull that touches a route, a
 * middleware or a `src/config` module the mock shares changes it. The runtime
 * database and the seed are read with `fs`, never `require`d, so what an
 * editor writes never changes the revision — the same boundary `node --watch`
 * restarts on. A running mock that reloads its code (`hotReload.js`) reports
 * the revision of what it reloaded.
 *
 * @param {{root: string, modules?: string[]}} options
 * @returns {string} 12 hex characters
 */
function sourceRevision({ root, modules = Object.keys(require.cache) }) {
  return revisionOf(snapshotModules({ root, modules }));
}

/* ------------------------------------------------------------------ *
 * The side that holds the port
 * ------------------------------------------------------------------ */

/**
 * The control routes a running mock answers, mounted by `server.js` in front
 * of the API.
 *
 *   GET  /__mock/identity   who is answering on this port, and with what code
 *   POST /__mock/shutdown   stop, so that a newer mock can take the port
 *
 * A shutdown is accepted only from this machine and only from a program: a
 * browser always sends `Origin` on a POST, and cannot add the takeover header
 * without a preflight that nothing here answers. A page on another site can
 * therefore not stop the developer's mock.
 *
 * @param {{identity: () => object, onShutdown: (requester: object) => void}} options
 * @returns {import('http').RequestListener & {handles: (url: string) => boolean}}
 */
function controlRoutes({ identity, onShutdown }) {
  const send = (res, status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(body));
  };

  const handler = (req, res) => {
    const url = String(req.url ?? '').split('?')[0];

    if (url === `${CONTROL_PATH}/identity` && req.method === 'GET') {
      send(res, 200, { data: identity() });
      return;
    }

    if (url === `${CONTROL_PATH}/shutdown` && req.method === 'POST') {
      const local = LOOPBACK.has(req.socket?.remoteAddress);
      if (!local || req.headers.origin !== undefined || req.headers[TAKEOVER_HEADER] !== '1') {
        send(res, 403, { message: 'Only a mock API starting on this machine may stop this one.' });
        return;
      }
      let raw = '';
      req.setEncoding('utf8');
      req.on('data', (chunk) => {
        raw += chunk;
      });
      req.on('end', () => {
        let requester = {};
        try {
          requester = raw ? JSON.parse(raw) : {};
        } catch {
          requester = {};
        }
        // Stop once the answer is on its way, so the caller hears it first.
        res.on('finish', () => onShutdown(requester));
        send(res, 202, { data: { stopping: true, pid: process.pid } });
      });
      return;
    }

    send(res, 404, { message: 'Not found' });
  };

  handler.handles = (url) => String(url ?? '').startsWith(`${CONTROL_PATH}/`);
  return handler;
}

/* ------------------------------------------------------------------ *
 * The side that wants the port
 * ------------------------------------------------------------------ */

/**
 * One HTTP exchange with whatever holds the port, as `{status, body}`, or
 * `null` when nothing answered in time. Plain `http`: the mock has no client
 * dependency, and a proxy must never stand between two local processes.
 */
function exchange(url, { method = 'GET', headers = {}, body, timeoutMs = 1500 } = {}) {
  return new Promise((resolve) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const request = http.request(
      url,
      {
        method,
        headers: {
          Accept: 'application/json',
          ...(payload ? { 'Content-Type': 'application/json' } : null),
          ...headers,
        },
        timeout: timeoutMs,
      },
      (response) => {
        let raw = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          raw += chunk;
        });
        response.on('end', () => {
          let parsed = null;
          try {
            parsed = raw ? JSON.parse(raw) : null;
          } catch {
            parsed = null;
          }
          resolve({ status: response.statusCode, body: parsed });
        });
      }
    );
    request.on('timeout', () => request.destroy());
    request.on('error', () => resolve(null));
    if (payload) request.write(payload);
    request.end();
  });
}

/** Whether `/api/health` answered the way every version of the mock answers it. */
const isMockHealth = (answer) =>
  answer?.status === 200 &&
  answer.body?.data?.status === 'ok' &&
  typeof answer.body.data.version === 'string';

/**
 * Whether a path answered the way every version of the mock answers a path it
 * does not know — the last handler of `app.js`: `404 {"message":"Not found"}`.
 */
const isMockNotFound = (answer) =>
  answer?.status === 404 &&
  answer.body !== null &&
  typeof answer.body === 'object' &&
  answer.body.message === 'Not found' &&
  Object.keys(answer.body).length === 1;

/** Runs a program and resolves its standard output, or `null` when it failed to run. */
function runText(file, args, { timeoutMs = 5000 } = {}) {
  return new Promise((resolve) => {
    execFile(
      file,
      args,
      { timeout: timeoutMs, windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
      (error, stdout) => {
        // `lsof` and `fuser` exit 1 when nothing matches, and that is an answer.
        if (error && (error.code === 'ENOENT' || !stdout)) {
          resolve(error.code === 'ENOENT' ? null : '');
          return;
        }
        resolve(String(stdout ?? ''));
      }
    );
  });
}

/** Every number in the output of `lsof -t` or `fuser`, once. */
const parsePidList = (output) => [
  ...new Set(
    String(output ?? '')
      .split(/\s+/)
      .map((word) => Number.parseInt(word, 10))
      .filter((pid) => Number.isInteger(pid) && pid > 0)
  ),
];

/**
 * The processes listening on a TCP port, from Windows' `netstat -ano`.
 *
 * A listening socket is told by its foreign address (`0.0.0.0:0`, `[::]:0`)
 * rather than by its state, because the state column is translated — it reads
 * `ABHÖREN` on a German Windows.
 *
 * @param {string} output
 * @param {number} port
 * @returns {number[]}
 */
function parseNetstat(output, port) {
  const pids = new Set();
  for (const line of String(output ?? '').split(/\r?\n/)) {
    const columns = line.trim().split(/\s+/);
    if (columns.length < 5 || columns[0].toUpperCase() !== 'TCP') continue;
    const [, local, foreign] = columns;
    const pid = Number.parseInt(columns[columns.length - 1], 10);
    const listening = foreign === '0.0.0.0:0' || foreign === '[::]:0' || foreign === '*:*';
    if (listening && local.endsWith(`:${port}`) && Number.isInteger(pid) && pid > 0) {
      pids.add(pid);
    }
  }
  return [...pids];
}

/**
 * The processes in the output of `ss -ltnp`: `users:(("node",pid=2252,fd=21))`.
 *
 * @param {string} output
 * @returns {number[]}
 */
const parseSs = (output) => [
  ...new Set(
    [...String(output ?? '').matchAll(/\bpid=(\d+)/g)]
      .map((match) => Number.parseInt(match[1], 10))
      .filter((pid) => Number.isInteger(pid) && pid > 0)
  ),
];

/**
 * The processes listening on a TCP port on this machine.
 *
 * @param {number} port
 * @param {{platform?: string, run?: typeof runText}} [deps]
 * @returns {Promise<number[]>}
 */
async function listeningPids(port, { platform = process.platform, run = runText } = {}) {
  if (platform === 'win32') {
    return parseNetstat(await run('netstat', ['-ano']), port);
  }

  const lsof = await run('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t']);
  if (lsof !== null) return parsePidList(lsof);

  // A Linux without `lsof` usually still has `fuser` (psmisc), and always `ss` (iproute2).
  const fuser = await run('fuser', ['-n', 'tcp', String(port)]);
  if (fuser !== null) return parsePidList(fuser);
  if (platform !== 'linux') return [];

  const ss = await run('ss', ['-ltnp', 'sport', '=', `:${port}`]);
  return ss === null ? [] : parseSs(ss);
}

/**
 * A process's command line, or `null` when it cannot be read.
 *
 * @param {number} pid
 * @param {{platform?: string, run?: typeof runText, readFile?: typeof fs.readFileSync}} [deps]
 * @returns {Promise<string|null>}
 */
async function commandLineOf(
  pid,
  { platform = process.platform, run = runText, readFile = fs.readFileSync } = {}
) {
  if (platform === 'win32') {
    const filter = `ProcessId=${Number(pid)}`;
    const line = await run(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `(Get-CimInstance Win32_Process -Filter '${filter}').CommandLine`,
      ],
      { timeoutMs: POWERSHELL_TIMEOUT_MS }
    );
    if (line) return line.trim() || null;
    const wmic = await run('wmic', ['process', 'where', filter, 'get', 'CommandLine', '/value']);
    return wmic ? wmic.replace(/^\s*CommandLine=/im, '').trim() || null : null;
  }

  if (platform === 'linux') {
    try {
      return (
        readFile(`/proc/${Number(pid)}/cmdline`, 'utf8')
          .split('\0')
          .join(' ')
          .trim() || null
      );
    } catch {
      // Not every Linux mounts /proc where a container expects it; `ps` next.
    }
  }

  const ps = await run('ps', ['-o', 'command=', '-p', String(Number(pid))]);
  return ps ? ps.trim() || null : null;
}

/**
 * The image name in `tasklist /FO CSV /NH` output: `"node.exe","9120",…`. The
 * "no tasks" line is translated on a non-English Windows, and is not CSV.
 *
 * @param {string} output
 * @returns {string|null}
 */
function parseTasklist(output) {
  const line = String(output ?? '')
    .split(/\r?\n/)
    .find((candidate) => candidate.trim().startsWith('"'));
  const match = line ? /^\s*"([^"]+)"/.exec(line) : null;
  return match ? match[1] : null;
}

/**
 * The name of a process's executable (`node.exe`, `/usr/local/bin/node`), or
 * `null`. It needs neither PowerShell nor `wmic`: Windows answers it with
 * `tasklist`, which every edition has.
 *
 * @param {number} pid
 * @param {{platform?: string, run?: typeof runText}} [deps]
 * @returns {Promise<string|null>}
 */
async function imageNameOf(pid, { platform = process.platform, run = runText } = {}) {
  if (platform === 'win32') {
    return parseTasklist(
      await run('tasklist', ['/FI', `PID eq ${Number(pid)}`, '/FO', 'CSV', '/NH'])
    );
  }
  const ps = await run('ps', ['-o', 'comm=', '-p', String(Number(pid))]);
  return ps ? ps.trim() || null : null;
}

/**
 * Whether the process listening on the port is a mock from before the control
 * routes, and may therefore be stopped.
 *
 * Its command line naming `mock-server/server.js` settles it. Without that,
 * the port's answers must be the mock's (`answersLikeMock`: the health check
 * and the 404 of every version of it) and the process must be Node: running a
 * `server.js` when its command line can be read, as `node server.js` inside
 * `mock-server/` does, or of any command line when it cannot be read, as
 * happens on a Windows where PowerShell is slow or blocked and `wmic` is gone.
 *
 * @param {number} pid
 * @param {object} options
 * @param {boolean} options.answersLikeMock
 * @param {(pid: number) => Promise<string|null>} options.readCommand
 * @param {(pid: number) => Promise<string|null>} options.readImage
 * @returns {Promise<boolean>}
 */
async function isLegacyMock(pid, { answersLikeMock, readCommand, readImage }) {
  const command = await readCommand(pid);
  if (command) {
    if (MOCK_COMMAND_RE.test(command)) return true;
    return answersLikeMock && NODE_RE.test(command) && SERVER_SCRIPT_RE.test(command);
  }
  if (!answersLikeMock) return false;
  const image = await readImage(pid);
  return Boolean(image && NODE_RE.test(image));
}

/**
 * Finds out what holds the port and, when it is an older copy of the mock,
 * stops it.
 *
 * A mock of another checkout is replaced even when its code is the same: it
 * serves that checkout's runtime database, not this one's.
 *
 * @param {object} options
 * @param {number} options.port
 * @param {string} options.revision this process's `sourceRevision`
 * @param {string} options.root this checkout
 * @param {object} [options.deps] injectable for the tests: `exchange`,
 *   `listeningPids`, `commandLineOf`, `imageNameOf`, `kill`, `pid`
 * @returns {Promise<{outcome: 'same'|'stopped'|'stuck'|'foreign', pid?: number|null,
 *   root?: string}>}
 *   `same` — this checkout's mock, with this very code, already answers;
 *   `stopped` — an older one was stopped and the port is about to be free;
 *   `stuck` — an older one holds it and could not be stopped; `foreign` — it
 *   is not the mock at all
 */
async function takeOver({ port, revision, root, deps = {} }) {
  const {
    exchange: ask = exchange,
    listeningPids: findPids = listeningPids,
    commandLineOf: readCommand = commandLineOf,
    imageNameOf: readImage = imageNameOf,
    kill = (pid) => process.kill(pid, 'SIGTERM'),
    pid: ownPid = process.pid,
  } = deps;

  const base = `http://127.0.0.1:${port}`;
  const identity = await ask(`${base}${CONTROL_PATH}/identity`);
  const holder = identity?.status === 200 ? identity.body?.data : null;

  if (holder?.app === APP_ID) {
    const sameCheckout = !root || !holder.root || path.resolve(holder.root) === path.resolve(root);
    if (holder.revision === revision && sameCheckout) {
      return { outcome: 'same', pid: holder.pid, root: holder.root };
    }

    const stop = await ask(`${base}${CONTROL_PATH}/shutdown`, {
      method: 'POST',
      headers: { [TAKEOVER_HEADER]: '1' },
      body: { pid: ownPid, revision },
    });
    return stop?.status === 202
      ? { outcome: 'stopped', pid: holder.pid, root: holder.root }
      : { outcome: 'stuck', pid: holder.pid, root: holder.root };
  }

  // A mock from before `/__mock/identity` existed: it cannot be asked to stop.
  if (!isMockHealth(await ask(`${base}/api/health`))) return { outcome: 'foreign' };
  // It answered the identity path as it answers any path it does not know.
  const answersLikeMock = isMockNotFound(identity);

  const pids = (await findPids(port)).filter((candidate) => candidate !== ownPid);
  for (const candidate of pids) {
    if (!(await isLegacyMock(candidate, { answersLikeMock, readCommand, readImage }))) continue;
    try {
      kill(candidate);
      return { outcome: 'stopped', pid: candidate };
    } catch {
      return { outcome: 'stuck', pid: candidate };
    }
  }
  return { outcome: 'stuck', pid: pids[0] ?? null };
}

module.exports = {
  APP_ID,
  CONTROL_PATH,
  TAKEOVER_HEADER,
  MOCK_COMMAND_RE,
  NODE_RE,
  SERVER_SCRIPT_RE,
  sourceRevision,
  controlRoutes,
  exchange,
  isMockHealth,
  isMockNotFound,
  parsePidList,
  parseNetstat,
  parseSs,
  parseTasklist,
  listeningPids,
  commandLineOf,
  imageNameOf,
  isLegacyMock,
  takeOver,
};
