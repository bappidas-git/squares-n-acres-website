/**
 * How the SEO panel's fix hints reach a field of the property form.
 *
 * A leaf module on purpose: `usePropertyForm` does the focusing and the tabs
 * carry the ids, and both need this without importing each other.
 */

/**
 * What the SEO analysers call a field, and what this form calls it.
 *
 * The engine measures "the content"; the property form keeps it in
 * `description` on Basics. The rest of the analysers' field names — `images`,
 * `faqs`, `pricing`, `amenityIds`, `floorPlans`, `reraNumber` — are already the
 * form's own (§3.1 of `docs/SEO_ENGINE.md`).
 */
export const FIELD_ALIASES = { content: 'description', excerpt: 'shortDescription' };

/**
 * The DOM id a tab gives the control — or the block — that owns a field.
 *
 * @param {string} path a dotted form path
 * @returns {string}
 */
export const propertyFieldId = (path) => `property-${String(path).replace(/[^a-zA-Z0-9]+/g, '-')}`;

/** What "focus this field" means when the id is on a block rather than a control. */
export const FOCUSABLE = 'input, textarea, select, [contenteditable="true"]';

/**
 * Puts the cursor in the control an id names, and brings it into view.
 *
 * The id may be on the control itself (a textarea) or on the block that holds
 * it (the rich-text editor, a repeater): either way the thing to focus is the
 * first control inside it.
 *
 * @param {string} path
 */
export function focusFieldElement(path) {
  const element = document.getElementById(propertyFieldId(path));
  if (!element) return;

  const control = element.matches(FOCUSABLE) ? element : element.querySelector(FOCUSABLE);
  (control ?? element).focus?.();
  element.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
}
