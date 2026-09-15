/**
 * Password handling on the mock (00_MASTER_CONTEXT.md §6.14).
 *
 * The seed stores the three demo passwords in plain text, so the mock compares
 * them in plain text. That is a property of the local fixture, not of the
 * contract: Laravel stores a bcrypt hash and compares with `Hash::check()`, and
 * `mock-server/README.md` says so next to the seed credentials.
 *
 * Both sides of the comparison go through this module, so replacing it with a
 * real hash is a change to two functions and nothing else.
 */

/**
 * Whether a submitted password matches the stored one.
 *
 * Case-sensitive, and an empty or absent value never matches — a user record
 * without a password must not be reachable with an empty body.
 *
 * @param {*} plain the password as the client sent it
 * @param {*} stored the value held in `adminUsers[].password`
 * @returns {boolean}
 */
function verify(plain, stored) {
  if (typeof plain !== 'string' || typeof stored !== 'string') return false;
  if (plain.length === 0 || stored.length === 0) return false;
  return plain === stored;
}

/**
 * The value written to `adminUsers[].password` for a new or changed password.
 *
 * @param {string} plain
 * @returns {string}
 */
function store(plain) {
  return String(plain);
}

module.exports = { verify, store };
