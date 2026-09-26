/**
 * Leads (00_MASTER_CONTEXT.md §5.14, §6.7).
 *
 * `create` is the only public call — every form on the site ends here. The
 * rest is the CRM, scoped server-side to what the signed-in role may see (D15).
 */

import { buildUrl } from './http';
import { endpoints } from './endpoints';
import http from './http';

/** Public capture; the API accepts the honeypot `website` field (§5.11). */
export const create = (body, opts) => http.request(endpoints.leads.create, { body, ...opts });

export const adminList = (params, opts) =>
  http.request(endpoints.adminLeads.list, { params, ...opts });

export const adminGet = (id, opts) =>
  http.request(endpoints.adminLeads.get, { pathParams: { id }, ...opts });

/** Status, priority, assignee, follow-up and lost reason all go through PATCH. */
export const patch = (id, body, opts) =>
  http.request(endpoints.adminLeads.patch, { pathParams: { id }, body, ...opts });

export const remove = (id, opts) =>
  http.request(endpoints.adminLeads.remove, { pathParams: { id }, ...opts });

/** A sales user takes an unassigned lead (D89). */
export const claim = (id, opts) =>
  http.request(endpoints.adminLeads.claim, { pathParams: { id }, ...opts });

export const addNote = (id, text, opts) =>
  http.request(endpoints.adminLeads.addNote, { pathParams: { id }, body: { text }, ...opts });

export const removeNote = (id, noteId, opts) =>
  http.request(endpoints.adminLeads.removeNote, { pathParams: { id, noteId }, ...opts });

export const bulk = (body, opts) => http.request(endpoints.adminLeads.bulk, { body, ...opts });

/**
 * A lead the desk enters itself — a walk-in, a call, a portal lead (prompt 51).
 * A sales user's is their own; anyone else's goes to the colleague named or
 * is auto-assigned.
 */
export const adminCreate = (body, opts) =>
  http.request(endpoints.adminLeads.create, { body, ...opts });

/**
 * A conversation on the timeline — `{ type, outcome?, note? }` (prompt 51).
 * A status or follow-up that came of it is a separate `patch`.
 */
export const logActivity = (id, body, opts) =>
  http.request(endpoints.adminLeads.logActivity, { pathParams: { id }, body, ...opts });

/** The CSV URL for `utils/download.js`, which adds the bearer token (D46). */
export const exportUrl = (params) => buildUrl(endpoints.adminLeads.exportCsv, {}, params);

const leadService = {
  create,
  adminList,
  adminGet,
  patch,
  remove,
  claim,
  addNote,
  removeNote,
  bulk,
  adminCreate,
  logActivity,
  exportUrl,
};

export default leadService;
