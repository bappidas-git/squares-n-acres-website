/**
 * Draft preview tokens (00_MASTER_CONTEXT.md §5.10; decision D28).
 *
 * An editor asks for `GET /admin/articles/:id/preview-token`, gets a link with
 * `?preview=<token>` on it and can show an unpublished article or page to
 * somebody who is not signed in. The token is bound to one record, lives 24
 * hours and is kept **in memory**: a preview link is a conversation, not a
 * feature of the data, and a restart of the mock ending one is correct.
 *
 * `<Seo>` renders every `?preview=` page `noindex,nofollow` (§9.3), so a leaked
 * link cannot put a draft into an index.
 */

const { randomBytes } = require('node:crypto');

/** How long a token stays valid (§5.14, D28). */
const PREVIEW_TTL_MS = 24 * 60 * 60 * 1000;

/** @type {Map<string, {type: string, id: string, expiresAt: number}>} */
const tokens = new Map();

/** Drops expired tokens, so the map cannot grow without bound. */
function prune(now) {
  for (const [token, entry] of tokens) {
    if (entry.expiresAt <= now) tokens.delete(token);
  }
}

/**
 * Issues a token for one record, replacing the one that record already had —
 * asking twice hands out one link, not two.
 *
 * @param {string} type `'article'` | `'page'`
 * @param {number|string} id
 * @param {number} [now]
 * @returns {{token: string, expiresAt: string}}
 */
function issueToken(type, id, now = Date.now()) {
  prune(now);

  for (const [token, entry] of tokens) {
    if (entry.type === type && entry.id === String(id)) tokens.delete(token);
  }

  const token = randomBytes(24).toString('base64url');
  const expiresAt = now + PREVIEW_TTL_MS;
  tokens.set(token, { type, id: String(id), expiresAt });

  return { token, expiresAt: new Date(expiresAt).toISOString() };
}

/**
 * Whether a token grants access to one record.
 *
 * @param {string|undefined} token the `?preview=` parameter
 * @param {string} type
 * @param {number|string} id
 * @param {number} [now]
 * @returns {boolean}
 */
function verifyToken(token, type, id, now = Date.now()) {
  if (typeof token !== 'string' || token === '') return false;

  const entry = tokens.get(token);
  if (!entry) return false;
  if (entry.expiresAt <= now) {
    tokens.delete(token);
    return false;
  }

  return entry.type === type && entry.id === String(id);
}

/**
 * Whether a token grants access to **some** record of a type.
 *
 * The public routes look a record up by slug, so they have the record before
 * they have an id; this answers "is this a live preview link for an article at
 * all", and the caller then compares the id.
 *
 * @param {string|undefined} token
 * @param {string} type
 * @param {number} [now]
 * @returns {{type: string, id: string}|null}
 */
function readToken(token, type, now = Date.now()) {
  if (typeof token !== 'string' || token === '') return null;

  const entry = tokens.get(token);
  if (!entry || entry.expiresAt <= now || entry.type !== type) return null;
  return { type: entry.type, id: entry.id };
}

/** Forgets every issued token — used by the tests. */
const resetPreviewTokens = () => tokens.clear();

module.exports = { issueToken, verifyToken, readToken, resetPreviewTokens, PREVIEW_TTL_MS };
