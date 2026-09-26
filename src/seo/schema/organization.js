/**
 * The knowledge-graph node: who publishes this site (§9.3).
 *
 * It is the one node that is the same on every page, which is why its `@id` is
 * `<siteUrl>/#organization` and why every other node points at it rather than
 * repeating it.
 */

const { absolute, compact } = require('./graph');
const { formatPhoneForTel } = require('../../utils/format');

/** The `@id` of the publisher node, for anything that references it. */
const organizationId = (siteUrl) => `${String(siteUrl ?? '').replace(/\/+$/, '')}/#organization`;

/**
 * @param {object} [_input] unused; the publisher comes from settings, not from a record
 * @param {{seoSettings?: object, siteSettings?: object}} [context]
 * @returns {object} an `Organization`, `RealEstateAgent` or `LocalBusiness` node
 */
function organizationNode(_input = {}, context = {}) {
  const seoSettings = context.seoSettings ?? {};
  const knowledge = seoSettings.knowledgeGraph ?? {};
  const siteUrl = String(context.siteUrl ?? seoSettings.siteUrl ?? '').replace(/\/+$/, '');
  const address = knowledge.address ?? {};
  const geo = knowledge.geo ?? {};

  // The second number Site settings keep for the contact page is the
  // publisher's too: `telephone` becomes a list when it is set (prompt 51).
  const alternate = context.siteSettings?.general?.alternatePhone;
  const phones = [knowledge.phone, alternate ? formatPhoneForTel(alternate) : null].filter(
    (phone, index, all) =>
      phone &&
      all.findIndex((other) => formatPhoneForTel(other) === formatPhoneForTel(phone)) === index
  );

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
    telephone: phones.length > 1 ? phones : phones[0],
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

module.exports = organizationNode;
module.exports.organizationNode = organizationNode;
module.exports.organizationId = organizationId;
