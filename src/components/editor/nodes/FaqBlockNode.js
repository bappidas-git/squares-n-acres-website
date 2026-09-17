/**
 * Questions and answers inside written content.
 *
 * It serialises to `<div data-sna-block="faq" data-items="[…]">`, with the
 * questions as JSON in the attribute, and `SafeHtml` renders it through the
 * same `FaqAccordion` the rest of the site uses — including the structured data
 * an article page merges into its `FAQPage` schema.
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';

import FaqBlockView from './FaqBlockView';
import { jsonListAttribute } from './attributes';

export const FaqBlockNode = Node.create({
  name: 'faqBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return { items: jsonListAttribute('data-items') };
  },

  parseHTML() {
    return [{ tag: 'div[data-sna-block="faq"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-sna-block': 'faq' })];
  },

  addCommands() {
    return {
      insertFaqBlock:
        (items = []) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { items } }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(FaqBlockView);
  },
});

export default FaqBlockNode;
