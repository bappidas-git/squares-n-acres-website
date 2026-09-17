/**
 * What happens to markup pasted from somewhere else.
 *
 * Word and Google Docs paste their own stylesheet along with the words: a
 * `<style>` block of `mso-*` rules, a `class` on every paragraph, an inline
 * `style` on every run and a `<span>` around each of them. Dropped into the
 * editor as-is that is unreadable markup which the sanitiser then strips
 * anyway, leaving the writer wondering why their formatting vanished at save
 * time. Cleaning at paste time means what they see after pasting is what will
 * be stored.
 *
 * Structure is kept — headings, lists, links, bold, italic, tables — because
 * that is the part worth pasting.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

/** Whole elements whose content is presentation, not text. */
const DROP_ELEMENTS = 'style, script, meta, link, title, xml, o\\:p';

/** Wrappers that carry nothing once their attributes are gone. */
const UNWRAP_ELEMENTS = ['SPAN', 'FONT', 'B', 'I', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER'];

/** Attributes no pasted element keeps. */
const DROP_ATTRIBUTES = ['class', 'style', 'lang', 'dir', 'id', 'align', 'valign', 'bgcolor'];

/** `<!--[if gte mso 9]> … <![endif]-->` and friends. */
const CONDITIONAL_COMMENT = /<!--\[if[\s\S]*?<!\[endif\]-->/gi;

/** Google Docs wraps its paste in `<b style="font-weight:normal">`. */
const isFauxBold = (element) =>
  (element.tagName === 'B' || element.tagName === 'I') &&
  /font-(?:weight|style)\s*:\s*normal/i.test(element.getAttribute('style') ?? '');

/** Whether `<b>`/`<i>` really mean bold/italic and must survive the unwrap. */
const isRealEmphasis = (element) =>
  (element.tagName === 'B' || element.tagName === 'I') && !isFauxBold(element);

/**
 * Pasted HTML with the word processor's chrome taken off.
 *
 * @param {string} html
 * @returns {string}
 */
export function cleanPastedHtml(html) {
  const raw = String(html ?? '').replace(CONDITIONAL_COMMENT, '');
  if (!raw.trim()) return '';
  if (typeof DOMParser === 'undefined') return raw;

  const doc = new DOMParser().parseFromString(`<body>${raw}</body>`, 'text/html');
  const body = doc.body;

  body.querySelectorAll(DROP_ELEMENTS).forEach((element) => element.remove());

  // Attributes first: `<b style="font-weight:normal">` has to be recognisable
  // while its style is still there.
  body.querySelectorAll('*').forEach((element) => {
    if (isFauxBold(element)) element.setAttribute('data-sna-unwrap', '');
    DROP_ATTRIBUTES.forEach((name) => element.removeAttribute(name));
    [...element.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      if (name.startsWith('on') || name.startsWith('mso') || name.startsWith('v:')) {
        element.removeAttribute(attribute.name);
      }
    });
  });

  // Unwrapping mutates the tree, so the list is taken first and walked deepest
  // first — an unwrapped parent must not orphan a child still to be visited.
  const wrappers = [...body.querySelectorAll(UNWRAP_ELEMENTS.join(','))].reverse();
  wrappers.forEach((element) => {
    if (isRealEmphasis(element) && !element.hasAttribute('data-sna-unwrap')) return;
    element.replaceWith(...element.childNodes);
  });

  // Empty paragraphs are how Word spaces things out; one is a blank line, four
  // in a row are a layout.
  body.querySelectorAll('p').forEach((element) => {
    if (element.textContent.trim() === '' && !element.querySelector('img, br')) element.remove();
  });

  return body.innerHTML;
}

/** The plugin key, exported so a test can reach the plugin by name. */
export const pasteCleanupKey = new PluginKey('snaPasteCleanup');

/** The Tiptap extension that runs {@link cleanPastedHtml} on every paste. */
export const PasteCleanup = Extension.create({
  name: 'snaPasteCleanup',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: pasteCleanupKey,
        props: {
          transformPastedHTML: (html) => cleanPastedHtml(html),
        },
      }),
    ];
  },
});

export default PasteCleanup;
