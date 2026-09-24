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

/** A CMS page's slug is a URL path, so it is given a longer budget (§6.10). */
export const PATH_SLUG_MAX_LENGTH = 120;

/** One or more slug segments joined by `/` — what a page's slug may be. */
export const PATH_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;

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
 * It spells letters the way the title's own slug does — "Ümlaut" is `umlaut`,
 * "Crème" is `creme` — rather than dropping them: a typed "Ü" used to vanish
 * while the same word in the title became a `u` (QA-55).
 *
 * @param {string} value
 * @param {object} [options]
 * @param {number} [options.maxLength]
 * @returns {string}
 */
export function toSlugInput(value, { maxLength = SLUG_MAX_LENGTH } = {}) {
  return slugifyLib(String(value ?? ''), {
    lower: true,
    strict: true,
    trim: false,
    locale: 'en',
    remove: /['’`]/g,
  })
    .replace(/-{2,}/g, '-')
    .slice(0, maxLength);
}

/**
 * The slug of a **path**: every `/`-separated segment slugified on its own
 * (§6.10). Only the CMS pages need it — `buyer-assistance/home-loan` is one
 * slug, and `slugify` would turn its separator into a hyphen.
 *
 * @param {string} value
 * @returns {string} `''` when nothing survives
 */
export function slugifyPath(value) {
  return String(value ?? '')
    .split('/')
    .map((segment) => slugify(segment, { maxLength: PATH_SLUG_MAX_LENGTH }))
    .filter(Boolean)
    .join('/')
    .slice(0, PATH_SLUG_MAX_LENGTH)
    .replace(/[-/]+$/, '');
}

/**
 * What a path slug looks like **while it is being typed** — the separators and
 * one trailing hyphen survive, so a multi-segment slug can be typed at all.
 *
 * @param {string} value
 * @returns {string}
 */
export function toPathSlugInput(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-/]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/\/{2,}/g, '/')
    .replace(/^\//, '')
    .slice(0, PATH_SLUG_MAX_LENGTH);
}

export default slugify;
