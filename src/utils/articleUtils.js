/**
 * What an article's own text decides, and how its publication moment is typed
 * (00_MASTER_CONTEXT.md §6.8, §1 "timezone Asia/Kolkata", D22).
 *
 * The API derives `contentText`, `wordCount` and `readingTimeMinutes` on every
 * save and never takes them from a client (§5.5). The same arithmetic lives
 * here because the admin form has to show an editor where they stand *before*
 * they save — "308 words, 2 min read, 8 short of the 300 a publish needs" — and
 * a second opinion on the number would be worse than no number at all.
 *
 * The text is read with `DOMParser`, the way `SafeHtml` and the paste rules
 * read markup: the input is HTML the editor produced, so a document is what it
 * is, not what a regular expression guesses. Without a DOM (a Node script, a
 * worker) every reader answers empty rather than something half-parsed — the
 * same rule `sanitizeHtml` follows.
 *
 *   generateExcerpt(content)        // the first paragraph, ≤ 300 characters
 *   wordCount(content)             // 1 240
 *   readingTime(1240)              // 7
 *   toDateTimeLocal(iso)           // '2026-10-12T09:00' — in IST, for the input
 *   dateTimeLocalToIso('2026-…')   // '2026-10-12T03:30:00.000Z'
 */

/** Words a minute the reading-time estimate assumes (§6.8). */
export const WORDS_PER_MINUTE = 200;

/** `articles.excerpt` is at most this long (§6.8). */
export const EXCERPT_MAX_LENGTH = 300;

/**
 * India Standard Time, as a fixed offset.
 *
 * India has never observed daylight saving, so IST is UTC+05:30 all year and
 * the conversion needs no timezone database — which is what makes the
 * scheduling field independent of the timezone the editor's laptop is set to
 * (D22: absolute dates are always rendered in Asia/Kolkata).
 */
export const IST_UTC_OFFSET = '+05:30';

/** The `yyyy-MM-ddTHH:mm` a `datetime-local` input reads and writes. */
const DATETIME_LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/**
 * Elements whose end separates two words.
 *
 * `textContent` concatenates without a gap, so `<p>one</p><p>two</p>` would
 * read as one word ("onetwo") and the count would be wrong on every article.
 * The list is the block half of the editor's own tag allow-list
 * (`components/editor/sanitize.js`).
 */
const BLOCK_TAGS = new Set([
  'P',
  'H2',
  'H3',
  'H4',
  'BLOCKQUOTE',
  'UL',
  'OL',
  'LI',
  'HR',
  'FIGURE',
  'FIGCAPTION',
  'TABLE',
  'THEAD',
  'TBODY',
  'TR',
  'TH',
  'TD',
  'DIV',
]);

/** Elements that break a line without ending a block. */
const BREAK_TAGS = new Set(['BR']);

/** Elements whose content is markup rather than prose. */
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME']);

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

/** The parsed body of an HTML fragment, or `null` when there is no DOM. */
function bodyOf(html) {
  if (typeof html !== 'string' || html.trim() === '') return null;
  if (typeof DOMParser === 'undefined') return null;
  return new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body;
}

/** One space between words, nothing at either end. */
const collapse = (text) =>
  String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();

/** The text of a node, with a space wherever a block or a break ends a word. */
function textOf(node) {
  let text = '';

  node.childNodes.forEach((child) => {
    if (child.nodeType === TEXT_NODE) {
      text += child.nodeValue ?? '';
      return;
    }
    if (child.nodeType !== ELEMENT_NODE) return;

    const tag = child.tagName;
    if (SKIP_TAGS.has(tag)) return;
    if (BREAK_TAGS.has(tag)) {
      text += ' ';
      return;
    }

    text += textOf(child);
    if (BLOCK_TAGS.has(tag)) text += ' ';
  });

  return text;
}

/**
 * The plain text of an article body — what the search matches and what the
 * word count measures (`contentText` in §6.8).
 *
 * @param {string} html
 * @returns {string} single-spaced and trimmed; `''` for anything but markup
 */
