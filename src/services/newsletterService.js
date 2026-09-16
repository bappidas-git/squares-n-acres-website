/**
 * Newsletter subscriptions (00_MASTER_CONTEXT.md §5.14, §6.14).
 *
 * A duplicate address answers 200 with "Already subscribed" rather than an
 * error, so the form treats it as a success (BUG-15).
 */

import { buildUrl } from './http';
import { endpoints } from './endpoints';
import http from './http';

export const subscribe = (body, opts) =>
  http.request(endpoints.newsletter.subscribe, { body, ...opts });

export const adminList = (params, opts) =>
  http.request(endpoints.adminNewsletterSubscribers.list, { params, ...opts });

export const remove = (id, opts) =>
  http.request(endpoints.adminNewsletterSubscribers.remove, { pathParams: { id }, ...opts });

export const exportUrl = (params) =>
  buildUrl(endpoints.adminNewsletterSubscribers.exportCsv, {}, params);

const newsletterService = { subscribe, adminList, remove, exportUrl };

export default newsletterService;
