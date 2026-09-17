/**
 * A row of live listings inside written content.
 *
 * The block stores ids, never a copy of the listings: a price that changed
 * after the article was published is the price the article shows, and a listing
 * that was taken down disappears from it. It serialises to
 * `<div data-sna-block="properties" data-ids="1,2">`.
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';

import PropertyEmbedView from './PropertyEmbedView';
import { idListAttribute } from './attributes';

export const PropertyEmbedNode = Node.create({
  name: 'propertyEmbed',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return { ids: idListAttribute('data-ids') };
  },

  parseHTML() {
    return [{ tag: 'div[data-sna-block="properties"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-sna-block': 'properties' })];
  },

  addCommands() {
    return {
      insertPropertyEmbed:
        (ids = []) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { ids } }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(PropertyEmbedView);
  },
});

export default PropertyEmbedNode;
