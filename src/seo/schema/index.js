/**
 * Every JSON-LD generator of §9.3, the merger that turns them into one
 * `@graph`, and the validator that refuses a graph search engines would.
 *
 * Nothing here renders: `components/seo/Seo.jsx` chooses which generators a
 * page calls and puts the result in the head. These are pure functions of a
 * record and the settings, which is what makes them testable without a browser
 * — and, since prompt 38, `require`-able from `scripts/validate-jsonld.js`
 * without one either (D36b, D103).
 */

const { SEO_SCHEMA_TYPES } = require('../../config/enums');
const { articleNode } = require('./article');
const { breadcrumbNode } = require('./breadcrumb');
const { developerOrganizationNode } = require('./developerOrganization');
const { faqPageNode } = require('./faqPage');
const { toSeoInput } = require('../entityAdapters');
const {
  SCHEMA_CONTEXT,
  absolute,
  compact,
  isoDate,
  mergeGraph,
  parseCustom,
  ref,
} = require('./graph');
const { itemListNode } = require('./itemList');
const { jobPostingNode } = require('./jobPosting');
const { organizationId, organizationNode } = require('./organization');
const { personNode } = require('./person');
const { placeNode } = require('./place');
const { realEstateListingNode, residenceTypeOf } = require('./realEstateListing');
const { aggregateRatingNode, reviewNodes } = require('./review');
const {
  KNOWN_TYPES,
  REQUIRED_PROPERTIES,
  validate,
  validateGraph,
  validateNode,
} = require('./validate');
const { videoObjectNode } = require('./videoObject');
const { webPageNode } = require('./webPage');
const { websiteId, websiteNode } = require('./website');

/** The generator each entity type leads with, for a caller that has no opinion. */
const GENERATOR_FOR = {
  property: realEstateListingNode,
  article: articleNode,
  page: webPageNode,
  locality: placeNode,
  developer: developerOrganizationNode,
  author: personNode,
  job: jobPostingNode,
  articleCategory: webPageNode,
  articleTag: webPageNode,
  propertyType: webPageNode,
};

/**
 * The node an entity type publishes about itself, or `null` when the record is
 * not far enough along to have one.
 *
 * @param {string} entityType
 * @param {object} input the normalised record (`entityAdapters.toSeoInput`)
 * @param {object} [context]
 * @returns {object|null}
 */
function primaryNodeFor(entityType, input, context = {}) {
  const generator = GENERATOR_FOR[entityType];
  return generator ? generator(input, context) : null;
}

/** The crumb an entity type's own page sits under, between the home page and itself. */
const SECTION_OF = {
  property: { name: 'Properties', url: '/properties' },
  article: { name: 'Insights', url: '/insights/articles' },
  articleCategory: { name: 'Insights', url: '/insights/articles' },
  articleTag: { name: 'Insights', url: '/insights/articles' },
  author: { name: 'Insights', url: '/insights/articles' },
  locality: { name: 'Localities', url: '/localities' },
  developer: { name: 'Builders', url: '/builders' },
  job: { name: 'Careers', url: '/careers' },
  propertyType: { name: 'Properties', url: '/properties' },
};

/**
 * Every node one record publishes about itself, before the page it sits on
 * adds its own.
 *
 * This is the record's share of the `@graph` of §9.3 — the node its type leads
 * with, its questions, its video and the trail above it — and it is what the
 * SEO panel's Schema tab previews. A page adds `Organization`, `WebSite` and
 * the lists of whatever else it shows; those belong to the page, not here.
 *
 * Three settings of §9.6 are honoured: `schema.type` replaces the generated
 * `@type`, `schema.disabledAutoTypes` removes generated nodes by type, and
 * `schema.custom` — when it parses and validates — is appended.
 *
 * @param {string} entityType one of `SEO_ENTITY_TYPES`
 * @param {object} entity the record, as the form holds it
 * @param {object} [seoSettings] `GET /seo/settings`
 * @param {object} [context] the master data of `toSeoInput`, plus the page's own
 *   `breadcrumbs` (`[{ name, path }]`) when it has already built them
 * @returns {{'@context': string, '@graph': Array<object>}}
 */
function buildGraph(entityType, entity = {}, seoSettings = {}, context = {}) {
  const siteUrl = context.siteUrl ?? seoSettings?.siteUrl ?? '';
  const full = { ...context, seoSettings: seoSettings ?? {}, siteUrl };
  const input = toSeoInput(entityType, entity, full);
  const settings = input.seo.schema ?? {};

  const nodes = autoNodes(entityType, input, full);
  const disabled = new Set((settings.disabledAutoTypes ?? []).map(String));
  const kept = nodes.filter((node) => !typesOf(node).some((type) => disabled.has(type)));

  // An explicit type replaces the one the generator chose, and only on the node
  // the record leads with: the questions stay a `FAQPage` whatever the listing
  // calls itself.
  const retyped =
    settings.type && settings.type !== 'auto' && kept[0] && kept[0] === nodes[0]
      ? [{ ...kept[0], '@type': settings.type }, ...kept.slice(1)]
      : kept;

  const custom = parseCustom(settings.custom);
  return mergeGraph([...retyped, ...(custom.valid ? custom.nodes : [])]);
}

