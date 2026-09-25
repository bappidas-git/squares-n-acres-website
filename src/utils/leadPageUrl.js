import { URL_MAX_LENGTH } from '../services/schemas/limits';

/**
 * The address a lead was sent from, in no more than the 500 characters a
 * `url` may have (`services/schemas/limits.js`, QA-65).
 *
 * A lead records `window.location.href`, and a visitor who arrives from an
 * advertisement brings an address with `gclid`, `gbraid`, `_gl` and a row of
 * `utm_*` tags on it — past 500 characters the API refuses it with 422, and
 * the enquiry with it, over a field the visitor never sees. So the
 * address is shortened the way that keeps it an address: the fragment goes
 * first, then the query. The `utm_*` values travel separately, in the lead's
 * `utm` (`leadStorage.getUtm()`), so what the query held of use is not lost.
 * An address whose path alone is too long is not sent at all.
 *
 * @param {string} [href] defaults to the page the visitor is on
 * @returns {string|null}
 */
export default function leadPageUrl(
  href = typeof window === 'undefined' ? null : window.location.href
) {
  if (typeof href !== 'string' || href === '') return null;
  if (href.length <= URL_MAX_LENGTH) return href;

  let url;
  try {
    url = new URL(href);
  } catch {
    return null;
  }

  url.hash = '';
  if (url.href.length <= URL_MAX_LENGTH) return url.href;

  const bare = `${url.origin}${url.pathname}`;
  return bare.length <= URL_MAX_LENGTH ? bare : null;
}
