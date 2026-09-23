#!/usr/bin/env node
/**
 * Do the sitemaps and the site agree about what the site is? (prompt 46 §3)
 *
 *   npm run mock           # in one terminal
 *   npm run serve:build    # in another (or `npm start`)
 *   npm run check:sitemap  # in a third
 *
 * `check:links` proves that every URL the sitemaps list goes somewhere, and
 * `check:jsonld` proves that each of those pages publishes a usable head.
 * Neither can see the other direction: a locality page that nothing lists, an
 * article the builder quietly dropped, a route added in a prompt and never
 * wired into `sitemapBuilder`. A page missing from the sitemaps is not a
 * broken link — it is a page Google is never told about, which is the more
 * expensive kind of mistake because nothing anywhere looks wrong.
 *
 * So this script compares the two sets and fails when they disagree:
 *
 *   missing — the site renders an indexable page that no sitemap lists
 *   extra   — a sitemap lists a URL that 404s or that renders `noindex`
 *
 * **With `CHROME_PATH`** it crawls the running app from `/`, following
 * internal links up to `--depth` (4 by default) and reading the `robots` meta
 * and the canonical each page actually published. That is the honest set: it
 * is what a crawler starting at the home page would find. Every sitemap URL
 * the crawl did not reach is then opened directly, so both directions are
 * covered even for pages nothing links to.
 *
 * **Without Chrome** there is no rendered page to read, so it compares the
 * route table (`src/routes/paths.js`) and the public API — the records a
 * visitor can actually reach — against the sitemaps, and resolves each sitemap
 * URL through the same SEO modules the browser runs to see whether it is
 * indexable. That catches every data-level disagreement and no rendering one.
 *
 *   node scripts/check-sitemap-coverage.js --baseUrl=http://localhost:5000
 *   node scripts/check-sitemap-coverage.js --depth=2 --verbose
 *
 * Exits non-zero when either set has an entry the other does not.
 */

const { hasChrome, launchChrome } = require('./lib/chrome');
const { renderHead, routeFor } = require('./lib/renderJsonLd');
const PATHS = require('../src/routes/paths');
const { segmentKind } = require('../src/config/segments');

/* ------------------------------------------------------------------ *
 * Arguments
 * ------------------------------------------------------------------ */

const DEFAULTS = {
  baseUrl: 'http://localhost:5000',
  apiUrl: 'http://localhost:4000/api',
  depth: 4,
  maxPages: 400,
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
  options.depth = Number(options.depth) || 0;
  options.maxPages = Number(options.maxPages) || DEFAULTS.maxPages;
  return options;
}

const options = parseArgs(process.argv.slice(2));

/** `{ path, reason }` for a page the sitemaps do not list. */
const missing = [];
/** `{ path, reason }` for a URL the sitemaps list but the site does not serve. */
const extra = [];
/** Things worth saying that are not failures. */
const notes = [];

/* ------------------------------------------------------------------ *
 * Paths
 * ------------------------------------------------------------------ */

/** A path with no trailing slash and no fragment; `/` stays `/`. */
const normalise = (value) => {
  const [withoutHash] = String(value ?? '').split('#');
  const [base] = withoutHash.split('?');
  return base.replace(/\/+$/, '') || '/';
};

/** The query string of a path, or `''`. */
const queryOf = (value) => {
  const [, query = ''] = String(value ?? '')
    .split('#')[0]
    .split('?');
  return query;
};

/**
 * Whether a path belongs to the public site.
 *
 * The admin panel is behind a sign-in and is never linked from a public page
 * (D24), so it is not part of the set either side of this comparison.
 */
const isPublic = (path) => path === '/' || !path.startsWith('/admin');

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

/** Every path the sitemap index and its children list, de-duplicated. */
async function sitemapPaths() {
  const index = await text(`${options.apiUrl}/sitemap.xml`);

  const all = [];
  for (const child of locations(index)) {
    const path = new URL(child).pathname.replace(/^\/api/, '');
    all.push(...locations(await text(`${options.apiUrl}${path}`)));
  }

  return new Set(all.map((url) => normalise(new URL(url).pathname)));
}

