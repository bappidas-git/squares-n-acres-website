/**
 * The admin dashboard aggregate (00_MASTER_CONTEXT.md §6.16).
 *
 * One call replaces the four collection fetches the old Dashboard recomputed
 * in the browser (NEW-24); the API is role-aware.
 */

import { endpoints } from './endpoints';
import http from './http';

export const get = (opts) => http.request(endpoints.dashboard.get, { ...opts });

const dashboardService = { get };

export default dashboardService;
