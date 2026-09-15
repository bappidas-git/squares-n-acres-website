/**
 * XML building for the sitemaps and the RSS feed (00_MASTER_CONTEXT.md §5.13).
 *
 * Small on purpose: no dependency may be added for this, and the documents the
 * SEO routes of prompt 09 emit are shallow — a declaration, one root element,
 * one element per URL.
 */

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };

/**
 * Escapes the five XML predefined entities.
 *
 * @param {*} value `null` and `undefined` become the empty string
 * @returns {string}
 */
function escape(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

/** ` key="value"` pairs for an element's attributes; empty for none. */
function attributes(attrs = {}) {
  return Object.entries(attrs)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([name, value]) => ` ${name}="${escape(value)}"`)
    .join('');
}

/**
 * One XML element.
 *
 * `children` is either text (escaped) or an array of already-built element
 * strings (inserted verbatim, indented by two spaces).
 *
 * @param {string} name
 * @param {string|number|Array<string>|null} [children]
 * @param {object} [attrs]
 * @returns {string}
 */
function element(name, children = '', attrs = {}) {
  const open = `<${name}${attributes(attrs)}`;
  if (children === null || children === undefined || children === '') return `${open} />`;

  if (Array.isArray(children)) {
    const body = children
      .filter(Boolean)
      .map((child) => `  ${String(child).split('\n').join('\n  ')}`)
      .join('\n');
    return `${open}>\n${body}\n</${name}>`;
  }
  return `${open}>${escape(children)}</${name}>`;
}

/** An XML document: the declaration followed by `root`. */
function document(root) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${root}\n`;
}

module.exports = { escape, element, attributes, document };
