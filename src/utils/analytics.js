/**
 * The one door to the data layer.
 *
 * Google Tag Manager reads `window.dataLayer`; every event the site sends —
 * a WhatsApp click, a call, a lead — is pushed through `track()` so that the
 * event names are written down in one place and a page never has to know
 * whether a tag manager is installed at all. With no container on the page the
 * pushes simply accumulate in the array and nothing happens.
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
  floorPlanDownload: 'floor_plan_download',
  brochureDownload: 'brochure_download',
  documentDownload: 'document_download',
};

/**
 * Push one event onto the data layer.
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

  try {
    window.dataLayer = Array.isArray(window.dataLayer) ? window.dataLayer : [];
    window.dataLayer.push({ event, ...payload });
    return true;
  } catch {
    return false;
  }
}

const analytics = { EVENTS, track };
export default analytics;
