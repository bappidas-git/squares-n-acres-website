import { useEffect, useMemo } from 'react';

import BLOCK_COMPONENTS from './blocks';

/**
 * A CMS page's blocks, in order (00_MASTER_CONTEXT.md §6.10).
 *
 * The renderer knows nothing about any particular block: it sorts by `order`,
 * looks the type up in `blocks/index.js` and hands the component the block's
 * `data`, the page it belongs to and the background band it should wear. A
 * type the registry does not know renders **nothing** — a page saved by a
 * newer build must not take an older one down — with a one-line warning in
 * development so it is not silent for whoever is looking at it.
 *
 * Backgrounds alternate white / grey down the page, and a block that has said
 * it is empty does not consume a turn: a `stats` block with no figures (§14
 * seeds every one of them empty) leaves no gap and does not flip the band of
 * whatever follows it.
 *
 * @param {object} props
 * @param {{slug: string, title: string, blocks?: Array<object>, leadSource?: string,
 *   heroImageUrl?: string}} props.page
 * @param {(items: Array<object>) => void} [props.onTestimonials] what the
 *   testimonials block fetched, so the page can publish the genuine ones as
 *   `Review` nodes (§9.3)
 * @param {Array<{label: string, to?: string}>} [props.breadcrumbs] passed to the
 *   `hero` block, which is the only one that shows them
 */

/** The two bands a block can sit on; `hero` and `cta` carry their own. */
const BACKGROUNDS = ['bg', 'surface'];

/** Whether a block would render nothing at all, asked before it is mounted. */
function isEmptyBlock(block) {
  const Component = BLOCK_COMPONENTS[block?.type];
  if (!Component) return true;
  return typeof Component.isEmpty === 'function' ? Component.isEmpty(block.data ?? {}) : false;
}

/**
 * The blocks to render, sorted and with their band assigned.
 *
 * Exported for the unit test: the ordering and the alternation are the two
 * things worth asserting without a DOM.
 *
 * @param {Array<object>} blocks
 * @returns {Array<{block: object, background: string}>}
 */
export function layoutBlocks(blocks) {
  const ordered = (Array.isArray(blocks) ? blocks : [])
    .filter((block) => block && typeof block.type === 'string')
    .map((block, index) => ({ block, index }))
    .sort(
      (left, right) =>
        (left.block.order ?? 0) - (right.block.order ?? 0) || left.index - right.index
    )
    .map(({ block }) => block);

  let band = 0;
  return ordered
    .filter((block) => !isEmptyBlock(block))
    .map((block) => {
      // `hero` and `cta` are full-bleed bands of their own, so they neither
      // take a background nor move the alternation along.
      if (block.type === 'hero' || block.type === 'cta') {
        return { block, background: null };
      }
      const background = BACKGROUNDS[band % BACKGROUNDS.length];
      band += 1;
      return { block, background };
    });
}

export default function PageRenderer({ page, breadcrumbs = [], onTestimonials }) {
  const blocks = useMemo(() => layoutBlocks(page?.blocks), [page?.blocks]);
  const unknown = useMemo(() => unknownTypes(page?.blocks), [page?.blocks]);

  // Said once per page rather than once per render, and never in production: a
  // block nobody rendered is a fact for whoever is looking at the build, not a
  // reason to write to a visitor's console.
  useEffect(() => {
    if (unknown.length === 0 || process.env.NODE_ENV === 'production') return;
    console.warn(`[PageRenderer] No component for block type(s): ${unknown.join(', ')}`);
  }, [unknown]);

  if (!page) return null;

  return (
    <>
      {blocks.map(({ block, background }, index) => {
        const Component = BLOCK_COMPONENTS[block.type];
        return (
          <Component
            key={block.id ?? `${block.type}-${index}`}
            data={block.data ?? {}}
            page={page}
            background={background ?? undefined}
            index={index}
            {...(block.type === 'hero' ? { breadcrumbs } : null)}
            {...(block.type === 'testimonials' ? { onItems: onTestimonials } : null)}
          />
        );
      })}
    </>
  );
}

/** The block types on a page that no component answers for, without repeats. */
function unknownTypes(blocks) {
  return [
    ...new Set(
      (Array.isArray(blocks) ? blocks : [])
        .map((block) => block?.type)
        .filter((type) => type && !BLOCK_COMPONENTS[type])
    ),
  ];
}
