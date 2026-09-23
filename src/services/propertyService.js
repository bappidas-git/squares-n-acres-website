/**
 * Properties (00_MASTER_CONTEXT.md §5.7, §5.14).
 *
 * Every function is one registry call. The records come back exactly as the
 * API sends them: the frontend has no transformation layer (§5.1).
 */

import { endpoints } from './endpoints';
import http from './http';

/* Public */

/** Paginated search; `meta.facets` accompanies every answer (§5.7). */
export const list = (params, opts) => http.request(endpoints.properties.list, { params, ...opts });

/** The featured row of the home page, ordered by priority then recency. */
export const featured = (params, opts) =>
  http.request(endpoints.properties.featured, { params, ...opts });

/** One property by its public slug; 404 when it is inactive. */
export const getBySlug = (slug, opts) =>
  http.request(endpoints.properties.bySlug, { pathParams: { slug }, ...opts });

/** The editor's picks first, topped up to six (BUG-07/BUG-18). */
export const similar = (id, params, opts) =>
  http.request(endpoints.properties.similar, { pathParams: { id }, params, ...opts });

/** Counts one view; the API debounces per IP per hour (D29). */
export const view = (id, opts) =>
  http.request(endpoints.properties.view, { pathParams: { id }, ...opts });

/** Type-ahead groups for the hero and header search. */
export const suggestions = (q, opts) =>
  http.request(endpoints.properties.suggestions, { params: { q }, ...opts });

/**
 * The addresses of a listing's files, gated ones included, for the token
 * `POST /leads` answered a lead about it with (`leadStorage.getAccess`). A
 * public read carries no address for a gated file; this is how the page gets
 * one once the visitor has shared their details. 403 when the token is no
 * longer good.
 */
export const documentAccess = (id, token, opts) =>
  http.request(endpoints.properties.documentAccess, {
    pathParams: { id },
    body: { token },
    ...opts,
  });

/* Admin */

export const adminList = (params, opts) =>
  http.request(endpoints.adminProperties.list, { params, ...opts });

export const adminGet = (id, opts) =>
  http.request(endpoints.adminProperties.get, { pathParams: { id }, ...opts });

/**
 * The same record by slug — what the admin preview of an unpublished listing
 * reads, because a public URL carries no id (§5.10; the admin-preview decision is in
 * `docs/DECISIONS.md`).
 */
export const adminGetBySlug = (slug, opts) =>
  http.request(endpoints.adminProperties.bySlug, { pathParams: { slug }, ...opts });

export const create = (body, opts) =>
  http.request(endpoints.adminProperties.create, { body, ...opts });

/** Replaces the whole record with the form's payload (§5.8). */
export const update = (id, body, opts) =>
  http.request(endpoints.adminProperties.update, { pathParams: { id }, body, ...opts });

/** Updates only the fields given — toggles, reorders, SEO saves (BUG-01). */
export const patch = (id, body, opts) =>
  http.request(endpoints.adminProperties.patch, { pathParams: { id }, body, ...opts });

export const remove = (id, opts) =>
  http.request(endpoints.adminProperties.remove, { pathParams: { id }, ...opts });

export const duplicate = (id, opts) =>
  http.request(endpoints.adminProperties.duplicate, { pathParams: { id }, ...opts });

export const bulk = (body, opts) => http.request(endpoints.adminProperties.bulk, { body, ...opts });

export const checkSlug = (params, opts) =>
  http.request(endpoints.adminProperties.checkSlug, { params, ...opts });

const propertyService = {
  list,
  featured,
  getBySlug,
  similar,
  view,
  suggestions,
  documentAccess,
  adminList,
  adminGet,
  adminGetBySlug,
  create,
  update,
  patch,
  remove,
  duplicate,
  bulk,
  checkSlug,
};

export default propertyService;
