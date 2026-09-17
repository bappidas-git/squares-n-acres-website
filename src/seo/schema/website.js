/**
 * The site node, with the search box Google may offer under the result (§9.3).
 *
 * `@id` is `<siteUrl>/#website`; the publisher is a reference to
 * `<siteUrl>/#organization` rather than a second copy of it.
 */

const { compact, ref } = require('./graph');
const { organizationId } = require('./organization');

/** The `@id` of the site node. */
const websiteId = (siteUrl) => `${String(siteUrl ?? '').replace(/\/+$/, '')}/#website`;

/**
 * @param {{searchAction?: boolean}} [input] `searchAction` publishes the
 *   `SearchAction` Google may draw a search box from — the home page's to
 *   offer, and nobody else's (§9.3)
 * @param {{seoSettings?: object, siteUrl?: string}} [context]
 * @returns {object} a `WebSite` node
 */
function websiteNode(input = {}, context = {}) {
  const seoSettings = context.seoSettings ?? {};
  const siteUrl = String(context.siteUrl ?? seoSettings.siteUrl ?? '').replace(/\/+$/, '');
  const name = seoSettings.knowledgeGraph?.name;

  return compact({
    '@type': 'WebSite',
    '@id': websiteId(siteUrl),
    url: siteUrl || undefined,
    name,
    description: seoSettings.defaults?.metaDescription,
    inLanguage: 'en-IN',
    publisher: ref(organizationId(siteUrl)),
    potentialAction:
      siteUrl && input.searchAction !== false
        ? {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: `${siteUrl}/properties?q={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
          }
        : undefined,
  });
}

module.exports = websiteNode;
module.exports.websiteNode = websiteNode;
module.exports.websiteId = websiteId;
