/**
 * The one door to the data layer.
 *
 * Google Tag Manager reads `window.dataLayer`; every event the site sends —
 * a WhatsApp click, a call, a lead — is pushed through `track()` so that the
 * event names are written down in one place and a page never has to know
 * whether a tag manager is installed at all. With no container on the page the
 * pushes simply accumulate in the array and nothing happens.
 *
 * When GA4 or the Meta pixel is on the page the same event goes to
 * `gtag('event', …)` and `fbq('trackCustom', …)` as well, so a site that runs
 * either of them directly rather than through the tag manager records it once
 * and only once. The snippets are injected by `components/seo/AnalyticsScripts`
 * from `settings.integrations`; with no id configured `window.gtag` and
 * `window.fbq` are simply absent and both bridges are no-ops.
 *
 *   track('whatsapp_click', { propertyId: 12 });
 */

/** The events the site sends. A name not in here is a typo, not an event. */
export const EVENTS = {
  // A single-page app fires one automatic page view in its life, so GA4 is
  // configured with `send_page_view: false` and every route change sends this.
  pageView: 'page_view',
  whatsappClick: 'whatsapp_click',
  callClick: 'call_click',
  shareClick: 'share_click',
  shortlistAdd: 'shortlist_add',
  shortlistRemove: 'shortlist_remove',
  leadSubmit: 'lead_submit',
  // An application is its own record, never a lead (D91), so it is its own
  // event: counting it as `lead_submit` would inflate the pipeline in GA4.
  jobApplication: 'job_application',
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

/** Whether the Meta pixel is on the page and ready to receive events. */
export function hasPixel() {
  return typeof window !== 'undefined' && typeof window.fbq === 'function';
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

  if (hasPixel()) {
    try {
      // `trackCustom`, not `track`: the pixel's `track` is reserved for Meta's
      // own seventeen standard events, and sending `whatsapp_click` through it
      // is how a pixel starts silently dropping events.
      window.fbq('trackCustom', event, payload);
      pushed = true;
    } catch {
      // Same again.
    }
  }

  return pushed;
}

const analytics = { EVENTS, hasGa4, hasPixel, track };
export default analytics;
