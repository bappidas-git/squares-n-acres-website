/**
 * HTML in, the pieces an analyser counts out: text, words, sentences,
 * paragraphs, headings, images and links.
 *
 * The engine runs in two places — the admin panel in a browser and Jest in
 * Node — and §7 of prompt 35 requires the same answer in both. So neither
 * reader parses HTML itself: both turn the markup into the same flat stream of
 * `open` / `text` / `close` events, and every function below is written
 * against that stream. In a browser the stream comes from `DOMParser`, in Node
 * from {@link scanHtml}, a small tag scanner; `text.test.js` asserts the two
 * agree on every fixture, which is the only way a rule written once can be
 * trusted twice.
 *
 * Nothing here is React-aware and nothing here sanitises: `components/editor/
 * SafeHtml` is what puts markup on a page, and this module only measures it.
 */

/** Elements that carry no text and never close. */
const VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

/** Elements whose content is code rather than prose. */
const RAW_TEXT_TAGS = new Set(['script', 'style', 'noscript', 'template']);

/** Elements that end the line they are on — a paragraph break for the reader. */
const BLOCK_TAGS = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'div',
  'dd',
  'dl',
  'dt',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'ul',
]);

/** The elements a "paragraph" is measured over (`short-paragraphs`, SEO-09). */
const PARAGRAPH_TAGS = new Set(['p', 'li', 'blockquote', 'pre']);

/** The six heading levels, in one place. */
const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

const NAMED_ENTITIES = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
  bull: '•',
  copy: '©',
  deg: '°',
  hellip: '…',
  ldquo: '“',
  lsquo: '‘',
  mdash: '—',
  middot: '·',
  ndash: '–',
  rdquo: '”',
  reg: '®',
  rsquo: '’',
  times: '×',
  trade: '™',
};

/**
 * `&amp;` → `&`, `&#8377;` → `₹`.
 *
 * The browser decodes entities on the way into the DOM, so the scanner has to
 * decode the same ones on the way into its text events or the two streams
 * would differ on the first `&nbsp;`.
 *
 * @param {string} value
 * @returns {string}
 */
export function decodeEntities(value) {
  return String(value ?? '').replace(/&(#x?[0-9a-f]+|[a-z][a-z0-9]*);/gi, (match, body) => {
    if (body[0] === '#') {
      const code =
        body[1] === 'x' || body[1] === 'X'
          ? Number.parseInt(body.slice(2), 16)
          : Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }
    const named = NAMED_ENTITIES[body.toLowerCase()];
    return named === undefined ? match : named;
  });
}

/**
 * The attributes of one start tag, lowercased names, decoded values.
 *
 * @param {string} source everything after the tag name inside `<…>`
 * @returns {Record<string, string>}
 */
