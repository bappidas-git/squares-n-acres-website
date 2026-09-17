/**
 * The `data-*` plumbing the three SNA blocks share.
 *
 * Each block is one `<div data-sna-block="…">` carrying its whole payload in
 * data attributes, because that is a placeholder any renderer can recognise —
 * `SafeHtml` turns it into a live component, and anything that only knows how
 * to print HTML prints an empty div rather than broken markup.
 */

/** A string attribute stored in, and read back from, one `data-` attribute. */
export const dataAttribute = (attributeName, defaultValue = '') => ({
  default: defaultValue,
  parseHTML: (element) => element?.getAttribute?.(attributeName) ?? defaultValue,
  renderHTML: (attributes) => {
    const value = attributes[camelName(attributeName)];
    return value ? { [attributeName]: value } : {};
  },
});

/** `data-button-label` → `buttonLabel`, so the renderer can find its own value. */
function camelName(attributeName) {
  return attributeName
    .replace(/^data-/, '')
    .replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
}

/** A list of integer ids stored as `data-ids="1,2,3"`. */
export const idListAttribute = (attributeName = 'data-ids') => ({
  default: [],
  parseHTML: (element) =>
    String(element?.getAttribute?.(attributeName) ?? '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  renderHTML: (attributes) => {
    const ids = Array.isArray(attributes.ids) ? attributes.ids : [];
    return ids.length > 0 ? { [attributeName]: ids.join(',') } : {};
  },
});

/**
 * A list of objects stored as JSON in one attribute.
 *
 * The serialiser escapes the quotes on the way out and the parser is given a
 * `try`, because a hand-edited `data-items` is a broken block, not a broken
 * page.
 */
export const jsonListAttribute = (attributeName = 'data-items') => ({
  default: [],
  parseHTML: (element) => {
    const raw = element?.getAttribute?.(attributeName);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },
  renderHTML: (attributes) => {
    const items = Array.isArray(attributes.items) ? attributes.items : [];
    return items.length > 0 ? { [attributeName]: JSON.stringify(items) } : {};
  },
});
