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

/**
 * One action on several files. A `delete` is all or nothing — a 409 naming
 * every file still in use (`data.refused`) — and `{ force: true }` removes
 * them anyway, as on a single delete.
 *
 * @param {{ids: Array<number>, action: string, payload?: object|null}} body
 * @param {{force?: boolean}} [opts]
 */
export const bulk = (body, { force = false, ...opts } = {}) =>
  http.request(endpoints.adminMedia.bulk, {
    body,
    ...(force ? { params: { force: true } } : null),
    ...opts,
  });

/**
 * Refiles files under `folder` — `null` for no folder (prompt 51). The answer
 * is `{ affected, missing }`: the files whose folder changed, and the ids that
 * matched nothing.
 *
 * @param {Array<number>} ids
 * @param {string|null} folder
 */
export const move = (ids, folder, opts) => bulk({ ids, action: 'move', payload: { folder } }, opts);

/**
 * Renames a folder, and every folder inside it, by refiling their records
 * (prompt 51). A name that already holds files is a 422 on `to` carrying
 * `data.existing` until `merge` is `true`. Records only: every file keeps its
 * address, so no Cloudinary path changes.
 *
 * @param {{from: string, to: string, merge?: boolean}} body
 */
export const renameFolder = (body, opts) =>
  http.request(endpoints.adminMedia.renameFolder, { body, ...opts });

const mediaService = { list, get, create, update, patch, remove, bulk, move, renameFolder };

export default mediaService;
