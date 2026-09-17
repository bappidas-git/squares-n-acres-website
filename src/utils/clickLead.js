/**
 * The lead a WhatsApp or call click leaves behind.
 *
 * A click is only worth a record when we already know who is clicking: a
 * visitor who has filled a form in this session has a name and a number, so
 * `whatsapp-click` / `call-click` (§6.17) tells the sales desk that the person
 * who enquired about Lakeview Heights an hour ago has just tried to reach
 * somebody. For an anonymous click there is nothing to file — `POST /leads`
 * requires a name and a phone number — so those stay a `dataLayer` event only.
 *
 * The call is deliberately fire-and-forget: the visitor clicked a `tel:` or a
 * `wa.me` link, and nothing here may delay it or turn a failed request into a
 * visible error. A rejection is swallowed on purpose — there is no user-facing
 * consequence to report and no state to roll back.
 */

import leadService from '../services/leadService';
import { getUtm } from './leadStorage';

/**
 * File a click against a visitor we already know.
 *
 * @param {object} options
 * @param {{name?: string, phone?: string, email?: string}|null} options.visitor
 * @param {'whatsapp-click'|'call-click'} options.source
 * @param {number|string|null} [options.propertyId]
 * @param {string} [options.message]
 * @returns {boolean} whether a request was started
 */
export function recordClickLead({ visitor, source, propertyId = null, message = '' }) {
  if (!visitor?.name || !visitor?.phone) return false;

  const body = {
    name: visitor.name,
    phone: visitor.phone,
    source,
    consent: true,
    website: '',
    pageUrl: typeof window === 'undefined' ? null : window.location.href,
  };

  if (visitor.email) body.email = visitor.email;
  if (propertyId !== null && propertyId !== undefined && propertyId !== '') {
    body.propertyId = Number(propertyId);
  }
  if (message) body.message = message;

  const utm = getUtm();
  if (utm) body.utm = utm;

  leadService.create(body).catch(() => {});
  return true;
}

export default recordClickLead;
