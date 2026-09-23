/**
 * Access tokens for a listing's gated files (docs/API_CONTRACT.md §5.10,
 * `docs/backend-notes/05_business_rules.md` → "Gated files").
 *
 * A document the editor marked `leadGated` — and the brochure, behind
 * `brochureLeadGated` — is offered to a visitor only after they have told the
 * sales desk who they are. A public read therefore carries no address for such
 * a file (`lib/scope.js`), and the address is handed over by
 * `POST /properties/:id/documents/access` to whoever presents one of these
 * tokens.
 *
 * `POST /leads` issues one with every lead about an active listing. A lead about
 * a listing opens all of that listing's gated files, whatever form it came
 * from — the rule the page has always applied (P24, P28: a visitor who has
 * enquired, or asked for any one paper, is not asked again for the next).
 *
 * The token is opaque, bound to one listing and one lead, lives 24 hours and is
 * kept **in memory**, like the preview tokens of `lib/previewTokens.js`: it is
 * a conversation, not data, and a restart of the mock ending one simply asks
 * the visitor for their details again.
 */

const { randomBytes } = require('node:crypto');

/** How long a token opens a listing's files. */
const ACCESS_TTL_MS = 24 * 60 * 60 * 1000;

/** @type {Map<string, {propertyId: string, leadId: string, expiresAt: number}>} */
const grants = new Map();

/** Drops expired tokens, so the map cannot grow without bound. */
function prune(now) {
  for (const [token, grant] of grants) {
    if (grant.expiresAt <= now) grants.delete(token);
  }
}

/**
 * Issues a token that opens one listing's gated files for one lead.
 *
 * @param {number|string} propertyId
 * @param {number|string} leadId the lead that earned it
 * @param {number} [now]
 * @returns {{token: string, expiresAt: string}}
 */
function issueAccess(propertyId, leadId, now = Date.now()) {
  prune(now);

  const token = randomBytes(24).toString('base64url');
  const expiresAt = now + ACCESS_TTL_MS;
  grants.set(token, { propertyId: String(propertyId), leadId: String(leadId), expiresAt });

  return { token, expiresAt: new Date(expiresAt).toISOString() };
}

/**
 * The grant a token carries for one listing, or `null`.
 *
 * @param {string|undefined} token
 * @param {number|string} propertyId the listing whose files are asked for
 * @param {number} [now]
 * @returns {{propertyId: string, leadId: string, expiresAt: number}|null}
 */
function verifyAccess(token, propertyId, now = Date.now()) {
  if (typeof token !== 'string' || token === '') return null;

  const grant = grants.get(token);
  if (!grant) return null;
  if (grant.expiresAt <= now) {
    grants.delete(token);
    return null;
  }

  return grant.propertyId === String(propertyId) ? grant : null;
}

/** Forgets every token — for the test harness, which starts each server clean. */
function resetAccess() {
  grants.clear();
}

module.exports = { ACCESS_TTL_MS, issueAccess, verifyAccess, resetAccess };
