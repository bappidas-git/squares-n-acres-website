/**
 * The map addresses a page may embed as they are.
 *
 * Google's "Embed a map" dialog and a shared Google My Maps are the two ways
 * an editor gets one; anything else in an `<iframe>` on a public page is a
 * page of somebody else's, so it is refused on the way in and ignored on the
 * way out.
 */
export const MAP_EMBED_PREFIXES = [
  'https://www.google.com/maps/embed',
  'https://www.google.com/maps/d/embed',
];

/**
 * @param {string|null|undefined} url
 * @returns {boolean}
 */
export const isMapEmbedUrl = (url) => {
  const value = String(url ?? '').trim();
  return MAP_EMBED_PREFIXES.some((prefix) => value.startsWith(prefix));
};

export default isMapEmbedUrl;
