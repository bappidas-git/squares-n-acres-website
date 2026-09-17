/**
 * The table of contents of a CMS-authored body (00_MASTER_CONTEXT.md §6.8).
 *
 * An article's contents list and the ids the body's headings carry have to be
 * the same strings, or every link in the list is a link to nowhere. So the id
 * rule lives here, once, and both sides read it: `components/editor/SafeHtml`
 * calls {@link assignHeadingIds} while it is rendering, and the article page
 * calls {@link buildToc} over the same markup to draw the list.
 *
 * Only `h2` and `h3` are collected — `h1` is the page's own headline and the
 * levels below are too fine for a contents list.
 */

import { slugify } from './slug';

/** The headings a contents list is built from. */
export const HEADING_SELECTOR = 'h2, h3';

/**
 * A de-duplicator for one document: the second "Overview" becomes
 * `overview-2`, the third `overview-3`, so an anchor always names one heading.
 *
 * @returns {(text: string) => string}
 */
export function createHeadingIds() {
  const used = new Set();

  return (text) => {
    const base = slugify(text) || 'section';
    let id = base;
    let suffix = 2;
    while (used.has(id)) {
      id = `${base}-${suffix}`;
      suffix += 1;
    }
    used.add(id);
    return id;
  };
}

/**
 * Gives every `h2`/`h3` of a parsed body the id its contents link points at,
 * in place, and answers with what it found.
 *
 * @param {ParentNode} root a parsed `<body>`, not an HTML string
 * @returns {Array<{id: string, text: string, level: 2|3}>} in document order
 */
export function assignHeadingIds(root) {
  const nextId = createHeadingIds();
  const found = [];

  root.querySelectorAll(HEADING_SELECTOR).forEach((heading) => {
    const text = (heading.textContent ?? '').replace(/\s+/g, ' ').trim();
    const id = nextId(text);
    heading.setAttribute('id', id);
    found.push({ id, text, level: heading.tagName === 'H3' ? 3 : 2 });
  });

  return found;
}

/**
 * The `h2`/`h3` headings of an HTML string, flat and in document order.
 *
 * @param {string} html
 * @returns {Array<{id: string, text: string, level: 2|3}>}
 */
export function listHeadings(html) {
  if (!html || typeof DOMParser === 'undefined') return [];

  const body = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body;
  return assignHeadingIds(body).filter((heading) => heading.text.length > 0);
}

/**
 * The contents of a body: every `h2` with the `h3`s that follow it.
 *
 * An `h3` before the first `h2` — a body that opens at the third level — is
 * kept at the top of the list rather than dropped, because a heading a reader
 * can see and the list cannot is worse than an uneven list.
 *
 * @param {string} html
 * @returns {Array<{id: string, text: string, level: 2|3, children: Array<object>}>}
 */
export function buildToc(html) {
  const tree = [];

  for (const heading of listHeadings(html)) {
    const node = { ...heading, children: [] };
    const parent = heading.level === 3 ? tree[tree.length - 1] : null;
    if (parent && parent.level === 2) parent.children.push(node);
    else tree.push(node);
  }

  return tree;
}

/**
 * Every id of a contents tree, parents and children, in document order —
 * what an `IntersectionObserver` watches to highlight the heading being read.
 *
 * @param {Array<object>} toc
 * @returns {string[]}
 */
export const tocIds = (toc = []) =>
  toc.flatMap((entry) => [entry.id, ...(entry.children ?? []).map((child) => child.id)]);

/**
 * How many headings a contents tree holds — the number the "is this list worth
 * drawing" threshold is measured against.
 *
 * @param {Array<object>} toc
 * @returns {number}
 */
export const tocLength = (toc = []) => tocIds(toc).length;

const toc = { buildToc, listHeadings, assignHeadingIds, createHeadingIds, tocIds, tocLength };
export default toc;
