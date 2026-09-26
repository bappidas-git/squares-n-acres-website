#!/usr/bin/env node
/**
 * postbuild — makes `build/robots.txt` right for the layout the build is for
 * (prompt 51). npm runs it after `npm run build` (`postbuild`) and after
 * `npm run build:ci` (`postbuild:ci`).
 *
 * The committed `public/robots.txt` is a development placeholder, and it must
 * not reach a crawler: whatever host serves the site, the admin-edited robots
 * text (`seoSettings.robotsTxt`, served by the API) is the one that counts.
 *
 *   REACT_APP_API_URL unset    nothing to decide against — a fresh clone, or
 *                              `check:all`: build/robots.txt stays as committed
 *   one origin (layout A)      the API serves /robots.txt as a route on the
 *                              site's own host, and a file under Laravel's
 *                              `public/` is served before any route (Apache and
 *                              Nginx both) — so build/robots.txt is deleted
 *   two origins (layout B)     the static host has to serve a file: the API's
 *                              `${API}/robots.txt` is fetched (5 s) and written
 *                              with every `Sitemap:` line moved to the API's
 *                              origin, its own path kept, repeats dropped — the
 *                              sitemaps live on the API host. When the fetch
 *                              fails, the seed's default (`db.json` →
 *                              `seoSettings.robotsTxt`) is written instead, with
 *                              `%siteurl%` resolved, the same `Sitemap:` rule
 *                              and a `Sitemap: ${API}/sitemap.xml` line — and a
 *                              warning, because it is not the admin's text.
 *
 * The two addresses are read the way the build reads them: the environment
 * first, then `.env.production.local`, `.env.local`, `.env.production` and
 * `.env`, the first file that sets a key winning. `public/robots.txt` is never
 * touched, and a missing `build/` is a message, not a failure.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/** The env files a production build reads, most important first (CRA's order). */
const ENV_FILES = ['.env.production.local', '.env.local', '.env.production', '.env'];

/** How long the API's robots.txt may take. */
const FETCH_TIMEOUT_MS = 5000;

/**
 * The `KEY=value` pairs of one env file: `#` comments, `export` prefixes and
 * quoted values understood, as dotenv reads them.
 *
 * @param {string} text
 * @returns {Record<string, string>}
 */
