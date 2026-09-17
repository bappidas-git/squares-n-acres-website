import { Helmet } from 'react-helmet-async';
import { useEffect } from 'react';

import { useSiteSettings } from '../../contexts/SiteSettingsContext';

/**
 * The two boxes an administrator can put raw HTML in (§6.14
 * `customHeadHtml` / `customBodyEndHtml`).
 *
 * **Trust boundary.** Whatever is in those two fields is injected into every
 * page exactly as written, scripts included. That is the point of them — a
 * verification tag, a heat-map snippet, a font a marketing team needs — and it
 * is why RBAC restricts both fields to the `admin` role (§7, prompt 37): a
 * manager can edit every other SEO setting and cannot edit these. Nothing here
 * sanitises, because a sanitised script tag is a script tag that does not work;
 * the control is *who may write the field*, not what the field may say.
 *
 * Helmet wants elements rather than a string, so the head fragment is parsed
 * with `DOMParser` and each `<meta>`, `<link>`, `<script>`, `<style>`,
 * `<base>` and `<noscript>` is handed over as a child. Anything else — a stray
 * `<div>`, a comment, loose text — is ignored, because the head is not a place
 * for it and silently dropping it is better than a browser moving it into the
 * body and ending the head early.
 *
 * The body fragment cannot go through Helmet at all (Helmet owns the head), and
 * React's `dangerouslySetInnerHTML` never executes a `<script>` it writes. So
 * {@link CustomBodyEnd} builds real elements and appends them to `document.body`
 * itself, once, and takes them away again when it unmounts.
 */

/** The head elements a fragment may contribute, in the order Helmet accepts them. */
const HEAD_TAGS = new Set(['meta', 'link', 'script', 'style', 'base', 'noscript']);

/**
 * One HTML fragment as DOM nodes, or an empty list where there is no parser.
 *
 * @param {string} html
 * @returns {Element[]}
 */
export function parseFragment(html) {
  const source = String(html ?? '').trim();
  if (!source || typeof DOMParser === 'undefined') return [];

  try {
    const parsed = new DOMParser().parseFromString(`<head>${source}</head>`, 'text/html');
    return [...parsed.head.children, ...parsed.body.children];
  } catch {
    // Malformed markup contributes nothing; it never takes the page with it.
    return [];
  }
}

/** An element's attributes as the props React would have been given. */
function propsOf(element) {
  const props = {};
  for (const { name, value } of element.attributes) props[name] = value;
  return props;
}

/**
 * `seoSettings.customHeadHtml`, rendered into the head through Helmet.
 *
 * @param {object} props
 * @param {string} [props.html] defaults to the setting
 */
export default function CustomHtml({ html }) {
  const { seoSettings } = useSiteSettings();
  const source = html ?? seoSettings?.customHeadHtml ?? '';

  const elements = parseFragment(source).filter((element) =>
    HEAD_TAGS.has(element.tagName.toLowerCase())
  );
  if (elements.length === 0) return null;

  return (
    <Helmet>
      {elements.map((element, index) => {
        const Tag = element.tagName.toLowerCase();
        const props = propsOf(element);
        const text = element.textContent;

        // A `<script src>` has no body; an inline one is all body. Helmet reads
        // the child of the element, so the two cases are spelled separately.
        return text && Tag !== 'link' && Tag !== 'meta' && Tag !== 'base' ? (
          <Tag key={`${Tag}-${index}`} {...props}>
            {text}
          </Tag>
        ) : (
          <Tag key={`${Tag}-${index}`} {...props} />
        );
      })}
    </Helmet>
  );
}

/**
 * `seoSettings.customBodyEndHtml`, appended to the end of `<body>`.
 *
 * Mounted once by `MainLayout`, so it survives a route change rather than
 * re-running a tag manager's snippet on every navigation.
 *
 * @param {object} props
 * @param {string} [props.html] defaults to the setting
 */
export function CustomBodyEnd({ html }) {
  const { seoSettings } = useSiteSettings();
  const source = html ?? seoSettings?.customBodyEndHtml ?? '';

  useEffect(() => {
    if (!source || typeof document === 'undefined') return undefined;

    // `document.importNode` copies a parsed `<script>` as an inert clone — the
    // browser only runs a script element it created itself — so scripts are
    // rebuilt rather than copied.
    const nodes = parseFragment(source).map((element) => {
      if (element.tagName.toLowerCase() !== 'script') return element.cloneNode(true);

      const script = document.createElement('script');
      for (const { name, value } of element.attributes) script.setAttribute(name, value);
      script.text = element.textContent ?? '';
      return script;
    });

    nodes.forEach((node) => document.body.appendChild(node));
    return () => nodes.forEach((node) => node.parentNode?.removeChild(node));
  }, [source]);

  return null;
}
