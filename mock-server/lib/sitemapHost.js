/**
 * Where the sitemap index and `robots.txt` name their child sitemaps
 * (prompt 51).
 *
 * On the origin and prefix the document was fetched from — `/api/sitemap.xml`
 * on the API host names `/api/sitemap-properties.xml` there — so every child
 * opens wherever the index was read, but only when that origin is one the site
 * answers on: the origin of `seoSettings.siteUrl`, the API's own
 * (`REACT_APP_API_URL`, when it is set) and a local one. Any other `Host` or
 * `X-Forwarded-Host` falls back to `seoSettings.siteUrl`, the address the index
 * always used: these documents are cached for an hour, and a forged header must
 * not put another site's address into one. The forwarded headers only ever
 * propose the origin; the list decides.
 *
 * The pages inside the child sitemaps are not affected — they are the site's
 * pages, and always carry `seoSettings.siteUrl`.
 */

/** Hosts that are this machine, on any port. */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** The first value of a header a chain of proxies may have appended to. */
const firstOf = (value) =>
  String(value ?? '')
    .split(',')[0]
    .trim();

/**
 * `https://www.example.com` for any http(s) address of that origin, or `null`.
 *
 * @param {string|null|undefined} url
 * @returns {string|null}
 */
function originOf(url) {
  if (!url) return null;
  try {
    const parsed = new URL(String(url));
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.origin : null;
  } catch {
    return null;
  }
}

/**
 * The origin a request proposes: the forwarded scheme and host when a proxy
 * set them, the connection's own otherwise.
 *
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function requestOrigin(req) {
  const proto = firstOf(req.get('x-forwarded-proto')) || req.protocol;
  const host = firstOf(req.get('x-forwarded-host')) || req.get('host');
  if (!host || !/^https?$/i.test(proto)) return null;
  return originOf(`${proto.toLowerCase()}://${host}`);
}

/**
 * Whether the index may name its children on an origin.
 *
 * @param {string|null} origin
 * @param {{siteUrl?: string, apiUrl?: string|null}} allowed
 * @returns {boolean}
 */
function isAllowedOrigin(origin, { siteUrl, apiUrl } = {}) {
  if (!origin) return false;
  if (LOCAL_HOSTS.has(new URL(origin).hostname)) return true;
  return [originOf(siteUrl), originOf(apiUrl)].filter(Boolean).includes(origin);
}

/**
 * The base the child sitemaps are named on: `<origin><prefix>` for a request
 * that came in on an allowed origin, `seoSettings.siteUrl` for any other.
 *
 * @param {import('express').Request} req
 * @param {{siteUrl?: string, apiUrl?: string|null, prefix?: string}} options
 *   `prefix` is the path the documents were fetched under: `/api`, or nothing
 *   at the root
 * @returns {string}
 */
function sitemapBase(req, { siteUrl, apiUrl = null, prefix = '' } = {}) {
  const origin = requestOrigin(req);
  if (isAllowedOrigin(origin, { siteUrl, apiUrl })) return `${origin}${prefix}`;
  return String(siteUrl ?? '').replace(/\/+$/, '');
}

module.exports = { isAllowedOrigin, originOf, requestOrigin, sitemapBase };