function parseAttributes(source) {
  const attrs = {};
  const pattern = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>`]+)))?/g;
  let match;

  while ((match = pattern.exec(source))) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    if (!(name in attrs)) attrs[name] = decodeEntities(value);
  }
  return attrs;
}

/**
 * The event stream of an HTML string, read by a tag scanner (the Node path).
 *
 * @param {string} html
 * @returns {Array<{kind: 'open'|'close'|'text', tag?: string, attrs?: object, value?: string}>}
 */
export function scanHtml(html) {
  const source = String(html ?? '');
  const events = [];
  let index = 0;

  const pushText = (value) => {
    if (value) events.push({ kind: 'text', value: decodeEntities(value) });
  };

  while (index < source.length) {
    const next = source.indexOf('<', index);
    if (next === -1) {
      pushText(source.slice(index));
      break;
    }
    pushText(source.slice(index, next));

    if (source.startsWith('<!--', next)) {
      const end = source.indexOf('-->', next + 4);
      index = end === -1 ? source.length : end + 3;
      continue;
    }
    if (source.startsWith('<!', next) || source.startsWith('<?', next)) {
      const end = source.indexOf('>', next);
      index = end === -1 ? source.length : end + 1;
      continue;
    }

    const close = /^<\/([a-zA-Z][^\s>]*)\s*>/.exec(source.slice(next));
    if (close) {
      events.push({ kind: 'close', tag: close[1].toLowerCase() });
      index = next + close[0].length;
      continue;
    }

    const open = /^<([a-zA-Z][^\s/>]*)((?:"[^"]*"|'[^']*'|[^>])*?)(\/?)>/.exec(source.slice(next));
    if (!open) {
      // A stray `<` that starts no tag is text, exactly as a browser reads it.
      pushText('<');
      index = next + 1;
      continue;
    }

    const tag = open[1].toLowerCase();
    const attrs = parseAttributes(open[2]);
    index = next + open[0].length;
    events.push({ kind: 'open', tag, attrs });

    if (VOID_TAGS.has(tag) || open[3] === '/') {
      events.push({ kind: 'close', tag });
      continue;
    }

    if (RAW_TEXT_TAGS.has(tag)) {
      const endPattern = new RegExp(`</${tag}\\s*>`, 'i');
      const rest = source.slice(index);
      const end = endPattern.exec(rest);
      index += end ? end.index + end[0].length : rest.length;
      events.push({ kind: 'close', tag });
    }
  }

  return events;
}

/**
 * The event stream of an HTML string, read by the browser's own parser.
 *
 * @param {string} html
 * @returns {Array<object>} the same shape {@link scanHtml} returns
 */
export function parseHtmlWithDom(html) {
  const body = new DOMParser().parseFromString(
    `<body>${String(html ?? '')}</body>`,
    'text/html'
  ).body;
  const events = [];

  const walk = (node) => {
    for (const child of node.childNodes) {
      if (child.nodeType === 3) {
        if (child.data) events.push({ kind: 'text', value: child.data });
        continue;
      }
      if (child.nodeType !== 1) continue;

      const tag = child.tagName.toLowerCase();
      const attrs = {};
      for (const name of child.getAttributeNames()) attrs[name] = child.getAttribute(name) ?? '';
      events.push({ kind: 'open', tag, attrs });
      if (!RAW_TEXT_TAGS.has(tag) && !VOID_TAGS.has(tag)) walk(child);
      events.push({ kind: 'close', tag });
    }
  };

  walk(body);
  return events;
}

/** Whether a string is markup at all — plain text skips the parser entirely. */
const looksLikeHtml = (value) => /<[a-zA-Z!/]/.test(value);

/**
 * The event stream of an HTML string, through whichever parser this runtime
 * has. Exported so the analysers can parse once and measure many times.
 *
 * @param {string} html
 * @returns {Array<object>}
 */
export function parseHtml(html) {
  const source = String(html ?? '');
  if (!source) return [];
  if (typeof DOMParser === 'undefined') return scanHtml(source);
  return parseHtmlWithDom(source);
}

/** Horizontal whitespace collapsed, blank lines kept, edges trimmed. */
function normaliseText(value) {
  return String(value)
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * The reader's text: tags gone, entities decoded, one blank line where the
 * markup ended a block so that {@link sentences} and {@link paragraphs} can
 * still tell one thought from the next.
 *
 * @param {string} html markup, or plain text (returned tidied)
 * @returns {string}
 */
export function stripHtml(html) {
  const source = String(html ?? '');
  if (!source) return '';
  if (!looksLikeHtml(source)) return normaliseText(source);

  const out = [];
  for (const event of parseHtml(source)) {
    if (event.kind === 'text') {
      out.push(event.value);
      continue;
    }
    if (event.tag === 'br') {
      if (event.kind === 'open') out.push('\n');
      continue;
    }
    if (BLOCK_TAGS.has(event.tag)) out.push('\n');
  }

  return normaliseText(out.join(''));
}

/**
 * How many words a string holds, counting the way a reader would: a hyphenated
 * word is one word, `1,650` is one word, and a letter in any script counts —
 * including the scripts whose vowels are combining marks rather than letters,
 * which is every Indian one.
 *
 * @param {string} input HTML or text
 * @returns {number}
 */
export function wordCount(input) {
  return words(input).length;
}

/**
 * The words of a string, lowercased for comparison by the callers that need it.
 *
 * @param {string} input HTML or text
 * @returns {string[]}
 */
export function words(input) {
  const text = stripHtml(input);
  return (
    text.match(/[\p{L}\p{N}][\p{L}\p{N}\p{M}]*(?:[’'\-.,][\p{L}\p{N}][\p{L}\p{N}\p{M}]*)*/gu) ?? []
  );
}

/**
 * The abbreviations whose full stop ends a word rather than a sentence —
 * "1,650 sq. ft." is one sentence, not three.
 */
const ABBREVIATIONS = new Set([
  'approx.',
  'a.m.',
  'co.',
  'dr.',
  'e.g.',
  'etc.',
  'fig.',
  'ft.',
  'i.e.',
  'jr.',
  'ltd.',
  'mr.',
  'mrs.',
  'ms.',
  'no.',
  'p.a.',
  'p.m.',
  'pvt.',
  'rs.',
  'sq.',
  'sr.',
  'st.',
  'vs.',
  'yd.',
]);

/** One line of text, cut into sentences. */
function splitSentences(line) {
  const out = [];
  const pattern = /([.!?]+)(["')\]]*)(\s+|$)/g;
  let start = 0;
  let match;

  while ((match = pattern.exec(line))) {
    const end = match.index + match[1].length + match[2].length;
    const chunk = line.slice(start, end);
    const word = /([\p{L}\p{N}.]+)[.!?]+["')\]]*$/u.exec(chunk);
    const candidate = word ? `${word[1].toLowerCase()}.` : '';

    // A single initial ("R. Nagar") and a known abbreviation both keep going.
    if (match[1] === '.' && (ABBREVIATIONS.has(candidate) || /^\p{L}\.$/u.test(candidate)))
      continue;

    const sentence = chunk.trim();
    if (sentence) out.push(sentence);
    start = pattern.lastIndex;
  }

  const tail = line.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}

/**
 * The sentences of a body, in order.
 *
 * A line break ends a sentence even without punctuation, because a heading and
 * a list item are sentences a reader reads as one each.
 *
 * @param {string} input HTML or text
 * @returns {string[]}
 */
export function sentences(input) {
  return stripHtml(input)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap(splitSentences)
    .filter((sentence) => /[\p{L}\p{N}]/u.test(sentence));
}

/**
 * The paragraphs of a body: the text of every `<p>`, list item, quote and
 * preformatted block, or — for plain text — whatever the blank lines separate.
 *
 * @param {string} input HTML or text
 * @returns {string[]}
 */
export function paragraphs(input) {
  const source = String(input ?? '');
  if (!source.trim()) return [];

  if (looksLikeHtml(source)) {
    const found = [];
    const stack = [];
    let buffer = null;

    for (const event of parseHtml(source)) {
      if (event.kind === 'text') {
        if (buffer) buffer.push(event.value);
        continue;
      }
      if (event.kind === 'open') {
        stack.push(event.tag);
        if (!buffer && PARAGRAPH_TAGS.has(event.tag)) buffer = [];
        else if (buffer && event.tag === 'br') buffer.push(' ');
        continue;
      }
      stack.pop();
      if (
        buffer &&
        PARAGRAPH_TAGS.has(event.tag) &&
        !stack.some((tag) => PARAGRAPH_TAGS.has(tag))
      ) {
        const text = normaliseText(buffer.join('')).replace(/\n+/g, ' ');
        if (text) found.push(text);
        buffer = null;
      }
    }

    if (found.length) return found;
  }

  return stripHtml(source)
    .split(/\n{2,}/)
    .map((block) => block.replace(/\n+/g, ' ').trim())
    .filter(Boolean);
}

/** The text of an element, from the events between its `open` and `close`. */
function collectElements(events, matches) {
  const found = [];
  let depth = 0;
  let current = null;

  for (const event of events) {
    if (event.kind === 'text') {
      if (current) current.parts.push(event.value);
      continue;
    }
    if (event.kind === 'open') {
      if (current) depth += 1;
      else if (matches(event.tag)) current = { tag: event.tag, attrs: event.attrs, parts: [] };
      continue;
    }
    if (!current) continue;
    if (depth > 0) {
      depth -= 1;
      continue;
    }
    if (event.tag === current.tag) {
      found.push({ ...current, text: normaliseText(current.parts.join('')).replace(/\n+/g, ' ') });
      current = null;
    }
  }

  return found;
}

/**
 * Every heading of a body, in document order.
 *
 * @param {string} html
 * @returns {Array<{level: number, text: string}>}
 */
export function headings(html) {
  return collectElements(parseHtml(html), (tag) => HEADING_TAGS.has(tag))
    .map((element) => ({ level: Number(element.tag[1]), text: element.text }))
    .filter((heading) => heading.text.length > 0);
}

/**
 * Every image of a body, in document order. `alt=""` — a decorative image —
 * comes back as an empty string, not as a missing one.
 *
 * @param {string} html
 * @returns {Array<{src: string, alt: string}>}
 */
export function images(html) {
  return parseHtml(html)
    .filter((event) => event.kind === 'open' && event.tag === 'img')
    .map((event) => ({ src: event.attrs.src ?? '', alt: event.attrs.alt ?? '' }));
}

/** Whether an href points back at this site (§9.4 counts those as internal). */
function isInternalHref(href, siteUrl) {
  const value = String(href ?? '').trim();
  if (!value) return false;
  if (/^(mailto|tel|sms|javascript):/i.test(value)) return false;
  if (/^(https?:)?\/\//i.test(value)) {
    if (!siteUrl) return false;
    const host = /^(?:https?:)?\/\/([^/?#]+)/i.exec(value)?.[1]?.toLowerCase() ?? '';
    const own = /^(?:https?:)?\/\/([^/?#]+)/i.exec(siteUrl)?.[1]?.toLowerCase() ?? '';
    return Boolean(host) && host === own;
  }
  return true;
}

/**
 * Every link of a body, in document order.
 *
 * @param {string} html
 * @param {{siteUrl?: string}} [options] the site's own origin, so that an
 *   absolute link back to it is counted as internal rather than as outbound
 * @returns {Array<{href: string, rel: string, internal: boolean}>}
 */
export function links(html, { siteUrl = '' } = {}) {
  return parseHtml(html)
    .filter((event) => event.kind === 'open' && event.tag === 'a' && 'href' in event.attrs)
    .map((event) => ({
      href: event.attrs.href ?? '',
      rel: (event.attrs.rel ?? '').trim(),
      internal: isInternalHref(event.attrs.href, siteUrl),
    }));
}

/** Whether a link carries `rel="nofollow"` (or `sponsored`/`ugc`, which count the same). */
export const isNofollow = (link) => /\b(nofollow|sponsored|ugc)\b/i.test(link?.rel ?? '');

/**
 * The first `n` words of a body as one string — what the "keyword in the first
 * 10 %" test reads.
 *
 * @param {string} input
 * @param {number} count
 * @returns {string}
 */
export const firstWords = (input, count) => words(input).slice(0, Math.max(0, count)).join(' ');

const text = {
  decodeEntities,
  firstWords,
  headings,
  images,
  isNofollow,
  links,
  paragraphs,
  parseHtml,
  parseHtmlWithDom,
  scanHtml,
  sentences,
  stripHtml,
  wordCount,
  words,
};

export default text;
