import { Suspense, createContext, lazy, useContext, useEffect, useMemo, useRef } from 'react';

import sanitizeHtml from './sanitize';
import { assignHeadingIds } from '../../utils/toc';

/**
 * The four blocks are fetched only by a body that actually contains one.
 *
 * Almost all CMS HTML is plain prose — a description, an answer, a guide — and
 * every public page renders some, so the listing cards, the accordion, the
 * enquiry band and the video facade stay out of the page's own bundle until a
 * body asks for them. The dynamic import also breaks the cycle `FaqAccordion`
 * would otherwise close by rendering its answers through this component.
 */
const RenderedCta = lazy(() => import('./blocks/RenderedCta'));
const RenderedFaq = lazy(() => import('./blocks/RenderedFaq'));
const RenderedProperties = lazy(() => import('./blocks/RenderedProperties'));
const RenderedYoutube = lazy(() => import('./blocks/RenderedYoutube'));

/**
 * How deep a `data-sna-block` may be rendered.
 *
 * A FAQ block renders answers, an answer is itself CMS HTML, and an answer
 * could in principle carry a FAQ block. One level of blocks is all any real
 * content needs and it is the level at which the recursion stops.
 */
const MAX_BLOCK_DEPTH = 1;

const DepthContext = createContext(0);

/** The block renderers, by block type. */
const BLOCKS = {
  cta: RenderedCta,
  properties: RenderedProperties,
  faq: RenderedFaq,
  youtube: RenderedYoutube,
};

/**
 * A YouTube embed in the body, as the facade's props — or `null`.
 *
 * The editor's YouTube node serialises to a `<div data-youtube-video>` holding
 * an `<iframe>`; a body that predates the editor may carry the bare iframe.
 * Either way what comes back out is not markup: it is a component that shows a
 * thumbnail until somebody presses play, because an embedded player is a
 * megabyte nobody asked for (§8.6).
 *
 * `editor/sanitize.js` has already dropped every iframe pointing anywhere but
 * the four allowed hosts, so the address here is one of those four; only the
 * YouTube ones have a facade, and a Vimeo player or a map is left alone.
 *
 * The element has to *be* the embed, not merely contain one: a wrapper counts
 * only when the iframe is its whole content. Anything looser and a blockquote
 * with a clip in the middle of it would be replaced by the clip.
 *
 * @param {Element} element a top-level node of the parsed body
 * @returns {{src: string, title: string}|null}
 */
function readYoutubeEmbed(element) {
  let iframe = null;

  if (element.tagName === 'IFRAME') {
    iframe = element;
  } else if (element.tagName === 'DIV' || element.tagName === 'FIGURE') {
    const children = [...element.children];
    const wrapsOnlyAnIframe =
      children.length === 1 &&
      children[0].tagName === 'IFRAME' &&
      (element.textContent ?? '').trim() === '';
    if (wrapsOnlyAnIframe) iframe = children[0];
  }

  if (!iframe) return null;

  const src = (iframe.getAttribute('src') ?? '').trim();
  if (!/^https:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\//i.test(src)) return null;

  return { src, title: (iframe.getAttribute('title') ?? '').trim() };
}

/** A `data-` attribute read off a placeholder, as a trimmed string. */
const attr = (element, name) => (element.getAttribute(name) ?? '').trim();

/** The payload each block type needs, read from its data attributes. */
function readBlock(element) {
  const type = attr(element, 'data-sna-block');

  if (type === 'cta') {
    return {
      type,
      props: {
        title: attr(element, 'data-title'),
        text: attr(element, 'data-text'),
        buttonLabel: attr(element, 'data-button-label'),
        buttonHref: attr(element, 'data-button-href'),
        leadSource: attr(element, 'data-lead-source'),
      },
    };
  }

  if (type === 'properties') {
    return {
      type,
      props: {
        ids: attr(element, 'data-ids')
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean),
      },
    };
  }

  if (type === 'faq') {
    let items = [];
    try {
      const parsed = JSON.parse(attr(element, 'data-items') || '[]');
      if (Array.isArray(parsed)) items = parsed;
    } catch {
      items = [];
    }
    return { type, props: { items } };
  }

  return { type, props: {} };
}

/**
 * The tidying every rendered body gets, done once on the parsed document.
 *
 * Heading ids are what a table of contents and an in-page anchor need and the
 * sanitiser does not let an editor write one — `utils/toc` owns that rule, so
 * the ids here and the list the article page draws are the same strings;
 * `rel="noopener"` and `loading="lazy"` are the two things a hand-written link
 * and a hand-written `<img>` are always missing.
 */