function parseEnvFile(text) {
  const values = {};
  for (const raw of String(text ?? '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, rest] = match;
    let value = rest;
    const quoted = value.match(/^(['"])(.*)\1$/);
    if (quoted) value = quoted[2];
    else value = value.replace(/\s+#.*$/, '').trim();
    values[key] = value;
  }
  return values;
}

/**
 * The value a production build would see for each key.
 *
 * @param {string[]} keys
 * @param {{root?: string, env?: NodeJS.ProcessEnv}} [options]
 * @returns {Record<string, string|undefined>}
 */
function readBuildEnv(keys, { root = ROOT, env = process.env } = {}) {
  const files = ENV_FILES.map((name) => path.join(root, name))
    .filter((file) => fs.existsSync(file))
    .map((file) => parseEnvFile(fs.readFileSync(file, 'utf8')));

  return Object.fromEntries(
    keys.map((key) => {
      if (env[key] !== undefined && env[key] !== '') return [key, env[key]];
      const found = files.find((values) => values[key] !== undefined && values[key] !== '');
      return [key, found ? found[key] : undefined];
    })
  );
}

/**
 * `https://api.example.com` for any http(s) address, or `null`.
 *
 * @param {string|undefined} url
 * @returns {string|null}
 */
function originOf(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.origin : null;
  } catch {
    return null;
  }
}

/** The line a `Sitemap:` directive names, or `null` for any other line. */
const sitemapTarget = (line) => {
  const match = line.match(/^\s*sitemap\s*:\s*(\S+)\s*$/i);
  return match ? match[1] : null;
};

/**
 * Every `Sitemap:` line moved to `apiOrigin`, its own path and query kept, and
 * a line naming an address already named dropped; the other lines untouched.
 *
 * @param {string} text a robots.txt
 * @param {string} apiOrigin
 * @param {string[]} [extra] `Sitemap:` targets to add when missing
 * @returns {string} the document, ending in one newline
 */
function rewriteSitemapLines(text, apiOrigin, extra = []) {
  const seen = new Set();
  const lines = [];

  const addSitemap = (target) => {
    let url;
    try {
      url = new URL(target, `${apiOrigin}/`);
    } catch {
      return;
    }
    const moved = `${apiOrigin}${url.pathname}${url.search}`;
    if (seen.has(moved)) return;
    seen.add(moved);
    lines.push(`Sitemap: ${moved}`);
  };

  for (const line of String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')) {
    const target = sitemapTarget(line);
    if (target) addSitemap(target);
    else lines.push(line.replace(/\s+$/, ''));
  }
  for (const target of extra) addSitemap(target);

  return `${lines.join('\n').replace(/\s+$/, '')}\n`;
}

/**
 * The seed's robots.txt — `db.json` → `seoSettings.robotsTxt`, the text
 * "Restore recommended" writes — with `%siteurl%` resolved.
 *
 * @param {{root?: string, siteUrl?: string}} options
 * @returns {string}
 */
function defaultRobots({ root = ROOT, siteUrl = '' } = {}) {
  const seed = JSON.parse(fs.readFileSync(path.join(root, 'db.json'), 'utf8'));
  const text = String(seed?.seoSettings?.robotsTxt ?? 'User-agent: *\nDisallow: /admin\n');
  return text.replace(/%siteurl%/gi, String(siteUrl).replace(/\/+$/, ''));
}

/**
 * The API's own robots.txt, or `null` when it could not be read.
 *
 * @param {string} apiUrl
 * @param {typeof fetch} fetchImpl
 * @returns {Promise<{text: string|null, reason: string|null}>}
 */
async function fetchRobots(apiUrl, fetchImpl) {
  const target = `${apiUrl.replace(/\/+$/, '')}/robots.txt`;
  try {
    const response = await fetchImpl(target, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!response.ok) return { text: null, reason: `${target} answered ${response.status}` };
    const text = await response.text();
    if (!/user-agent\s*:/i.test(text)) {
      return { text: null, reason: `${target} did not answer with a robots.txt` };
    }
    return { text, reason: null };
  } catch (error) {
    return { text: null, reason: `${target} could not be reached (${error.message})` };
  }
}

/**
 * Decides and does it.
 *
 * @param {object} [options]
 * @param {string} [options.root] the repository
 * @param {NodeJS.ProcessEnv} [options.env]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {(message: string) => void} [options.log]
 * @param {(message: string) => void} [options.warn]
 * @returns {Promise<'unset'|'no-build'|'deleted'|'absent'|'written'|'fallback'>} what it did
 */
async function run({
  root = ROOT,
  env = process.env,
  fetchImpl = fetch,
  log = (message) => console.log(message),
  warn = (message) => console.warn(message),
} = {}) {
  const { REACT_APP_API_URL: apiUrl, REACT_APP_SITE_URL: siteUrl } = readBuildEnv(
    ['REACT_APP_API_URL', 'REACT_APP_SITE_URL'],
    { root, env }
  );

  if (!apiUrl) {
    log('postbuild: REACT_APP_API_URL not set — leaving build/robots.txt as committed');
    return 'unset';
  }

  const buildDir = path.join(root, 'build');
  if (!fs.existsSync(buildDir)) {
    log('postbuild: no build/ folder — run it after `npm run build`; nothing to do');
    return 'no-build';
  }
  const target = path.join(buildDir, 'robots.txt');

  const apiOrigin = originOf(apiUrl);
  if (!apiOrigin) {
    warn(`postbuild: REACT_APP_API_URL is not an http(s) address (${apiUrl}) — nothing changed`);
    return 'unset';
  }

  if (apiOrigin === originOf(siteUrl)) {
    if (!fs.existsSync(target)) {
      log('postbuild: one origin — build/robots.txt is already absent');
      return 'absent';
    }
    fs.rmSync(target);
    log(
      `postbuild: the site and the API share ${apiOrigin}, so the API answers /robots.txt ` +
        'as a route — build/robots.txt deleted: Apache (and Nginx) serve a file in the web ' +
        'root before Laravel sees the request, and the placeholder must not deploy'
    );
    return 'deleted';
  }

  const fetched = await fetchRobots(apiUrl, fetchImpl);
  if (fetched.text !== null) {
    fs.writeFileSync(target, rewriteSitemapLines(fetched.text, apiOrigin), 'utf8');
    log(
      `postbuild: build/robots.txt written from ${apiUrl.replace(/\/+$/, '')}/robots.txt, ` +
        `its Sitemap: lines on ${apiOrigin}`
    );
    return 'written';
  }

  const fallback = rewriteSitemapLines(defaultRobots({ root, siteUrl }), apiOrigin, [
    `${apiUrl.replace(/\/+$/, '')}/sitemap.xml`,
  ]);
  fs.writeFileSync(target, fallback, 'utf8');
  warn(
    `postbuild: ${fetched.reason} — wrote the seed's default robots.txt instead, its ` +
      `Sitemap: lines on ${apiOrigin}. Rebuild once the API answers, so the admin's text ships.`
  );
  return 'fallback';
}

if (require.main === module) {
  run().catch((error) => {
    console.error(`postbuild: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  ENV_FILES,
  defaultRobots,
  originOf,
  parseEnvFile,
  readBuildEnv,
  rewriteSitemapLines,
  run,
};
