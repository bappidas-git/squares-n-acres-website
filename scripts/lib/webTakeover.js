/**
 * Taking port 3000 back from a web dev server left running (QA-66).
 *
 * `npm run dev` runs two servers. Since QA-57 the mock on port 4000 takes its
 * port over from an older copy of itself. The web dev server on port 3000 never
 * did. When a process from an earlier session still held that port — a
 * `npm run dev` left running across a `git pull`, or one whose Ctrl+C never
 * reached its children (common on Windows) — `react-scripts start` printed
 * "Something is already running on port 3000." and exited with code 0: under
 * `concurrently` it runs without a terminal, so it cannot ask to use another
 * port. The terminal went on showing the mock's log, and the browser went on
 * showing whatever the old process served. After prompt 51 moved files
 * (`ConflictDialog`, `DraftBanner`) and renamed exports, an old server that
 * missed part of the pull stays on "Failed to compile", and running
 * `npm run dev` again could not replace it.
 *
 * So `npm run dev` claims the port before it starts the web dev server
 * (`scripts/claim-web-port.js`), deciding from what holds it:
 *
 *   - nothing: there is nothing to do;
 *   - this project's web dev server, from this change on — it answers
 *     `GET /__web/identity` (`src/setupProxy.js`): it is asked to stop
 *     (`POST /__web/shutdown`, accepted from this machine and from a program
 *     only, exactly as the mock's control routes);
 *   - one from before this change, which cannot be asked: the process that
 *     listens on the port is looked up with the mock's own helpers (`lsof`,
 *     `fuser`, `ss`; `netstat` on Windows) and stopped only once it is known to
 *     be this project's dev server. Its command line runs `react-scripts start`
 *     and names this checkout, or it serves this site's development page; when
 *     its command line cannot be read (a Windows without a working PowerShell
 *     or `wmic`), it is Node and serves this site's development page;
 *   - anything else: nothing is stopped, and the message names the process
 *     that holds the port and how to stop it, instead of the web dev server
 *     exiting without a word.
 *
 * Whichever `npm run dev` starts last serves the port: running it again is how
 * a developer asks for a fresh web dev server.
 */

const fs = require('fs');
const net = require('net');
const path = require('path');

const {
  NODE_RE,
  commandLineOf,
  controlRoutes,
  exchange,
  imageNameOf,
  listeningPids,
} = require('../../mock-server/lib/takeover');
const { parseEnvFile } = require('../postbuild');

/** What `/__web/identity` calls this project's web dev server. */
const APP_ID = 'squares-n-acres-web';

/** The web dev server's control routes, below its root (the mock's are below `/__mock`). */
const CONTROL_PATH = '/__web';

/** The header a shutdown request carries. A browser cannot send it without a preflight. */
const TAKEOVER_HEADER = 'x-web-takeover';

/** How long a stopped web dev server gets to let go of the port. */
const RELEASE_TIMEOUT_MS = 10000;

/** The files `react-scripts start` reads `PORT` and `HOST` from, most important first (CRA's order). */
const DEV_ENV_FILES = ['.env.development.local', '.env.local', '.env.development', '.env'];

/**
 * `react-scripts start` as it appears in a command line: the process that
 * listens runs `…/react-scripts/scripts/start.js`, which the `react-scripts`
 * shim spawns.
 */
const DEV_SERVER_COMMAND_RE =
  /react-scripts[\\/]+scripts[\\/]+start\.js\b|react-scripts(?:\.cmd|\.js)?["']?\s+start\b/i;

/** `<meta name="application-name" content="…">`, as `public/index.html` spells it. */
const APPLICATION_NAME_RE = /<meta\s+name="application-name"\s+content="([^"]*)"/i;

/** The script tag the development server adds to the page; a build names hashed chunks instead. */
const DEV_BUNDLE_RE = /<script[^>]+src="[^"]*\/static\/js\/bundle\.js"/i;

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/* ------------------------------------------------------------------ *
 * The side that holds the port: `react-scripts start`
 * ------------------------------------------------------------------ */

/**
 * Stops this process the way Ctrl+C does: CRA's own `SIGTERM` handler closes
 * the dev server and exits. Emitted rather than sent, because on Windows a
 * signal sent to a process ends it without running any handler.
 */
