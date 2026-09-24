/**
 * "The API is older than this web app" (QA-58).
 *
 * After a `git pull` the web app hot-reloads and shows the new screens at once.
 * An API process that goes on running does not change with it, unless it is a
 * mock that reloads its own code (`mock-server/lib/hotReload.js`). An older mock
 * refuses every admin route it has no rule for, so the admin was told "You do
 * not have permission to perform this action." That points at roles. Three
 * reports (QA-54, QA-57, QA-58) went looking at roles while the answer was an
 * old process still holding port 4000.
 *
 * So a refusal that cannot be right is explained instead of repeated. That is
 * a refusal where every one of these holds:
 *
 *   - the API runs on this machine (`localhost`, `127.0.0.1`, `[::1]`), where
 *     a process left running from before an update is the usual cause;
 *   - it is a 403 to a GET: a screen that could not load;
 *   - the signed-in role is an admin or a manager, and the registry says that
 *     role may call the endpoint (`auth`). A sales user is refused the leads
 *     assigned to someone else, and that refusal is right (D15);
 *   - the answer does not carry `X-Mock-Revision`. The mock that reloads its
 *     code marks every answer with it, so an answer without it came from an
 *     older mock, or from an API that does not have this screen's route yet.
 *
 * Nothing here changes what the API is asked or what it answers. Only the
 * sentence the screen shows changes.
 */

/** The header the mock marks every answer with (`mock-server/server.js`), lower-cased as axios reads it. */
export const MOCK_REVISION_HEADER = 'x-mock-revision';

/** The roles whose GET refusals are never scoped: they may read everything their matrix gives them. */
const UNSCOPED_ROLES = new Set(['admin', 'manager']);

/** The roles each `auth` level of the registry admits (`services/endpoints.js`). */
const AUTH_ROLES = {
  user: ['admin', 'manager', 'sales'],
  manager: ['admin', 'manager'],
  admin: ['admin'],
};

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/**
 * Whether the API base points at this machine.
 *
 * @param {string} baseUrl `REACT_APP_API_URL`
 * @returns {boolean}
 */
export function isLocalApi(baseUrl) {
  try {
    return LOCAL_HOSTS.has(new URL(baseUrl).hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Whether the registry lets a role call an endpoint. `public` is not a
 * question of roles: a public refusal (a gated file) is never this.
 *
 * @param {string} role
 * @param {string} auth the entry's `auth`
 * @returns {boolean}
 */
export function roleMayCall(role, auth) {
  return Boolean(AUTH_ROLES[auth]?.includes(role));
}

/**
 * One response header, whatever the casing and whether axios handed over
 * `AxiosHeaders` or a plain object.
 *
 * @param {object|undefined} headers
 * @param {string} name lower-case
 * @returns {string|undefined}
 */
export function headerOf(headers, name) {
  if (!headers) return undefined;
  if (typeof headers.get === 'function') {
    const value = headers.get(name);
    if (value !== undefined && value !== null && value !== false) return String(value);
  }
  const key = Object.keys(headers).find((candidate) => candidate.toLowerCase() === name);
  return key === undefined ? undefined : String(headers[key]);
}

/**
 * Whether a refusal comes from an API that is older than this web app.
 *
 * @param {object} facts
 * @param {number} facts.status
 * @param {string} facts.method the endpoint's method
 * @param {string} facts.auth the endpoint's `auth`
 * @param {string|null|undefined} facts.role the signed-in role
 * @param {object} [facts.headers] the response's headers
 * @param {string} facts.baseUrl `REACT_APP_API_URL`
 * @returns {boolean}
 */
export function isStaleRefusal({ status, method, auth, role, headers, baseUrl }) {
  return (
    status === 403 &&
    String(method).toUpperCase() === 'GET' &&
    UNSCOPED_ROLES.has(role) &&
    roleMayCall(role, auth) &&
    isLocalApi(baseUrl) &&
    !headerOf(headers, MOCK_REVISION_HEADER)
  );
}

/**
 * What the screen says instead of "You do not have permission…": what is
 * wrong, and the one thing that puts it right.
 *
 * @param {string} baseUrl `REACT_APP_API_URL`
 * @returns {string}
 */
export function staleApiMessage(baseUrl) {
  let at = '';
  try {
    at = ` at ${new URL(baseUrl).host}`;
  } catch {
    // An unparsable base still gets the sentence, without the address.
  }
  return (
    `The API${at} is running older code than this web app, so it does not know this screen ` +
    'yet. Restart it: stop “npm run dev” with Ctrl+C and run “npm run dev” again.'
  );
}
