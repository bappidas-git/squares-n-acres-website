#!/usr/bin/env node
/**
 * Does every link on this site go somewhere? (prompt 38 §4.7)
 *
 *   npm run dev          # in one terminal
 *   npm run check:links  # in another
 *
 * It starts from the sitemaps the API serves — the list the site tells search
 * engines is the site — and checks two different things depending on what it
 * has to work with.
 *
 * **With `CHROME_PATH`** it opens each of those URLs in Chrome, collects every
 * internal `href` on the rendered page, and visits each one once to confirm it
 * renders a page rather than the 404. That is the real check: a broken link in
 * a footer, a CMS block pointing at a slug somebody renamed, a locality card
 * linking to a locality that was deactivated.
 *
 * **Without Chrome** it cannot see a rendered page at all, so it checks the
 * other direction instead: every URL the sitemap claims must have a record
 * behind it on the API. That catches a sitemap that has gone stale — which is
 * the failure a crawler notices first — and it says plainly that the rendered
 * links were not checked.
 *
 *   node scripts/check-links.js --baseUrl=http://localhost:3000 --limit=20
 *
 * Exits non-zero when anything is broken.
 */

const { launchChrome } = require('./lib/chrome');
const { routeFor } = require('./lib/renderJsonLd');

/* ------------------------------------------------------------------ *
 * Arguments
 * ------------------------------------------------------------------ */

const DEFAULTS = {
  baseUrl: 'http://localhost:3000',
  apiUrl: 'http://localhost:4000/api',
  limit: 0,
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

  options.baseUrl = String(options.baseUrl).replace(/\/+$/, '');
  options.apiUrl = String(options.apiUrl).replace(/\/+$/, '');
  options.limit = Number(options.limit) || 0;
  return options;
}

const options = parseArgs(process.argv.slice(2));

/** `{ from, to, reason }` for everything that does not resolve. */
const broken = [];

/* ------------------------------------------------------------------ *
 * The sitemaps
 * ------------------------------------------------------------------ */

const locations = (xml) =>
  [...String(xml).matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((match) => match[1]);

async function text(url) {
  const response = await fetch(url, { headers: { Accept: '*/*' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.text();
}

async function json(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) return null;
  const body = await response.json().catch(() => null);
  return body?.data ?? null;
}

async function sitemapUrls() {
  const index = await text(`${options.apiUrl}/sitemap.xml`);

  const all = [];
  for (const child of locations(index)) {
    const path = new URL(child).pathname.replace(/^\/api/, '');
    all.push(...locations(await text(`${options.apiUrl}${path}`)));
  }

  const unique = [...new Set(all)];
  return options.limit > 0 ? unique.slice(0, options.limit) : unique;
}

/* ------------------------------------------------------------------ *
 * Without Chrome: does every URL in the sitemap still have a record?
 * ------------------------------------------------------------------ */

async function checkSitemapRecords(urls) {
  let checked = 0;

  for (const url of urls) {
    const pathname = new URL(url).pathname;
    const route = routeFor(pathname);

    // A static route — the home page, a listing index — has no record behind
    // it, so there is nothing here to check.
    if (!route.resource || !route.slug) continue;

    const record = await json(
      `${options.apiUrl}/${route.resource}/slug/${encodeURIComponent(route.slug)}`
    );
    if (!record) {
      broken.push({
        from: 'sitemap',
        to: pathname,
        reason: `GET /${route.resource}/slug/${route.slug} answers nothing — the sitemap is stale.`,
      });
    }
    checked += 1;
    if (options.verbose && record) console.log(`ok   ${pathname}`);
  }

  return checked;
}

/* ------------------------------------------------------------------ *
 * With Chrome: does every link on every page render a page?
 * ------------------------------------------------------------------ */

/**
 * Waits until `<Seo>` has actually written the head.
 *
 * `networkidle0` is not that moment: a page fetches its record *after* the
 * bundle has settled, renders a skeleton in the meantime, and only then puts a
 * head on the document. The canonical and the JSON-LD are the two things every
 * page emits and no skeleton does, so their arrival is the honest signal — and
 * one more frame after it lets Helmet finish the commit it schedules.
 */
async function waitForHead(page) {
  await page.waitForFunction(
    () =>
      document.head.querySelector('link[rel="canonical"]') &&
      document.head.querySelector('script[type="application/ld+json"]'),
    { timeout: 30000 }
  );
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve())));
  await waitForStableHead(page);
}

