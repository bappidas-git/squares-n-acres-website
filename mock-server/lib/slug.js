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
 *
 * `slugifyPath` is the one exception to "a slug is one segment": a CMS page's
 * slug is a URL **path** (§6.10, `buyer-assistance/home-loan`), so its
 * separators survive and each segment is slugified on its own. Only the pages
 * resource asks for it (`makeCrudRouter({ pathSlug: true })`).
 */

const MAX_SLUG_LENGTH = 75;

/** A path slug may hold several segments, so it is given a longer budget (§6.10). */
const MAX_PATH_SLUG_LENGTH = 120;

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

/**
 * Turns arbitrary text into a URL **path** slug: every `/`-separated segment
 * slugified on its own, empty segments dropped.
 *
 *   slugifyPath('Buyer Assistance/Home Loan')  // 'buyer-assistance/home-loan'
 *
 * @param {string} text
 * @returns {string} `''` when nothing survives
 */
function slugifyPath(text) {
  return String(text ?? '')
    .split('/')
    .map((segment) => slugify(segment))
    .filter(Boolean)
    .join('/')
    .slice(0, MAX_PATH_SLUG_LENGTH)
    .replace(/[-/]+$/, '');
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
 * @param {(text: string) => string} [toSlug] `slugifyPath` for a path slug
 * @returns {string}
 */
function ensureUniqueSlug(records, slug, excludeId = null, field = 'slug', toSlug = slugify) {
  const base = toSlug(slug);
  if (!base) return base;

  const taken = takenSlugs(records, excludeId, field);
  if (!taken.has(base)) return base;

  const budget = toSlug === slugify ? MAX_SLUG_LENGTH : MAX_PATH_SLUG_LENGTH;

  for (let suffix = 2; ; suffix += 1) {
    const tail = `-${suffix}`;
    const candidate = `${base.slice(0, budget - tail.length).replace(/[-/]$/, '')}${tail}`;
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
 * @param {(text: string) => string} [toSlug] `slugifyPath` for a path slug
 * @returns {{available: boolean, suggestion: string}}
 */
function checkSlug(records, slug, excludeId = null, field = 'slug', toSlug = slugify) {
  const candidate = toSlug(slug);
  const suggestion = ensureUniqueSlug(records, candidate, excludeId, field, toSlug);
  return { available: candidate !== '' && candidate === suggestion, suggestion };
}

module.exports = {
  slugify,
  slugifyPath,
  ensureUniqueSlug,
  checkSlug,
  MAX_SLUG_LENGTH,
  MAX_PATH_SLUG_LENGTH,
};
