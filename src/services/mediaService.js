/**
 * The media library (00_MASTER_CONTEXT.md §6.12).
 *
 * The API stores metadata only — the binary goes straight to Cloudinary from
 * the browser (prompt 39).
 */

import { endpoints } from './endpoints';
import http from './http';

export const list = (params, opts) => http.request(endpoints.adminMedia.list, { params, ...opts });

export const get = (id, opts) =>
  http.request(endpoints.adminMedia.get, { pathParams: { id }, ...opts });

export const create = (body, opts) => http.request(endpoints.adminMedia.create, { body, ...opts });

export const update = (id, body, opts) =>
  http.request(endpoints.adminMedia.update, { pathParams: { id }, body, ...opts });

export const patch = (id, body, opts) =>
  http.request(endpoints.adminMedia.patch, { pathParams: { id }, body, ...opts });

/**
 * Removes a library entry.
 *
 * The API refuses with a 409 listing `usedIn` when something still shows the
 * file (prompt 39 §5); `{ force: true }` is the editor's answer to that list.
 * Either way the Cloudinary asset stays where it is — this API has never held
 * the binary (D12).
 *
 * @param {string|number} id
 * @param {{force?: boolean}} [opts]
 */
export const remove = (id, { force = false, ...opts } = {}) =>
  http.request(endpoints.adminMedia.remove, {
    pathParams: { id },
    ...(force ? { params: { force: true } } : null),
    ...opts,
  });

export const bulk = (body, opts) => http.request(endpoints.adminMedia.bulk, { body, ...opts });

const mediaService = { list, get, create, update, patch, remove, bulk };

export default mediaService;
