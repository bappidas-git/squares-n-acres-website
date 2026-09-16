/**
 * The one HTTP client (00_MASTER_CONTEXT.md §5.1–§5.4, D48).
 *
 * Nothing in `src/` talks to the API except through `http.request(endpoint, …)`
 * with an entry of `services/endpoints.js`: the registry owns every path, this
 * module owns every header, every query string and every error.
 *
 * What it guarantees to a caller:
 *   - the envelope comes back untouched (`{ data, meta }` / `{ data, message }`)
 *     — there is no transformation layer in the frontend (§5.1);
 *   - a failure is always an `ApiError`, never an axios error;
 *   - a 401 logs the session out only when the call was an admin or auth call:
 *     a public page whose token has gone stale keeps rendering (BUG-14/NEW-13).
 */

import axios from 'axios';

import ApiError, { GENERIC_MESSAGE, NETWORK_MESSAGE } from './apiError';
import PATHS from '../routes/paths';
import storage from '../utils/storage';
import { endpoints } from './endpoints';

/** The three keys a signed-in session owns (§5.4, D10). */
export const AUTH_STORAGE_KEYS = {
  token: 'sna_auth_token',
  user: 'sna_auth_user',
  expiresAt: 'sna_auth_expires_at',
};

/** Where the admin session starts again after a 401 — a route, not an API path. */
const LOGIN_ROUTE = PATHS.adminLogin;

/** The API base — required, with no fallback (D48). */
const BASE_URL = process.env.REACT_APP_API_URL;
if (!BASE_URL) {
  throw new Error(
    'REACT_APP_API_URL is not set. Copy .env.example to .env and point it at your API.'
  );
}

/** Long enough for a cold mock or a slow CSV, short enough to fail visibly. */
const TIMEOUT_MS = 20000;

const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** `:slug`, and `:slug(*)` for the parameters that may contain slashes. */
const PATH_PARAM = /:([A-Za-z_][A-Za-z0-9_]*)(\(\*\))?/g;

const client = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_MS,
  headers: { Accept: 'application/json' },
});

/* ------------------------------------------------------------------ *
 * Token
 * ------------------------------------------------------------------ */

/** `undefined` until something asks; then the memo the interceptor reads. */
let authToken;

const readToken = () => {
  if (authToken === undefined) authToken = storage.getItem(AUTH_STORAGE_KEYS.token, null);
  return authToken;
};

/**
 * Sets (or clears, with `null`) the bearer token for every later request and
 * persists it, so a reload keeps the session.
 *
 * @param {string|null} token
 */
export function setAuthToken(token) {
  authToken = token || null;
  if (authToken) storage.setItem(AUTH_STORAGE_KEYS.token, authToken);
  else storage.removeItem(AUTH_STORAGE_KEYS.token);
}

/** Forgets every trace of the signed-in session, in memory and in storage. */
export function clearSession() {
  authToken = null;
  Object.values(AUTH_STORAGE_KEYS).forEach((key) => storage.removeItem(key));
}

/* ------------------------------------------------------------------ *
 * 401 handling
 * ------------------------------------------------------------------ */

/**
 * Clears the session and sends the browser to the login screen once.
 *
 * Several admin calls are usually in flight at the same time, so a single
 * expired token produces several 401s; the latch keeps them to one navigation,
 * and being already on the login screen is not a reason to navigate at all.
 */
let redirecting = false;

const defaultUnauthorized = () => {
  clearSession();
  if (typeof window === 'undefined') return;
  if (redirecting || window.location?.pathname === LOGIN_ROUTE) return;
  redirecting = true;
  window.location.assign(LOGIN_ROUTE);
};

let unauthorizedHandler = defaultUnauthorized;

/**
 * Replaces what happens when an admin call answers 401. `AdminAuthContext`
 * registers its own so the sign-out runs through React rather than a reload.
 *
 * @param {(() => void)|null} callback `null` restores the default
 * @returns {() => void} a function that restores the previous handler
 */
export function onUnauthorized(callback) {
  const previous = unauthorizedHandler;
  redirecting = false;
  unauthorizedHandler = typeof callback === 'function' ? callback : defaultUnauthorized;
  return () => {
    unauthorizedHandler = previous;
  };
}

/**
 * Whether a 401 on this URL means "your session ended" rather than "this
 * resource wants a token you never had". Only admin and auth calls sign the
 * user out; the login endpoint answers 401 for a wrong password (§5.4).
 */
const SESSION_PREFIXES = [endpoints.dashboard.get.path, endpoints.auth.profile.path].map(
  (path) => `${path.split('/').slice(0, 2).join('/')}/`
);

const isSessionCall = (url = '') => {
  const path = String(url).split('?')[0];
  if (path === endpoints.auth.login.path) return false;
  return SESSION_PREFIXES.some((prefix) => path.startsWith(prefix));
};

/* ------------------------------------------------------------------ *
 * Interceptors
 * ------------------------------------------------------------------ */

