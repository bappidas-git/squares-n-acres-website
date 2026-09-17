/**
 * A builder as an organisation (§9.3).
 *
 * Its `@id` hangs off the builder's own page (`<canonical>#organization`), not
 * off the site's, so it can never be confused with the publisher node.
 */

import { absolute, compact } from './graph';

/**
 * @param {object} input the normalised record (`entityAdapters.toSeoInput`) of a developer
 * @param {{siteUrl?: string, seoSettings?: object}} [context]
 * @returns {object|null}
 */
export function developerOrganizationNode(input = {}, context = {}) {
  const developer = input.entity ?? {};
  const canonical = input.canonical;
  if (!canonical) return null;

  const siteUrl = String(context.siteUrl ?? context.seoSettings?.siteUrl ?? '').replace(/\/+$/, '');
  const website = developer.website ? String(developer.website) : '';

  return compact({
    '@type': 'Organization',
    '@id': `${canonical}#organization`,
    name: developer.name,
    url: canonical,
    description: input.description || input.summary,
    logo: developer.logoUrl
      ? { '@type': 'ImageObject', url: absolute(siteUrl, developer.logoUrl) }
      : undefined,
    image: absolute(siteUrl, developer.coverImageUrl ?? developer.logoUrl),
    foundingDate: developer.establishedYear ? String(developer.establishedYear) : undefined,
    areaServed: input.extras?.areaServed,
    sameAs: website ? [website] : undefined,
  });
}

export default developerOrganizationNode;