function stopThisProcess() {
  if (process.listenerCount('SIGTERM') > 0) process.emit('SIGTERM');
  setTimeout(() => process.exit(0), 1000).unref();
}

/**
 * Mounts `GET /__web/identity` and `POST /__web/shutdown` on the dev server's
 * Express app. `src/setupProxy.js` calls it; CRA loads that file into
 * `react-scripts start` only, so a build never carries these routes.
 *
 * @param {import('express').Application} app
 * @param {object} options
 * @param {string} options.root the checkout
 * @param {(message: string) => void} [options.log]
 * @param {() => void} [options.stop] how the process ends; the tests pass their own
 */
function mountControlRoutes(app, { root, log = console.warn, stop = stopThisProcess }) {
  const startedAt = new Date().toISOString();
  const routes = controlRoutes({
    basePath: CONTROL_PATH,
    takeoverHeader: TAKEOVER_HEADER,
    refusal: 'Only an `npm run dev` starting on this machine may stop this web dev server.',
    identity: () => ({ app: APP_ID, pid: process.pid, root, startedAt }),
    onShutdown: (requester) => {
      const who = requester?.pid ? ` (pid ${requester.pid})` : '';
      log(
        `A newer \`npm run dev\`${who} is taking this port over; this web dev server is stopping.`
      );
      stop();
    },
  });
  app.use((req, res, next) => (routes.handles(req.url) ? routes(req, res) : next()));
}

/* ------------------------------------------------------------------ *
 * The side that wants the port: `npm run dev`
 * ------------------------------------------------------------------ */

/**
 * The port and host `react-scripts start` will use: `PORT` and `HOST` from the
 * environment, else from the env files a development server loads, the first
 * file that sets a key winning.
 *
 * @param {{root: string, env?: NodeJS.ProcessEnv}} options
 * @returns {{port: number, host: string}}
 */
function devServerAddress({ root, env = process.env }) {
  const files = DEV_ENV_FILES.map((name) => path.join(root, name))
    .filter((file) => fs.existsSync(file))
    .map((file) => parseEnvFile(fs.readFileSync(file, 'utf8')));
  const read = (key) => {
    if (env[key] !== undefined && env[key] !== '') return env[key];
    return files.find((values) => values[key] !== undefined && values[key] !== '')?.[key];
  };
  return {
    port: Number.parseInt(read('PORT'), 10) || 3000,
    host: read('HOST') || '0.0.0.0',
  };
}

/** Whether a listen on `host` succeeds: `ENOTFOUND` counts as free, as it does for CRA. */
function canListen(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (error) => {
      server.close();
      resolve(error.code === 'ENOTFOUND');
    });
    server.listen(port, host, () => {
      server.close(() => resolve(true));
    });
  });
}

/**
 * Whether the port is free the way `react-scripts start` decides it
 * (`detect-port-alt`): a listen succeeds on the configured host, on the
 * default one and on `localhost`.
 *
 * @param {number} port
 * @param {string} host
 * @returns {Promise<boolean>}
 */
async function isPortFree(port, host) {
  for (const candidate of [host, undefined, 'localhost']) {
    if (!(await canListen(port, candidate))) return false;
  }
  return true;
}

/**
 * The application name a page declares, or `null`.
 *
 * @param {string|null|undefined} html
 * @returns {string|null}
 */
function applicationNameOf(html) {
  return APPLICATION_NAME_RE.exec(String(html ?? ''))?.[1] ?? null;
}

/**
 * Whether a page is this site as the development server serves it: the
 * application name of the checkout's `public/index.html`, and the development
 * bundle — a build of the site (`serve -s build`) names hashed chunks instead,
 * and another Create React App project another name.
 *
 * @param {string|null|undefined} html
 * @param {string|null} siteName `applicationNameOf(public/index.html)`
 * @returns {boolean}
 */
function isSiteDevPage(html, siteName) {
  if (!siteName) return false;
  return applicationNameOf(html) === siteName && DEV_BUNDLE_RE.test(String(html ?? ''));
}

