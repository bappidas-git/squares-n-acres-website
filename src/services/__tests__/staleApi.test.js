/**
 * `staleApi.js` — which refusals only an API older than the web app gives
 * (QA-58). Master data → Segments and Pages → Header menu told the admin
 * "You do not have permission to perform this action." while an old mock held
 * port 4000; these pin when the screen says what is really wrong instead.
 */

import {
  MOCK_REVISION_HEADER,
  headerOf,
  isLocalApi,
  isStaleRefusal,
  roleMayCall,
  staleApiMessage,
} from '../staleApi';

const LOCAL = 'http://localhost:4000/api';

/** The refusal of the screenshots: an admin's GET, refused by a mock from before the screen. */
const refusal = (overrides = {}) => ({
  status: 403,
  method: 'GET',
  auth: 'manager',
  role: 'admin',
  headers: {},
  baseUrl: LOCAL,
  ...overrides,
});

describe('isStaleRefusal', () => {
  it('recognises the refusal of a screen the role may open, from an older API on this machine', () => {
    expect(isStaleRefusal(refusal())).toBe(true);
    expect(isStaleRefusal(refusal({ role: 'manager' }))).toBe(true);
    expect(isStaleRefusal(refusal({ auth: 'admin' }))).toBe(true);
    expect(isStaleRefusal(refusal({ auth: 'user' }))).toBe(true);
    expect(isStaleRefusal(refusal({ method: 'get' }))).toBe(true);
    expect(isStaleRefusal(refusal({ baseUrl: 'http://127.0.0.1:4000/api' }))).toBe(true);
    expect(isStaleRefusal(refusal({ baseUrl: 'http://[::1]:4000/api' }))).toBe(true);
  });

  it('leaves the answers of the mock that reloads its code alone', () => {
    expect(isStaleRefusal(refusal({ headers: { 'x-mock-revision': '99ff6d391149' } }))).toBe(false);
    expect(isStaleRefusal(refusal({ headers: { 'X-Mock-Revision': '99ff6d391149' } }))).toBe(false);
  });

  it('leaves refusals the role has earned alone', () => {
    // A manager is not an admin: the users screen and the settings form are refused.
    expect(isStaleRefusal(refusal({ role: 'manager', auth: 'admin' }))).toBe(false);
    // A sales user is refused the leads assigned to someone else (D15).
    expect(isStaleRefusal(refusal({ role: 'sales', auth: 'user' }))).toBe(false);
    // A gated file refuses a visitor's stale token.
    expect(isStaleRefusal(refusal({ auth: 'public' }))).toBe(false);
    expect(isStaleRefusal(refusal({ role: null }))).toBe(false);
    expect(isStaleRefusal(refusal({ role: undefined }))).toBe(false);
  });

  it('leaves every other failure alone', () => {
    expect(isStaleRefusal(refusal({ status: 404 }))).toBe(false);
    expect(isStaleRefusal(refusal({ status: 401 }))).toBe(false);
    expect(isStaleRefusal(refusal({ status: 422 }))).toBe(false);
    // A refused write is answered where it was made; the screen had loaded.
    expect(isStaleRefusal(refusal({ method: 'PUT' }))).toBe(false);
    expect(isStaleRefusal(refusal({ method: 'POST' }))).toBe(false);
  });

  it('does not blame a deployed API: only one on this machine is left running by mistake', () => {
    expect(isStaleRefusal(refusal({ baseUrl: 'https://api.squaresnacres.com/api' }))).toBe(false);
    expect(isStaleRefusal(refusal({ baseUrl: 'http://192.168.1.20:4000/api' }))).toBe(false);
    expect(isStaleRefusal(refusal({ baseUrl: 'not a url' }))).toBe(false);
  });
});

describe('the pieces', () => {
  it('reads a header from AxiosHeaders and from a plain object, in any case', () => {
    const axiosLike = { get: (name) => (name === MOCK_REVISION_HEADER ? 'abc' : undefined) };
    expect(headerOf(axiosLike, MOCK_REVISION_HEADER)).toBe('abc');
    expect(headerOf({ 'X-Mock-Revision': 'abc' }, MOCK_REVISION_HEADER)).toBe('abc');
    expect(headerOf({}, MOCK_REVISION_HEADER)).toBeUndefined();
    expect(headerOf(undefined, MOCK_REVISION_HEADER)).toBeUndefined();
  });

  it('knows which roles each auth level of the registry admits', () => {
    expect(roleMayCall('sales', 'user')).toBe(true);
    expect(roleMayCall('sales', 'manager')).toBe(false);
    expect(roleMayCall('manager', 'manager')).toBe(true);
    expect(roleMayCall('manager', 'admin')).toBe(false);
    expect(roleMayCall('admin', 'admin')).toBe(true);
    expect(roleMayCall('admin', 'public')).toBe(false);
    expect(roleMayCall('admin', undefined)).toBe(false);
  });

  it('knows the addresses of this machine', () => {
    expect(isLocalApi('http://localhost:4000/api')).toBe(true);
    expect(isLocalApi('http://LOCALHOST:4000/api')).toBe(true);
    expect(isLocalApi('https://www.squaresnacres.com/api')).toBe(false);
    expect(isLocalApi('')).toBe(false);
  });

  it('says what is wrong and what puts it right', () => {
    const message = staleApiMessage(LOCAL);
    expect(message).toMatch(/^The API at localhost:4000 is running older code than this web app/);
    expect(message).toMatch(/Restart it: stop “npm run dev” with Ctrl\+C and run “npm run dev”/);
    expect(message).not.toMatch(/permission/i);
    expect(staleApiMessage('not a url')).toMatch(/^The API is running older code/);
  });
});
