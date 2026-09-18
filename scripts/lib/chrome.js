/**
 * Where Chrome is, and how the scripts that need it start it.
 *
 * Three scripts drive a real browser — `check:links`, `check:jsonld` and the
 * prerender — and all three answered the same question in the same three
 * lines, none of which looked anywhere but `CHROME_PATH`. That is the right
 * default (D16: `puppeteer-core` never downloads a browser, so the path is the
 * contract), but it means a developer with Chrome installed in the ordinary
 * place still has to find it and type it out.
 *
 * So: `CHROME_PATH` wins whenever it is set, and when it is not, the usual
 * install locations of the three platforms are tried in turn. Nothing here
 * downloads anything and nothing here guesses silently — `describe()` says
 * which of the two answers a caller got, and `requireChrome()` prints the one
 * sentence that tells somebody what to set.
 *
 * @module scripts/lib/chrome
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * The places Chrome or Chromium installs itself, per platform.
 *
 * Windows paths are built from the environment rather than hardcoded to
 * `C:\Program Files`, because a 32-bit Chrome on a 64-bit machine lives in the
 * other one and a per-user install lives in neither (§3.4: Windows first).
 */
function candidatePaths(platform = process.platform, env = process.env) {
  if (platform === 'win32') {
    const roots = [
      env.PROGRAMFILES,
      env['PROGRAMFILES(X86)'],
      env.LOCALAPPDATA,
      env.PROGRAMW6432,
    ].filter(Boolean);

    const suffixes = [
      path.join('Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join('Google', 'Chrome Beta', 'Application', 'chrome.exe'),
      path.join('Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join('Chromium', 'Application', 'chrome.exe'),
    ];

    return roots.flatMap((root) => suffixes.map((suffix) => path.join(root, suffix)));
  }

  if (platform === 'darwin') {
    const home = env.HOME || os.homedir();
    const suffixes = [
      path.join('Applications', 'Google Chrome.app', 'Contents', 'MacOS', 'Google Chrome'),
      path.join('Applications', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
      path.join('Applications', 'Microsoft Edge.app', 'Contents', 'MacOS', 'Microsoft Edge'),
    ];

    return [
      ...suffixes.map((suffix) => path.join('/', suffix)),
      ...(home ? suffixes.map((suffix) => path.join(home, suffix)) : []),
    ];
  }

  return [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/usr/bin/microsoft-edge',
  ];
}

/** Whether a path is a file this process may execute. */
function isExecutable(candidate) {
  try {
    if (!fs.statSync(candidate).isFile()) return false;
  } catch {
    return false;
  }

  try {
    fs.accessSync(candidate, fs.constants.X_OK);
    return true;
  } catch {
    // A file that exists but is not marked executable is still worth reporting
    // on Windows, where the bit does not mean what it means elsewhere.
    return process.platform === 'win32';
  }
}

/**
 * The browser executable to use, or `null` when there is none.
 *
 * @param {{ env?: object, platform?: string }} [options] injected by the tests
 * @returns {{ executablePath: string, source: 'CHROME_PATH'|'discovered' }|null}
 */
function findChrome({ env = process.env, platform = process.platform } = {}) {
  const configured = String(env.CHROME_PATH ?? '').trim();

  // An explicit `CHROME_PATH` is an instruction, not a hint: it is returned
  // whether or not this process can stat it, so a typo fails as "Chrome did
  // not start at <path>" rather than silently running a different browser.
  if (configured) return { executablePath: configured, source: 'CHROME_PATH' };

  const found = candidatePaths(platform, env).find(isExecutable);
  return found ? { executablePath: found, source: 'discovered' } : null;
}

/** Whether {@link findChrome} can answer at all — the gate a script skips on. */
function hasChrome(options) {
  return findChrome(options) !== null;
}

/** One line for a log: which browser will run, and how it was chosen. */
function describe(options) {
  const chrome = findChrome(options);
  if (!chrome) return 'no Chrome (set CHROME_PATH)';
  return chrome.source === 'CHROME_PATH'
    ? `Chrome from CHROME_PATH (${chrome.executablePath})`
    : `Chrome found at ${chrome.executablePath}`;
}

/**
 * The message a script prints before giving up.
 *
 * @param {string} what the step that needs a browser, e.g. `'the prerender'`
 */
function missingChromeMessage(what = 'this step') {
  return `Set CHROME_PATH to run ${what} (optional step).`;
}

/**
 * {@link findChrome}, or an `Error` carrying {@link missingChromeMessage}.
 *
 * @param {string} what
 * @param {object} [options]
 * @returns {{ executablePath: string, source: string }}
 */
function requireChrome(what, options) {
  const chrome = findChrome(options);
  if (!chrome) throw new Error(missingChromeMessage(what));
  return chrome;
}

/** The flags every one of our headless runs wants. */
const DEFAULT_ARGS = ['--no-sandbox', '--disable-dev-shm-usage'];

/**
 * A headless browser, launched through `puppeteer-core` (D16).
 *
 * @param {object} [options]
 * @param {string} [options.what] named in the error when no browser is found
 * @param {boolean} [options.headless] `false` to watch it work
 * @param {string[]} [options.args] added to {@link DEFAULT_ARGS}
 * @returns {Promise<import('puppeteer-core').Browser>}
 */
async function launchChrome({ what = 'this step', headless = true, args = [] } = {}) {
  const { executablePath } = requireChrome(what);
  const puppeteer = require('puppeteer-core');

  return puppeteer.launch({
    executablePath,
    // `--headless=new` is Chrome's own modern headless mode: the old one is a
    // different binary shape with different layout behaviour, which is not
    // what we want to measure or prerender.
    headless: headless ? 'new' : false,
    args: [...DEFAULT_ARGS, ...args],
  });
}

module.exports = {
  DEFAULT_ARGS,
  candidatePaths,
  describe,
  findChrome,
  hasChrome,
  launchChrome,
  missingChromeMessage,
  requireChrome,
};
