/**
 * The one door to the data layer.
 *
 * Google Tag Manager reads `window.dataLayer`; every event the site sends —
 * a WhatsApp click, a call, a lead — is pushed through `track()` so that the
 * event names are written down in one place and a page never has to know
 * whether a tag manager is installed at all. With no container on the page the
 * pushes simply accumulate in the array and nothing happens.
 *
 * When GA4 is configured the same event goes to `gtag('event', …)` as well, so
 * a site that runs GA4 directly rather than through GTM records it once and
 * only once. The `gtag.js` snippet itself is injected by `<Seo>` in prompt 38
 * from `seoSettings`; until then `window.gtag` is simply absent and the bridge
 * is a no-op.
 *
 *   track('whatsapp_click', { propertyId: 12 });
 */

/** The events the site sends. A name not in here is a typo, not an event. */
export const EVENTS = {
  whatsappClick: 'whatsapp_click',
  callClick: 'call_click',
  shareClick: 'share_click',
  shortlistAdd: 'shortlist_add',
  shortlistRemove: 'shortlist_remove',
  leadSubmit: 'lead_submit',
  galleryOpen: 'gallery_open',
  search: 'search',
  floorPlanDownload: 'floor_plan_download',
  brochureDownload: 'brochure_download',
  documentDownload: 'document_download',
  newsletterSubscribe: 'newsletter_subscribe',
};

/** Whether a GA4 tag is on the page and ready to receive events. */
export function hasGa4() {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
}

/**
 * Push one event onto the data layer, and to GA4 when it is configured.
 *
 * Undefined and null parameters are dropped, so a call with no property id
 * sends `{ event }` rather than `{ event, propertyId: undefined }`.
 *
 * @param {string} event one of `EVENTS`
 * @param {object} [params]
 * @returns {boolean} whether the push went through
 */
export function track(event, params = {}) {
  if (typeof window === 'undefined' || !event) return false;

  const payload = Object.fromEntries(
    Object.entries(params ?? {}).filter(([, value]) => value !== undefined && value !== null)
  );

  let pushed = false;

  try {
    window.dataLayer = Array.isArray(window.dataLayer) ? window.dataLayer : [];
    window.dataLayer.push({ event, ...payload });
    pushed = true;
  } catch {
    // A frozen or hostile `window.dataLayer` must not take a click with it.
  }

  if (hasGa4()) {
    try {
      window.gtag('event', event, payload);
      pushed = true;
    } catch {
      // Same: analytics never breaks the thing the visitor actually clicked.
    }
  }

  return pushed;
}

const analytics = { EVENTS, hasGa4, track };
export default analytics;
