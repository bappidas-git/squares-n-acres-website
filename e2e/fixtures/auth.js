/**
 * Signing in, for the specs that are not about signing in (prompt 44).
 *
 * `login.spec.js` drives the form the way a person does. Every other admin spec
 * only needs to *be* signed in, so it asks the API for a token and writes the
 * three session keys of §4.2 into `localStorage` before the first navigation —
 * which is what the application itself stores after a successful login, so the
 * app cannot tell the difference and no spec pays for a form submission it is
 * not testing.
 *
 *   const { test, expect } = require('../fixtures/auth');
 *
 *   test('…', async ({ signIn, page }) => {
 *     await signIn('admin');
 *     await page.goto('/admin/properties');
 *   });
 *
 * `api` is the same session as a request context, for the fixtures a spec needs
 * to create or clean up without going through the interface.
 */

const { test: base, expect, request } = require('@playwright/test');

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4000/api';

/** The three seeded accounts of §7, with the passwords `db.json` carries. */
const ACCOUNTS = {
  admin: { email: 'admin@squaresnacres.com', password: 'Admin@123' },
  manager: { email: 'manager@squaresnacres.com', password: 'Manager@123' },
  sales: { email: 'sales@squaresnacres.com', password: 'Sales@123' },
};

/** The `localStorage` keys `AdminAuthContext` keeps a session in (§4.2). */
const STORAGE_KEYS = {
  token: 'sna_auth_token',
  user: 'sna_auth_user',
  expiresAt: 'sna_auth_expires_at',
};

/**
 * One session per role for the whole run.
 *
 * `POST /auth/login` is throttled to ten attempts a minute per IP (§5.11), and
 * the suite has more tests than that: signing in afresh for each one turned the
 * run red at the eleventh. A token is valid for twenty-four hours, so one login
 * per role is all the suite ever needs, and the cached promise means two tests
 * starting at once still make one request.
 *
 * @type {Map<string, Promise<{token: string, expiresAt: string, user: object}>>}
 */
const sessions = new Map();

/**
 * A session straight from the API, issued once per role.
 *
 * @param {import('@playwright/test').APIRequestContext} api
 * @param {'admin'|'manager'|'sales'} role
 * @returns {Promise<{token: string, expiresAt: string, user: object}>}
 */
function issueSession(api, role) {
  const account = ACCOUNTS[role];
  if (!account) throw new Error(`No seeded account for the role "${role}".`);

  if (!sessions.has(role)) {
    sessions.set(
      role,
      (async () => {
        const response = await api.post(`${API_URL}/auth/login`, { data: account });
        expect(response.status(), `POST /auth/login as ${role}`).toBe(200);
        return (await response.json()).data;
      })().catch((error) => {
        // A failed login must not poison every later test with the same answer.
        sessions.delete(role);
        throw error;
      })
    );
  }

  return sessions.get(role);
}

const test = base.extend({
  /** A request context that talks to the API directly. */
  api: async ({}, use) => {
    const context = await request.newContext();
    await use(context);
    await context.dispose();
  },

  /** An admin request context, already carrying the admin's bearer token. */
  adminApi: async ({ api }, use) => {
    const session = await issueSession(api, 'admin');
    const context = await request.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${session.token}` },
    });
    await use(context);
    await context.dispose();
  },

  /**
   * `await signIn('manager')` — the page is signed in from its next navigation
   * on, including the first one.
   */
  signIn: async ({ page, api }, use) => {
    await use(async (role = 'admin') => {
      const session = await issueSession(api, role);

      // `addInitScript` runs before the bundle on every document, so the
      // context is authenticated by the time `AdminAuthContext` first reads it.
      await page.addInitScript(
        ([keys, value]) => {
          window.localStorage.setItem(keys.token, JSON.stringify(value.token));
          window.localStorage.setItem(keys.user, JSON.stringify(value.user));
          window.localStorage.setItem(keys.expiresAt, JSON.stringify(value.expiresAt));
        },
        [STORAGE_KEYS, session]
      );

      return session;
    });
  },
});

module.exports = { test, expect, ACCOUNTS, STORAGE_KEYS, API_URL, issueSession };
