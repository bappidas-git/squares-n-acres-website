/**
 * The editor's vocabulary — the single place that decides what an editor can
 * write, and therefore what `sanitize.js` has to allow.
 *
 * Choices worth knowing about:
 *
 * - **Headings are H2–H4.** The page owns its H1 (§9), so a body that could
 *   write one would compete with it in every outline.
 * - **Code blocks are off, inline `<code>` is on.** Real-estate content quotes
 *   a clause number or a RERA id, never a program.
 * - **Link, Underline and the table parts come from their own packages**
 *   rather than from StarterKit's copies, so their configuration is visible
 *   here instead of buried in a kit option.
 * - **The schema is the same in both variants.** `compact` hides the block
 *   inserts from the toolbar; it does not narrow what the document may hold,
 *   because a compact box opened on content that already has a table must not
 *   silently drop it.
 */

import StarterKit from '@tiptap/starter-kit';
import { CharacterCount, Placeholder } from '@tiptap/extensions';
import { Link } from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import { Youtube } from '@tiptap/extension-youtube';

import CtaBlockNode from './nodes/CtaBlockNode';
import FaqBlockNode from './nodes/FaqBlockNode';
import FigureImage from './nodes/FigureImage';
import PasteCleanup from './pasteRules';
import PropertyEmbedNode from './nodes/PropertyEmbedNode';

/** The heading levels a body may use. */
export const HEADING_LEVELS = [2, 3, 4];

/**
 * Every extension one editor instance runs with.
 *
 * @param {object} [options]
 * @param {'full'|'compact'} [options.variant]
 * @param {string} [options.placeholder] the empty-document hint
 * @returns {Array<import('@tiptap/core').Extensions[number]>}
 */
export function buildExtensions({ variant = 'full', placeholder = '' } = {}) {
  return [
    StarterKit.configure({
      heading: { levels: HEADING_LEVELS },
      codeBlock: false,
      // Configured below, from their own packages.
      link: false,
      underline: false,
    }),

    Underline,

    // `protocols` is deliberately left at its default: http, https, mailto and
    // tel are schemes linkify already knows, and re-registering them as custom
    // ones only warns. What a link may actually point at is decided by the
    // sanitiser, which is the rule that also covers pasted and legacy markup.
    Link.configure({
      openOnClick: false,
      autolink: true,
      defaultProtocol: 'https',
      HTMLAttributes: { rel: 'noopener' },
    }),

    FigureImage.configure({ allowBase64: false }),

    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,

    // The responsive frame is CSS on `[data-youtube-video]`; the numbers here
    // are only the aspect ratio the iframe is born with.
    Youtube.configure({ nocookie: true, width: 640, height: 360, modestBranding: true }),

    TextAlign.configure({ types: ['heading', 'paragraph'] }),

    Placeholder.configure({
      placeholder: placeholder || (variant === 'compact' ? 'Write here…' : 'Start writing…'),
      showOnlyWhenEditable: true,
    }),

    CharacterCount,

    CtaBlockNode,
    PropertyEmbedNode,
    FaqBlockNode,

    PasteCleanup,
  ];
}

export default buildExtensions;
