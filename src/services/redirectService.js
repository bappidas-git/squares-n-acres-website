/**
 * Redirects (00_MASTER_CONTEXT.md §9.10, D30).
 *
 * The API owns the rules; `RedirectHandler` (prompt 38) loads them once and
 * matches each navigation in the browser, which is the closest an SPA gets to a
 * 301. Server-level redirects are documented for the Laravel deployment, and
 * the SEO desk exports them as an Nginx snippet.
 *
 * Two functions answer "where does this path go?", and they are not the same
 * question:
 *
 *   - `matchRedirect(pathname, rules)` is **pure**. It reads the list the
 *     caller already loaded, so a navigation costs no request — which is what
 *     makes client-side redirects usable at all.
 *   - `resolve(path)` **asks the API** (`GET /redirects/resolve`). It is the
 *     redirects screen's "Check a URL" tester, and it is the one call that
 *     counts a hit, so it is never on the navigation path.
 */

import { buildUrl } from './http';
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
export function matchRedirect(pathname, rules = []) {
  const wanted = String(pathname || '').replace(/\/+$/, '') || '/';
  return (
    (Array.isArray(rules) ? rules : []).find((rule) => {
      const from = String(rule?.fromPath || '').replace(/\/+$/, '') || '/';
      return from === wanted;
    }) ?? null
  );
}

/**
 * What the API would do with a path: the rule, or `null` when nothing matches.
 *
 * A 404 is the answer "no redirect", not a failure, so it resolves rather than
 * throws; every other status is the caller's to report.
 *
 * @param {string} path
 * @param {{signal?: AbortSignal}} [opts]
 * @returns {Promise<{fromPath: string, toPath: string, statusCode: number}|null>}
 */
export async function resolve(path, opts) {
  try {
    const { data } = await http.request(endpoints.redirects.resolve, {
      params: { path: String(path ?? '') },
      ...opts,
    });
    return data ?? null;
  } catch (thrown) {
    if (thrown?.status === 404) return null;
    throw thrown;
  }
}

export const adminList = (params, opts) =>
  http.request(endpoints.adminRedirects.list, { params, ...opts });

/**
 * A rule the site has just followed, counted (prompt 51). Fire and forget:
 * the visitor is on their way whatever the API says.
 *
 * @param {number|string} id
 */
export function hit(id) {
  if (id === undefined || id === null) return;
  http.request(endpoints.redirects.hit, { pathParams: { id } }).catch(() => {});
}

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

/** A path compares without its query string and without a trailing slash, as the API stores it. */
export function normalizePath(value) {
  const text = String(value ?? '').trim();
  if (text === '') return '';

  const withoutQuery = text.split('?')[0].split('#')[0];
  return withoutQuery.length > 1 ? withoutQuery.replace(/\/+$/, '') : withoutQuery;
}

/**
 * The rule for a path, whether or not one already exists.
 *
 * `fromPath` is unique on the API, so "create it" is a 422 the second time a
 * listing is saved with the same redirect switched on. The SEO panel therefore
 * asks for an upsert rather than a create: the rules are searched for the path
 * (`q` matches `fromPath`), an exact match is patched, and only a path nothing
 * answers yet is created.
 *
 * The search narrows the list rather than deciding it — `q` is a substring
 * match, so `/lake` would find `/lakeview` — which is why the exact comparison
 * happens here, on normalised paths.
 *
 * @param {{fromPath: string, toPath: string, statusCode?: number, isActive?: boolean,
 *   note?: string}} rule
 * @param {object} [opts] passed to `http.request` (`signal`)
 * @returns {Promise<object>} the envelope of the write
 */
export async function upsertByFromPath(rule, opts) {
  const fromPath = normalizePath(rule?.fromPath);
  if (!fromPath) throw new Error('A redirect needs a path to redirect from.');

  const body = {
    toPath: normalizePath(rule?.toPath) || String(rule?.toPath ?? '').trim(),
    statusCode: Number(rule?.statusCode) || 301,
    isActive: rule?.isActive !== false,
  };

  const existing = await findByFromPath(fromPath, opts);
  if (existing) return patch(existing.id, body, opts);

  return create({ fromPath, ...body, ...(rule?.note ? { note: rule.note } : {}) }, opts);
}

/**
 * The stored rule for a path, or `null`.
 *
 * @param {string} path
 * @param {object} [opts]
 * @returns {Promise<object|null>}
 */
export async function findByFromPath(path, opts) {
  const wanted = normalizePath(path);
  if (!wanted) return null;

  const { data } = await adminList({ q: wanted, perPage: 'all' }, opts);
  const rows = Array.isArray(data) ? data : [];
  return rows.find((row) => normalizePath(row?.fromPath) === wanted) ?? null;
}

/**
 * Switches a rule off without losing it.
 *
 * An editor who unticks "Redirect this page" has changed their mind about the
 * redirect, not asked for its history to be deleted — and the redirects screen
 * (prompt 37) is where a rule is removed for good.
 *
 * @param {string} path
 * @param {object} [opts]
 * @returns {Promise<object|null>} the envelope, or `null` when there was no rule
 */
export async function deactivateByFromPath(path, opts) {
  const existing = await findByFromPath(path, opts);
  if (!existing || existing.isActive === false) return null;
  return patch(existing.id, { isActive: false }, opts);
}

/**
 * Parsed CSV rows, in one request.
 *
 * @param {{rows: Array<{fromPath: string, toPath: string, statusCode?: number,
 *   note?: string}>}} body
 * @param {object} [opts]
 * @returns {Promise<{data: {created: number, updated: number, skipped: number}}>}
 */
export const importRows = (body, opts) =>
  http.request(endpoints.adminRedirects.import, { body, ...opts });

/** The absolute URL of the CSV export — what `downloadAuthenticated` fetches (D46). */
export const exportUrl = (params) => buildUrl(endpoints.adminRedirects.exportCsv, {}, params);

const redirectService = {
  list,
  matchRedirect,
  resolve,
  hit,
  import: importRows,
  importRows,
  exportUrl,
  adminList,
  adminGet,
  create,
  update,
  patch,
  remove,
  bulk,
  deactivateByFromPath,
  findByFromPath,
  normalizePath,
  upsertByFromPath,
};

export default redirectService;
