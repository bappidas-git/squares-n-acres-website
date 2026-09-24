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

/** An opening tag, attributes and all. */
const TAG_RE = /<[a-z][^>]*>/gi;

/** A quoted attribute value — what is left out when attribute names are read. */
const QUOTED_RE = /"[^"]*"|'[^']*'/g;

/** An inline event handler's name: `onclick=`, `onerror =`. */
const HANDLER_RE = /\son[a-z]+\s*=/i;

/** An attribute that holds an address, and the address, however it is quoted. */
const URL_ATTRIBUTE_RE =
  /\s(?:href|src|action|formaction|xlink:href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;

/** A string without spaces and control characters, which browsers skip inside a scheme. */
const withoutBlanks = (value) =>
  [...value].filter((character) => character.charCodeAt(0) > 32).join('');

/** The entities a browser decodes in an attribute value before it reads a scheme. */
const NAMED_IN_SCHEME = { colon: ':', tab: '\t', newline: '\n' };

/**
 * An attribute value as the browser reads it: `&#106;avascript&colon;` is a
 * `javascript:` address to the browser, and would be text to a plain compare.
 *
 * @param {string} value
 * @returns {string}
 */
const decodeAttribute = (value) =>
  value
    .replace(/&#x([0-9a-f]+);?/gi, (_match, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_match, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(
      /&(colon|tab|newline);/gi,
      (match, name) => NAMED_IN_SCHEME[name.toLowerCase()] ?? match
    );

/**
 * Whether a stored HTML string carries markup the site must never run (QA-55):
 * a script element, an inline event handler, a `javascript:` address.
 *
 * Handlers and addresses are looked for inside tags only, and a handler among
 * the attribute **names** only, so neither prose nor an alt text that happens
 * to read "onward=" is mistaken for one.
 *
 * Sanitising is the editor's job (`dompurify`, `components/editor/sanitize`);
 * this is the API's second line of defence against a body that reached it
 * some other way, as the pages API refuses a `<script` in a block.
 *
 * @param {string} html
 * @returns {boolean}
 */
function unsafeMarkup(html) {
  if (typeof html !== 'string' || html === '') return false;
  if (/<script\b/i.test(html)) return true;

  return (html.match(TAG_RE) ?? []).some((tag) => {
    if (HANDLER_RE.test(tag.replace(QUOTED_RE, '""'))) return true;
    return [...tag.matchAll(URL_ATTRIBUTE_RE)].some((match) =>
      /^javascript:/i.test(withoutBlanks(decodeAttribute(match[1] ?? match[2] ?? match[3] ?? '')))
    );
  });
}

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

module.exports = { stripHtml, wordCount, readingTime, unsafeMarkup, WORDS_PER_MINUTE };
