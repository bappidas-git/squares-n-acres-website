/**
 * Images, as the site actually renders them: a `<figure>` with a lazily loaded
 * `<img>` and an optional `<figcaption>`.
 *
 * The base extension writes a bare `<img>`, which loses the caption an editor
 * wrote and the alignment they chose. This one keeps the whole figure as a
 * single atom so it moves, copies and deletes as one thing, and serialises to
 * the markup the seed articles already use.
 *
 * Alignment and width are `data-align`/`data-width` rather than class names:
 * both are on the sanitiser's attribute allow-list, where a `class` is narrowed
 * to `sna-*`/`prose-*` and a layout class would need a second rule to survive.
 */

import { Image } from '@tiptap/extension-image';
import { mergeAttributes } from '@tiptap/core';

/** Where the figure sits in the column. */
export const FIGURE_ALIGNMENTS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Centre' },
  { value: 'right', label: 'Right' },
];

/** How much of the column it takes. */
export const FIGURE_WIDTHS = [
  { value: 'full', label: 'Column width' },
  { value: 'wide', label: 'Wider than the column' },
  { value: 'half', label: 'Half the column' },
];

/** The `<img>` of a figure, or the element itself when it already is one. */
const imageOf = (element) =>
  element?.tagName === 'FIGURE' ? element.querySelector('img') : element;

const readAttribute = (name) => (element) => imageOf(element)?.getAttribute(name) ?? null;

export const FigureImage = Image.extend({
  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),

      src: { default: null, parseHTML: readAttribute('src') },
      alt: { default: '', parseHTML: readAttribute('alt') },
      title: { default: null, parseHTML: readAttribute('title') },
      width: { default: null, parseHTML: readAttribute('width') },
      height: { default: null, parseHTML: readAttribute('height') },

      /**
       * The caption, as text. `<figcaption>` may legally hold markup, but a
       * caption that can hold a list is a caption nobody can lay out, and the
       * dialog that writes it is a single-line box.
       */
      caption: {
        default: '',
        parseHTML: (element) =>
          element?.tagName === 'FIGURE'
            ? (element.querySelector('figcaption')?.textContent?.trim() ?? '')
            : '',
        renderHTML: () => ({}),
      },

      align: {
        default: 'center',
        parseHTML: (element) => element?.getAttribute?.('data-align') ?? null,
        renderHTML: () => ({}),
      },

      size: {
        default: 'full',
        parseHTML: (element) => element?.getAttribute?.('data-width') ?? null,
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'figure', getAttrs: (element) => (element.querySelector('img') ? {} : false) },
      { tag: 'img[src]:not([src^="data:"])' },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { caption, align, size } = node.attrs;

    const image = [
      'img',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { loading: 'lazy' }),
    ];

    const figure = [
      'figure',
      {
        class: 'sna-figure',
        'data-align': align || 'center',
        'data-width': size || 'full',
      },
      image,
    ];

    return caption ? [...figure, ['figcaption', {}, caption]] : figure;
  },

  addCommands() {
    return {
      ...this.parent?.(),

      /**
       * Insert a figure. Refuses an image with no alternative text: a picture
       * nobody can describe is a picture a screen reader cannot read and a
       * search engine cannot index (§8.3).
       */
      setFigureImage:
        (attributes = {}) =>
        ({ commands }) => {
          const alt = String(attributes.alt ?? '').trim();
          if (!attributes.src || !alt) return false;
          return commands.insertContent({ type: this.name, attrs: { ...attributes, alt } });
        },
    };
  },
});

export default FigureImage;