/** A path as a command line may spell it: one `/` between parts, any case, no trailing separator. */
const comparable = (value) =>
  String(value ?? '')
    .replace(/[\\/]+/g, '/')
    .replace(/\/$/, '')
    .toLowerCase();

/**
 * Whether a command line runs the `react-scripts` installed in this checkout.
 *
 * @param {string} command
 * @param {string} root
 * @returns {boolean}
 */
function namesCheckout(command, root) {
  if (!root) return false;
  return comparable(command).includes(`${comparable(root)}/node_modules/react-scripts/`);
}

/**
 * Whether the process that listens on the port is this project's web dev
 * server from before the control routes, and may therefore be stopped.
 *
 * @param {object} facts
 * @param {string|null} facts.command its command line, `null` when unreadable
 * @param {string|null} [facts.image] its executable's name, read only when the command line is not
 * @param {boolean} facts.servesSite whether the port serves this site's development page
 * @param {string} facts.root this checkout
 * @returns {boolean}
 */
function isLeftoverDevServer({ command, image = null, servesSite, root }) {
  if (command) {
    return DEV_SERVER_COMMAND_RE.test(command) && (servesSite || namesCheckout(command, root));
  }
  return servesSite && Boolean(image && NODE_RE.test(image));
}

/**
 * Makes the port free for a new web dev server, stopping the one this project
 * left running there.
 *
 * @param {object} options
 * @param {number} options.port
 * @param {string} options.host
 * @param {string} options.root this checkout
 * @param {object} [options.deps] injectable for the tests: `isPortFree`,
 *   `exchange`, `listeningPids`, `commandLineOf`, `imageNameOf`, `kill`, `pid`,
 *   `siteName`, `sleep`, `now`, `releaseTimeoutMs`
 * @returns {Promise<{outcome: 'free'|'stopped'|'stuck'|'foreign'|'unknown', pid?: number|null,
 *   root?: string, command?: string|null, devServer?: boolean}>}
 *   `free` — nothing held it; `stopped` — this project's dev server gave it up;
 *   `stuck` — that server holds it and could not be stopped; `foreign` — a
 *   program that is not this project's dev server holds it (`devServer` when
 *   it is another project's `react-scripts start`); `unknown` — it is held, but
 *   by no process that could be looked up
 */
async function claimWebPort({ port, host, root, deps = {} }) {
  const {
    isPortFree: portIsFree = isPortFree,
    exchange: ask = exchange,
    listeningPids: findPids = listeningPids,
    commandLineOf: readCommand = commandLineOf,
    imageNameOf: readImage = imageNameOf,
    kill = (pid) => process.kill(pid, 'SIGTERM'),
    pid: ownPid = process.pid,
    siteName = readSiteName(root),
    sleep: wait = sleep,
    now = Date.now,
    releaseTimeoutMs = RELEASE_TIMEOUT_MS,
  } = deps;

  if (await portIsFree(port, host)) return { outcome: 'free' };

  const waitForRelease = async (stopped) => {
    const deadline = now() + releaseTimeoutMs;
    while (now() < deadline) {
      await wait(200);
      if (await portIsFree(port, host)) return { outcome: 'stopped', ...stopped };
    }
    return { outcome: 'stuck', ...stopped };
  };

  // A dev server bound to `localhost` may answer on either loopback address.
  let base = null;
  let identity = null;
  for (const candidate of [`http://127.0.0.1:${port}`, `http://[::1]:${port}`]) {
    identity = await ask(`${candidate}${CONTROL_PATH}/identity`);
    if (identity) {
      base = candidate;
      break;
    }
  }

  const holder = identity?.status === 200 ? identity.body?.data : null;
  if (holder?.app === APP_ID) {
    const stop = await ask(`${base}${CONTROL_PATH}/shutdown`, {
      method: 'POST',
      headers: { [TAKEOVER_HEADER]: '1' },
      body: { pid: ownPid },
    });
    const stopped = { pid: holder.pid ?? null, root: holder.root };
    return stop?.status === 202 ? waitForRelease(stopped) : { outcome: 'stuck', ...stopped };
  }

  // A dev server from before the control routes cannot be asked: find its process.
  const page = base
    ? await ask(`${base}/`, { headers: { Accept: 'text/html' }, timeoutMs: 5000 })
    : null;
  const servesSite = isSiteDevPage(page?.text, siteName);

  const pids = (await findPids(port)).filter((candidate) => candidate !== ownPid);
  if (pids.length === 0) return { outcome: 'unknown' };

  let first = null;
  for (const candidate of pids) {
    const command = await readCommand(candidate);
    const image = command ? null : await readImage(candidate);
    if (!first) first = { pid: candidate, command };
    if (!isLeftoverDevServer({ command, image, servesSite, root })) continue;
    try {
      kill(candidate);
    } catch {
      return { outcome: 'stuck', pid: candidate };
    }
    return waitForRelease({ pid: candidate });
  }
  return {
    outcome: 'foreign',
    pid: first.pid,
    command: first.command,
    devServer: Boolean(first.command && DEV_SERVER_COMMAND_RE.test(first.command)),
  };
}

