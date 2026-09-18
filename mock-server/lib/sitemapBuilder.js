/**
 * Sitemaps, RSS and llms.txt (00_MASTER_CONTEXT.md §5.13, §9.8; decision D21).
 *
 * Everything in this module answers one question — *what is the public URL of
 * this record?* — and then wraps the answer in the document a crawler expects.
 * The URL map is therefore the important part of the file: it is the single
 * place the API states that a property lives at `/properties/<slug>` and a
 * builder at `/builders/<slug>`, and both `GET /admin/seo/overview` and the
 * sitemaps read it, so the SEO desk and the crawler can never disagree about
 * where a page is.
 *
 * Three settings shape the output (§6.14): `seoSettings.siteUrl` makes the
 * URLs absolute, `seoSettings.sitemap` supplies the defaults and the
 * `excludeUrls` list, and each record's own `seo.sitemap` overrides its
 * `priority` and `changefreq` or drops it from the file entirely.
 */

const { document, element, escape } = require('./xml');
const { isLive, liveArticles } = require('./articleFilters');

/** The sitemap namespaces (sitemaps.org 0.9 + Google's image extension). */
const SITEMAP_NS = 'http://www.sitemaps.org/schemas/sitemap/0.9';
const IMAGE_NS = 'http://www.google.com/schemas/sitemap-image/1.1';

/** At most this many images per URL (§4.13 of this prompt). */
const IMAGES_PER_URL = 5;

/** How many articles the RSS feed carries (§5.13). */
const RSS_LIMIT = 20;

/** How many entries each generated `llms.txt` section lists (§9.8). */
const LLMS_LIMIT = 10;

/**
 * The public path of every entity that has one.
 *
 * `page` special-cases `home`, which is the site root rather than `/home`;
 * `propertyType` follows D25, where a type slug resolves under the listing
 * route of its segment.
 *
 * @type {Record<string, (entity: object) => string>}
 */
const PUBLIC_PATHS = {
  property: (entity) => `/properties/${entity.slug}`,
  locality: (entity) => `/localities/${entity.slug}`,
  developer: (entity) => `/builders/${entity.slug}`,
  article: (entity) => `/insights/articles/${entity.slug}`,
  articleCategory: (entity) => `/insights/articles/category/${entity.slug}`,
  articleTag: (entity) => `/insights/articles/tag/${entity.slug}`,
  author: (entity) => `/insights/authors/${entity.slug}`,
  page: (entity) => (entity.slug === 'home' ? '/' : `/${entity.slug}`),
  propertyType: (entity) =>
    entity.segment === 'commercial' ? `/commercial/${entity.slug}` : `/buy/${entity.slug}`,
};

/** The routes that exist without a record behind them (§4.13). */
const STATIC_ROUTES = [
  '/',
  '/properties',
  '/buy',
  '/rent',
  '/lease',
  '/commercial',
  '/plots',
  '/buy/pre-launch',
  '/buy/under-construction',
  '/buy/ready-to-move',
  '/buy/resale',
  '/localities',
  '/builders',
  '/insights/articles',
  '/insights/faqs',
];

/** The five child sitemaps of the index, in the order it lists them. */
const CHILD_SITEMAPS = ['properties', 'localities', 'developers', 'articles', 'pages'];

/**
 * The public path of one record.
 *
 * @param {string} type a key of {@link PUBLIC_PATHS}
 * @param {object} entity
 * @returns {string|null} `null` for a type with no public page
 */
function publicPathOf(type, entity) {
  const builder = PUBLIC_PATHS[type];
  if (!builder || !entity) return null;
  return builder(entity);
}

/** `<siteUrl><path>`, with exactly one slash between them and none at the end. */
function absoluteUrl(siteUrl, path) {
  const base = String(siteUrl ?? '').replace(/\/+$/, '');
  const suffix = String(path ?? '');
  if (suffix === '/' || suffix === '') return base || '/';
  return `${base}${suffix.startsWith('/') ? '' : '/'}${suffix}`;
}

/** The `seoSettings.sitemap` branch, with the §6.14 defaults filled in. */
function sitemapSettings(seoSettings) {
  const sitemap = seoSettings?.sitemap ?? {};
  return {
    enabled: sitemap.enabled !== false,
    includeProperties: sitemap.includeProperties !== false,
    includeLocalities: sitemap.includeLocalities !== false,
    includeDevelopers: sitemap.includeDevelopers !== false,
    includeArticles: sitemap.includeArticles !== false,
    includePages: sitemap.includePages !== false,
    changefreq: sitemap.changefreq ?? {},
    priority: sitemap.priority ?? {},
    excludeUrls: Array.isArray(sitemap.excludeUrls) ? sitemap.excludeUrls : [],
  };
}

