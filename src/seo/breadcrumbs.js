/**
 * The trail above a page, built once and used twice (§9.3, §9.7).
 *
 * `<Breadcrumbs>` draws it and `<Seo>` publishes it as a `BreadcrumbList`, and
 * the two must never disagree: a visitor who sees "Home › Buy › Whitefield ›
 * Lakeview Heights" and a crawler that is told "Home › Properties › Lakeview
 * Heights" have been shown two different sites. So pages ask this module once
 * and hand the same array to both.
 *
 * The shape is `{ name, path }` — the vocabulary of schema.org's `ListItem`
 * rather than of a React link — and the last crumb carries **no** path,
 * because it is the page the visitor is already on.
 *
 * Authored in CommonJS (D36b, extended in prompt 38) so that
 * `scripts/validate-jsonld.js` can build the same trail without a browser.
 */

const { LISTING_TYPES } = require('../config/enums');
const PATHS = require('../routes/paths');

/** "buyer-assistance" → "Buyer Assistance". */
function humanise(segment) {
  return String(segment ?? '')
    .split('-')
    .filter(Boolean)
    .map((word) => `${word[0].toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

/** The listing index a property belongs to: `/buy`, `/rent` or `/lease`. */
const LISTING_PATH = { sale: PATHS.buy, rent: PATHS.rent, lease: PATHS.lease };

/** The two section crumbs almost every page hangs off. */
const INSIGHTS = { name: 'Insights', path: PATHS.articles };
const CAREERS = { name: 'Careers', path: PATHS.careers };

/** A crumb, or nothing when there is no name to print. */
const crumb = (name, path) => (name ? { name: String(name), path: path ?? undefined } : null);

/**
 * The trail for one page.
 *
 * @param {string} type one of the `<Seo type>` values — `home` answers with an
 *   empty trail, because a breadcrumb whose only item is the page you are on
 *   is a line of furniture rather than navigation
 * @param {object} [entity] the record the page is about
 * @param {{homeLabel?: string, locality?: object, category?: object, items?: Array,
 *   routeConfig?: object, title?: string}} [extras]
 * @returns {Array<{name: string, path?: string}>}
 */
function breadcrumbsFor(type, entity = {}, extras = {}) {
  const record = entity ?? {};
  const home = { name: extras.homeLabel || 'Home', path: PATHS.home };
  const own = record.seo?.breadcrumbTitle || extras.title || record.title || record.name || '';

  switch (type) {
    case 'home':
    case 'notFound':
    case 'error':
    case 'admin':
      return [];

    case 'property': {
      const locality = record.location?.locality ?? extras.locality ?? null;
      const listingLabel = LISTING_TYPES.labelOf(record.listingType);
      return compactTrail([
        home,
        listingLabel
          ? crumb(listingLabel, LISTING_PATH[record.listingType] ?? PATHS.properties)
          : null,
        locality?.slug ? crumb(locality.name, PATHS.locality(locality.slug)) : null,
        crumb(own),
      ]);
    }

    // A listing route already states its own trail (`listingRoutes.js`), in the
    // `{ label, to }` shape the UI has used since prompt 26.
    case 'listing':
      return compactTrail([
        ...(Array.isArray(extras.items) ? extras.items : (extras.routeConfig?.breadcrumbs ?? [])),
      ]);

    case 'localities':
      return compactTrail([home, crumb('Localities')]);
    case 'locality':
      return compactTrail([home, crumb('Localities', PATHS.localities), crumb(own)]);

    case 'builders':
      return compactTrail([home, crumb('Builders')]);
    case 'developer':
      return compactTrail([home, crumb('Builders', PATHS.builders), crumb(own)]);

    case 'blog':
      return compactTrail([home, crumb(INSIGHTS.name)]);
    case 'article': {
      const category = record.category ?? extras.category ?? null;
      return compactTrail([
        home,
        INSIGHTS,
        category?.slug ? crumb(category.name, PATHS.articleCategory(category.slug)) : null,
        crumb(own),
      ]);
    }
    case 'articleCategory':
    case 'articleTag':
    case 'author':
      return compactTrail([home, INSIGHTS, crumb(own)]);

    case 'faqs':
      return compactTrail([home, INSIGHTS, crumb('FAQs')]);

    case 'jobs':
      return compactTrail([home, crumb(CAREERS.name)]);
    case 'job':
      return compactTrail([home, CAREERS, crumb(own)]);

    case 'shortlist':
      return compactTrail([home, crumb('Shortlist')]);
    case 'search':
      return compactTrail([home, crumb('Search')]);

    case 'page': {
      // A nested slug gets its parent segment as a crumb — Home › Buyer
      // Assistance › Home Loan — but the parent is **not** a link:
      // `/buyer-assistance` is not a page, and a breadcrumb to a 404 is worse
      // than a breadcrumb that is only a label (§9.7).
      const segments = String(record.slug ?? '')
        .split('/')
        .filter(Boolean);
      return compactTrail([
        home,
        ...segments.slice(0, -1).map((segment) => crumb(humanise(segment))),
        crumb(own || humanise(segments[segments.length - 1])),
      ]);
    }

    default:
      return compactTrail([home, crumb(own)]);
  }
}

/**
 * The trail as `<Seo>` and `<Breadcrumbs>` read it: every crumb named, the last
 * one without a path.
 *
 * Both input shapes are accepted — `{ name, path }` from this module and
 * `{ label, to }` from the route tables prompts 26 and 31 wrote — so a caller
 * never has to translate before passing a trail on.
 */
function compactTrail(items) {
  const named = (Array.isArray(items) ? items : [])
    .filter(Boolean)
    .map((item) => ({ name: item.name ?? item.label, path: item.path ?? item.to }))
    .filter((item) => item.name);

  return named.map((item, index) =>
    index === named.length - 1 ? { name: item.name } : { name: item.name, path: item.path }
  );
}

/** The trail in the `{ label, to }` shape `<Breadcrumbs>` was written against. */
const toUiItems = (items) =>
  (Array.isArray(items) ? items : []).map((item) => ({
    label: item.name ?? item.label,
    to: item.path ?? item.to,
  }));

const breadcrumbs = { breadcrumbsFor, compactTrail, humanise, toUiItems };

module.exports = breadcrumbs;
