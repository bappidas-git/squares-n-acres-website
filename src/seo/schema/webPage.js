/**
 * The page itself (§9.3): the node a CMS page publishes, tied to the site node
 * so that a crawler can see where it sits.
 */

const { absolute, compact, isoDate, ref } = require('./graph');
const { websiteId } = require('./website');

/**
 * @param {object} input the normalised record (`entityAdapters.toSeoInput`)
 * @param {{siteUrl?: string, seoSettings?: object}} [context]
 * @returns {object|null}
 */
function webPageNode(input = {}, context = {}) {
  const page = input.entity ?? {};
  const canonical = input.canonical;
  if (!canonical) return null;

  const siteUrl = String(context.siteUrl ?? context.seoSettings?.siteUrl ?? '').replace(/\/+$/, '');
  const image = absolute(siteUrl, input.coverImageUrl);

  return compact({
    '@type': 'WebPage',
    '@id': `${canonical}#webpage`,
    url: canonical,
    name: input.title || input.effectiveTitle,
    description: input.description || input.summary,
    isPartOf: siteUrl ? ref(websiteId(siteUrl)) : undefined,
    primaryImageOfPage: image ? { '@type': 'ImageObject', url: image } : undefined,
    datePublished: isoDate(page.createdAt),
    dateModified: isoDate(page.updatedAt),
    inLanguage: 'en-IN',
  });
}

module.exports = webPageNode;
module.exports.webPageNode = webPageNode;
