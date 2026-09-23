/**
 * How a field of the property form is reached from somewhere else — the SEO
 * panel's fix hints, the rail's "Fix SEO", and a save that failed validation.
 *
 * A leaf module on purpose: `usePropertyForm` does the focusing and the tabs
 * carry the ids, and both need this without importing each other.
 */

/**
 * What the SEO analysers call a field, and what this form calls it.
 *
 * The engine measures "the content"; the property form keeps it in
 * `description` on Basics. The rest of the analysers' field names — `images`,
 * `faqs`, `amenityIds`, `floorPlans`, `highlights` — are already the form's own
 * (§3.1 of `docs/SEO_ENGINE.md`).
 */
export const FIELD_ALIASES = { content: 'description', excerpt: 'shortDescription' };

/**
 * The form path an analyser's (or a validator's) field lands on, for this
 * listing.
 *
 * Two of them depend on the record: "the listing states a price" is the rent on
 * a rental and the price on a sale, and "no RERA number" is the switch while
 * the listing is not marked registered — the number field does not exist yet.
 *
 * @param {string} path
 * @param {object} [values] the form values
 * @returns {string}
 */
export function resolveFieldPath(path, values = {}) {
  const aliased = FIELD_ALIASES[path] ?? path;
  const rental = values.listingType === 'rent' || values.listingType === 'lease';

  if (aliased === 'pricing') return rental ? 'pricing.rentPerMonth' : 'pricing.price';
  if (aliased === 'reraNumber' && values.reraRegistered !== true) return 'reraRegistered';
  return aliased;
}

/**
 * The DOM id a tab gives the control — or the block — that owns a field.
 *
 * @param {string} path a dotted form path
 * @returns {string}
 */
export const propertyFieldId = (path) => `property-${String(path).replace(/[^a-zA-Z0-9]+/g, '-')}`;

/** What "focus this field" means when the id is on a block rather than a control. */
export const FOCUSABLE =
  'input:not([type="hidden"]), textarea, select, [contenteditable="true"], button';

/**
 * The control inside a block worth putting the cursor in.
 *
 * The text of a rich-text field before its toolbar: the description's block
 * holds a "Text style" `<select>` and a dozen buttons ahead of the editor, and
 * "the body never uses the focus keyword" means the body.
 */
function controlIn(element) {
  if (element.matches(FOCUSABLE)) return element;
  return (
    element.querySelector('[contenteditable="true"]') ??
    element.querySelector('input:not([type="hidden"]), textarea, select') ??
    element.querySelector('button')
  );
}

/**
 * The control on the open tab that is invalid *with this message*: every
 * field of the form links its message through `aria-describedby`, so a
 * control nobody gave an id to is still found by what it says is wrong.
 *
 * @param {string} message
 * @returns {HTMLElement|null}
 */
function controlWithMessage(message) {
  const wanted = String(message ?? '').trim();
  if (!wanted) return null;
  const panel = document.querySelector('[role="tabpanel"]');
  const invalid = panel ? [...panel.querySelectorAll('[aria-invalid="true"]')] : [];
  return (
    invalid.find((control) =>
      (control.getAttribute('aria-describedby') ?? '')
        .split(/\s+/)
        .filter(Boolean)
        .some((id) => document.getElementById(id)?.textContent?.trim() === wanted)
    ) ?? null
  );
}

/**
 * The element a path points at: its own id, else the invalid control that
 * carries its message, else the nearest ancestor path that has an id
 * (`images.3.alt` → `images`), else the tab's error summary — which lists the
 * message, and links to it — else the first control the active tab marks
 * invalid.
 *
 * The summary comes before "the first invalid control" on purpose: a message
 * with no control of its own ("this locality has no city") used to put the
 * cursor in whichever other field happened to be red.
 *
 * @param {string} path
 * @param {{fallback?: boolean, message?: string}} [options] `message` is the
 *   one the form holds for `path`
 * @returns {HTMLElement|null}
 */
export function findFieldElement(path, { fallback = true, message } = {}) {
  const parts = String(path ?? '').split('.');
  const own = document.getElementById(propertyFieldId(parts.join('.')));
  if (own) return own;

  const described = controlWithMessage(message);
  if (described) return described;

  while (parts.length > 1) {
    parts.pop();
    const element = document.getElementById(propertyFieldId(parts.join('.')));
    if (element) return element;
  }
  if (!fallback) return null;

  const panel = document.querySelector('[role="tabpanel"]');
  return (
    document.querySelector('[data-error-summary]') ??
    panel?.querySelector('[aria-invalid="true"]') ??
    null
  );
}

/**
 * Puts the cursor in the control a path names, and brings it into view.
 *
 * A caller that is still waiting for a lazy tab passes `fallback: false`: the
 * summary, or a block whose editor has not arrived yet, is only the answer once
 * the control has had its chance to appear — found on the first try, it
 * stopped the search a tick before the rich-text editor mounted.
 *
 * @param {string} path
 * @param {{fallback?: boolean, message?: string}} [options]
 * @returns {boolean} whether anything was found to focus
 */
export function focusFieldElement(path, { fallback = true, message } = {}) {
  const element = findFieldElement(path, { fallback, message });
  if (!element) return false;

  // The summary takes the cursor itself, so its heading is what is read out.
  const own = element.hasAttribute('data-error-summary') || element.matches('[tabindex="-1"]');
  const control = own ? element : controlIn(element);
  if (!control && !fallback) return false;

  const target = control ?? element;
  target.focus?.({ preventScroll: true });
  target.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  return true;
}
