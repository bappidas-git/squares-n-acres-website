/**
 * Redirects (00_MASTER_CONTEXT.md §9.10, D30).
 *
 * The API owns the rules; `RedirectHandler` (prompt 37) loads them once and
 * resolves each navigation client-side, which is the closest an SPA gets to a
 * 301. Server-level redirects are documented for the Laravel deployment.
 *
 * The contract has no import or export endpoint for redirects; the admin
 * screen of prompt 37 builds its CSV in the browser from `adminList`, the way
 * the property export does (D44).
 */

import { endpoints } from './endpoints';
import http from './http';

/** Active rules only: `[{ fromPath, toPath, statusCode }]`. */
export const list = (opts) => http.request(endpoints.redirects.list, { ...opts });

/**
 * The rule that matches a pathname, or `null`. Pure — it takes the rules the
 * caller already loaded rather than asking the API on every navigation.
 *
 * @param {string} pathname
 * @param {Array<{fromPath: string, toPath: string, statusCode?: number}>} rules
 */
export function resolve(pathname, rules = []) {
  const wanted = String(pathname || '').replace(/\/+$/, '') || '/';
  return (
    (Array.isArray(rules) ? rules : []).find((rule) => {
      const from = String(rule?.fromPath || '').replace(/\/+$/, '') || '/';
      return from === wanted;
    }) ?? null
  );
}

export const adminList = (params, opts) =>
  http.request(endpoints.adminRedirects.list, { params, ...opts });

export const adminGet = (id, opts) =>
  http.request(endpoints.adminRedirects.get, { pathParams: { id }, ...opts });

export const create = (body, opts) =>
  http.request(endpoints.adminRedirects.create, { body, ...opts });

export const update = (id, body, opts) =>
  http.request(endpoints.adminRedirects.update, { pathParams: { id }, body, ...opts });

export const patch = (id, body, opts) =>
  http.request(endpoints.adminRedirects.patch, { pathParams: { id }, body, ...opts });

export const remove = (id, opts) =>
  http.request(endpoints.adminRedirects.remove, { pathParams: { id }, ...opts });

export const bulk = (body, opts) => http.request(endpoints.adminRedirects.bulk, { body, ...opts });

const redirectService = {
  list,
  resolve,
  adminList,
  adminGet,
  create,
  update,
  patch,
  remove,
  bulk,
};

export default redirectService;
