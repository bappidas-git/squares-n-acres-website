/**
 * The call-to-action band an editor can drop into an article or a page.
 *
 * It serialises to `<div data-sna-block="cta" data-title … data-lead-source>`,
 * which `SafeHtml` renders as the real band with the real enquiry dialog behind
 * its button. Naming a `leadSource` is what turns the button from a link into a
 * form, exactly as the CMS `cta` block does (§6.10).
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';

import CtaBlockView from './CtaBlockView';
import { dataAttribute } from './attributes';

export const CtaBlockNode = Node.create({
  name: 'ctaBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      title: dataAttribute('data-title'),
      text: dataAttribute('data-text'),
      buttonLabel: dataAttribute('data-button-label'),
      buttonHref: dataAttribute('data-button-href'),
      leadSource: dataAttribute('data-lead-source'),
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-sna-block="cta"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-sna-block': 'cta' })];
  },

  addCommands() {
    return {
      insertCtaBlock:
        (attributes = {}) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: attributes }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CtaBlockView);
  },
});

export default CtaBlockNode;
