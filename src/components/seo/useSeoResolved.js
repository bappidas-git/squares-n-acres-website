/**
 * Everything one page puts in its head, resolved once (§9.2, §9.3).
 *
 * `<Seo>` renders; this decides. The split exists because the deciding is where
 * all the rules are — the title templates, the canonical whitelist, the robots
 * ladder, the image fallback chain, the graph — and rules are worth testing
 * without a `<head>` to assert against.
 *
 * Nothing here is new logic: `src/seo` already resolves a record's title,
 * description, canonical, robots and social cards, and `src/seo/schema` already
 * builds its JSON-LD. This hook is what turns "a record" into "a page": it
 * supplies the pages that have no record (the indexes, the shortlist, a 404)
 * with one, adds the nodes that belong to the page rather than to the record —
 * the publisher, the site, the list of results, the trail — and applies the
 * three rules that can only be known at the URL: a `?preview=`, a filtered
 * listing, and which page of a series this is.
 */

import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';

import breadcrumbsModule from '../../seo/breadcrumbs';
import pageGraph from '../../seo/pageGraph';
import schema from '../../seo/schema';
import urls from '../../seo/urls';
import { BRAND, SITE } from '../../config/site';
import { buildUrl } from '../../services/http';
import { endpoints } from '../../services/endpoints';
import { resolveSeoOutput, robotsContent } from '../../seo/resolve';
import { responsiveImage } from '../../utils/cloudinary';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useSiteSettings } from '../../contexts/SiteSettingsContext';
import {
  DEFAULT_ROBOTS,
  ENGINE_TYPE_FOR,
  HTML_LANG,
  INDEX_PAGES,
  NEVER_INDEXED,
  OG_LOCALE,
  OG_TYPE_FOR,
  RECORD_TYPES,
  RSS_TYPES,
  THEME_COLOR,
  VERIFICATION_META,
} from './seoDefaults';

const { absolute, compact, isoDate } = schema;

/**
 * The page types whose canonical is the **record's** address rather than the
 * URL the visitor happened to arrive on.
 *
 * The difference shows up under `?preview=`, behind a redirect and on any route
 * that reaches a record by a second spelling: the canonical has to name where
 * the record lives, which is what `urls.publicPathFor` answers. Every other
 * page *is* its URL, so its canonical is the path.
 */
const CANONICAL_FROM_RECORD = new Set([
  'property',
  'article',
  'articleCategory',
  'articleTag',
  'author',
  'locality',
  'developer',
  'job',
  'page',
]);

/** The query string as the listing rules read it (§9.4). */
function queryOf(search) {
  const params = {};
  for (const [key, value] of new URLSearchParams(search ?? '')) {
    if (value !== '') params[key] = value;
  }
  return params;
}

/** The favicons of §9.3: the committed copies, with Cloudinary behind them. */
function iconLinks(siteUrl) {
  const local = (path) => absolute(siteUrl, path);
  return [
    { rel: 'icon', type: 'image/png', sizes: '32x32', href: local('/brand/favicon-32.png') },
    { rel: 'icon', type: 'image/png', sizes: '16x16', href: local('/brand/favicon-16.png') },
    { rel: 'apple-touch-icon', href: local('/brand/apple-touch-icon.png') },
    // The brand asset itself, so a build whose `public/brand/` was never
    // generated still has an icon rather than four 404s (§2.3).
    { rel: 'icon', type: 'image/png', sizes: '192x192', href: BRAND.iconUrl },
  ];
}

const findById = (records, id) =>
  (Array.isArray(records) ? records : []).find((row) => String(row?.id) === String(id)) ?? null;

/** `article:*` — only an article has these, and only once it is published. */
function articleMetaFor(entity, context) {
  const author = entity.author ?? findById(context.authors, entity.authorId);
  const category = entity.category ?? findById(context.categories, entity.categoryId);
  const tags = Array.isArray(entity.tags) ? entity.tags : [];

  return compact({
    publishedTime: isoDate(entity.publishedAt),
    modifiedTime: isoDate(entity.updatedAt ?? entity.publishedAt),
    author: author?.name,
    section: category?.name,
    tags: tags.map((tag) => tag?.name ?? tag).filter(Boolean),
  });
}

