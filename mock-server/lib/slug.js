/**
 * Slugs (00_MASTER_CONTEXT.md §5.9).
 *
 * The `slugify` npm package is a **runtime** dependency of the React app; the
 * mock server has no runtime dependencies beyond Express, so the same rules are
 * implemented here: lowercase ASCII, `[a-z0-9-]`, no leading or trailing
 * hyphen, at most 75 characters.
 *
 * Latin diacritics are transliterated (`Whitefield Ãºphase` → `whitefield-uphase`)
 * by decomposing to NFD and dropping the combining marks; the handful of Latin
 * letters that do not decompose carry an explicit mapping. Everything else —
 * Devanagari, Kannada, emoji — is dropped rather than guessed at.
 */

const MAX_SLUG_LENGTH = 75;

/** Latin letters without a canonical decomposition. */
const LIGATURES = {
  ß: 'ss',
  æ: 'ae',
  œ: 'oe',
  ø: 'o',
  đ: 'd',
  ð: 'd',
  þ: 'th',
  ł: 'l',
  ħ: 'h',
  ı: 'i',
  ŋ: 'n',
  ſ: 's',
};

/**
 * Turns arbitrary text into a URL slug.
 *
 * @param {string} text
 * @returns {string} `''` when nothing survives the transliteration
 */
function slugify(text) {
  const source = String(text ?? '')
    .toLowerCase()
    .replace(/[ßæœøðþłħıŋſđ]/g, (char) => LIGATURES[char] ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

  return source
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-$/, '');
}

/** Every slug already taken in `records`, except the one owned by `excludeId`. */
function takenSlugs(records, excludeId, field = 'slug') {
  const exclude = excludeId === undefined || excludeId === null ? null : String(excludeId);
  return new Set(
    (Array.isArray(records) ? records : [])
      .filter((record) => exclude === null || String(record?.id) !== exclude)
      .map((record) => record?.[field])
      .filter(Boolean)
  );
}

/**
 * The first free variant of `slug` in `records`: `slug`, then `slug-2`,
 * `slug-3`… The suffix is trimmed back into the 75-character budget.
 *
 * @param {Array<object>} records the collection's rows
 * @param {string} slug the candidate, already slugified
 * @param {number|string|null} [excludeId] the record being updated
 * @param {string} [field] the slug field's name
 * @returns {string}
 */
function ensureUniqueSlug(records, slug, excludeId = null, field = 'slug') {
  const base = slugify(slug);
  if (!base) return base;

  const taken = takenSlugs(records, excludeId, field);
  if (!taken.has(base)) return base;

  for (let suffix = 2; ; suffix += 1) {
    const tail = `-${suffix}`;
    const candidate = `${base.slice(0, MAX_SLUG_LENGTH - tail.length).replace(/-$/, '')}${tail}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/**
 * Backs `GET /admin/<resource>/check-slug` (§5.9).
 *
 * @param {Array<object>} records
 * @param {string} slug
 * @param {number|string|null} [excludeId]
 * @param {string} [field]
 * @returns {{available: boolean, suggestion: string}}
 */
function checkSlug(records, slug, excludeId = null, field = 'slug') {
  const candidate = slugify(slug);
  const suggestion = ensureUniqueSlug(records, candidate, excludeId, field);
  return { available: candidate !== '' && candidate === suggestion, suggestion };
}

module.exports = { slugify, ensureUniqueSlug, checkSlug, MAX_SLUG_LENGTH };
