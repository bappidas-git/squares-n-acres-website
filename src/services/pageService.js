/**
 * CMS pages (00_MASTER_CONTEXT.md §6.10). The renderer arrives in prompt 30.
 */

import { endpoints } from './endpoints';
import http from './http';

/**
 * The navigation list: published pages that an editor placed in the header or
 * the footer, as `{ slug, title, headerMenu, footerColumn, order }`.
 *
 *   pageService.list({ showInHeader: true })
 */
export const list = (params, opts) => http.request(endpoints.pages.list, { params, ...opts });

/** Published pages only; `?preview=<token>` also returns drafts (D28). */
export const getBySlug = (slug, params, opts) =>
  http.request(endpoints.pages.bySlug, { pathParams: { slug }, params, ...opts });

export const adminList = (params, opts) =>
  http.request(endpoints.adminPages.list, { params, ...opts });

export const adminGet = (id, opts) =>
  http.request(endpoints.adminPages.get, { pathParams: { id }, ...opts });

export const create = (body, opts) => http.request(endpoints.adminPages.create, { body, ...opts });

export const update = (id, body, opts) =>
  http.request(endpoints.adminPages.update, { pathParams: { id }, body, ...opts });

export const patch = (id, body, opts) =>
  http.request(endpoints.adminPages.patch, { pathParams: { id }, body, ...opts });

export const remove = (id, opts) =>
  http.request(endpoints.adminPages.remove, { pathParams: { id }, ...opts });

export const bulk = (body, opts) => http.request(endpoints.adminPages.bulk, { body, ...opts });

export const checkSlug = (params, opts) =>
  http.request(endpoints.adminPages.checkSlug, { params, ...opts });

export const previewToken = (id, opts) =>
  http.request(endpoints.adminPages.previewToken, { pathParams: { id }, ...opts });

const pageService = {
  list,
  getBySlug,
  adminList,
  adminGet,
  create,
  update,
  patch,
  remove,
  bulk,
  checkSlug,
  previewToken,
};

export default pageService;
