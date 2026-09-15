/**
 * Bearer tokens (00_MASTER_CONTEXT.md §5.4, §6.14; decision D19).
 *
 * The mock issues **opaque** tokens — 48 random characters from
 * `crypto.randomBytes(36)` in base64url — and keeps them in the `apiTokens`
 * collection of the runtime database, so a restart of `npm run mock` does not
 * sign anybody out. Laravel Sanctum owns the same job on the real API, which is
 * why nothing about the token's content is part of the contract: the client
 * stores the string and sends it back, and only this module ever reads it.
 *
 * A token is valid until `expiresAt`, computed from `MOCK_TOKEN_TTL_HOURS`
 * (default 24, fractional values allowed so QA can watch a session expire).
 * Expired records are deleted lazily — when the token is presented, and in bulk
 * on every login — rather than by a timer the mock would have to own.
 */

const crypto = require('node:crypto');

const { nextId } = require('./ids');

/** The token length the schema descriptor pins (`apiTokens.token`, §6.14). */
const TOKEN_LENGTH = 48;

/** 36 random bytes are 48 base64url characters exactly, with nothing to pad. */
const TOKEN_BYTES = 36;

const MS_PER_HOUR = 3_600_000;

/** A fresh opaque token. */
const createToken = () =>
  crypto.randomBytes(TOKEN_BYTES).toString('base64url').slice(0, TOKEN_LENGTH);

/** True when `expiresAt` has passed, or cannot be read at all. */
function isExpired(record, now = Date.now()) {
  const expiresAt = Date.parse(record?.expiresAt);
  return !Number.isFinite(expiresAt) || expiresAt <= now;
}

/**
 * The token store over one runtime database.
 *
 * @param {{db: object, config: object}} deps the runtime-database module and
 *   the resolved configuration (`tokenTtlHours`)
 * @returns {{issueToken: Function, resolveToken: Function, revokeToken: Function,
 *   revokeUserTokens: Function, purgeExpired: Function}}
 */
function createTokenStore({ db, config }) {
  const rows = () => db.getCollection('apiTokens');
  const users = () => db.getCollection('adminUsers');

  /** The configured lifetime in milliseconds; never negative. */
  const ttlMs = () => {
    const hours = Number(config?.tokenTtlHours);
    return Math.max(Number.isFinite(hours) ? hours : 0, 0) * MS_PER_HOUR;
  };

  /**
   * Deletes every token matching `predicate` and persists the change.
   *
   * @param {(record: object) => boolean} predicate
   * @returns {number} how many were deleted
   */
  function removeWhere(predicate) {
    const list = rows();
    let removed = 0;

    for (let index = list.length - 1; index >= 0; index -= 1) {
      if (!predicate(list[index])) continue;
      list.splice(index, 1);
      removed += 1;
    }

    if (removed > 0) db.write();
    return removed;
  }

  return {
    /**
     * Issues a token for a user.
     *
     * @param {number|string} userId
     * @returns {{id: number, userId: number, token: string, expiresAt: string, createdAt: string}}
     */
    issueToken(userId) {
      const now = Date.now();
      const record = {
        id: nextId(rows()),
        userId: Number(userId),
        token: createToken(),
        expiresAt: new Date(now + ttlMs()).toISOString(),
        createdAt: new Date(now).toISOString(),
      };

      rows().push(record);
      db.write();
      return record;
    },

    /**
     * Looks a token up and returns it with its user.
     *
     * An expired token — and a token whose user has since been deleted — is
     * removed on the way out, so the collection cannot grow without bound.
     *
     * @param {string} token
     * @returns {{token: object, user: object}|null} `null` when the token is
     *   unknown, expired or orphaned
     */
    resolveToken(token) {
      if (typeof token !== 'string' || token.length === 0) return null;

      const record = rows().find((entry) => entry?.token === token);
      if (!record) return null;

      if (isExpired(record)) {
        removeWhere((entry) => entry?.token === token);
        return null;
      }

      const user = users().find((entry) => String(entry?.id) === String(record.userId));
      if (!user) {
        removeWhere((entry) => entry?.token === token);
        return null;
      }

      return { token: record, user };
    },

    /**
     * Revokes one token (`POST /auth/logout`).
     *
     * @param {string} token
     * @returns {boolean} false when the token was already gone
     */
    revokeToken(token) {
      if (typeof token !== 'string' || token.length === 0) return false;
      return removeWhere((entry) => entry?.token === token) > 0;
    },

    /**
     * Revokes every token of a user — on a password change (except the one
     * making the change), on deactivation and on delete.
     *
     * @param {number|string} userId
     * @param {{except?: string}} [options] a token to keep
     * @returns {number} how many were revoked
     */
    revokeUserTokens(userId, { except } = {}) {
      return removeWhere(
        (entry) => String(entry?.userId) === String(userId) && entry?.token !== except
      );
    },

    /**
     * Deletes every expired token. Called on each login, which is the only
     * moment the collection is guaranteed to grow.
     *
     * @returns {number} how many were deleted
     */
    purgeExpired() {
      const now = Date.now();
      return removeWhere((entry) => isExpired(entry, now));
    },
  };
}

module.exports = { createTokenStore, createToken, isExpired, TOKEN_LENGTH };
