/**
 * A locality as a place (§9.3): the node that lets "Whitefield" mean a
 * neighbourhood of Bengaluru rather than a word on a page.
 */

const { absolute, compact } = require('./graph');

/**
 * @param {object} input the normalised record (`entityAdapters.toSeoInput`) of a locality
 * @param {{siteUrl?: string, seoSettings?: object}} [context]
 * @returns {object|null}
 */
function placeNode(input = {}, context = {}) {
  const locality = input.entity ?? {};
  const canonical = input.canonical;
  if (!canonical) return null;

  const siteUrl = String(context.siteUrl ?? context.seoSettings?.siteUrl ?? '').replace(/\/+$/, '');
  const city = input.extras?.cityName;

  return compact({
    '@type': 'Place',
    '@id': `${canonical}#place`,
    name: locality.name,
    description: input.description || input.summary,
    url: canonical,
    image: absolute(siteUrl, locality.heroImageUrl),
    address: compact({
      '@type': 'PostalAddress',
      addressLocality: locality.name,
      addressRegion: 'Karnataka',
      postalCode: (input.extras?.pincodes ?? [])[0],
      addressCountry: 'IN',
    }),
    geo:
      locality.latitude && locality.longitude
        ? { '@type': 'GeoCoordinates', latitude: locality.latitude, longitude: locality.longitude }
        : undefined,
    containedInPlace: city ? { '@type': 'Place', name: city } : undefined,
  });
}

module.exports = placeNode;
module.exports.placeNode = placeNode;
