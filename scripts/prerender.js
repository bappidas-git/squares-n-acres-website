#!/usr/bin/env node
/**
 * Save the rendered HTML of every public URL (§9.9, D16).
 *
 *   npm run mock              # terminal 1 — the crawl reads real records
 *   npm run build:prerender   # terminal 2
 *
 * The site is a single-page app: the HTML a crawler receives is an empty
 * `<div id="root">` and a title, and everything else arrives after React has
 * booted and the API has answered. Google renders JavaScript and sees the real
 * page; a social-card scraper, an LLM crawler, a link preview and a slow phone
 * on a bad connection do not.
 *
 * So this script does what a server-rendered site would have done: it serves
 * the build, opens every URL the sitemaps name in a real Chrome, waits for the
 * page to say it has its data, and writes the result back over the static HTML
 * at that address. `createRoot` is untouched — React re-renders into `#root`
 * on load rather than hydrating, so there is no hydration contract to break
 * and no `ReactDOM.hydrateRoot` anywhere in `src/`.
 *
 * **It is optional, and it is never part of `npm run build`.** `puppeteer-core`
 * downloads no browser, so without `CHROME_PATH` — or a Chrome in one of the
 * usual places — this exits 1 and says what to set, while the ordinary build
 * keeps working on a machine that has no Chrome at all.
 *
 * Options (all have defaults):
 *
 *   --port=5000            the port the build is served on (the mock's CORS
 *                          allow-list, §5.12, is why it is not an arbitrary one)
 *   --mockUrl=…            the API whose sitemaps are the list of URLs
 *   --concurrency=3        pages open at once
 *   --timeout=10000        ms to wait for one page's data
 *   --headTimeout=20000    ms to wait for its head to stop being rewritten
 *   --limit=0              stop after N URLs (0 = all), for a quick look
 *   --keepServer           leave `serve` running afterwards
 *   --verbose              print every URL as it lands
 *
 * Exits non-zero when any page fails.
 */

const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const { describe: describeChrome, launchChrome, requireChrome } = require('./lib/chrome');

/* ------------------------------------------------------------------ *
 * Arguments
 * ------------------------------------------------------------------ */

const DEFAULTS = {
  // 5000, not a free port of its own: §5.12 pins the mock's CORS allow-list to
  // `localhost:3000`, `127.0.0.1:3000` and `localhost:5000`, and the crawl is a
  // browser making real XHRs at the API. Served anywhere else, every page
  // renders its error state and the prerendered HTML is worth nothing. It is
  // the port `serve:build` uses, so the two share one origin — and a server
  // already running there is reused rather than fought over.
  port: 5000,
  mockUrl: process.env.MOCK_URL || 'http://localhost:4000/api',
  concurrency: 3,
  timeout: 10000,
  headTimeout: 20000,
  limit: 0,
  keepServer: false,
  verbose: false,
};

function parseArgs(argv) {
  const options = { ...DEFAULTS };

  for (const argument of argv) {
    const match = /^--([a-zA-Z]+)(?:=(.*))?$/.exec(argument);
    if (!match) continue;
    const [, key, value] = match;
    if (!(key in options)) continue;
    options[key] = value === undefined ? true : value;
  }

  options.port = Number(options.port) || DEFAULTS.port;
  options.concurrency = Math.max(1, Number(options.concurrency) || DEFAULTS.concurrency);
  options.timeout = Number(options.timeout) || DEFAULTS.timeout;
  options.headTimeout = Number(options.headTimeout) || DEFAULTS.headTimeout;
  options.limit = Number(options.limit) || 0;
  options.mockUrl = String(options.mockUrl).replace(/\/+$/, '');
  return options;
}

const options = parseArgs(process.argv.slice(2));

const BUILD_DIR = path.join(__dirname, '..', 'build');
const INDEX_HTML = path.join(BUILD_DIR, 'index.html');
const SPA_FALLBACK = path.join(BUILD_DIR, 'index.spa.html');

/**
 * The URLs no sitemap lists but every visitor sees.
 *
 * The sitemaps carry the records — a property, a locality, an article — and
 * these are the routes those records are reached through: the home page, the
 * six listing indexes with their category pages, the two directories and the
 * two insight indexes. `/shortlist` is deliberately absent: it is `noindex`
 * and it is a different page for every visitor (§9.4).
 */
const STATIC_ROUTES = [
  '/',
  '/properties',
  '/buy',
  '/buy/pre-launch',
  '/buy/under-construction',
  '/buy/ready-to-move',
  '/buy/resale',
  '/rent',
  '/lease',
  '/commercial',
  '/plots',
  '/localities',
  '/builders',
  '/insights/articles',
  '/insights/faqs',
];