export function plainText(html) {
  const body = bodyOf(html);
  if (!body) return '';
  return collapse(textOf(body));
}

/**
 * The excerpt an article would get if nobody wrote one: its first paragraph,
 * cut to `EXCERPT_MAX_LENGTH` at a word boundary.
 *
 * The *first paragraph* rather than the first 300 characters of the document,
 * because a body that opens with a heading or a pull-quote would otherwise
 * produce an excerpt that reads as a fragment. A document with no paragraph at
 * all falls back to its whole text, which is the only other honest answer.
 *
 * @param {string} html the article body
 * @param {{maxLength?: number}} [options]
 * @returns {string} `''` when there is no text to take
 */
export function generateExcerpt(html, { maxLength = EXCERPT_MAX_LENGTH } = {}) {
  const body = bodyOf(html);
  if (!body) return '';

  const paragraph = Array.from(body.querySelectorAll('p'))
    .map((node) => collapse(textOf(node)))
    .find((text) => text.length > 0);

  const text = paragraph ?? collapse(textOf(body));
  if (text.length <= maxLength) return text;

  // One character of the budget belongs to the ellipsis, so the result is
  // never longer than the field allows.
  const clipped = text.slice(0, maxLength - 1);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${(lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped).replace(/[\s,;:.–—-]+$/, '')}…`;
}

/**
 * How many words an article body holds.
 *
 * A "word" is a run of non-space characters, which counts "3 BHK" as two and
 * "end-to-end" as one — the same arithmetic a writer does when they say an
 * article is 1 200 words long, and the same one `mock-server/lib/html.js`
 * does on the way into storage.
 *
 * @param {string} html
 * @returns {number}
 */
export function wordCount(html) {
  const text = plainText(html);
  if (text === '') return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Reading time in whole minutes (§6.8: `ceil(words / 200)`).
 *
 * An article with words in it always takes at least a minute to read; an empty
 * one takes none, because "1 min read" over a blank page is a claim rather
 * than an estimate. Every non-empty document therefore gets the figure the API
 * will store.
 *
 * @param {number} words
 * @returns {number}
 */
export function readingTime(words) {
  const count = Number(words);
  if (!Number.isFinite(count) || count <= 0) return 0;
  return Math.max(1, Math.ceil(count / WORDS_PER_MINUTE));
}

/**
 * An ISO instant as the `datetime-local` input spells it, in IST.
 *
 * The control has no timezone of its own: it shows and returns wall-clock
 * time, so the value it is given has to be the moment as a reader in Bengaluru
 * would see it (§1), not as the browser's own zone would.
 *
 * @param {string|Date|null} value an ISO-8601 instant
 * @returns {string} `yyyy-MM-ddTHH:mm`, or `''` when there is no valid moment
 */
export function toDateTimeLocal(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const part = (type) => parts.find((entry) => entry.type === type)?.value ?? '';
  // `hour12: false` renders midnight as "24" in some ICU versions.
  const hour = part('hour') === '24' ? '00' : part('hour');

  return `${part('year')}-${part('month')}-${part('day')}T${hour}:${part('minute')}`;
}

/**
 * The instant a `datetime-local` value names, read as IST (§5.5: the API
 * stores ISO-8601 UTC).
 *
 * @param {string} value `yyyy-MM-ddTHH:mm`
 * @returns {string|null} an ISO-8601 UTC string, or `null` when unparseable
 */
export function dateTimeLocalToIso(value) {
  const text = String(value ?? '').trim();
  if (!DATETIME_LOCAL_PATTERN.test(text)) return null;

  const date = new Date(`${text}:00.000${IST_UTC_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Whether a `datetime-local` value is still in the future — the rule a
 * scheduled article has to satisfy both here and on the server (§6.8).
 *
 * @param {string} value `yyyy-MM-ddTHH:mm`
 * @param {number} [now] epoch milliseconds to compare against
 * @returns {boolean} `false` for a value that is not a moment at all
 */
export function isFutureDateTime(value, now = Date.now()) {
  const iso = dateTimeLocalToIso(value);
  return iso !== null && Date.parse(iso) > now;
}
