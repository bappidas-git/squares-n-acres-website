/**
 * The one allow-list every piece of CMS-authored HTML passes through.
 *
 * It runs twice on purpose: once on the way out of `RichTextEditor` (so what is
 * stored is already clean) and once on the way into `SafeHtml` (so markup that
 * predates the editor, or that a future API ever hands us, is clean on the
 * page). Sanitising on render is the half that actually protects a visitor;
 * sanitising on save is what keeps the stored value honest.
 *
 * The vocabulary below is exactly what the editor can produce: the marks and
 * blocks of `extensions.js`, the `<figure>` of `FigureImage`, the tables, the
 * YouTube embed and the three `data-sna-block` placeholders the custom nodes
 * serialise to. Anything else — a `<script>`, an `on*` handler, a
 * `javascript:` or `data:` URL, an iframe pointing somewhere we do not embed
 * from, a `style` attribute, a class that is not ours — is dropped.
 */

import DOMPurify from 'dompurify';

/** Everything the editor can write, and nothing else. */
export const ALLOWED_TAGS = [
  'p',
  'br',
  'h2',
  'h3',
  'h4',
  'strong',
  'em',
  'u',
  's',
  'code',
  'blockquote',
  'ul',
  'ol',
  'li',
  'hr',
  'a',
  'img',
  'figure',
  'figcaption',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'iframe',
  'div',
  'span',
  'mark',
  'sup',
  'sub',
];

/**
 * The attributes those tags may carry.
 *
 * `data-*` is **not** open: `ALLOW_DATA_ATTR` is off and the handful of data
 * attributes the custom nodes and the figure need are listed one by one, so a
 * `data-onclick-ish` attribute pasted from anywhere is still dropped.
 */
export const ALLOWED_ATTR = [
  'href',
  'target',
  'rel',
  'src',
  'alt',
  'title',
  'loading',
  'width',
  'height',
  'class',
  'colspan',
  'rowspan',
  'data-sna-block',
  'data-ids',
  'data-title',
  'data-text',
  'data-button-label',
  'data-button-href',
  'data-lead-source',
  'data-items',
  'data-align',
  'data-width',
  'data-youtube-video',
  'allow',
  'allowfullscreen',
  'frameborder',
];

/**
 * The only places an `<iframe>` may point at.
 *
 * A host alone is not always enough: `www.google.com` is the maps embed *and*
 * everything else Google serves, so the map entry pins the path too.
 */
const EMBED_HOSTS = [
  { host: 'www.youtube.com' },
  { host: 'www.youtube-nocookie.com' },
  { host: 'player.vimeo.com' },
  { host: 'www.google.com', pathPrefix: '/maps' },
];

/** `sna-*` for our own hooks, `prose-*` for the typography's modifiers. */
const CLASS_PATTERN = /^(?:sna|prose)-[a-z0-9-]+$/;

/**
 * Schemes an `href` may use.
 *
 * The shape is DOMPurify's own default with `data:` and the exotic schemes
 * taken out: an absolute `https`/`mailto`/`tel` URL, anything that starts with
 * a character no scheme can start with (`/path`, `#anchor`, `?q=`), or a
 * relative path whose first colon-free run is not a scheme at all.
 */
const SAFE_URI = /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.:-]|$))/i;

/** `true` for a URL that may be embedded in an `<iframe>`. */
export function isAllowedEmbedUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return false;
  try {
    const url = new URL(raw, 'https://www.squaresnacres.com');
    if (url.protocol !== 'https:') return false;
    return EMBED_HOSTS.some(
      (entry) =>
        entry.host === url.hostname &&
        (!entry.pathPrefix || url.pathname.startsWith(entry.pathPrefix))
    );
  } catch {
    return false;
  }
}

/** Whether the DOM this module needs is available (it is not, under plain Node). */
const supported = () => Boolean(DOMPurify.isSupported);

let hooked = false;

/**
 * The two rules the allow-list alone cannot express, registered once.
 *
 * `uponSanitizeElement` runs before an element is kept, which is where an
 * iframe pointing outside {@link EMBED_HOSTS} is removed whole.
 * `afterSanitizeAttributes` runs once the attributes have survived the
 * allow-list, which is where the class list is narrowed, `data:` URLs are
 * dropped and a new tab is given its `rel`.
 */
function installHooks() {
  if (hooked || !supported()) return;
  hooked = true;

  DOMPurify.addHook('uponSanitizeElement', (node, data) => {
    if (data.tagName !== 'iframe') return;
    if (isAllowedEmbedUrl(node.getAttribute?.('src'))) return;
    node.parentNode?.removeChild(node);
  });

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (typeof node.getAttribute !== 'function') return;

    if (node.hasAttribute('class')) {
      const kept = node
        .getAttribute('class')
        .split(/\s+/)
        .filter((name) => CLASS_PATTERN.test(name));
      if (kept.length > 0) node.setAttribute('class', kept.join(' '));
      else node.removeAttribute('class');
    }

    // DOMPurify lets a `data:` URI through on an `<img>` by default; the
    // contract embeds pictures by URL, so it is dropped here too.
    ['src', 'href'].forEach((name) => {
      const value = node.getAttribute(name);
      if (value && /^\s*data:/i.test(value)) node.removeAttribute(name);
    });

    if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
      const rel = new Set(
        (node.getAttribute('rel') ?? '')
          .split(/\s+/)
          .filter(Boolean)
          .map((token) => token.toLowerCase())
      );
      rel.add('noopener');
      node.setAttribute('rel', [...rel].join(' '));
    }
  });
}

/**
 * CMS HTML, minus everything the allow-list does not name.
 *
 * @param {string} html
 * @returns {string} `''` for an empty value, and for a DOM-less environment,
 *   where nothing can be sanitised and rendering raw markup is not an option
 */
export function sanitizeHtml(html) {
  const raw = html === null || html === undefined ? '' : String(html);
  if (!raw.trim()) return '';
  if (!supported()) return '';

  installHooks();

  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: SAFE_URI,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
  });
}

export default sanitizeHtml;