/** The `@type`s of a node, as a list — a node may carry two (`RealEstateListing`, `Residence`). */
const typesOf = (node) => {
  const type = node?.['@type'];
  return Array.isArray(type) ? type.map(String) : type ? [String(type)] : [];
};

/**
 * The trail above a record: the page's own crumbs when it has built them
 * (`breadcrumbsFor`, prompt 38), and the type's own guess otherwise so that the
 * SEO panel's Schema tab previews a trail without a rendered page behind it.
 */
function trailFor(entityType, input, context) {
  const shared = Array.isArray(context.breadcrumbs) ? context.breadcrumbs : null;
  if (shared && shared.length) {
    return shared.map((item) => ({ name: item.name ?? item.label, url: item.path ?? item.url }));
  }

  const section = SECTION_OF[entityType];
  const label = input.seo.breadcrumbTitle || input.title || input.effectiveTitle;

  return [
    { name: 'Home', url: '/' },
    ...(section ? [section] : []),
    ...(label ? [{ name: label, url: input.url }] : []),
  ];
}

/** The generated nodes, in graph order, before anything is removed. */
function autoNodes(entityType, input, context) {
  return [
    primaryNodeFor(entityType, input, context),
    faqPageNode(input, context),
    videoObjectNode(input, context),
    breadcrumbNode(
      { canonical: input.canonical, items: trailFor(entityType, input, context) },
      context
    ),
  ].filter(Boolean);
}

/**
 * The types a record's graph would carry — the checklist the Schema tab draws
 * its "do not publish this node" switches from.
 *
 * @param {string} entityType
 * @param {object} entity
 * @param {object} [seoSettings]
 * @param {object} [context]
 * @returns {string[]} unique, in graph order
 */
function autoNodeTypes(entityType, entity = {}, seoSettings = {}, context = {}) {
  const siteUrl = context.siteUrl ?? seoSettings?.siteUrl ?? '';
  const full = { ...context, seoSettings: seoSettings ?? {}, siteUrl };
  const input = toSeoInput(entityType, entity, full);

  return [...new Set(autoNodes(entityType, input, full).flatMap(typesOf))];
}

/** The schema types an entity type may be forced to, beyond `auto` (§6.17). */
const ALLOWED_TYPES_FOR = {
  property: ['RealEstateListing', 'Product', 'Place', 'WebPage'],
  article: ['Article', 'BlogPosting', 'NewsArticle', 'WebPage'],
  page: ['WebPage', 'FAQPage', 'Event'],
  locality: ['Place', 'WebPage'],
  developer: ['Organization', 'LocalBusiness', 'WebPage'],
  articleCategory: ['WebPage'],
  author: ['WebPage'],
  job: ['WebPage'],
  propertyType: ['WebPage'],
};

/**
 * The options the Schema tab's type select offers: `auto` first, then the types
 * that entity type may be forced to (§6.17 `SEO_SCHEMA_TYPES`).
 *
 * @param {string} entityType
 * @returns {Array<{value: string, label: string}>}
 */
function schemaTypeOptions(entityType) {
  const allowed = ALLOWED_TYPES_FOR[entityType] ?? ALLOWED_TYPES_FOR.page;
  return SEO_SCHEMA_TYPES.options.filter(
    (option) => option.value === 'auto' || allowed.includes(option.value)
  );
}

const schema = {
  ALLOWED_TYPES_FOR,
  GENERATOR_FOR,
  KNOWN_TYPES,
  REQUIRED_PROPERTIES,
  SCHEMA_CONTEXT,
  absolute,
  aggregateRatingNode,
  articleNode,
  autoNodeTypes,
  breadcrumbNode,
  buildGraph,
  compact,
  developerOrganizationNode,
  faqPageNode,
  isoDate,
  itemListNode,
  jobPostingNode,
  mergeGraph,
  organizationId,
  organizationNode,
  parseCustom,
  personNode,
  placeNode,
  primaryNodeFor,
  realEstateListingNode,
  ref,
  residenceTypeOf,
  reviewNodes,
  schemaTypeOptions,
  validate,
  validateGraph,
  validateNode,
  videoObjectNode,
  webPageNode,
  websiteId,
  websiteNode,
};

module.exports = schema;
