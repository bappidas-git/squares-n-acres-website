/**
 * Authentication (00_MASTER_CONTEXT.md §5.4, §10).
 *
 * Every admin route and the three authenticated `/auth/*` routes go through
 * `requireAuth`: it reads `Authorization: Bearer <token>`, resolves it against
 * the `apiTokens` collection and puts the user on the request.
 *
 *   no header / wrong scheme / unknown / expired / revoked → 401 Unauthenticated.
 *   the user has since been deactivated                    → 401 Account is inactive.
 *
 * A 401 never says which of those happened: an attacker must not learn from
 * the response whether a token was ever valid. The only exception is the
 * deactivated account, because the token's owner is the one reading it and
 * "your account was switched off" is the answer they need (§8.2).
 *
 * Downstream, `req.user` is the user record **without the password** and
 * `req.token` is the `apiTokens` row — which is what `POST /auth/logout`
 * revokes and what prompt 08 scopes a sales user's leads with (D15).
 */

const { createTokenStore } = require('../lib/tokens');
const { omit } = require('../lib/scope');
const { unauthorized } = require('./errors');

/** `Bearer <token>`, tolerating the casing and the extra spaces clients send. */
const BEARER_RE = /^Bearer\s+(\S+)$/i;

/**
 * A user record as every response returns it: everything except the password
 * (§6.14 — the field is `secret`, no endpoint ever echoes it).
 *
 * @param {object} user
 * @returns {object}
 */
const publicUser = (user) => omit(user, ['password']);

/**
 * Builds the authentication middleware.
 *
 * @param {{db: object, config: object}} deps
 * @returns {import('express').RequestHandler}
 */
function requireAuth({ db, config }) {
  const tokens = createTokenStore({ db, config });

  return (req, res, next) => {
    const match = BEARER_RE.exec(String(req.get('authorization') ?? '').trim());
    if (!match) {
      next(unauthorized());
      return;
    }

    const resolved = tokens.resolveToken(match[1]);
    if (!resolved) {
      next(unauthorized());
      return;
    }

    // A deactivated account loses its sessions immediately: the token stays in
    // the collection (the account may be switched back on) but stops working.
    if (resolved.user.isActive === false) {
      next(unauthorized('Account is inactive.'));
      return;
    }

    req.token = resolved.token;
    req.user = publicUser(resolved.user);
    next();
  };
}

module.exports = { requireAuth, publicUser, BEARER_RE };
