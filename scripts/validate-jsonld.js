#!/usr/bin/env node
/**
 * Does every public page publish a head a search engine can use? (prompt 38 §4.7)
 *
 *   npm run dev            # in one terminal
 *   npm run check:jsonld   # in another
 *
 * It walks the sitemaps the API serves — the same list Search Console will —
 * and checks each URL for the things that decide whether a page can produce a
 * rich result at all: a `<title>` and a description that no other page on the
 * site already has, a canonical, valid JSON-LD with known types, absolute URLs
 * and ISO dates, exactly one `<h1>`, and an `alt` on every image.
 *
 * **Two ways to look.** With `CHROME_PATH` set it opens each URL in Chrome and
 * reads the head the browser actually built — the honest check, and the only
 * one that can see an `<h1>` or an `<img>`. Without Chrome it asks the API for
 * the records behind those URLs and resolves them through the same modules the
 * browser runs (`scripts/lib/renderJsonLd.js`), which catches every data
 * problem and no rendering problem. The report says which path it took.
 *
 *   node scripts/validate-jsonld.js --baseUrl=http://localhost:3000
 *   node scripts/validate-jsonld.js --apiUrl=http://localhost:4000/api --limit=20
 *
 * Exits non-zero on the first error class it finds; warnings do not fail it.
 */

const { renderHead, routeFor } = require('./lib/renderJsonLd');
const schema = require('../src/seo/schema');

/* ------------------------------------------------------------------ *
 * Arguments
 * ------------------------------------------------------------------ */

const DEFAULTS = {
  baseUrl: 'http://localhost:3000',
  apiUrl: 'http://localhost:4000/api',
  limit: 0,
  verbose: false,
};

/** `--key=value` and bare `--flag`, with the documented defaults underneath. */
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

/* ------------------------------------------------------------------ *
 * Reporting
 * ------------------------------------------------------------------ */

const errors = [];
const warnings = [];

const fail = (url, message) => errors.push({ url, message });
const warn = (url, message) => warnings.push({ url, message });

/**
 * The character guides of §9.1 — what fits in a result before Google truncates
 * it. Being outside them is a warning rather than an error: a 62-character
 * title is a shorter snippet, not a broken page.
 */
const TITLE_CHARS = { min: 30, max: 60 };
const DESCRIPTION_CHARS = { min: 70, max: 160 };

/* ------------------------------------------------------------------ *
 * The sitemaps
 * ------------------------------------------------------------------ */

/** Every `<loc>` of an XML document, in order. */
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

/**
 * Every URL the site says it has: the index, then each child sitemap.
 *
 * @returns {Promise<string[]>} absolute URLs, de-duplicated, in sitemap order
 */
async function sitemapUrls() {
  const index = await text(`${options.apiUrl}/sitemap.xml`);
  const children = locations(index);

  const all = [];
  for (const child of children) {
    // The documents carry production URLs; the child sitemaps are fetched from
    // the API that served the index, whatever hostname is written inside it.
    const path = new URL(child).pathname;
    all.push(...locations(await text(`${options.apiUrl}${path.replace(/^\/api/, '')}`)));
  }

  const unique = [...new Set(all)];
  return options.limit > 0 ? unique.slice(0, options.limit) : unique;
}

/* ------------------------------------------------------------------ *
 * The checks that do not need a browser
 * ------------------------------------------------------------------ */

/** Titles and descriptions already seen, so a duplicate can be named. */
const seenTitles = new Map();
const seenDescriptions = new Map();

/**
 * The checks every page gets, whichever way its head was obtained.
 *
 * `head.descriptionFromRecord === false` means the record stores no description
 * and the page writes one when it renders — a tag archive, a job, a listing.
 * The Node path cannot see that string, so it says so once and judges neither
 * its length nor its uniqueness; the Chrome path always can, and always does.
 *
 * @param {string} url
 * @param {{title?: string, description?: string, canonical?: string, robots?: string,
 *   descriptionFromRecord?: boolean, graph?: object}} head
 */