/**
 * Builds one `<url>` entry, or `null` when the record opted out.
 *
 * @param {object} input
 * @returns {{loc: string, lastmod: string|null, changefreq: string|null, priority: number|null, images: Array}|null}
 */
function urlEntry({ type, entity, siteUrl, settings, images = [] }) {
  const overrides = entity?.seo?.sitemap ?? {};
  if (overrides.include === false) return null;

  const path = publicPathOf(type, entity);
  if (!path) return null;

  const loc = absoluteUrl(siteUrl, path);
  if (settings.excludeUrls.includes(path) || settings.excludeUrls.includes(loc)) return null;

  return {
    loc,
    lastmod: entity.updatedAt ?? entity.publishedAt ?? null,
    changefreq: overrides.changefreq ?? settings.changefreq[type] ?? null,
    priority: overrides.priority ?? settings.priority[type] ?? null,
    images: images.slice(0, IMAGES_PER_URL),
  };
}

/** A static route as a `<url>` entry, with no record behind it. */
function staticEntry({ path, siteUrl, settings, lastmod }) {
  const loc = absoluteUrl(siteUrl, path);
  if (settings.excludeUrls.includes(path) || settings.excludeUrls.includes(loc)) return null;

  return {
    loc,
    lastmod: lastmod ?? null,
    changefreq: settings.changefreq.page ?? null,
    priority: path === '/' ? 1 : (settings.priority.page ?? null),
    images: [],
  };
}

/** The most recent `updatedAt` of a set of entries, for the index's `<lastmod>`. */
function latest(entries) {
  const moments = entries
    .map((entry) => (entry.lastmod ? Date.parse(entry.lastmod) : NaN))
    .filter((moment) => Number.isFinite(moment));

  return moments.length === 0 ? null : new Date(Math.max(...moments)).toISOString();
}

/**
 * The five `<url>` sets of the sitemap family.
 *
 * @param {object} data the collections plus `seoSettings`
 * @param {number} [now]
 * @returns {Record<string, Array<object>>} keyed by {@link CHILD_SITEMAPS}
 */
function sitemapSets(data, now = Date.now()) {
  const settings = sitemapSettings(data.seoSettings);
  const siteUrl = data.seoSettings?.siteUrl ?? '';
  const rows = (name) => (Array.isArray(data[name]) ? data[name] : []);

  const build = (type, records, extra = () => ({})) =>
    records
      .map((entity) => urlEntry({ type, entity, siteUrl, settings, ...extra(entity) }))
      .filter(Boolean);

  if (!settings.enabled) {
    return Object.fromEntries(CHILD_SITEMAPS.map((name) => [name, []]));
  }

  const published = liveArticles(rows('articles'), now);

  const properties = settings.includeProperties
    ? build(
        'property',
        rows('properties').filter((property) => property.isActive),
        (property) => ({
          images: (property.images ?? [])
            .filter((image) => image?.url)
            .map((image) => ({ loc: image.url, title: image.alt ?? property.title })),
        })
      )
    : [];

  const localities = settings.includeLocalities
    ? build(
        'locality',
        rows('localities').filter((locality) => locality.isActive)
      )
    : [];

  const developers = settings.includeDevelopers
    ? build(
        'developer',
        rows('developers').filter((developer) => developer.isActive)
      )
    : [];

  // An article index lists the taxonomy pages too: they are where a crawler
  // finds the articles that are not linked from the blog's first page.
  const articles = settings.includeArticles
    ? [
        ...build('article', published),
        ...build(
          'articleCategory',
          rows('articleCategories').filter((category) => category.isActive)
        ),
        ...build('articleTag', rows('articleTags')),
        ...build(
          'author',
          rows('authors').filter((author) => author.isActive)
        ),
      ]
    : [];

  const cmsPages = rows('pages').filter((page) => page.status === 'published');

  // A property-type landing page (`/buy/apartments`, `/commercial/warehouses`,
  // D25) is a listing route like `/buy/ready-to-move` next to it, so it takes
  // the `page` defaults when `seoSettings.sitemap` names none of its own — and
  // an admin who later adds a `propertyType` key still wins.
  const typeSettings = {
    ...settings,
    changefreq: {
      ...settings.changefreq,
      propertyType: settings.changefreq.propertyType ?? settings.changefreq.page,
    },
    priority: {
      ...settings.priority,
      propertyType: settings.priority.propertyType ?? settings.priority.page,
    },
  };

  const propertyTypes = rows('propertyTypes')
    .filter((type) => type.isActive)
    .map((entity) => urlEntry({ type: 'propertyType', entity, siteUrl, settings: typeSettings }))
    .filter(Boolean);

  const pages = settings.includePages
    ? [
        ...STATIC_ROUTES.map((path) =>
          staticEntry({
            path,
            siteUrl,
            settings,
            lastmod: latest(build('page', cmsPages)),
          })
        ).filter(Boolean),
        ...propertyTypes,
        ...build('page', cmsPages).filter((entry) => entry.loc !== absoluteUrl(siteUrl, '/')),
      ]
    : [];

  return { properties, localities, developers, articles, pages };
}

