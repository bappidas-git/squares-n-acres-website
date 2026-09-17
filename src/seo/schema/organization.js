/**
 * The knowledge-graph node: who publishes this site (§9.3).
 *
 * It is the one node that is the same on every page, which is why its `@id` is
 * `<siteUrl>/#organization` and why every other node points at it rather than
 * repeating it.
 */

import { absolute, compact } from './graph';

/** The `@id` of the publisher node, for anything that references it. */
export const organizationId = (siteUrl) =>
  `${String(siteUrl ?? '').replace(/\/+$/, '')}/#organization`;

/**
 * @param {object} [_input] unused; the publisher comes from settings, not from a record
 * @param {{seoSettings?: object, siteSettings?: object}} [context]
 * @returns {object} an `Organization`, `RealEstateAgent` or `LocalBusiness` node
 */
export function organizationNode(_input = {}, context = {}) {
  const seoSettings = context.seoSettings ?? {};
  const knowledge = seoSettings.knowledgeGraph ?? {};
  const siteUrl = String(context.siteUrl ?? seoSettings.siteUrl ?? '').replace(/\/+$/, '');
  const address = knowledge.address ?? {};
  const geo = knowledge.geo ?? {};

  return compact({
    '@type': knowledge.type || 'Organization',
    '@id': organizationId(siteUrl),
    name: knowledge.name,
    legalName: knowledge.legalName,
    url: siteUrl || undefined,
    logo: knowledge.logoUrl
      ? { '@type': 'ImageObject', url: absolute(siteUrl, knowledge.logoUrl) }
      : undefined,
    image: absolute(siteUrl, knowledge.logoUrl),
    description: knowledge.description,
    telephone: knowledge.phone,
    email: knowledge.email,
    address: compact({
      '@type': 'PostalAddress',
      streetAddress: address.streetAddress,
      addressLocality: address.addressLocality,
      addressRegion: address.addressRegion,
      postalCode: address.postalCode,
      addressCountry: address.addressCountry,
    }),
    geo:
      geo.latitude && geo.longitude
        ? { '@type': 'GeoCoordinates', latitude: geo.latitude, longitude: geo.longitude }
        : undefined,
    openingHours: knowledge.openingHours,
    priceRange: knowledge.priceRange,
    areaServed: knowledge.areaServed,
    sameAs: knowledge.sameAs,
  });
}

export default organizationNode;