function checkHead(url, head) {
  const composed = head.descriptionFromRecord === false;

  if (!head.title) fail(url, 'No <title>.');
  if (!head.description) fail(url, 'No meta description.');
  if (!head.canonical) fail(url, 'No canonical link.');

  const indexable = !/noindex/i.test(head.robots ?? '');

  // Two pages competing for the same query with the same words is the most
  // common SEO defect there is — but only between pages that are both indexed.
  if (indexable && head.title) {
    const first = seenTitles.get(head.title);
    if (first) fail(url, `Title is identical to ${first}.`);
    else seenTitles.set(head.title, url);
  }
  if (indexable && head.description && !composed) {
    const first = seenDescriptions.get(head.description);
    if (first) fail(url, `Meta description is identical to ${first}.`);
    else seenDescriptions.set(head.description, url);
  }
  if (composed) {
    warn(url, 'The record stores no description; the page writes one. Use CHROME_PATH to read it.');
  }

  if (head.title && head.title.length > TITLE_CHARS.max) {
    warn(url, `Title is ${head.title.length} characters; Google shows about ${TITLE_CHARS.max}.`);
  }
  if (head.title && head.title.length < TITLE_CHARS.min) {
    warn(url, `Title is only ${head.title.length} characters.`);
  }
  if (!composed && head.description && head.description.length > DESCRIPTION_CHARS.max) {
    warn(
      url,
      `Meta description is ${head.description.length} characters; Google shows about ${DESCRIPTION_CHARS.max}.`
    );
  }
  if (!composed && head.description && head.description.length < DESCRIPTION_CHARS.min) {
    warn(url, `Meta description is only ${head.description.length} characters.`);
  }

  if (!head.graph) {
    fail(url, 'No JSON-LD on the page.');
    return;
  }
  if (head.graph['@context'] !== 'https://schema.org') {
    fail(url, `JSON-LD @context is “${head.graph['@context']}”, not https://schema.org.`);
  }
  if (!Array.isArray(head.graph['@graph'])) {
    fail(url, 'JSON-LD has no @graph array.');
    return;
  }
  if (head.graph['@graph'].length === 0) fail(url, 'JSON-LD @graph is empty.');

  const { valid, errors: graphErrors } = schema.validateGraph(head.graph);
  if (!valid) {
    for (const error of graphErrors) {
      fail(url, `JSON-LD ${error.path || '(root)'}: ${error.message}`);
    }
  }
}

/* ------------------------------------------------------------------ *
 * The Node path: the records behind the URLs
 * ------------------------------------------------------------------ */

/** The master data the title templates and the graphs resolve against. */
async function loadContext() {
  const [seoSettings, localities, cities, propertyTypes, developers, amenities] = await Promise.all(
    [
      json(`${options.apiUrl}/seo/settings`),
      json(`${options.apiUrl}/localities?perPage=100`),
      json(`${options.apiUrl}/cities?perPage=100`),
      json(`${options.apiUrl}/property-types?perPage=100`),
      json(`${options.apiUrl}/developers?perPage=100`),
      json(`${options.apiUrl}/amenities?perPage=100`),
    ]
  );

  if (!seoSettings) throw new Error(`GET ${options.apiUrl}/seo/settings did not answer.`);
  return {
    seoSettings,
    context: { localities, cities, propertyTypes, developers, amenities },
  };
}

/** One record, by the slug in its public URL. */
async function recordFor(route) {
  if (!route.resource || !route.slug) return null;
  return json(`${options.apiUrl}/${route.resource}/slug/${encodeURIComponent(route.slug)}`);
}

async function runWithoutChrome(urls) {
  const { seoSettings, context } = await loadContext();
  let checked = 0;
  let skipped = 0;

  for (const url of urls) {
    const pathname = new URL(url).pathname;
    const route = routeFor(pathname);

    // A listing route — `/properties`, `/buy`, `/buy/ready-to-move` — is a
    // route rather than a record: its head is assembled from the filters in
    // play and the count the API answered with, neither of which exists
    // outside a rendered page. Judging it from here would be judging something
    // the site never publishes. Everything with a record behind it, the three
    // archives included, is checked.
    if (!route.resource || !route.slug) {
      skipped += 1;
      continue;
    }

    const entity = await recordFor(route);
    if (!entity) {
      fail(
        url,
        `The sitemap lists this URL but GET /${route.resource}/slug/${route.slug} is empty.`
      );
      continue;
    }

    checkHead(url, renderHead({ pathname, entity, type: route.type, seoSettings, context }));
    checked += 1;
    if (options.verbose) console.log(`ok   ${pathname}`);
  }

  if (skipped > 0) {
    console.log(`${skipped} route(s) with no record behind them skipped; they need a browser.`);
  }
  return checked;
}