/* ------------------------------------------------------------------ *
 * With Chrome: what the site renders
 * ------------------------------------------------------------------ */

/**
 * Waits until `<Seo>` has written the head and stopped rewriting it.
 *
 * The same two-step wait `check:links` and `check:jsonld` use: the canonical
 * and the JSON-LD are the two tags no skeleton emits, and two polls that agree
 * mean Helmet has finished the commit it schedules after the data arrives.
 */
async function waitForHead(page) {
  await page.waitForFunction(
    () =>
      document.head.querySelector('link[rel="canonical"]') &&
      document.head.querySelector('script[type="application/ld+json"]'),
    { timeout: 30000 }
  );
  await page.waitForFunction(
    () => {
      const key = `${document.title}::${document.head.innerHTML.length}`;
      if (window.__snaCoverageKey === key) return true;
      window.__snaCoverageKey = key;
      return false;
    },
    { polling: 300, timeout: 30000 }
  );
}

/** What one rendered page says about itself, and where it points next. */
const READ_PAGE = `(() => ({
  title: document.title,
  h1: document.querySelector('h1')?.textContent?.trim() ?? '',
  robots: document.head.querySelector('meta[name="robots"]')?.getAttribute('content') ?? '',
  canonical: document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '',
  links: [...document.querySelectorAll('a[href]')]
    .map((anchor) => anchor.getAttribute('href'))
    .filter((href) => href && href.startsWith('/') && !href.startsWith('//')),
}))()`;

/** What the 404 page calls itself — the one string that says "not a page". */
const NOT_FOUND = /page not found|not found/i;

/**
 * Crawls the app, then opens whatever the crawl missed.
 *
 * @param {Set<string>} listed every path the sitemaps carry
 * @returns {Promise<{indexable: Set<string>, visited: number, parameterised: number}>}
 */