/** One `<image:image>` element. */
const imageElement = (image) =>
  element('image:image', [
    element('image:loc', image.loc),
    ...(image.title ? [element('image:title', image.title)] : []),
  ]);

/**
 * A `<urlset>` document.
 *
 * @param {Array<object>} entries
 * @returns {string}
 */
function renderUrlSet(entries) {
  const hasImages = entries.some((entry) => (entry.images ?? []).length > 0);

  const urls = entries.map((entry) =>
    element('url', [
      element('loc', entry.loc),
      ...(entry.lastmod ? [element('lastmod', entry.lastmod)] : []),
      ...(entry.changefreq ? [element('changefreq', entry.changefreq)] : []),
      ...(entry.priority === null || entry.priority === undefined
        ? []
        : [element('priority', Number(entry.priority).toFixed(1))]),
      ...(entry.images ?? []).map(imageElement),
    ])
  );

  return document(
    element('urlset', urls, {
      xmlns: SITEMAP_NS,
      ...(hasImages ? { 'xmlns:image': IMAGE_NS } : {}),
    })
  );
}

/**
 * The `<sitemapindex>` document.
 *
 * @param {Array<{loc: string, lastmod: string|null}>} children
 * @returns {string}
 */
function renderSitemapIndex(children) {
  return document(
    element(
      'sitemapindex',
      children.map((child) =>
        element('sitemap', [
          element('loc', child.loc),
          ...(child.lastmod ? [element('lastmod', child.lastmod)] : []),
        ])
      ),
      { xmlns: SITEMAP_NS }
    )
  );
}

/**
 * The index's children, with each one's `<lastmod>` taken from its set.
 *
 * @param {object} data
 * @param {number} [now]
 * @returns {Array<{name: string, loc: string, lastmod: string|null}>}
 */
function sitemapIndexChildren(data, now = Date.now()) {
  const sets = sitemapSets(data, now);
  const siteUrl = data.seoSettings?.siteUrl ?? '';

  return CHILD_SITEMAPS.map((name) => ({
    name,
    loc: absoluteUrl(siteUrl, `/sitemap-${name}.xml`),
    lastmod: latest(sets[name] ?? []),
  }));
}

/** RFC 822, which is what RSS 2.0 wants `<pubDate>` in. */
function rfc822(value) {
  const moment = value ? new Date(value) : null;
  return moment && !Number.isNaN(moment.getTime()) ? moment.toUTCString() : null;
}

/**
 * The RSS 2.0 feed of the latest published articles (§5.13).
 *
 * @param {object} data
 * @param {number} [now]
 * @returns {string}
 */
function renderRss(data, now = Date.now()) {
  const siteUrl = data.seoSettings?.siteUrl ?? '';
  const siteName = data.siteSettings?.general?.siteName ?? 'Squares N Acres';
  const categories = Array.isArray(data.articleCategories) ? data.articleCategories : [];
  const authors = Array.isArray(data.authors) ? data.authors : [];

  const articles = liveArticles(data.articles ?? [], now)
    .slice()
    .sort((left, right) => Date.parse(right.publishedAt ?? 0) - Date.parse(left.publishedAt ?? 0))
    .slice(0, RSS_LIMIT);

  const items = articles.map((article) => {
    const link = absoluteUrl(siteUrl, publicPathOf('article', article));
    const category = categories.find((row) => row.id === article.categoryId);
    const author = authors.find((row) => row.id === article.authorId);
    const published = rfc822(article.publishedAt);

    return element('item', [
      element('title', article.title),
      element('link', link),
      element('guid', link, { isPermaLink: 'true' }),
      ...(published ? [element('pubDate', published)] : []),
      element('description', article.excerpt ?? ''),
      ...(category ? [element('category', category.name)] : []),
      ...(author ? [element('author', author.name)] : []),
    ]);
  });

  return document(
    element(
      'rss',
      [
        element('channel', [
          element('title', `${siteName} — Insights`),
          element('link', absoluteUrl(siteUrl, '/insights/articles')),
          element(
            'description',
            data.seoSettings?.defaults?.metaDescription ?? `Articles from ${siteName}.`
          ),
          element('language', 'en-IN'),
          element('lastBuildDate', new Date(now).toUTCString()),
          element('atom:link', null, {
            href: absoluteUrl(siteUrl, '/rss.xml'),
            rel: 'self',
            type: 'application/rss+xml',
          }),
          ...items,
        ]),
      ],
      { version: '2.0', 'xmlns:atom': 'http://www.w3.org/2005/Atom' }
    )
  );
}