client.interceptors.request.use((config) => {
  const token = readToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data !== undefined && config.data !== null && !config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

/** `{ field: ['…'] }` — a single string becomes a one-element array (§5.3). */
const normalizeFieldErrors = (errors) => {
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) return {};
  return Object.fromEntries(
    Object.entries(errors).map(([field, messages]) => [
      field,
      Array.isArray(messages) ? messages.map(String) : [String(messages)],
    ])
  );
};

/** Every axios failure, translated into the one error shape of §5.3. */
export function toApiError(error) {
  if (error instanceof ApiError) return error;

  if (
    axios.isCancel?.(error) ||
    error?.code === 'ERR_CANCELED' ||
    error?.name === 'CanceledError'
  ) {
    return new ApiError({ message: 'Request canceled', isCanceled: true, original: error });
  }

  const response = error?.response;
  if (response) {
    const payload = response.data && typeof response.data === 'object' ? response.data : {};
    return new ApiError({
      status: response.status,
      message: payload.message || error.message || GENERIC_MESSAGE,
      errors: normalizeFieldErrors(payload.errors),
      original: error,
    });
  }

  const isTimeout = error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT';
  return new ApiError({
    status: 0,
    message: NETWORK_MESSAGE,
    isNetworkError: true,
    isTimeout,
    original: error,
  });
}

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = toApiError(error);
    if (apiError.status === 401 && isSessionCall(error?.config?.url)) unauthorizedHandler();
    return Promise.reject(apiError);
  }
);

/* ------------------------------------------------------------------ *
 * URL building
 * ------------------------------------------------------------------ */

const encodeSegmented = (value) =>
  String(value)
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');

/**
 * Fills the `:param` placeholders of a registry path.
 * A `:param(*)` keeps its slashes; every other value is encoded whole.
 *
 * @param {object} endpoint
 * @param {Record<string, string|number>} [pathParams]
 * @returns {string}
 */
export function buildPath(endpoint, pathParams = {}) {
  return endpoint.path.replace(PATH_PARAM, (_match, name, wildcard) => {
    const value = pathParams?.[name];
    if (value === undefined || value === null || value === '') {
      throw new Error(`${endpoint.key}: missing path parameter "${name}"`);
    }
    return wildcard ? encodeSegmented(value) : encodeURIComponent(String(value));
  });
}

/**
 * The query the endpoint actually accepts: unknown keys are dropped (§5.6),
 * arrays become comma-separated lists, booleans become `true`/`false`, and
 * `undefined`, `null` and `''` never reach the wire.
 *
 * @param {object} endpoint
 * @param {Record<string, unknown>} [params]
 * @returns {Record<string, string>}
 */
export function buildParams(endpoint, params = {}) {
  const allowed = endpoint.query || {};
  const query = {};

  for (const [key, raw] of Object.entries(params || {})) {
    if (!(key in allowed)) continue;
    if (raw === undefined || raw === null || raw === '') continue;

    if (Array.isArray(raw)) {
      const csv = raw
        .filter((item) => item !== undefined && item !== null && item !== '')
        .map((item) => (typeof item === 'boolean' ? String(item) : String(item)))
        .join(',');
      if (csv) query[key] = csv;
      continue;
    }

    query[key] = typeof raw === 'boolean' ? String(raw) : String(raw);
  }

  return query;
}

/**
 * The absolute URL of a call — what `utils/download.js` hands to `fetch` for
 * the authenticated CSV exports (D46).
 *
 * @param {object} endpoint
 * @param {Record<string, string|number>} [pathParams]
 * @param {Record<string, unknown>} [params]
 * @returns {string}
 */
export function buildUrl(endpoint, pathParams = {}, params = {}) {
  const path = buildPath(endpoint, pathParams);
  const query = new URLSearchParams(buildParams(endpoint, params)).toString();
  const base = BASE_URL.replace(/\/+$/, '');
  return query ? `${base}${path}?${query}` : `${base}${path}`;
}

/* ------------------------------------------------------------------ *
 * The request
 * ------------------------------------------------------------------ */

/**
 * Performs one registry call and answers with the parsed envelope.
 *
 * @param {object} endpoint an entry of `services/endpoints.js`
 * @param {object} [options]
 * @param {Record<string, string|number>} [options.pathParams]
 * @param {Record<string, unknown>} [options.params]
 * @param {unknown} [options.body]
 * @param {AbortSignal} [options.signal]
 * @param {'blob'|'text'} [options.responseType] returns the raw body instead
 * @param {Record<string, string>} [options.headers]
 * @returns {Promise<object>} `{ data, meta }` or `{ data, message }`
 * @throws {ApiError}
 */
export async function request(
  endpoint,
  { pathParams, params, body, signal, responseType, headers } = {}
) {
  if (!endpoint || typeof endpoint !== 'object' || typeof endpoint.path !== 'string') {
    throw new Error('http.request expects an entry of services/endpoints.js');
  }

  const method = String(endpoint.method || '').toUpperCase();
  if (!METHODS.has(method)) {
    throw new Error(`${endpoint.key || endpoint.path}: unsupported method "${endpoint.method}"`);
  }

  const config = {
    method,
    url: buildPath(endpoint, pathParams),
    params: buildParams(endpoint, params),
  };

  if (body !== undefined && METHODS_WITH_BODY.has(method)) config.data = body;
  if (signal) config.signal = signal;
  if (responseType) config.responseType = responseType;
  if (headers) config.headers = headers;

  const response = await client.request(config);
  return response.data;
}

/** The façade every service imports. */
const http = { request, client };

export default http;
export { http, client };
