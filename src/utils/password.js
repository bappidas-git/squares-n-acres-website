/**
 * A temporary password an administrator hands to somebody (prompt 51).
 *
 * Sixteen characters of letters and digits that read back unambiguously over
 * the phone — no 0/O, no 1/l/I — with at least one letter and one digit, the
 * rule the API asks of every password. The browser's own random source is
 * used where there is one; the person is asked to change it at their first
 * sign-in regardless.
 */

const LETTERS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const ALPHABET = `${LETTERS}${DIGITS}`;

/** How long a generated password is. */
export const GENERATED_PASSWORD_LENGTH = 16;

/** `count` random integers below `limit`. */
function randomIndexes(count, limit) {
  const cryptoSource = typeof window !== 'undefined' ? window.crypto : undefined;
  if (cryptoSource?.getRandomValues) {
    const values = cryptoSource.getRandomValues(new Uint32Array(count));
    return Array.from(values, (value) => value % limit);
  }
  return Array.from({ length: count }, () => Math.floor(Math.random() * limit));
}

/**
 * @param {number} [length]
 * @returns {string}
 */
export function generatePassword(length = GENERATED_PASSWORD_LENGTH) {
  for (;;) {
    const password = randomIndexes(length, ALPHABET.length)
      .map((index) => ALPHABET[index])
      .join('');
    if (/[a-zA-Z]/.test(password) && /\d/.test(password)) return password;
  }
}

/**
 * What an administrator sends the person: where to sign in with, and with what.
 *
 * @param {string} email
 * @param {string} password
 * @returns {string}
 */
export const handoverText = (email, password) =>
  [email ? `E-mail: ${email}` : null, `Temporary password: ${password}`].filter(Boolean).join('\n');