function enhance(body) {
  assignHeadingIds(body);

  body.querySelectorAll('a[href]').forEach((anchor) => {
    const href = anchor.getAttribute('href') ?? '';
    if (!/^https?:\/\//i.test(href)) return;
    const rel = new Set((anchor.getAttribute('rel') ?? '').split(/\s+/).filter(Boolean));
    rel.add('noopener');
    anchor.setAttribute('rel', [...rel].join(' '));
  });

  body.querySelectorAll('img').forEach((image) => {
    if (!image.hasAttribute('loading')) image.setAttribute('loading', 'lazy');
  });
}

/**
 * Splits sanitised HTML into runs of markup and the blocks between them.
 *
 * @param {string} html already sanitised
 * @param {boolean} withBlocks
 * @returns {{segments: Array<object>, faqItems: Array<object>}}
 */
function parse(html, withBlocks) {
  if (typeof DOMParser === 'undefined') return { segments: [{ kind: 'html', html }], faqItems: [] };

  const body = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body;
  enhance(body);

  const segments = [];
  const faqItems = [];
  let buffer = '';

  const flush = () => {
    if (buffer.trim().length === 0) return;
    segments.push({ kind: 'html', html: buffer });
    buffer = '';
  };

  [...body.childNodes].forEach((node) => {
    const element = node.nodeType === 1 ? node : null;
    const isPlaceholder =
      withBlocks && element?.tagName === 'DIV' && element.hasAttribute('data-sna-block');

    // A video facade is not opt-in: it replaces an embed wherever one is, even
    // in a body nested deep enough that `withBlocks` has run out (a FAQ answer
    // inside a FAQ block). It fetches nothing and cannot recurse.
    const youtube = isPlaceholder || !element ? null : readYoutubeEmbed(element);

    if (!isPlaceholder && !youtube) {
      buffer += element ? element.outerHTML : (node.textContent ?? '');
      return;
    }

    flush();
    const block = youtube ? { type: 'youtube', props: youtube } : readBlock(element);
    if (block.type === 'faq') faqItems.push(...block.props.items);
    segments.push({ kind: 'block', ...block });
  });

  flush();
  return { segments, faqItems };
}

/**
 * The only place in the app that renders HTML it did not build.
 *
 * Everything CMS-authored comes through here: an article body, a listing's
 * description, a locality guide, a FAQ answer, a page's rich-text block. It
 * sanitises against the editor's allow-list (`sanitize.js`) and then renders
 * the result inside `.prose`, which is why none of that content needs a class
 * name of its own.
 *
 * The three `data-sna-block` placeholders are not printed as markup: they are
 * split out and rendered as real components, so a call to action opens the real
 * enquiry dialog, a listings block shows today's prices and a FAQ block is the
 * same accordion as everywhere else.
 *
 * @param {object} props
 * @param {string} props.html
 * @param {string} [props.className] added beside `prose`
 * @param {boolean} [props.propertyCards] `false` leaves listings blocks out —
 *   for the places that must not fire an extra request, such as a card preview
 * @param {boolean} [props.faqBlocks] `false` leaves FAQ blocks out of the body
 *   while still reporting their questions through `onFaqItems` — for a page
 *   that gathers every question of an article into one accordion of its own and
 *   must not print the same question twice
 * @param {(items: Array<{question: string, answer: string}>) => void} [props.onFaqItems]
 *   every question found in the body, for a page merging them into its
 *   accordion and into its `FAQPage` structured data
 */
export default function SafeHtml({
  html,
  className = '',
  propertyCards = true,
  faqBlocks = true,
  onFaqItems,
  ...rest
}) {
  const depth = useContext(DepthContext);
  const clean = useMemo(() => sanitizeHtml(html), [html]);
  const withBlocks = depth < MAX_BLOCK_DEPTH;

  const { segments, faqItems } = useMemo(() => parse(clean, withBlocks), [clean, withBlocks]);

  // The callback is read through a ref: a page passing an inline arrow would
  // otherwise re-run this effect on every render it causes.
  const faqCallbackRef = useRef(onFaqItems);
  faqCallbackRef.current = onFaqItems;
  const faqKey = useMemo(() => JSON.stringify(faqItems), [faqItems]);

  useEffect(() => {
    faqCallbackRef.current?.(JSON.parse(faqKey));
  }, [faqKey]);

  const classes = ['prose', className].filter(Boolean).join(' ');

  if (!clean) return null;

  // The overwhelmingly common case — a description, an answer, a guide — has no
  // blocks in it, and renders as exactly the one element it used to, so the
  // measured clamps and the stylesheets around it keep working.
  if (segments.length === 1 && segments[0].kind === 'html') {
    return (
      <div className={classes} dangerouslySetInnerHTML={{ __html: segments[0].html }} {...rest} />
    );
  }

  return (
    <DepthContext.Provider value={depth + 1}>
      <div className={classes} {...rest}>
        {segments.map((segment, index) => {
          if (segment.kind === 'html') {
            return (
              <div
                key={`html-${index}`}
                className="prose proseWide"
                dangerouslySetInnerHTML={{ __html: segment.html }}
              />
            );
          }

          const Block = BLOCKS[segment.type];
          if (!Block) return null;
          if (segment.type === 'properties' && !propertyCards) return null;
          if (segment.type === 'faq' && !faqBlocks) return null;

          return (
            <Suspense key={`block-${index}`} fallback={null}>
              <Block {...segment.props} />
            </Suspense>
          );
        })}
      </div>
    </DepthContext.Provider>
  );
}