/**
 * `robots.txt`: the stored document with `%siteurl%` resolved and one
 * `Sitemap:` line per child sitemap appended (§9.8).
 *
 * @param {object} data
 * @returns {string}
 */
function renderRobots(data) {
  const siteUrl = String(data.seoSettings?.siteUrl ?? '').replace(/\/+$/, '');
  const stored = String(data.seoSettings?.robotsTxt ?? '').replace(/%siteurl%/gi, siteUrl);

  const lines = stored.split('\n');
  const declared = new Set(
    lines
      .filter((line) => /^sitemap:/i.test(line.trim()))
      .map((line) => line.split(':').slice(1).join(':').trim())
  );

  const extra = CHILD_SITEMAPS.map((name) => absoluteUrl(siteUrl, `/sitemap-${name}.xml`))
    .filter((url) => !declared.has(url))
    .map((url) => `Sitemap: ${url}`);

  const body = stored.replace(/\s+$/, '');
  return `${[body, ...extra].join('\n')}\n`;
}

/**
 * The generated `llms.txt` (§9.8): what the site is, and the links an answer
 * engine needs to cite it.
 *
 * @param {object} data
 * @param {number} [now]
 * @returns {string}
 */
function generateLlms(data, now = Date.now()) {
  const siteUrl = data.seoSettings?.siteUrl ?? '';
  const settings = data.siteSettings ?? {};
  const general = settings.general ?? {};
  const siteName = general.siteName ?? 'Squares N Acres';
  const link = (path, label) => `- [${label}](${absoluteUrl(siteUrl, path)})`;

  const rows = (name) => (Array.isArray(data[name]) ? data[name] : []);
  const byOrder = (left, right) => (left.order ?? 0) - (right.order ?? 0);

  const localities = rows('localities')
    .filter((locality) => locality.isActive)
    .sort(byOrder)
    .map((locality) => link(publicPathOf('locality', locality), locality.name));

  const propertyTypes = rows('propertyTypes')
    .filter((type) => type.isActive)
    .sort(byOrder)
    .map((type) => link(publicPathOf('propertyType', type), type.name));

  const featured = rows('properties')
    .filter((property) => property.isActive && property.isFeatured)
    .sort((left, right) => (right.priorityOrder ?? 0) - (left.priorityOrder ?? 0))
    .slice(0, LLMS_LIMIT)
    .map((property) => link(publicPathOf('property', property), property.title));

  const guides = liveArticles(rows('articles'), now)
    .slice()
    .sort((left, right) => Date.parse(right.publishedAt ?? 0) - Date.parse(left.publishedAt ?? 0))
    .slice(0, LLMS_LIMIT)
    .map((article) => link(publicPathOf('article', article), article.title));

  const summary =
    data.seoSettings?.defaults?.metaDescription ??
    general.tagline ??
    `${siteName} is a property advisory in Bengaluru, Karnataka, India.`;

  const contact = [
    general.contactEmail ? `- Email: ${general.contactEmail}` : null,
    general.contactPhone ? `- Phone: ${general.contactPhone}` : null,
    `- Website: ${absoluteUrl(siteUrl, '/')}`,
    link('/contact', 'Contact page'),
  ].filter(Boolean);

  const section = (title, entries) =>
    entries.length === 0 ? [] : [`## ${title}`, '', ...entries, ''];

  return [
    `# ${siteName}`,
    '',
    summary,
    '',
    ...section('Localities', localities),
    ...section('Property types', propertyTypes),
    ...section('Featured properties', featured),
    ...section('Guides', guides),
    ...section('Contact', contact),
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

/**
 * `llms.txt` as served: the stored document when the editor wrote one,
 * otherwise the generated one (§4.13 of this prompt).
 *
 * @param {object} data
 * @param {number} [now]
 * @returns {string}
 */
function renderLlms(data, now = Date.now()) {
  const stored = data.seoSettings?.llmsTxt;
  const text =
    typeof stored === 'string' && stored.trim() !== '' ? stored : generateLlms(data, now);
  return text.endsWith('\n') ? text : `${text}\n`;
}

module.exports = {
  PUBLIC_PATHS,
  STATIC_ROUTES,
  CHILD_SITEMAPS,
  publicPathOf,
  absoluteUrl,
  sitemapSettings,
  sitemapSets,
  sitemapIndexChildren,
  renderUrlSet,
  renderSitemapIndex,
  renderRss,
  renderRobots,
  renderLlms,
  generateLlms,
  isLive,
  escape,
};
