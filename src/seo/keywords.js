/**
 * Does this text carry this keyword, how often, and how early?
 *
 * Matching is deliberately forgiving in the three ways Indian-English property
 * copy needs it to be, and in no others:
 *
 * 1. **Plurals.** "flats in whitefield" is "flat in whitefield"; "2 BHKs" is
 *    "2 BHK". A light stemmer folds the regular plural endings, so a keyword
 *    and a body that disagree only about a trailing `s` still match.
 * 2. **Hyphens.** `ready-to-move` and `ready to move` are one phrase typed two
 *    ways, and an editor will type both in the same article.
 * 3. **Punctuation and case.** "Whitefield, Bengaluru — ₹1.42 Cr" holds the
 *    keyword "whitefield bengaluru".
 *
 * It is not forgiving about word order or about words in between: "flats in
 * whitefield" does not match "whitefield flats", because they are two
 * different search queries and Google treats them as two.
 */

import { stripHtml, words as textWords } from './text';

/**
 * Lowercased, punctuation gone, hyphens read as spaces, one space between words.
 *
 * @param {string} value HTML or text
 * @returns {string}
 */
export function normalize(value) {
  // The hyphens go first and the tags go before them: `ready-to-move` has to
  // become three tokens so that it matches `ready to move`, and replacing the
  // hyphens of raw markup would turn `<!-- a comment -->` into visible text.
  const plain = stripHtml(value).replace(/[-\u2010-\u2015]/g, ' ');

  return textWords(plain)
    .map((word) => word.toLowerCase().replace(/[’'.,]/g, ''))
    .join(' ');
}

/** The irregulars the rules below would get wrong. */
const IRREGULAR = { bhks: 'bhk', sqft: 'sqft', properties: 'property', people: 'person' };

/**
 * A word reduced to what it shares with its plural.
 *
 * Deliberately shallow: no Porter stemmer, no suffix table. It folds the three
 * plural endings English writes and nothing else, so "building" stays
 * "building" and "buildings" becomes "building".
 *
 * @param {string} word
 * @returns {string}
 */
export function stem(word) {
  const value = String(word ?? '').toLowerCase();
  if (IRREGULAR[value]) return IRREGULAR[value];
  if (value.length <= 3) return value;
  if (/[^aeiou]ies$/.test(value)) return `${value.slice(0, -3)}y`;
  if (/(ch|sh|s|x|z)es$/.test(value)) return value.slice(0, -2);
  if (/[^s]s$/.test(value)) return value.slice(0, -1);
  return value;
}

/**
 * The comparable tokens of a string: normalised, then stemmed.
 *
 * @param {string} value
 * @returns {string[]}
 */
export function tokens(value) {
  const normalised = normalize(value);
  return normalised ? normalised.split(' ').map(stem) : [];
}

/** Where in `haystack` the token run `needle` starts, every time it does. */
function matchPositions(haystack, needle) {
  const found = [];
  if (!needle.length || needle.length > haystack.length) return found;

  for (let index = 0; index <= haystack.length - needle.length; index += 1) {
    let hit = true;
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (haystack[index + offset] !== needle[offset]) {
        hit = false;
        break;
      }
    }
    if (hit) found.push(index);
  }
  return found;
}

/**
 * How many times a body carries a keyword phrase.
 *
 * @param {string} text HTML or text
 * @param {string} keyword
 * @returns {number}
 */
export function countOccurrences(text, keyword) {
  const needle = tokens(keyword);
  if (!needle.length) return 0;
  return matchPositions(tokens(text), needle).length;
}

/**
 * Whether a body carries a keyword phrase.
 *
 * @param {string} text HTML or text
 * @param {string} keyword
 * @returns {boolean}
 */
export function containsKeyword(text, keyword) {
  return countOccurrences(text, keyword) > 0;
}

/**
 * The share of a body that is the keyword, as a percentage.
 *
 * One occurrence of a four-word phrase counts once, not four times: the
 * question the `keyword-density` test asks is how often the phrase is used,
 * not how many words it happens to be long.
 *
 * @param {string} text HTML or text
 * @param {string} keyword
 * @returns {number} `0` when either side is empty
 */
export function density(text, keyword) {
  const haystack = tokens(text);
  if (!haystack.length) return 0;
  const hits = countOccurrences(text, keyword);
  return hits === 0 ? 0 : (hits / haystack.length) * 100;
}

/**
 * How far into a body the keyword first appears, as a percentage of its words.
 *
 * @param {string} text HTML or text
 * @param {string} keyword
 * @returns {number|null} `null` when the keyword is not there at all
 */
export function firstOccurrencePercent(text, keyword) {
  const haystack = tokens(text);
  const needle = tokens(keyword);
  if (!haystack.length || !needle.length) return null;

  const positions = matchPositions(haystack, needle);
  if (!positions.length) return null;
  return (positions[0] / haystack.length) * 100;
}

/**
 * Whether the keyword turns up inside the opening slice of a body — the
 * paragraph a search engine and a reader both weigh hardest (SEO-06).
 *
 * The opening slice is never shorter than the keyword itself, so a short body
 * cannot fail a test it has no room to pass.
 *
 * @param {string} text HTML or text
 * @param {string} keyword
 * @param {number} [percent]
 * @returns {boolean}
 */
export function inFirstPercent(text, keyword, percent = 10) {
  const haystack = tokens(text);
  const needle = tokens(keyword);
  if (!haystack.length || !needle.length) return false;

  const positions = matchPositions(haystack, needle);
  if (!positions.length) return false;

  const windowWords = Math.max(needle.length, Math.ceil((haystack.length * percent) / 100));
  return positions[0] < windowWords;
}

/**
 * Whether two strings say the same thing for the purposes of the uniqueness
 * tests — case, punctuation and trailing whitespace are not a difference
 * (§7 of prompt 35).
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export const isSameText = (a, b) => {
  const left = normalize(a);
  return Boolean(left) && left === normalize(b);
};

/**
 * The rows of `context.siteIndex` that already use a value, excluding the
 * record being analysed.
 *
 * @param {Array<object>} siteIndex rows of `GET /admin/seo/overview`
 * @param {(row: object) => string} read which field of a row to compare
 * @param {string} value
 * @param {{id?: number|string, type?: string}} [self] the record being analysed
 * @returns {Array<object>}
 */
export function duplicatesIn(siteIndex, read, value, self = {}) {
  if (!Array.isArray(siteIndex) || !normalize(value)) return [];

  const hasSelf = self.id !== undefined && self.id !== null;

  return siteIndex.filter((row) => {
    if (!row) return false;
    const sameRecord =
      hasSelf &&
      String(row.id) === String(self.id) &&
      (!self.type || !row.type || row.type === self.type);
    if (sameRecord) return false;
    return isSameText(read(row), value);
  });
}

const keywords = {
  containsKeyword,
  countOccurrences,
  density,
  duplicatesIn,
  firstOccurrencePercent,
  inFirstPercent,
  isSameText,
  normalize,
  stem,
  tokens,
};

export default keywords;
