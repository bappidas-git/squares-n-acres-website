/**
 * Site settings (00_MASTER_CONTEXT.md §6.13).
 *
 * `public()` is called once per session by `SiteSettingsContext` (D93);
 * components read the context and never this service.
 */

import { endpoints } from './endpoints';
import http from './http';

/** The public subset: general, hero, navigation, social, footer, newsletter. */
export const publicSettings = (opts) => http.request(endpoints.settings.get, { ...opts });

/** Everything, including the lead branch admins may edit. */
export const admin = (opts) => http.request(endpoints.adminSettings.get, { ...opts });

/** Known keys are deep-merged by the API; the client sends what it edited. */
export const update = (body, opts) =>
  http.request(endpoints.adminSettings.update, { body, ...opts });

/**
 * Sends a test lead alert to the **saved** notification addresses (prompt 51);
 * answers `{ sentTo, sentAt }`.
 */
export const testLeadAlert = (opts) =>
  http.request(endpoints.adminSettings.testLeadAlert, { ...opts });

const settingsService = { public: publicSettings, admin, update, testLeadAlert };

export default settingsService;
