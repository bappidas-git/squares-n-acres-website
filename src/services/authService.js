/**
 * Authentication (00_MASTER_CONTEXT.md §5.4).
 *
 * The service only speaks to the API; who is signed in, where the token lives
 * and when the session expires are `contexts/AdminAuthContext` and
 * `services/http.js`.
 */

import { endpoints } from './endpoints';
import http from './http';

/** `{ data: { token, expiresAt, user } }`; 401 for wrong credentials. */
export const login = (credentials, opts) =>
  http.request(endpoints.auth.login, { body: credentials, ...opts });

/**
 * "Stay signed in": the same token, valid for a full lifetime from now —
 * `{ data: { token, expiresAt, user } }`, as a sign-in answers.
 */
export const refresh = (opts) => http.request(endpoints.auth.refresh, { ...opts });

/** Revokes the current token server-side. */
export const logout = (opts) => http.request(endpoints.auth.logout, { ...opts });

/** The signed-in user; 401 when the token is missing, expired or revoked. */
export const profile = (opts) => http.request(endpoints.auth.profile, { ...opts });

/** `{ name, phone, avatarUrl }` of the signed-in user. */
export const updateProfile = (body, opts) =>
  http.request(endpoints.auth.updateProfile, { body, ...opts });

/** `{ currentPassword, newPassword }`; 422 when the current one is wrong. */
export const changePassword = (body, opts) =>
  http.request(endpoints.auth.updatePassword, { body, ...opts });

const authService = { login, refresh, logout, profile, updateProfile, changePassword };

export default authService;
