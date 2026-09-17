/**
 * The site node, with the search box Google may offer under the result (§9.3).
 *
 * `@id` is `<siteUrl>/#website`; the publisher is a reference to
 * `<siteUrl>/#organization` rather than a second copy of it.
 */

import { compact, ref } from './graph';
import { organizationId } from './organization';

/** The `@id` of the site node. */
export const websiteId = (siteUrl) => `${String(siteUrl ?? '').replace(/\/+$/, '')}/#website`;

/**
 * @param {object} [_input] unused
 * @param {{seoSettings?: object, siteUrl?: string}} [context]
 * @returns {object} a `WebSite` node
 */
export function websiteNode(_input = {}, context = {}) {
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
    potentialAction: siteUrl
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

export default websiteNode;