/**
 * Waits until the head has stopped moving.
 *
 * Helmet appends its new tags **before** it removes the ones they replace, and
 * a page writes its head more than once — a listing adds its `ItemList` when
 * the grid arrives. Read in between, a page looks as though it publishes two
 * JSON-LD blocks. Two consecutive polls that agree is the signal that the last
 * write has landed.
 */
async function waitForStableHead(page) {
  await page.waitForFunction(
    () => {
      const key = `${document.title}::${document.head.innerHTML.length}`;
      if (window.__snaHeadKey === key) return true;
      window.__snaHeadKey = key;
      return false;
    },
    { polling: 300, timeout: 30000 }
  );
}

/** Every internal link on the rendered page, and whether it is the 404. */
const READ_PAGE = `(() => ({
  title: document.title,
  h1: document.querySelector('h1')?.textContent?.trim() ?? '',
  links: [...document.querySelectorAll('a[href]')]
    .map((anchor) => anchor.getAttribute('href'))
    .filter((href) => href && href.startsWith('/') && !href.startsWith('//')),
}))()`;

/** A path without its fragment, and without a trailing slash. */
const cleanPath = (href) => {
  const [path] = String(href).split('#');
  const [base, query] = path.split('?');
  const normalised = base.replace(/\/+$/, '') || '/';
  return query ? `${normalised}?${query}` : normalised;
};

/** What the 404 page calls itself — the one string that says "not a page". */
const NOT_FOUND = /page not found|not found/i;

async function checkRenderedLinks(urls) {
  const browser = await launchChrome({ what: 'the rendered-link check' });

  const visited = new Set();
  let checked = 0;

  /** Opens one path and answers what it rendered. */
  const open = async (page, path) => {
    await page.goto(`${options.baseUrl}${path}`, { waitUntil: 'networkidle0', timeout: 30000 });
    await waitForHead(page);
    return page.evaluate(READ_PAGE);
  };

  try {
    const page = await browser.newPage();

    for (const url of urls) {
      const path = new URL(url).pathname;
      const read = await open(page, path);
      checked += 1;

      if (NOT_FOUND.test(read.h1) || NOT_FOUND.test(read.title)) {
        broken.push({ from: 'sitemap', to: path, reason: 'The page renders as a 404.' });
        continue;
      }
      if (options.verbose) console.log(`ok   ${path}`);

      for (const href of new Set(read.links.map(cleanPath))) {
        // The admin panel is behind a sign-in and is not part of the public
        // site (D24); a link to it on a public page would be its own defect,
        // caught by `check:traces`, not a broken link.
        if (href.startsWith('/admin')) continue;
        if (visited.has(href)) continue;
        visited.add(href);

        const target = await open(page, href);
        if (NOT_FOUND.test(target.h1) || NOT_FOUND.test(target.title)) {
          broken.push({ from: path, to: href, reason: 'The link renders as a 404.' });
        } else if (options.verbose) {
          console.log(`ok   ${href}  (linked from ${path})`);
        }
      }
    }
  } finally {
    await browser.close();
  }

  return { checked, links: visited.size };
}

/* ------------------------------------------------------------------ *
 * Run
 * ------------------------------------------------------------------ */

async function main() {
  const urls = await sitemapUrls();
  if (urls.length === 0) throw new Error('The sitemaps list no URLs at all.');

  const withChrome = Boolean(process.env.CHROME_PATH);
  console.log(`Checking ${urls.length} URL(s) from ${options.apiUrl}/sitemap.xml.`);

  if (withChrome) {
    const { checked, links } = await checkRenderedLinks(urls);
    console.log(
      `${checked} page(s) opened at ${options.baseUrl}; ${links} internal link(s) followed.`
    );
  } else {
    const checked = await checkSitemapRecords(urls);
    console.log(`${checked} sitemap URL(s) traced back to a record on the API.`);
    console.log(
      'rendered-link check skipped (no CHROME_PATH): following the links on a page ' +
        'needs a browser. Set CHROME_PATH to include it.'
    );
  }

  for (const entry of broken) {
    console.error(`FAIL ${entry.to}\n     ${entry.reason} (from ${entry.from})`);
  }

  console.log(`\n${broken.length} broken link(s).`);
  if (broken.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`check:links could not run: ${error.message}`);
  process.exitCode = 1;
});