/**
 * @param {object} props the props of `<Seo>`
 * @returns {object} the resolved head: title, description, canonical, robots,
 *   `og`, `twitter`, `articleMeta`, `links`, `verification`, `icons` and the
 *   single merged JSON-LD graph
 */
export default function useSeoResolved({
  type = 'page',
  entity = null,
  title,
  description,
  overrides = {},
  variables = {},
  breadcrumbs = null,
  pagination = null,
  preloadImage = null,
  jsonLd = null,
  faqs = null,
  items = null,
  testimonials = null,
} = {}) {
  const { settings, seoSettings } = useSiteSettings();
  const masterData = useMasterData();
  const location = useLocation();

  // §9.3 and D31: the runtime setting is authoritative, the build-time
  // environment is the fallback, and neither ever carries a trailing slash.
  const siteUrl = String(
    seoSettings?.siteUrl || settings?.general?.siteUrl || SITE.url || ''
  ).replace(/\/+$/, '');

  const engineType = ENGINE_TYPE_FOR[type] ?? (RECORD_TYPES.has(type) ? type : 'page');
  const previewing = Boolean(new URLSearchParams(location.search).get('preview'));

  const context = useMemo(
    () => ({
      seoSettings: seoSettings ?? {},
      siteSettings: settings ?? {},
      siteUrl,
      localities: masterData.localities,
      cities: masterData.cities,
      propertyTypes: masterData.propertyTypes,
      developers: masterData.developers,
      amenities: masterData.amenities,
      ...variables,
    }),
    [seoSettings, settings, siteUrl, masterData, variables]
  );

  /**
   * The record the engine resolves.
   *
   * A page that has one passes it; a page that is a route rather than a record
   * — an index, a shortlist, a 404 — is given one built from its own words and
   * the defaults of its type, so that both take exactly the same path through
   * the templates (§9.5) and a change to the separator reaches both.
   */
  const subject = useMemo(() => {
    const base = entity && typeof entity === 'object' ? entity : {};
    const fallback = INDEX_PAGES[type] ?? {};
    const seo = base.seo ?? {};

    return {
      // A page that is a route rather than a record is always published: it
      // exists because the router says so. Without this the engine reads the
      // synthetic record as a draft — `status` is what tells it a CMS page is
      // published — and puts `noindex` on the localities index.
      ...(RECORD_TYPES.has(type) ? null : { status: 'published', isActive: true }),
      ...base,
      title: title ?? base.title ?? base.name ?? fallback.title ?? '',
      seo: {
        ...seo,
        title: overrides.title ?? seo.title ?? '',
        description:
          overrides.description ?? description ?? seo.description ?? fallback.description ?? '',
        robots: { ...DEFAULT_ROBOTS, ...(seo.robots ?? {}), ...(overrides.robots ?? {}) },
        og: { ...(seo.og ?? {}), ...(overrides.og ?? {}) },
        twitter: { ...(seo.twitter ?? {}), ...(overrides.twitter ?? {}) },
      },
    };
  }, [entity, type, title, description, overrides]);

  const output = useMemo(
    () => resolveSeoOutput(engineType, subject, seoSettings ?? {}, context),
    [engineType, subject, seoSettings, context]
  );

  const canonical = useMemo(() => {
    if (overrides.canonical) return absolute(siteUrl, overrides.canonical);
    if (subject.seo.canonicalUrl) return absolute(siteUrl, subject.seo.canonicalUrl);
    if (CANONICAL_FROM_RECORD.has(type) && output.canonical) return output.canonical;
    return urls.absoluteUrl(siteUrl, location.pathname);
  }, [overrides.canonical, subject.seo.canonicalUrl, type, output.canonical, siteUrl, location]);

  /**
   * Robots, in three steps (§9.3, §9.4).
   *
   * A page nobody should keep **or follow** — the admin panel, a search, a
   * shortlist, a 404, anything under `?preview=` — says so outright. A page
   * that is merely this visitor's view of a list, or a record that is not
   * published, is `noindex` but still worth crawling: its links go somewhere.
   * Everything else publishes the record's own directives.
   */
  const hardNoindex = NEVER_INDEXED.has(type) || previewing;
  const softNoindex =
    overrides.noindex === true ||
    (type === 'listing' && urls.isNoindexListing(queryOf(location.search), seoSettings ?? {}));

  const robots = hardNoindex
    ? 'noindex, nofollow'
    : robotsContent(subject.seo.robots, { indexable: output.indexable && !softNoindex });

  const ogImage = absolute(siteUrl, output.og.imageUrl) ?? null;
  const twitterImage = absolute(siteUrl, output.twitter.imageUrl) ?? ogImage;

  const trail = useMemo(
    () =>
      breadcrumbsModule.compactTrail(
        breadcrumbs ??
          breadcrumbsModule.breadcrumbsFor(type, subject, {
            homeLabel: seoSettings?.breadcrumbs?.homeLabel,
          })
      ),
    [breadcrumbs, type, subject, seoSettings]
  );

  const graph = useMemo(
    () =>
      pageGraph.buildPageGraph({
        type,
        engineType,
        entity: subject,
        seoSettings: seoSettings ?? {},
        context,
        canonical,
        trail,
        faqs,
        items,
        testimonials,
        extra: jsonLd,
        // What the page calls itself once the templates have run. A listing
        // route has no record to take a name from, and a `WebPage` without one
        // is a node Google drops.
        name: output.title,
        description: output.description,
      }),
    [
      type,
      engineType,
      subject,
      seoSettings,
      context,
      canonical,
      trail,
      faqs,
      items,
      testimonials,
      jsonLd,
      output.title,
      output.description,
    ]
  );

  const verification = Object.entries(VERIFICATION_META)
    .map(([key, name]) => ({ name, content: seoSettings?.verification?.[key] ?? '' }))
    .filter((meta) => meta.content);

  /**
   * The LCP image, as a `<link rel="preload">` (§8.6, prompt 41).
   *
   * A property's cover, an article's featured image and a locality's or a
   * builder's hero are all inside a `React.lazy` route chunk: the browser
   * cannot see the `<img>` until that chunk has parsed and rendered, which on
   * a phone is a second after the HTML arrived. Naming the file in the head
   * starts the download with the stylesheet instead.
   *
   * The candidates come from `responsiveImage` — the same helper `LazyImage`
   * uses — so the file the preload fetches is the file the element then asks
   * for, rather than a second copy at a different width.
   */
  const preloadLink = useMemo(() => {
    const src = String(preloadImage?.src ?? '').trim();
    if (!src) return null;

    const built = responsiveImage(src, {
      ratio: preloadImage.ratio,
      fit: preloadImage.fit ?? 'cover',
    });

    return compact({
      href: built.src,
      imagesrcset: built.srcSet ?? undefined,
      // `imagesizes` is only meaningful beside a candidate list, exactly as
      // `sizes` is on the element itself.
      imagesizes: built.srcSet ? (preloadImage.sizes ?? undefined) : undefined,
    });
  }, [preloadImage]);

  return {
    lang: HTML_LANG,
    title: output.title || subject.title,
    description: output.description,
    canonical,
    robots,
    indexable: !hardNoindex && !softNoindex && output.indexable,
    breadcrumbs: trail,

    og: {
      type: OG_TYPE_FOR[type] ?? 'website',
      title: output.og.title,
      description: output.og.description,
      image: ogImage,
      url: canonical,
      siteName: output.og.siteName || settings?.general?.siteName || BRAND.name,
      locale: OG_LOCALE,
    },
    twitter: {
      card: output.twitter.card,
      title: output.twitter.title,
      description: output.twitter.description,
      image: twitterImage,
    },

    articleMeta: type === 'article' ? articleMetaFor(subject, context) : null,

    links:
      compact({
        prev: pagination?.prev ? absolute(siteUrl, pagination.prev) : undefined,
        next: pagination?.next ? absolute(siteUrl, pagination.next) : undefined,
        rss: RSS_TYPES.has(type) ? buildUrl(endpoints.sitemap.rss) : undefined,
      }) ?? {},

    preload: preloadLink,

    verification,
    icons: iconLinks(siteUrl),
    themeColor: THEME_COLOR,
    applicationName: settings?.general?.siteName || BRAND.name,

    jsonLd: graph && graph['@graph'].length ? graph : null,
  };
}
