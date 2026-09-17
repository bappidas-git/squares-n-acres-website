/**
 * SEO settings and the site-wide SEO overview (00_MASTER_CONTEXT.md §9, §5.14).
 *
 * The old service mapped snake_case to camelCase in both directions; the
 * contract is camelCase throughout (§5.1), so nothing is mapped here.
 */

import { endpoints } from './endpoints';
import http from './http';

/** The public subset `<Seo>` and the sitemap read. */
export const settings = (opts) => http.request(endpoints.seo.settings, { ...opts });

/** The complete singleton, for the admin SEO screens. */
export const adminSettings = (opts) => http.request(endpoints.adminSeo.settings, { ...opts });

export const updateSettings = (body, opts) =>
  http.request(endpoints.adminSeo.updateSettings, { body, ...opts });

/** Lightweight `{ id, type, title, slug, url, seo, … }` rows (§5.14). */
export const overview = (params, opts) =>
  http.request(endpoints.adminSeo.overview, { params, ...opts });

/**
 * The `llms.txt` the current data would generate — `{ llmsTxt }`, unsaved.
 *
 * Not `GET /llms.txt`: that serves the **stored** document, which is the point
 * of the settings screen's two buttons. "Regenerate from data" asks this
 * endpoint what the localities, property types, listings and guides say today;
 * saving the textarea is what makes it the document the crawlers read (§9.8).
 */
export const llmsPreview = (opts) => http.request(endpoints.adminSeo.llmsPreview, { ...opts });

/** The stored document, as text rather than an envelope (§5.13). */
export const llmsTxt = (opts) =>
  http.request(endpoints.sitemap.llms, { responseType: 'text', ...opts });

const seoService = { settings, adminSettings, updateSettings, overview, llmsPreview, llmsTxt };

export default seoService;