/* ------------------------------------------------------------------ *
 * The Chrome path: the head the browser actually built
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

/** The head, the headings and the images of one rendered page. */
const READ_PAGE = `(() => {
  const script = document.querySelector('script[type="application/ld+json"]');
  const meta = (selector) => document.head.querySelector(selector)?.getAttribute('content') ?? '';
  let graph = null;
  try { graph = script ? JSON.parse(script.textContent) : null; } catch { graph = 'invalid'; }
  return {
    title: document.title,
    description: meta('meta[name="description"]'),
    robots: meta('meta[name="robots"]'),
    canonical: document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '',
    scripts: document.head.querySelectorAll('script[type="application/ld+json"]').length,
    h1: [...document.querySelectorAll('h1')].map((node) => node.textContent.trim()),
    imagesWithoutAlt: [...document.querySelectorAll('img')]
      .filter((img) => img.getAttribute('alt') === null)
      .map((img) => img.getAttribute('src') ?? '(no src)'),
    graph,
  };
})()`;

async function runWithChrome(urls) {
  const puppeteer = require('puppeteer-core');
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  let checked = 0;
  try {
    const page = await browser.newPage();
    for (const url of urls) {
      // The sitemaps carry production URLs; the app under test is wherever
      // `--baseUrl` says it is.
      const target = `${options.baseUrl}${new URL(url).pathname}`;
      await page.goto(target, { waitUntil: 'networkidle0', timeout: 30000 });
      try {
        await waitForHead(page);
      } catch {
        fail(url, 'No canonical or JSON-LD appeared within 30s — the page never rendered a head.');
        continue;
      }

      const read = await page.evaluate(READ_PAGE);

      if (read.graph === 'invalid') {
        fail(url, 'The JSON-LD block is not valid JSON.');
        continue;
      }
      if (read.scripts > 1) {
        fail(url, `${read.scripts} JSON-LD scripts; §9.3 asks for one @graph.`);
      }

      checkHead(url, read);

      // §9.7: one `<h1>` per page, from the entity's title.
      if (read.h1.length === 0) fail(url, 'No <h1>.');
      if (read.h1.length > 1) fail(url, `${read.h1.length} <h1> elements: ${read.h1.join(' | ')}.`);

      for (const src of read.imagesWithoutAlt) {
        fail(url, `<img> without an alt attribute: ${src}`);
      }

      checked += 1;
      if (options.verbose) console.log(`ok   ${target}`);
    }
  } finally {
    await browser.close();
  }

  return checked;
}

/* ------------------------------------------------------------------ *
 * Run
 * ------------------------------------------------------------------ */

async function main() {
  const urls = await sitemapUrls();
  if (urls.length === 0) throw new Error('The sitemaps list no URLs at all.');

  const withChrome = Boolean(process.env.CHROME_PATH);
  console.log(
    `Validating ${urls.length} URL(s) from ${options.apiUrl}/sitemap.xml ` +
      `${withChrome ? `through Chrome at ${options.baseUrl}` : 'through the Node adapter (no CHROME_PATH)'}.`
  );

  const checked = withChrome ? await runWithChrome(urls) : await runWithoutChrome(urls);

  if (!withChrome) {
    console.log(
      'rendered-page checks skipped (no CHROME_PATH): one <h1> per page and <img alt> ' +
        'need a browser. Set CHROME_PATH to include them.'
    );
  }

  for (const warning of warnings) console.log(`warn ${warning.url}\n     ${warning.message}`);
  for (const error of errors) console.error(`FAIL ${error.url}\n     ${error.message}`);

  console.log(
    `\n${checked} page(s) checked — ${errors.length} error(s), ${warnings.length} warning(s).`
  );
  if (errors.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`check:jsonld could not run: ${error.message}`);
  process.exitCode = 1;
});
