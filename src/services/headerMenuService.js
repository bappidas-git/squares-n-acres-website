/**
 * The header's menus (QA-56). `config/navigation.js` builds the bar from these
 * and from the pages placed in them; Admin → Pages → Header menu edits them.
 */

import { endpoints } from './endpoints';
import http from './http';

/** The active menus, left to right, unpaginated. */
export const list = (params, opts) => http.request(endpoints.headerMenus.list, { params, ...opts });

export const adminList = (params, opts) =>
  http.request(endpoints.adminHeaderMenus.list, { params, ...opts });

export const adminGet = (id, opts) =>
  http.request(endpoints.adminHeaderMenus.get, { pathParams: { id }, ...opts });

export const create = (body, opts) =>
  http.request(endpoints.adminHeaderMenus.create, { body, ...opts });

export const update = (id, body, opts) =>
  http.request(endpoints.adminHeaderMenus.update, { pathParams: { id }, body, ...opts });

export const patch = (id, body, opts) =>
  http.request(endpoints.adminHeaderMenus.patch, { pathParams: { id }, body, ...opts });

export const remove = (id, opts) =>
  http.request(endpoints.adminHeaderMenus.remove, { pathParams: { id }, ...opts });

export const bulk = (body, opts) =>
  http.request(endpoints.adminHeaderMenus.bulk, { body, ...opts });

const headerMenuService = { list, adminList, adminGet, create, update, patch, remove, bulk };

export default headerMenuService;
