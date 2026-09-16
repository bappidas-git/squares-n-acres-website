/**
 * Admin users (00_MASTER_CONTEXT.md §5.14, §7). Admin-only on the server.
 */

import { endpoints } from './endpoints';
import http from './http';

export const list = (params, opts) => http.request(endpoints.adminUsers.list, { params, ...opts });

export const get = (id, opts) =>
  http.request(endpoints.adminUsers.get, { pathParams: { id }, ...opts });

export const create = (body, opts) => http.request(endpoints.adminUsers.create, { body, ...opts });

export const update = (id, body, opts) =>
  http.request(endpoints.adminUsers.update, { pathParams: { id }, body, ...opts });

export const patch = (id, body, opts) =>
  http.request(endpoints.adminUsers.patch, { pathParams: { id }, body, ...opts });

export const remove = (id, opts) =>
  http.request(endpoints.adminUsers.remove, { pathParams: { id }, ...opts });

export const bulk = (body, opts) => http.request(endpoints.adminUsers.bulk, { body, ...opts });

const userService = { list, get, create, update, patch, remove, bulk };

export default userService;
