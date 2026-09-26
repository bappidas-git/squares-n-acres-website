/**
 * Authentication endpoints (00_MASTER_CONTEXT.md §5.4).
 *
 *   POST /api/auth/login      e-mail + password → a bearer token
 *   POST /api/auth/logout     revokes the token that made the call
 *   POST /api/auth/refresh    the same token, a full lifetime from now (prompt 51)
 *   GET  /api/auth/profile    the signed-in user
 *   PUT  /api/auth/profile    their own name, phone and avatar
 *   PUT  /api/auth/password   their own password
 *
 * Only `login` is public, and `mock-server/app.js` puts `requireAuth` in front
 * of the other five, so nothing here has to check a token itself.
 *
 * The seed's three accounts (§6.14) are the only way in on the mock; they are
 * listed, with the note that Laravel hashes what the seed stores in plain text,
 * in `mock-server/README.md`.
 */

const express = require('express');

const authSchemas = require('../../src/services/schemas/auth');
const { createTokenStore } = require('../lib/tokens');
const { publicUser } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');
const { store, verify } = require('../lib/password');
const { unauthorized, validation } = require('../middleware/errors');
const { validateBody } = require('../middleware/validate');

/** §5.11's throttle, applied to the login form: 10 attempts per minute per IP. */
const LOGIN_ATTEMPTS_PER_MINUTE = 10;

/**
 * The password change asks for the current password, which makes it a second
 * door to guessing it — one that stood open: thirty wrong guesses in a row were
 * thirty 422s, where the login form stops at ten a minute (QA-65). Counted per
 * account, not per IP, so a session cannot spread its guesses over addresses;
 * a person who mistypes their password five times in a minute is told to wait.
 */
const PASSWORD_ATTEMPTS_PER_MINUTE = 5;

/** The same answer for an unknown address and for a wrong password. */
const INVALID_CREDENTIALS = 'Invalid email or password.';

/** The `user` object of the login response — the six fields of §5.4. */
const sessionUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatarUrl: user.avatarUrl ?? null,
  phone: user.phone ?? null,
});

/** Trims the string fields a form sends; e-mail matching ignores whitespace. */
function normalize(body) {
  const clean = { ...(body ?? {}) };
  for (const field of ['email', 'name', 'phone', 'avatarUrl']) {
    if (typeof clean[field] === 'string') clean[field] = clean[field].trim();
  }
  return clean;
}

/**
 * The authentication router.
 *
 * @param {{db: object, config: object}} deps
 * @returns {import('express').Router}
 */
module.exports = ({ db, config }) => {
  const router = express.Router();
  const tokens = createTokenStore({ db, config });

  const users = () => db.getCollection('adminUsers');

  /** The live record behind `req.user`, which the routes below mutate. */
  const currentUser = (req) => users().find((user) => String(user.id) === String(req.user.id));

  /** An active account with this address, whatever the casing (§7 of this prompt). */
  const findActive = (email) => {
    const needle = String(email).toLowerCase();
    return users().find(
      (user) =>
        user.isActive !== false &&
        String(user.email ?? '')
          .trim()
          .toLowerCase() === needle
    );
  };

  router.post('/auth/login', rateLimit({ max: LOGIN_ATTEMPTS_PER_MINUTE }), (req, res, next) => {
    try {
      const body = normalize(req.body);
      validateBody(authSchemas.login, body);

      // Every login is also the moment to drop the tokens nobody will present
      // again — the mock has no scheduler, and this is the one route that
      // grows the collection.
      tokens.purgeExpired();

      const user = findActive(body.email);
      if (!user || !verify(body.password, user.password)) throw unauthorized(INVALID_CREDENTIALS);

      user.lastLoginAt = new Date().toISOString();
      db.write();

      // A session beside the account's others, not in place of them: an account
      // may be signed in on a desk and a phone at once. Only a password change,
      // a reset, a deactivation or a delete ends the others (QA-65).
      const issued = tokens.issueToken(user.id);
      res.ok({ token: issued.token, expiresAt: issued.expiresAt, user: sessionUser(user) });
    } catch (error) {
      next(error);
    }
  });

  // "Stay signed in" (prompt 51): the session the request carries runs a full
  // lifetime again, from now — the same answer a sign-in gives.
  router.post('/auth/refresh', (req, res, next) => {
    const extended = tokens.extendToken(req.token?.token);
    if (!extended) {
      next(unauthorized());
      return;
    }
    res.ok({ token: extended.token, expiresAt: extended.expiresAt, user: sessionUser(req.user) });
  });

  router.post('/auth/logout', (req, res) => {
    tokens.revokeToken(req.token?.token);
    res.message('Logged out.');
  });

  router.get('/auth/profile', (req, res) => {
    res.ok(req.user);
  });

  router.put('/auth/profile', (req, res, next) => {
    try {
      const body = normalize(req.body);
      validateBody(authSchemas.profile, body);

      const user = currentUser(req);
      // A `PUT` states the whole form, so the two optional fields are reset
      // rather than kept when the body leaves them out (§5.8).
      user.name = body.name;
      user.phone = body.phone ?? null;
      user.avatarUrl = body.avatarUrl ?? null;
      user.updatedAt = new Date().toISOString();
      db.write();

      res.ok(publicUser(user));
    } catch (error) {
      next(error);
    }
  });

  router.put(
    '/auth/password',
    rateLimit({
      max: PASSWORD_ATTEMPTS_PER_MINUTE,
      key: (req) => `user:${req.user?.id}`,
      message: 'Too many attempts to change the password. Try again in a minute.',
    }),
    (req, res, next) => {
      try {
        const body = { ...(req.body ?? {}) };
        validateBody(authSchemas.password, body);

        const user = currentUser(req);
        const errors = {};
        if (!verify(body.currentPassword, user.password)) {
          errors.currentPassword = ['Current password is incorrect.'];
        }
        // A new password must not be eight letters or eight digits (§5.4).
        if (!authSchemas.PASSWORD_PATTERN.test(body.newPassword)) {
          errors.newPassword = [authSchemas.passwordMessage('newPassword')];
        }
        if (Object.keys(errors).length > 0) throw validation(errors);

        user.password = store(body.newPassword);
        user.updatedAt = new Date().toISOString();
        db.write();

        // The session that changed the password stays signed in; every other
        // device the account was left signed in on does not.
        tokens.revokeUserTokens(user.id, { except: req.token?.token });

        res.message('Password updated.');
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
};
