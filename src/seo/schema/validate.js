/**
 * A structural check on JSON-LD, not a semantic one (§9.1).
 *
 * It answers four questions, which are the four that break a rich result in
 * practice: is the `@type` one search engines know, are the properties that
 * type cannot do without present, is every URL absolute, and is every date an
 * ISO 8601 date. What it deliberately does not do is judge whether the content
 * is true or complete — that is Google's Rich Results Test, and the SEO
 * dashboard links to it.
 *
 * The editor-authored `seo.schema.custom` is the reason it exists: a typo in a
 * hand-written graph must be caught in the panel, not in Search Console six
 * weeks later.
 */

const { SEO_SCHEMA_TYPES } = require('../../config/enums');

/** The types the generators emit, on top of the ones the panel offers. */
const GENERATED_TYPES = [
  'AggregateRating',
  'Answer',
  'Apartment',
  'Article',
  'BlogPosting',
  'BreadcrumbList',
  'ContactPoint',
  'EntryPoint',
  'GeoCoordinates',
  'House',
  'ImageObject',
  'ItemList',
  'JobPosting',
  'ListItem',
  'LocationFeatureSpecification',
  'Offer',
  'OpeningHoursSpecification',
  'Person',
  'Place',
  'PostalAddress',
  'QuantitativeValue',
  'Question',
  'Rating',
  'RealEstateAgent',
  'RealEstateListing',
  'Residence',
  'Review',
  'SearchAction',
  'Service',
  'SingleFamilyResidence',
  'UnitPriceSpecification',
  'VideoObject',
  'WebPage',
  'WebSite',
];

/** Every `@type` this engine accepts. */
const KNOWN_TYPES = new Set(
  [...SEO_SCHEMA_TYPES.values.filter((value) => value !== 'auto'), ...GENERATED_TYPES].sort()
);

/** What each type cannot be published without. */
const REQUIRED_PROPERTIES = {
  Article: ['headline'],
  BlogPosting: ['headline'],
  BreadcrumbList: ['itemListElement'],
  Event: ['name', 'startDate'],
  FAQPage: ['mainEntity'],
  ItemList: ['itemListElement'],
  // Google shows nothing for a posting missing any of these four (prompt 38).
  JobPosting: ['title', 'description', 'datePosted', 'hiringOrganization'],
  ListItem: ['position'],
  LocalBusiness: ['name'],
  NewsArticle: ['headline'],
  Offer: ['price', 'priceCurrency'],
  Organization: ['name'],
  Person: ['name'],
  Place: ['name'],
  Product: ['name'],
  Question: ['name', 'acceptedAnswer'],
  RealEstateAgent: ['name'],
  RealEstateListing: ['name', 'url'],
  Review: ['reviewRating'],
  VideoObject: ['name', 'thumbnailUrl', 'uploadDate'],
  WebPage: ['name'],
  WebSite: ['name', 'url'],
};

/** Properties whose value must be an absolute URL. */
const URL_PROPERTIES = new Set([
  '@id',
  'contentUrl',
  'embedUrl',
  'logo',
  'mainEntityOfPage',
  'sameAs',
  'target',
  'thumbnailUrl',
  'url',
  'urlTemplate',
]);

/** Properties whose value must be an ISO 8601 date. */
const DATE_PROPERTIES = new Set([
  'availabilityStarts',
  'dateModified',
  'datePosted',
  'datePublished',
  'endDate',
  'startDate',
  'uploadDate',
  'validFrom',
  'validThrough',
]);

const isAbsoluteUrl = (value) => /^https?:\/\/[^\s]+$/i.test(String(value));

const isIsoDate = (value) => {
  const text = String(value);
  if (!/^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/.test(text)) {
    return false;
  }
  return !Number.isNaN(new Date(text).getTime());
};

/** The `@type` of a node as a list — schema.org allows more than one. */
const typesOf = (node) => {
  const type = node?.['@type'];
  if (!type) return [];
  return Array.isArray(type) ? type.map(String) : [String(type)];
};

function checkNode(node, path, errors, seen) {
  if (!node || typeof node !== 'object') return;
  if (seen.has(node)) return;
  seen.add(node);

  const types = typesOf(node);

  // `{ "@id": … }` and `{ "@type": "WebPage", "@id": … }` are pointers at a node
  // published elsewhere in the graph, not copies of it: they are complete as
  // they stand, and asking them for the properties of the thing they point at
  // is how a correct graph gets reported as broken.
  const isReference =
    '@id' in node && Object.keys(node).every((key) => key === '@id' || key === '@type');

  if (!types.length && !isReference) {
    errors.push({ path, message: 'Missing @type.' });
  }

  for (const type of types) {
    if (!KNOWN_TYPES.has(type)) {
      errors.push({ path: `${path}@type`, message: `Unknown @type “${type}”.` });
      continue;
    }
    if (isReference) continue;
    for (const property of REQUIRED_PROPERTIES[type] ?? []) {
      const value = node[property];
      if (value === undefined || value === null || value === '') {
        errors.push({ path: `${path}${property}`, message: `${type} requires “${property}”.` });
      }
    }
  }

  for (const [key, value] of Object.entries(node)) {
    const childPath = `${path}${key}`;

    if (URL_PROPERTIES.has(key)) {
      const candidates = Array.isArray(value) ? value : [value];
      for (const candidate of candidates) {
        if (typeof candidate === 'string' && !isAbsoluteUrl(candidate)) {
          errors.push({ path: childPath, message: `“${candidate}” is not an absolute URL.` });
        }
      }
    }
    if (DATE_PROPERTIES.has(key) && typeof value === 'string' && !isIsoDate(value)) {
      errors.push({ path: childPath, message: `“${value}” is not an ISO 8601 date.` });
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => checkNode(item, `${childPath}.${index}.`, errors, seen));
    } else if (value && typeof value === 'object') {
      checkNode(value, `${childPath}.`, errors, seen);
    }
  }
}

/**
 * Checks one node and everything nested inside it.
 *
 * @param {object} node
 * @returns {{valid: boolean, errors: Array<{path: string, message: string}>}}
 */
function validateNode(node) {
  const errors = [];
  checkNode(node, '', errors, new Set());
  return { valid: errors.length === 0, errors };
}

/**
 * Checks a list of nodes, or a whole `{ '@context', '@graph' }` document.
 *
 * @param {Array<object>|object} input
 * @returns {{valid: boolean, errors: Array<{path: string, message: string}>}}
 */
function validateGraph(input) {
  const errors = [];

  if (input && !Array.isArray(input) && typeof input === 'object' && '@graph' in input) {
    if (!input['@context']) errors.push({ path: '@context', message: 'Missing @context.' });
    if (!Array.isArray(input['@graph'])) {
      errors.push({ path: '@graph', message: '@graph must be a list of nodes.' });
      return { valid: false, errors };
    }
    input['@graph'].forEach((node, index) =>
      checkNode(node, `@graph.${index}.`, errors, new Set())
    );
    return { valid: errors.length === 0, errors };
  }

  const nodes = Array.isArray(input) ? input : [input];
  nodes.forEach((node, index) =>
    checkNode(node, nodes.length > 1 ? `${index}.` : '', errors, new Set())
  );
  return { valid: errors.length === 0, errors };
}

/** {@link validateGraph} under the name the panel calls it by. */
const validate = validateGraph;

const validateModule = { KNOWN_TYPES, REQUIRED_PROPERTIES, validate, validateGraph, validateNode };

module.exports = validateModule;