/** The application name of the checkout's `public/index.html`, or `null`. */
function readSiteName(root) {
  try {
    return applicationNameOf(fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8'));
  } catch {
    return null;
  }
}

/** How to stop a process by hand, on every platform the project is developed on. */
const stopCommands = (pid) =>
  `\`kill ${pid}\` on macOS/Linux, \`Stop-Process -Id ${pid}\` in PowerShell`;

/**
 * What `claim-web-port.js` prints for a claim, and how it exits. Only a port
 * held by something `npm run dev` must not stop fails; a port that is held by
 * no process that could be looked up is left to `react-scripts start` to
 * report, as before.
 *
 * @param {Awaited<ReturnType<typeof claimWebPort>>} result
 * @param {{port: number, root?: string}} context
 * @returns {{exitCode: 0|1, level: 'info'|'warn'|'error'|null, message: string|null}}
 */
function describeClaim(result, { port, root } = {}) {
  const pid = result.pid ? ` (pid ${result.pid})` : '';
  switch (result.outcome) {
    case 'free':
      return { exitCode: 0, level: null, message: null };
    case 'stopped': {
      const details = [
        result.pid ? `pid ${result.pid}` : null,
        result.root && root && comparable(result.root) !== comparable(root)
          ? `from ${result.root}`
          : null,
      ].filter(Boolean);
      return {
        exitCode: 0,
        level: 'info',
        message:
          `Stopped an older web dev server${details.length ? ` (${details.join(', ')})` : ''} ` +
          `that was still answering on port ${port}. The new one starts now.`,
      };
    }
    case 'stuck':
      return {
        exitCode: 1,
        level: 'error',
        message:
          `Port ${port} is held by an older web dev server of this project${pid} that could not ` +
          `be stopped automatically. Stop it${result.pid ? ` (${stopCommands(result.pid)})` : ''}, ` +
          'then run `npm run dev` again.',
      };
    case 'foreign': {
      const what = result.devServer
        ? "another project's Create React App dev server"
        : "a program that is not this project's web dev server";
      const command = result.command ? `: ${result.command}` : '';
      return {
        exitCode: 1,
        level: 'error',
        message:
          `Port ${port} is in use by ${what}` +
          `${result.pid ? ` (pid ${result.pid}${command})` : ''}, and the web dev server needs ` +
          `it. Stop that program${result.pid ? ` (${stopCommands(result.pid)})` : ''}, then ` +
          'run `npm run dev` again.',
      };
    }
    default:
      return {
        exitCode: 0,
        level: 'warn',
        message:
          `Port ${port} is in use, and what holds it could not be looked up. If the web dev ` +
          `server says "Something is already running on port ${port}.", stop the program on ` +
          'that port (README → Troubleshooting), then run `npm run dev` again.',
      };
  }
}

module.exports = {
  APP_ID,
  CONTROL_PATH,
  TAKEOVER_HEADER,
  DEV_ENV_FILES,
  DEV_SERVER_COMMAND_RE,
  applicationNameOf,
  claimWebPort,
  describeClaim,
  devServerAddress,
  isLeftoverDevServer,
  isPortFree,
  isSiteDevPage,
  mountControlRoutes,
  namesCheckout,
};