/* ------------------------------------------------------------------ *
 * The list of URLs
 * ------------------------------------------------------------------ */

const locations = (xml) =>
  [...String(xml).matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((match) => match[1]);

async function text(url) {
  const response = await fetch(url, { headers: { Accept: '*/*' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.text();
}

/**
 * Every path to prerender: the static routes, then the sitemaps' records.
 *
 * The sitemaps carry production URLs (`https://www.squaresnacres.com/…`), so
 * only the pathname is kept — the build is served from localhost.
 *
 * @returns {Promise<string[]>}
 */
async function collectPaths() {
  let index;
  try {
    index = await text(`${options.mockUrl}/sitemap.xml`);
  } catch (thrown) {
    throw new Error(
      `The mock API did not answer at ${options.mockUrl}/sitemap.xml (${thrown.message}).\n` +
        'Start it with `npm run mock` — the crawl renders real records, so it needs the API.'
    );
  }

  const fromSitemaps = [];
  for (const child of locations(index)) {
    const childPath = new URL(child).pathname.replace(/^\/api/, '');
    fromSitemaps.push(...locations(await text(`${options.mockUrl}${childPath}`)));
  }

  const paths = [
    ...STATIC_ROUTES,
    ...fromSitemaps.map((url) => new URL(url).pathname.replace(/\/+$/, '') || '/'),
  ];

  const unique = [...new Set(paths)];
  return options.limit > 0 ? unique.slice(0, options.limit) : unique;
}

/* ------------------------------------------------------------------ *
 * Serving the build
 * ------------------------------------------------------------------ */

/** The `serve` CLI inside `node_modules`, run with this same Node. */
const SERVE_BIN = path.join(__dirname, '..', 'node_modules', 'serve', 'build', 'main.js');

/**
 * Starts `serve -s build` on `options.port` and waits for it to answer.
 *
 * It is spawned as `node <serve>/build/main.js` rather than through a shell, so
 * there is no quoting to get wrong on Windows and no `npx` reaching for the
 * network (§3.4). When the package is not installed the error says to install
 * it rather than printing a spawn failure.
 *
 * @returns {Promise<import('child_process').ChildProcess>}
 */
async function startServer() {
  // `npm run serve:build` is already on this port in the workflow the docs
  // describe, and two servers cannot bind it. Reusing the one that is there —
  // once it has answered with something that looks like this app — is the
  // difference between the documented workflow working and failing on
  // `EADDRINUSE`.
  try {
    const { body } = await probe();
    if (looksLikeOurBuild(body)) {
      console.log(`Reusing the server already on http://localhost:${options.port}.`);
      return null;
    }
    throw new Error(
      `Something that is not this build is already serving port ${options.port}. ` +
        'Stop it, or pass `--port=<other>` — and add that origin to the mock’s CORS ' +
        'allow-list (§5.12) or every page will render its error state.'
    );
  } catch (thrown) {
    // Nothing listening is the ordinary case: start our own below.
    if (thrown.code !== 'ECONNREFUSED' && !/ECONNREFUSED|timeout/i.test(thrown.message)) {
      throw thrown;
    }
  }

  if (!fs.existsSync(SERVE_BIN)) {
    throw new Error('`serve` is not installed. Run `npm install` first.');
  }

  const child = spawn(process.execPath, [SERVE_BIN, '-s', BUILD_DIR, '-l', String(options.port)], {
    stdio: ['ignore', 'ignore', 'pipe'],
  });

  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += String(chunk);
  });

  const exited = new Promise((_, reject) => {
    child.once('exit', (code) =>
      reject(new Error(`\`serve\` exited with code ${code}. ${stderr.trim()}`))
    );
    child.once('error', reject);
  });

  await Promise.race([waitForServer(), exited]);
  return child;
}

/**
 * Fetches `/` from the port, or rejects.
 *
 * `localhost` rather than `127.0.0.1` throughout: a CORS origin is scheme,
 * host **and** port, and `http://127.0.0.1:5000` is not the
 * `http://localhost:5000` the mock allows (§5.12).
 */
function probe() {
  return new Promise((resolve, reject) => {
    const request = http.get(
      { host: 'localhost', port: options.port, path: '/', timeout: 1000 },
      (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => resolve({ status: response.statusCode, body }));
      }
    );
    request.on('timeout', () => request.destroy(new Error('timeout')));
    request.on('error', reject);
  });
}

/** Whether what answered on the port is this build's app shell. */
function looksLikeOurBuild(body) {
  return String(body).includes('id="root"');
}

/** Polls the server until it answers, for up to fifteen seconds. */
function waitForServer() {
  const deadline = Date.now() + 15000;

  const poll = async () => {
    try {
      await probe();
    } catch (thrown) {
      if (Date.now() > deadline) {
        throw new Error(`The build was not served on port ${options.port}: ${thrown.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
      await poll();
    }
  };

  return poll();
}

/* ------------------------------------------------------------------ *
 * Rendering one page
 * ------------------------------------------------------------------ */

/**
 * Removes the third-party tags from the page before it is saved.
 *
 * `AnalyticsScripts` injects whatever `siteSettings.integrations` configures
 * after the page has loaded, and a saved copy of a tag manager's loader is a
 * container that runs twice — once from the HTML and once when the app mounts
 * and injects it again. The prerendered HTML carries the markup, never the
 * measurement.
 *
 * It runs in the page, on the live DOM, immediately before the capture.
 */
const STRIP_ANALYTICS = `(() => {
  const hosts = ['googletagmanager.com', 'connect.facebook.net', 'facebook.com/tr'];
  const matches = (value) => hosts.some((host) => String(value || '').includes(host));

  document.querySelectorAll('script').forEach((script) => {
    if (matches(script.getAttribute('src')) || matches(script.textContent)) script.remove();
  });
  document.querySelectorAll('noscript').forEach((node) => {
    if (matches(node.textContent) || matches(node.innerHTML)) node.remove();
  });
  document.querySelectorAll('iframe').forEach((frame) => {
    if (matches(frame.getAttribute('src'))) frame.remove();
  });

  return '<!doctype html>\\n' + document.documentElement.outerHTML;
})()`;

/**
 * Where a path's HTML is written.
 *
 * `/` is `build/index.html` — it **replaces** CRA's own, which is why the
 * original is kept as `build/index.spa.html` for the server's rewrite rule
 * (`docs/PERFORMANCE.md`). Everything else becomes a directory with an
 * `index.html` in it, which is the shape every static host serves without
 * configuration.
 */
function outputFileFor(pathname) {
  if (pathname === '/') return INDEX_HTML;

  const segments = pathname
    .split('/')
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));

  // Nothing a sitemap says may write outside `build/`.
  if (segments.some((segment) => segment === '.' || segment === '..' || segment.includes(path.sep)))
    return null;

  return path.join(BUILD_DIR, ...segments, 'index.html');
}

/**
 * Waits until `<Seo>` has actually written the head, and then stopped.
 *
/**
 * Waits until `<Seo>` has actually written the head.
 *
 * `data-prerender-ready` says the page has its record; it does not say Helmet
 * has committed the head that record produces — react-helmet-async batches its
 * DOM writes, and a capture taken between the two saves a page with the static
 * `index.html` title and no canonical at all. The canonical and the JSON-LD
 * are the two things every page emits and no skeleton does, so their arrival
 * is the honest signal — the same one `scripts/check-links.js` waits for.
 *
 * @param {import('puppeteer-core').Page} page
 */
function waitForCanonical(page) {
  return page.waitForFunction(
    () =>
      document.head.querySelector('link[rel="canonical"]') &&
      document.head.querySelector('script[type="application/ld+json"]'),
    // `mutation` rather than puppeteer's default `raf`: what is being waited
    // for *is* a DOM change, and a poll driven by animation frames is the one
    // thing a background tab does not get.
    //
    // `headTimeout`, not `timeout`: the record has already arrived by now, and
    // what is left is the tail of every *other* request the page made — the
    // settings, the master data, the deferred bands the crawl switches all on
    // at once — against a single-threaded mock serving three tabs. The page is
    // not slow; the queue is.
    { polling: 'mutation', timeout: options.headTimeout }
  );
}

/**
 * Waits until the head has stopped moving.
 *
 * Helmet appends its new tags **before** it removes the ones they replace, and
 * a page writes its head more than once: a listing adds its `ItemList` when
 * the grid arrives, an article adds the questions its body carries. Two
 * consecutive polls that agree is the signal that the last write has landed.
 *
 * Its own budget, and a generous one: settling is the tail of every request
 * the page makes, and during a crawl a page makes all of them at once
 * (`utils/prerender.js` switches every deferred section on). Waiting here
 * costs seconds; not waiting costs a saved page with the wrong `<title>`.
 */
function waitForStableHead(page) {
  return page.waitForFunction(
    () => {
      const key = `${document.title}::${document.head.innerHTML.length}`;
      if (window.__snaHeadKey === key) return true;
      window.__snaHeadKey = key;
      return false;
    },
    { polling: 500, timeout: options.headTimeout }
  );
}

/**
 * Opens one path and returns its rendered HTML.
 *
 * The wait is `[data-prerender-ready]`, which `usePrerenderReady` puts on
 * `<main>` once the page's primary query has settled — including when it
 * settled on an error state, so a URL the API cannot answer costs one page
 * rather than the whole timeout. When the attribute never arrives the page is
 * saved anyway and reported as a warning: a listing whose grid is still a
 * skeleton is worth less than a finished one, but it is not worth failing a
 * build over.
 *
 * @param {import('puppeteer-core').Page} page
 * @param {string} pathname
 * @returns {Promise<{html: string, ready: boolean, consoleErrors: string[]}>}
 */
async function render(page, pathname) {
  const consoleErrors = [];
  const onConsole = (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    // "Failed to load resource: net::ERR_…" with nothing else is the network
    // the crawl is running on — a blocked font, a seed photograph behind a
    // proxy — not something the page did. The messages worth reporting (a CORS
    // refusal, a thrown error) carry their own explanation.
    if (/^Failed to load resource: net::/.test(text)) return;
    consoleErrors.push(text);
  };
  const onPageError = (error) => consoleErrors.push(error.message);

  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  try {
    await page.goto(`http://localhost:${options.port}${pathname}`, {
      waitUntil: 'networkidle2',
      timeout: Math.max(options.timeout, 15000),
    });

    // Three waits, reported separately: "the page never said it had its data"
    // and "the head was still being written" are different problems with
    // different fixes, and a warning that does not say which is a warning
    // nobody can act on.
    let waited = '';

    try {
      await page.waitForSelector('[data-prerender-ready]', { timeout: options.timeout });
    } catch {
      waited = 'no [data-prerender-ready] on <main>';
    }

    if (!waited) {
      try {
        await waitForCanonical(page);
      } catch {
        waited = 'no canonical or JSON-LD in the head';
      }
    }

    if (!waited) {
      try {
        await waitForStableHead(page);
      } catch {
        waited = 'the head was still changing';
      }
    }

    const html = await page.evaluate(STRIP_ANALYTICS);
    return { html, ready: !waited, waited, consoleErrors };
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
  }
}

/* ------------------------------------------------------------------ *
 * The crawl
 * ------------------------------------------------------------------ */

/**
 * Renders every path, `options.concurrency` at a time.
 *
 * **One browser per worker, one tab per browser.** Sharing one Chrome between
 * three tabs looks obviously cheaper and does not work: a tab that is not the
 * visible one gets no `requestAnimationFrame` at all, and react-helmet-async
 * commits the head inside a `requestAnimationFrame`. Two of every three pages
 * were saved with the static `index.html` head — not slowly, never — and which
 * two changed on every run, because it depended on which tab Chrome happened
 * to be showing. No throttling flag fixes it: a hidden tab has no frames to
 * throttle. A browser whose only tab is the one being rendered always has
 * them.
 */
async function crawl(browsers, paths) {
  const queue = [...paths];
  /**
   * `file -> html`, written only once the crawl is over.
   *
   * Nothing may be written into `build/` while the crawl is running.
   * `serve -s` answers a path it has no file for with `build/index.html`, so
   * the moment the rendered home page is written there, every URL not yet
   * crawled is served *that* page as its shell — and what gets saved for a
   * property is the home page's head with the property's body under it. It is
   * a silent corruption and it only shows up as a wrong `<title>` in a file
   * nobody reads until a crawler does.
   */
  const captures = new Map();
  const written = [];
  const failures = [];
  const warnings = [];
  let done = 0;

  const worker = async (browser) => {
    const page = await browser.newPage();
    // What tells the app it is being photographed rather than read: every
    // deferred section fetches at once and every fade-up is already in
    // (`src/utils/prerender.js`). It has to be set before the bundle runs.
    await page.evaluateOnNewDocument(() => {
      window.__SNA_PRERENDER__ = true;
    });
    await page.setViewport({ width: 1280, height: 1600 });
    // A counted statistic animates from 0 to its value over ~2 s of animation
    // frames, and a headless crawl does not reliably grant a second one — so
    // every figure on the page was being saved as `0` (NEW-30). `useCountUp`
    // already jumps straight to the end value under `prefers-reduced-motion`,
    // which is exactly the right answer for a snapshot: the HTML a scraper
    // receives should carry the number, not the first frame of a count. A real
    // visitor is unaffected; this emulation exists only inside the crawl.
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);

    try {
      for (;;) {
        const pathname = queue.shift();
        if (pathname === undefined) return;

        const file = outputFileFor(pathname);
        if (!file) {
          failures.push({ pathname, reason: 'The path does not resolve inside `build/`.' });
          continue;
        }

        try {
          let result = await render(page, pathname);

          // One retry, and only for a page whose head never settled. The first
          // pages of a cold crawl pay for the bundle parse and the master-data
          // load in three tabs at once, and 10 s is tight for that; a second
          // pass on a warm browser is the difference between a saved skeleton
          // and a saved page.
          if (!result.ready) result = await render(page, pathname);

          captures.set(file, result.html);
          written.push(pathname);

          if (!result.ready) {
            warnings.push({
              pathname,
              reason: `${result.waited} — saved as it stood.`,
            });
          }
          if (result.consoleErrors.length > 0) {
            warnings.push({ pathname, reason: `Console: ${result.consoleErrors[0]}` });
          }

          done += 1;
          if (options.verbose) {
            console.log(`  ${result.ready ? 'ok  ' : 'warn'} ${pathname}`);
          } else if (done % 10 === 0) {
            console.log(`  ${done}/${paths.length}…`);
          }
        } catch (thrown) {
          failures.push({ pathname, reason: thrown.message });
          done += 1;
        }
      }
    } finally {
      await page.close().catch(() => {});
    }
  };

  await Promise.all(browsers.map(worker));

  return { captures, written, failures, warnings };
}

/* ------------------------------------------------------------------ *
 * Run
 * ------------------------------------------------------------------ */

async function main() {
  // Before anything else: a machine with no Chrome should be told in one line,
  // not after a build has been served and a sitemap fetched.
  requireChrome('the prerender');

  if (!fs.existsSync(INDEX_HTML)) {
    throw new Error('There is no `build/index.html`. Run `npm run build` first.');
  }

  console.log(`Prerendering with ${describeChrome()}.`);

  const paths = await collectPaths();
  console.log(
    `${paths.length} URL(s): ${STATIC_ROUTES.length} static route(s) plus the records in ` +
      `${options.mockUrl}/sitemap.xml.`
  );

  // CRA's own `index.html` is about to be overwritten by the rendered home
  // page, and a static host still needs the empty shell for every URL that was
  // not prerendered (`docs/PERFORMANCE.md` has the Nginx rule). So it is kept
  // as `index.spa.html` — and on a second run over the same build, it is put
  // *back*, because a crawl that starts from a prerendered home page would
  // inherit its markup into every page it saves.
  if (fs.existsSync(SPA_FALLBACK)) {
    fs.copyFileSync(SPA_FALLBACK, INDEX_HTML);
    console.log('Restored the app shell from `build/index.spa.html` for the crawl.');
  } else {
    fs.copyFileSync(INDEX_HTML, SPA_FALLBACK);
    console.log('Kept the app shell as `build/index.spa.html` (see docs/PERFORMANCE.md).');
  }

  const server = await startServer();
  if (server) console.log(`Serving the build on http://localhost:${options.port}.`);

  const workers = Math.max(1, Math.min(options.concurrency, paths.length));
  const browsers = await Promise.all(
    Array.from({ length: workers }, () =>
      launchChrome({
        what: 'the prerender',
        // Belt and braces beside the one-browser-per-worker rule above: these
        // stop Chrome throttling the timers of a window it thinks nobody is
        // looking at.
        args: [
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
        ],
      })
    )
  );
  console.log(`${workers} browser(s), one page each.`);

  let result;
  try {
    result = await crawl(browsers, paths);
  } finally {
    await Promise.all(browsers.map((browser) => browser.close().catch(() => {})));
    if (server && !options.keepServer) server.kill();
  }

  for (const [file, html] of result.captures) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, html);
  }

  console.log(`\nPrerendered ${result.written.length} of ${paths.length} page(s).`);

  if (result.warnings.length > 0) {
    console.log(`\n${result.warnings.length} warning(s):`);
    result.warnings.forEach(({ pathname, reason }) => console.log(`  • ${pathname} — ${reason}`));
  }

  if (result.failures.length > 0) {
    console.error(`\n${result.failures.length} failure(s):`);
    result.failures.forEach(({ pathname, reason }) => console.error(`  • ${pathname} — ${reason}`));
    return 1;
  }

  console.log('\nEvery page was saved.');
  return 0;
}

if (require.main === module) {
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((thrown) => {
      console.error(thrown.message);
      process.exitCode = 1;
    });
}

module.exports = { STATIC_ROUTES, collectPaths, outputFileFor, parseArgs };
