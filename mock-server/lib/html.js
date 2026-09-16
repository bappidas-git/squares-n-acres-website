/**
 * HTML → text (00_MASTER_CONTEXT.md §6.8).
 *
 * Articles and pages are stored as sanitised HTML; three numbers are derived
 * from that HTML every time one is saved: `contentText` (what the search `q`
 * matches and what the SEO readability analysers read), `wordCount` and
 * `readingTimeMinutes`. They are computed here rather than in the route so the
 * article router, the page router and the tests all agree on what a word is.
 *
 * The conversion is deliberately shallow — no parser may be added (§3.3) and
 * the input is HTML the editor produced, not arbitrary markup from the web.
 */

/** Elements whose content is markup or styling rather than prose. */
const NON_PROSE_RE = /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi;

/** Tags that end a sentence when they close, so text does not run together. */
const BLOCK_RE = /<\/(p|div|h[1-6]|li|tr|td|th|blockquote|section|article|figcaption)>/gi;

/** The five predefined entities plus the ones an editor produces routinely. */
const ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&nbsp;': ' ',
  '&ndash;': '–',
  '&mdash;': '—',
  '&hellip;': '…',
  '&rsquo;': '’',
  '&lsquo;': '‘',
  '&rdquo;': '”',
  '&ldquo;': '“',
  '&#8377;': '₹',
};

/** Words per minute the reading-time estimate assumes (§6.8). */
const WORDS_PER_MINUTE = 200;

/**
 * The plain text of an HTML fragment.
 *
 * @param {string} html
 * @returns {string} single-spaced, trimmed; `''` for anything but a string
 */
function stripHtml(html) {
  if (typeof html !== 'string' || html === '') return '';

  return html
    .replace(NON_PROSE_RE, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(BLOCK_RE, '$& ')
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z]+;|&#\d+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * How many words a text holds.
 *
 * A "word" is a run of characters separated by whitespace, which counts
 * "3 BHK" as two and "end-to-end" as one — the same arithmetic a writer does
 * when they say an article is 1,200 words long.
 *
 * @param {string} text plain text, or HTML (stripped first)
 * @returns {number}
 */
function wordCount(text) {
  const plain = /<[a-z!/]/i.test(String(text ?? '')) ? stripHtml(text) : String(text ?? '').trim();
  if (plain === '') return 0;
  return plain.split(/\s+/).filter(Boolean).length;
}

/**
 * The reading time of a word count, in whole minutes (§6.8).
 *
 * @param {number} words
 * @param {number} [wordsPerMinute]
 * @returns {number} at least 1 — "0 min read" helps nobody
 */
function readingTime(words, wordsPerMinute = WORDS_PER_MINUTE) {
  const count = Number(words);
  if (!Number.isFinite(count) || count <= 0) return 1;
  return Math.max(1, Math.ceil(count / wordsPerMinute));
}

module.exports = { stripHtml, wordCount, readingTime, WORDS_PER_MINUTE };
