/**
 * Where a listing lives on the public site.
 *
 * Both admin property screens link to it — the form's "View on site" / "Save &
 * preview" and the list's row action — and an unpublished listing answers 404
 * to everybody, so an editor is sent to the admin preview of it instead
 * (`?preview=admin`, readable only while an admin session exists; the decision
 * is in `docs/DECISIONS.md`).
 *
 * It is a module of its own so the list page can link to a listing without
 * importing the form's reducer, validators and payload builder with it (§8.6).
 */

import PATHS from '../../../routes/paths';
import { SITE } from '../../../config/site';

/** The query that lets a signed-in admin open an unpublished page (§5.10). */
export const PREVIEW_QUERY = '?preview=admin';

/** The public address of a listing, absolute. */
export const publicUrlOf = (slug) => `${SITE.url}${PATHS.propertyDetails(slug)}`;

/**
 * The path to open for a listing: the public page when it is live, the admin
 * preview of it when it is not.
 *
 * @param {string} slug
 * @param {boolean} isActive
 * @returns {string}
 */
export const viewPathOf = (slug, isActive) =>
  `${PATHS.propertyDetails(slug)}${isActive ? '' : PREVIEW_QUERY}`;

/** The same address, absolute, for a link that opens in a new tab. */
export const viewUrlOf = (slug, isActive) => `${SITE.url}${viewPathOf(slug, isActive)}`;
