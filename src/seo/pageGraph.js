/**
 * The whole `@graph` one page publishes (§9.3).
 *
 * `schema/index.js` builds what a **record** says about itself. This builds what
 * a **page** says: the publisher and the site node that every page carries, the
 * record's own nodes, the list of whatever the page is a list of, the questions
 * it actually shows, and the reviews — if any of the testimonials on it are
 * real.
 *
 * The record's nodes come first, because everything else refers to them; merging
 * is by `@id` and later wins, which is what lets a property page's FAQ list —
 * its stored questions plus the ones its description carries — replace the
 * record's without either of them knowing about the other.
 *
 * Authored in CommonJS (D36b, extended in prompt 38) so that
 * `components/seo/useSeoResolved.js` and `scripts/validate-jsonld.js` publish
 * the same graph: a validator that built a *different* graph from the page it
 * is checking would be worth nothing at all.
 */

const schema = require('./schema');
const { RECORD_TYPES } = require('./pageTypes');

/** At most this many entries in an `ItemList` — a page shows a page's worth. */
const MAX_LIST_ITEMS = 24;

/** The `@type`s of a node, as a list — a node may carry two. */
const typesOf = (node) => {
  const type = node?.['@type'];
  return Array.isArray(type) ? type.map(String) : type ? [String(type)] : [];
};

/**
 * @param {object} args
 * @param {string} args.type the `<Seo type>` of the page
 * @param {string} args.engineType the record type the engine resolves it against
 * @param {object} args.entity the record, or the synthetic one an index page gets
 * @param {object} args.seoSettings `GET /seo/settings`
 * @param {object} args.context the master data, plus `siteUrl`
 * @param {string} args.canonical the page's canonical URL
 * @param {Array<{name: string, path?: string}>} args.trail the breadcrumbs
 * @param {Array<object>} [args.faqs] the questions this page shows
 * @param {Array<object>} [args.items] what this page is a list of
 * @param {Array<object>} [args.testimonials] only genuine ones are published (D41)
 * @param {object|Array<object>} [args.extra] graphs a page adds of its own
 * @param {string} [args.name] what the page calls itself once the §9.5 templates
 *   have run — a listing route has no record to take a name from
 * @param {string} [args.description]
 * @returns {{'@context': string, '@graph': Array<object>}}
 */
function buildPageGraph({
  type,
  engineType,
  entity = {},
  seoSettings = {},
  context = {},
  canonical,
  trail = [],
  faqs = null,
  items = null,
  testimonials = null,
  extra = null,
  name = '',
  description = '',
}) {
  const withTrail = { ...context, breadcrumbs: trail };
  const nodes = [];

  // The publisher is on every page and everything else points at it; the site
  // node carries the search box, which only the home page may offer (§9.3).
  nodes.push(schema.organizationNode({}, withTrail));
  nodes.push(schema.websiteNode({ searchAction: type === 'home' }, withTrail));

  const isRecord = RECORD_TYPES.has(type) && Boolean(entity.id ?? entity.slug ?? entity.title);
  if (isRecord) {
    nodes.push(schema.buildGraph(engineType, entity, seoSettings, withTrail));
  } else {
    // A page that is a route rather than a record still publishes itself and
    // its trail — and still honours an editor's own JSON-LD, because the home
    // page *is* a CMS record even though its type is not one of the eight.
    const custom = schema.parseCustom(entity.seo?.schema?.custom);
    nodes.push(
      schema.breadcrumbNode({ canonical, items: trail }, withTrail),
      schema.webPageNode(
        {
          entity,
          canonical,
          title: entity.title || name,
          description: entity.seo?.description || description,
          coverImageUrl: entity.seo?.og?.imageUrl,
        },
        withTrail
      ),
      ...(custom.valid ? custom.nodes : [])
    );
  }

  // What the page is a list of, and what it answers — both belong to the page:
  // a locality's `ItemList` is the properties this page shows, not the ones the
  // record has.
  if (Array.isArray(items) && items.length) {
    nodes.push(
      schema.itemListNode(
        { canonical, name: entity.title || name, items: items.slice(0, MAX_LIST_ITEMS) },
        withTrail
      )
    );
  }
  if (Array.isArray(faqs) && faqs.length) {
    nodes.push(schema.faqPageNode({ canonical, faqs }, withTrail));
  }

  // Review markup is only ever published for testimonials somebody actually
  // gave us: the seeded samples are dropped inside `reviewNodes` (D41, §9.3).
  if (Array.isArray(testimonials) && testimonials.length) {
    const reviews = schema.reviewNodes({ canonical, testimonials }, withTrail);
    if (reviews.length) {
      nodes.push(reviews, {
        '@id': schema.organizationId(context.siteUrl),
        aggregateRating: schema.aggregateRatingNode(testimonials),
        review: reviews.map((review) => ({ '@id': review['@id'] })),
      });
    }
  }

  if (extra) nodes.push(extra);

  const disabled = new Set((entity.seo?.schema?.disabledAutoTypes ?? []).map(String));
  const merged = schema.mergeGraph(nodes);

  return {
    ...merged,
    '@graph': merged['@graph'].filter(
      (node) => !typesOf(node).some((typeName) => disabled.has(typeName))
    ),
  };
}

module.exports = { MAX_LIST_ITEMS, buildPageGraph, typesOf };
