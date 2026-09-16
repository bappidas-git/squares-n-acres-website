/**
 * Slugs (00_MASTER_CONTEXT.md §5.9): lowercase, `[a-z0-9-]`, at most 75 chars.
 *
 * The API generates and de-duplicates slugs; this is the client's preview of
 * what it will produce, so `SlugField` can show the URL while the title is
 * still being typed.
 */

import slugifyLib from 'slugify';

import { SLUG_PATTERN } from './validation';

/** The contract's ceiling for every entity slug (§5.9). */
export const SLUG_MAX_LENGTH = 75;

export { SLUG_PATTERN };

/** `true` when a string is a slug the API would accept. */
export const isSlug = (value) => typeof value === 'string' && SLUG_PATTERN.test(value);

/**
 * The slug of a title.
 *
 * `strict` drops everything the pattern forbids and `remove` takes the
 * apostrophes `slugify` would otherwise turn into separators, so
 * `"Bengaluru's East — Whitefield"` becomes `bengalurus-east-whitefield`.
 *
 * @param {string} value
 * @param {object} [options]
 * @param {number} [options.maxLength]
 * @returns {string} `''` when nothing survives
 */
export function slugify(value, { maxLength = SLUG_MAX_LENGTH } = {}) {
  if (value === undefined || value === null) return '';

  const slug = slugifyLib(String(value), {
    lower: true,
    strict: true,
    trim: true,
    locale: 'en',
    remove: /['’`]/g,
  });

  // Cutting at the limit can leave a dangling separator; a slug never ends in one.
  return slug.slice(0, maxLength).replace(/-+$/, '');
}

/**
 * What a slug looks like **while it is being typed**.
 *
 * `slugify` would trim the separator off `some-` on every keystroke, which
 * makes a multi-word slug impossible to type: the space is swallowed before the
 * next letter arrives. This keeps one trailing hyphen and only forbids what the
 * pattern forbids; `slugify` tidies the result when the field is left.
 *
 * @param {string} value
 * @param {object} [options]
 * @param {number} [options.maxLength]
 * @returns {string}
 */
export function toSlugInput(value, { maxLength = SLUG_MAX_LENGTH } = {}) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, maxLength);
}

export default slugify;
