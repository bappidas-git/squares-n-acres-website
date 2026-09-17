/**
 * What each kind of page is, before it says anything about itself (§9.3).
 *
 * `<Seo type="…">` names a *page*, and the engine in `src/seo` works on
 * *records*. These tables are the join between the two: which record type the
 * engine should resolve a page against, what `og:type` it publishes, whether it
 * may be indexed at all, and — for the index pages that have no record behind
 * them — what it is called.
 *
 * Nothing here is a style decision, so nothing here belongs in a page: a
 * localities index and a builders index are the same kind of page, and the day
 * one of them stops being indexed the other should too.
 *
 * Authored in CommonJS (D36b, extended in prompt 38) with no imports at all, so
 * that `scripts/validate-jsonld.js` reads exactly the tables the browser does.
 * `components/seo/seoDefaults.js` re-exports them beside the one value that
 * does need the design system (the theme colour).
 */

/** Every value `<Seo type>` accepts (§9.2, extended by prompt 38). */
const PAGE_TYPES = [
  'home',
  'property',
  'listing',
  'locality',
  'localities',
  'developer',
  'builders',
  'article',
  'articleCategory',
  'articleTag',
  'author',
  'blog',
  'faqs',
  'page',
  'jobs',
  'job',
  'search',
  'shortlist',
  'notFound',
  'error',
  'admin',
];

/**
 * The pages a search engine is never invited to keep (§9.3).
 *
 * The admin panel and the sign-in screen because they are not the public site;
 * a search, a shortlist and a 404 because each one is a view of the site rather
 * than a page of it.
 */
const NEVER_INDEXED = new Set(['admin', 'search', 'shortlist', 'notFound', 'error']);

/** The record type the engine resolves a page against (`SEO_ENTITY_TYPES`). */
const ENGINE_TYPE_FOR = {
  home: 'home',
  property: 'property',
  listing: 'listing',
  locality: 'locality',
  developer: 'developer',
  article: 'article',
  articleCategory: 'articleCategory',
  articleTag: 'articleTag',
  author: 'author',
  job: 'job',
  search: 'search',
};

/** The page types that are a record with its own `seo` branch (§9.6). */
const RECORD_TYPES = new Set([
  'property',
  'article',
  'articleCategory',
  'articleTag',
  'author',
  'locality',
  'developer',
  'page',
  'job',
]);

/** `og:type` per page (§9.3): an article is an article, a person is a profile. */
const OG_TYPE_FOR = { article: 'article', author: 'profile' };

/** The blog routes that carry the feed as an alternate representation. */
const RSS_TYPES = new Set(['blog', 'article', 'articleCategory', 'articleTag', 'author']);

/**
 * The robots branch a page with no record of its own publishes.
 *
 * `max-image-preview: large` is what gets a listing's photograph into the
 * result rather than a thumbnail, and every seeded record already carries it
 * (§9.6); a page without a record would otherwise quietly lose it.
 */
const DEFAULT_ROBOTS = { index: true, follow: true, maxImagePreview: 'large' };

/**
 * The index pages, which are routes rather than records.
 *
 * Their titles go **through** the type's title template like any record's
 * would, so "Localities in Bengaluru" becomes "Localities in Bengaluru |
 * Squares N Acres" and changing the separator in Admin → SEO changes it here
 * too. A page may still pass its own `title`/`description` and win.
 */
const INDEX_PAGES = {
  localities: {
    title: 'Localities in Bengaluru',
    description:
      'Explore neighbourhoods across Bengaluru: connectivity, prices and lifestyle at a glance.',
  },
  builders: {
    title: 'Builders and developers in Bengaluru',
    description:
      'The builders behind the projects we list in Bengaluru — their track record, their registrations and what they have available now.',
  },
  blog: {
    title: 'Real estate insights and guides for Bengaluru',
    description:
      'Buying guides, market notes, legal explainers and investment thinking on Bengaluru property, from Squares N Acres.',
  },
  faqs: {
    title: 'Frequently asked questions',
    description:
      'Answers to the questions buyers, sellers, tenants and NRIs ask us most often about property in Bengaluru — buying, renting, home loans, legal checks and RERA.',
  },
  jobs: {
    title: 'Careers',
    description: 'Open roles at Squares N Acres, and what it is like to work here.',
  },
  shortlist: {
    title: 'Your shortlist',
    description: 'The properties you have saved on this device.',
  },
  search: {
    title: 'Search results',
    description: 'What we have that matches your search.',
  },
  notFound: {
    title: 'Page not found',
    description: 'There is nothing published at this address.',
  },
  error: {
    title: 'Something went wrong',
    description: 'This page could not be loaded.',
  },
};

/** The `<meta name="…">` each verification service looks for (§9.3). */
const VERIFICATION_META = {
  google: 'google-site-verification',
  bing: 'msvalidate.01',
  pinterest: 'p:domain_verify',
  yandex: 'yandex-verification',
};

/** `<html lang>` and `og:locale` — English (India), everywhere (§1). */
const HTML_LANG = 'en-IN';
const OG_LOCALE = 'en_IN';

module.exports = {
  DEFAULT_ROBOTS,
  ENGINE_TYPE_FOR,
  HTML_LANG,
  INDEX_PAGES,
  NEVER_INDEXED,
  OG_LOCALE,
  OG_TYPE_FOR,
  PAGE_TYPES,
  RECORD_TYPES,
  RSS_TYPES,
  VERIFICATION_META,
};