async function readRenderedRoutes(listed) {
  const browser = await launchChrome({ what: 'the sitemap crawl' });

  /** Canonical paths of pages that render and allow indexing. */
  const indexable = new Set();
  /** Every path already opened, so nothing is fetched twice. */
  const seen = new Set();
  let parameterised = 0;
  let visited = 0;

  try {
    const page = await browser.newPage();

    /** Opens one path and records what it published. Returns its links. */
    const open = async (path, depth) => {
      await page.goto(`${options.baseUrl}${path}`, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      try {
        await waitForHead(page);
      } catch {
        // A page that never writes a head cannot be judged indexable, but if a
        // sitemap lists it that is exactly the failure worth reporting.
        if (listed.has(normalise(path))) {
          extra.push({ path: normalise(path), reason: 'The page never rendered a head (30s).' });
        }
        return [];
      }

      const read = await page.evaluate(READ_PAGE);
      visited += 1;

      if (NOT_FOUND.test(read.h1) || NOT_FOUND.test(read.title)) {
        if (listed.has(normalise(path))) {
          extra.push({ path: normalise(path), reason: 'The sitemap lists it; it renders a 404.' });
        }
        return [];
      }

      const allowsIndexing = !/noindex/i.test(read.robots);
      const canonical = read.canonical ? normalise(new URL(read.canonical).pathname) : null;
      const canonicalHasQuery = read.canonical && queryOf(new URL(read.canonical).search) !== '';

      if (allowsIndexing && canonical) {
        // §9.4 lets an index-worthy filter keep its parameters in the
        // canonical. `sitemapBuilder` only ever emits parameterless URLs, so
        // such a page is reported rather than demanded.
        if (canonicalHasQuery) parameterised += 1;
        else indexable.add(canonical);
      }

      if (!allowsIndexing && listed.has(normalise(path))) {
        extra.push({
          path: normalise(path),
          reason: `The sitemap lists it; the page renders robots "${read.robots}".`,
        });
      }

      if (options.verbose) {
        console.log(`  ${allowsIndexing ? 'index ' : 'noindex'} d${depth} ${path}`);
      }

      return read.links;
    };

    // Breadth-first from the home page: the set a crawler that starts at `/`
    // would build for itself.
    let frontier = ['/'];
    seen.add('/');

    for (let depth = 0; depth <= options.depth && frontier.length > 0; depth += 1) {
      const next = [];

      for (const path of frontier) {
        if (seen.size > options.maxPages) break;
        const links = await open(path, depth);
        if (depth === options.depth) continue;

        for (const href of links) {
          const target = normalise(href);
          if (!isPublic(target) || seen.has(target)) continue;
          seen.add(target);
          next.push(target);
        }
      }

      frontier = next;
    }

    // Anything the sitemaps promise that nothing links to still has to render.
    for (const path of listed) {
      if (seen.has(path)) continue;
      seen.add(path);
      await open(path, -1);
    }
  } finally {
    await browser.close();
  }

  return { indexable, visited, parameterised };
}

/* ------------------------------------------------------------------ *
 * Without Chrome: the route table and the public API
 * ------------------------------------------------------------------ */

/**
 * The static public routes that exist whether or not a record backs them.
 *
 * Read from `src/routes/paths.js` rather than restated here, so a route added
 * to the app and forgotten in `sitemapBuilder` shows up as a failure. The
 * builders (`propertyDetails(slug)` and friends) are skipped — their pages
 * come from the API below — and so are the routes that are `noindex` by
 * contract (§9.3), which no sitemap should ever list.
 */
const NEVER_INDEXED = new Set([PATHS.shortlist]);

function staticRoutes() {
  return Object.entries(PATHS)
    .filter(([name, value]) => typeof value === 'string' && !name.startsWith('admin'))
    .map(([, value]) => normalise(value))
    .filter((path) => isPublic(path) && !NEVER_INDEXED.has(path));
}

/**
 * Every record the public API will serve, as the path its page lives at.
 *
 * The public endpoints already apply the scoping a visitor sees — an inactive
 * property and a scheduled article are simply absent — so this is an honest
 * "what does the site have?" that does not re-implement the sitemap's rules.
 */
const RECORD_SOURCES = [
  { label: 'property', endpoint: 'properties', path: (r) => PATHS.propertyDetails(r.slug) },
  { label: 'locality', endpoint: 'localities', path: (r) => PATHS.locality(r.slug) },
  { label: 'developer', endpoint: 'developers', path: (r) => PATHS.builder(r.slug) },
  { label: 'article', endpoint: 'articles', path: (r) => PATHS.article(r.slug) },
  {
    label: 'article category',
    endpoint: 'article-categories',
    path: (r) => PATHS.articleCategory(r.slug),
  },
  { label: 'article tag', endpoint: 'article-tags', path: (r) => PATHS.articleTag(r.slug) },
  { label: 'author', endpoint: 'authors', path: (r) => PATHS.author(r.slug) },
  {
    label: 'page',
    endpoint: 'pages',
    path: (r) => (r.slug === 'home' ? PATHS.home : PATHS.page(r.slug)),
  },
  // A property type is a landing page under the listing route of its segment
  // (D25), not a record with a page of its own name. It is in this list
  // because leaving it out is precisely the defect the Chrome path found:
  // seventeen indexable pages that no sitemap carried. A fallback that cannot
  // catch the bug the main path caught is not a fallback. The route follows the
  // segment's kind (QA-52), read from `GET /segments` before the types.
  {
    label: 'property type',
    endpoint: 'property-types',
    path: (r, context = {}) =>
      segmentKind(r.segment, context.segments) === 'commercial'
        ? PATHS.commercialType(r.slug)
        : PATHS.buyType(r.slug),
  },
];

/** Whether a record asked to stay out of the sitemaps (§9.6 `seo.sitemap`). */
const optedOut = (record) => record?.seo?.sitemap?.include === false;

async function readApiRoutes() {
  const expected = new Map();

  for (const path of staticRoutes()) expected.set(path, 'route table');

  const segments = await json(`${options.apiUrl}/segments?perPage=100`);
  const context = { segments: Array.isArray(segments) ? segments : [] };

  for (const source of RECORD_SOURCES) {
    const records = await json(`${options.apiUrl}/${source.endpoint}?perPage=500`);
    if (!Array.isArray(records)) {
      notes.push(`GET /${source.endpoint} answered nothing — ${source.label} pages not compared.`);
      continue;
    }

    for (const record of records) {
      if (!record?.slug || optedOut(record)) continue;
      expected.set(normalise(source.path(record, context)), source.label);
    }
  }

  return expected;
}

/**
 * Resolves each sitemap URL through the SEO modules to see if it is indexable.
 *
 * This is the `extra` half of the comparison without a browser: a sitemap that
 * lists a page the engine marks `noindex` is telling Google two contradictory
 * things about the same URL.
 */
async function checkListedAreIndexable(listed) {
  const seoSettings = await json(`${options.apiUrl}/seo/settings`);
  if (!seoSettings) {
    notes.push('GET /seo/settings answered nothing — the indexable check was skipped.');
    return 0;
  }

  let checked = 0;

  for (const path of listed) {
    const route = routeFor(path);
    const entity =
      route.resource && route.slug
        ? await json(`${options.apiUrl}/${route.resource}/slug/${encodeURIComponent(route.slug)}`)
        : null;

    if (route.resource && route.slug && !entity) {
      extra.push({ path, reason: `GET /${route.resource}/slug/${route.slug} answers nothing.` });
      continue;
    }

    const head = renderHead({ pathname: path, entity, type: route.type, seoSettings });
    if (/noindex/i.test(head.robots)) {
      extra.push({ path, reason: `The sitemap lists it; the engine resolves "${head.robots}".` });
    }

    checked += 1;
    if (options.verbose) console.log(`  listed ${path}`);
  }

  return checked;
}

/* ------------------------------------------------------------------ *
 * Run
 * ------------------------------------------------------------------ */

async function main() {
  const listed = await sitemapPaths();
  if (listed.size === 0) throw new Error('The sitemaps list no URLs at all.');

  const withChrome = hasChrome();
  console.log(
    `${listed.size} URL(s) in the sitemaps at ${options.apiUrl}/sitemap.xml; comparing with ` +
      `${withChrome ? `the pages ${options.baseUrl} renders` : 'the route table and the public API'}.`
  );

  if (withChrome) {
    const { indexable, visited, parameterised } = await readRenderedRoutes(listed);

    for (const path of indexable) {
      if (!listed.has(path)) {
        missing.push({ path, reason: 'The page is indexable; no sitemap lists it.' });
      }
    }

    console.log(
      `${visited} page(s) opened to depth ${options.depth}; ` +
        `${indexable.size} indexable route(s) found.`
    );
    if (parameterised > 0) {
      notes.push(
        `${parameterised} indexable page(s) canonicalise to a filtered URL (§9.4); ` +
          'the sitemaps list only parameterless routes, so they are not required there.'
      );
    }
  } else {
    const expected = await readApiRoutes();

    for (const [path, label] of expected) {
      if (!listed.has(path)) {
        missing.push({ path, reason: `The ${label} is public; no sitemap lists it.` });
      }
    }

    const checked = await checkListedAreIndexable(listed);
    console.log(
      `${expected.size} public route(s) derived from the route table and the API; ` +
        `${checked} sitemap URL(s) resolved through the SEO engine.`
    );
    console.log(
      'rendered-route crawl skipped (no CHROME_PATH): following the links a page really ' +
        'has needs a browser. Set CHROME_PATH to include it.'
    );
  }

  for (const note of notes) console.log(`note ${note}`);
  for (const entry of missing) console.error(`MISSING ${entry.path}\n        ${entry.reason}`);
  for (const entry of extra) console.error(`EXTRA   ${entry.path}\n        ${entry.reason}`);

  console.log(`\n${missing.length} missing, ${extra.length} extra.`);
  if (missing.length + extra.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`check:sitemap could not run: ${error.message}`);
  process.exitCode = 1;
});
