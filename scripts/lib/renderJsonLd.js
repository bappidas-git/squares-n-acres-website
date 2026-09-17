/**
 * The head of a public page, resolved in Node (prompt 38 §4.7).
 *
 * `scripts/validate-jsonld.js` prefers a real browser: only a browser can tell
 * you what a visitor's Chrome actually received. But a browser is not always
 * there — CI without `CHROME_PATH`, a laptop with no Chromium — and "we could
 * not check" is a poor answer for a check that is meant to gate a release.
 *
 * So this is the fallback: it asks the API for the records the sitemaps list
 * and resolves each one through **the same modules the browser runs** —
 * `src/seo/resolve.js` for the title, the description and the robots directive,
 * `src/seo/urls.js` for the canonical, `src/seo/breadcrumbs.js` for the trail
 * and `src/seo/pageGraph.js` for the graph. That is the whole reason those
 * modules are CommonJS (D36b, D103): a validator that re-implemented any of
 * them would be checking its own opinion rather than the site's.
 *
 * What it cannot check without a browser is the rendered page: one `<h1>`,
 * images with `alt`, the links a page actually has. Those are the browser
 * path's, and `validate-jsonld.js` says so when it skips them.
 */

const breadcrumbs = require('../../src/seo/breadcrumbs');
const pageGraph = require('../../src/seo/pageGraph');
const urls = require('../../src/seo/urls');
const {
  DEFAULT_ROBOTS,
  ENGINE_TYPE_FOR,
  INDEX_PAGES,
  RECORD_TYPES,
} = require('../../src/seo/pageTypes');
const { resolveSeoOutput, robotsContent } = require('../../src/seo/resolve');

/**
 * Which collection a public path belongs to, and how to reach one record of it.
 *
 * The map is the mirror image of `mock-server/lib/sitemapBuilder.js`'s
 * `PUBLIC_PATHS`: that module turns a record into a URL, this one turns a URL
 * back into the record. Keeping them the same shape is what lets a mismatch
 * show up as a failing check rather than as a page nobody notices.
 */
const ROUTES = [
  { type: 'property', pattern: /^\/properties\/([^/]+)$/, resource: 'properties' },
  { type: 'locality', pattern: /^\/localities\/([^/]+)$/, resource: 'localities' },
  { type: 'developer', pattern: /^\/builders\/([^/]+)$/, resource: 'developers' },
  {
    type: 'articleCategory',
    pattern: /^\/insights\/articles\/category\/([^/]+)$/,
    resource: 'article-categories',
  },
  {
    type: 'articleTag',
    pattern: /^\/insights\/articles\/tag\/([^/]+)$/,
    resource: 'article-tags',
  },
  { type: 'article', pattern: /^\/insights\/articles\/([^/]+)$/, resource: 'articles' },
  { type: 'author', pattern: /^\/insights\/authors\/([^/]+)$/, resource: 'authors' },
  { type: 'job', pattern: /^\/careers\/([^/]+)$/, resource: 'jobs' },
];

/** The static routes that are an index rather than a record (`seoDefaults`). */
const INDEX_ROUTES = {
  // `/` is the home CMS page (§6.10), so it is a record like any other and
  // `routeFor` says so below; the entry is here for completeness of the map.
  '/': 'home',
  '/properties': 'listing',
  '/buy': 'listing',
  '/rent': 'listing',
  '/lease': 'listing',
  '/commercial': 'listing',
  '/plots': 'listing',
  '/localities': 'localities',
  '/builders': 'builders',
  '/insights/articles': 'blog',
  '/insights/faqs': 'faqs',
  '/careers': 'jobs',
};

/**
 * What kind of page a path is, and which record is behind it.
 *
 * @param {string} pathname
 * @returns {{type: string, resource?: string, slug?: string}}
 */
function routeFor(pathname) {
  const path = urls.normalisePath(pathname);

  // The home page is a CMS record under the slug `home` (§6.10, D81).
  if (path === '/') return { type: 'home', resource: 'pages', slug: 'home' };
  if (INDEX_ROUTES[path]) return { type: INDEX_ROUTES[path] };
  if (/^\/buy\/|^\/rent\/|^\/commercial\//.test(path)) return { type: 'listing' };

  for (const route of ROUTES) {
    const match = route.pattern.exec(path);
    if (match) return { type: route.type, resource: route.resource, slug: match[1] };
  }

  // Everything else the CMS may hold, nested slugs included (D11).
  return { type: 'page', resource: 'pages', slug: path.replace(/^\//, '') };
}

/**
 * The head one URL publishes, as far as it can be known without a browser.
 *
 * @param {object} args
 * @param {string} args.pathname the public path
 * @param {object|null} args.entity the record behind it, or `null` for an index
 * @param {string} args.type the `<Seo type>` of the page
 * @param {object} args.seoSettings `GET /seo/settings`
 * @param {object} [args.context] master data (`localities`, `cities`, …)
 * @returns {{title: string, description: string, canonical: string, robots: string,
 *   descriptionFromRecord: boolean, breadcrumbs: Array<object>, graph: object}}
 */
function renderHead({ pathname, entity, type, seoSettings, context = {} }) {
  const siteUrl = String(seoSettings?.siteUrl ?? '').replace(/\/+$/, '');
  const engineType = ENGINE_TYPE_FOR[type] ?? (RECORD_TYPES.has(type) ? type : 'page');
  const fallback = INDEX_PAGES[type] ?? {};

  const base = entity && typeof entity === 'object' ? entity : {};
  const seo = base.seo ?? {};
  const subject = {
    // A page that is a route rather than a record is always published; the
    // engine would otherwise read the synthetic record as a draft.
    ...(RECORD_TYPES.has(type) ? null : { status: 'published', isActive: true }),
    ...base,
    title: base.title ?? base.name ?? fallback.title ?? '',
    seo: {
      ...seo,
      description: seo.description || fallback.description || '',
      robots: { ...DEFAULT_ROBOTS, ...(seo.robots ?? {}) },
    },
  };

  const full = { ...context, seoSettings, siteUrl };
  const output = resolveSeoOutput(engineType, subject, seoSettings, full);

  const canonical = subject.seo.canonicalUrl
    ? String(subject.seo.canonicalUrl).replace(/\/+$/, '')
    : (output.canonical ?? urls.absoluteUrl(siteUrl, pathname));

  const trail = breadcrumbs.compactTrail(
    breadcrumbs.breadcrumbsFor(type, subject, {
      homeLabel: seoSettings?.breadcrumbs?.homeLabel,
    })
  );

  return {
    type,
    pathname,
    title: output.title,
    description: output.description,
    // Whether the description is the record's own. When it is not, the page
    // composes one at render time from words this adapter cannot see, and the
    // caller must not judge it (`validate-jsonld.js`).
    descriptionFromRecord: output.descriptionSource === 'own',
    canonical,
    robots: robotsContent(subject.seo.robots, { indexable: output.indexable }),
    breadcrumbs: trail,
    graph: pageGraph.buildPageGraph({
      type,
      engineType,
      entity: subject,
      seoSettings,
      context: full,
      canonical,
      trail,
      faqs: Array.isArray(base.faqs) ? base.faqs : null,
      name: output.title,
      description: output.description,
    }),
  };
}

module.exports = { INDEX_ROUTES, ROUTES, renderHead, routeFor };
