/**
 * Accessibility assertions for component tests.
 *
 * The audit that matters runs in a real browser (`npm run a11y:audit`), but a
 * browser only sees the states a crawl can reach: an open drawer, a filter
 * sheet with a chosen group, a table in its mobile card layout. These helpers
 * put the same rules — every input has a label, every icon button has a name,
 * every menu has its roles, no id is used twice — into the Jest tests that
 * render those states directly, so a regression is caught by `npm run test:ci`
 * rather than by the next full crawl.
 *
 * No new dependency (§3.3 allows none — no `jest-axe`, no `axe-core`): these
 * are a few dozen lines over the DOM that Testing Library already gives us.
 *
 *   import { expectLabelledInputs, expectNoDuplicateIds } from '../../../test-utils/a11y';
 *
 *   const { container } = render(<LeadForm />);
 *   expectLabelledInputs(container);
 *   expectNoDuplicateIds(container);
 *
 * @module test-utils/a11y
 */

/** Text an assistive technology would announce, with `aria-hidden` removed. */
function announcedText(element) {
  let text = '';

  element.childNodes.forEach((node) => {
    if (node.nodeType === 3) {
      text += node.nodeValue;
      return;
    }
    if (node.nodeType !== 1) return;
    if (node.getAttribute('aria-hidden') === 'true' || node.hasAttribute('hidden')) return;
    const label = node.getAttribute('aria-label');
    text += label && label.trim() ? ` ${label} ` : announcedText(node);
  });

  return text.replace(/\s+/g, ' ').trim();
}

/**
 * The accessible name of an element, or `''`.
 *
 * The same subset of the accname algorithm the browser audit uses
 * (`scripts/lib/inPageAudit.js`), kept in step with it deliberately: a name
 * that satisfies one and not the other would be a rule nobody could trust.
 *
 * @param {Element} element
 * @returns {string}
 */
export function accessibleName(element) {
  if (!element) return '';

  const label = element.getAttribute('aria-label');
  if (label && label.trim()) return label.trim();

  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const root = element.ownerDocument;
    const text = labelledBy
      .split(/\s+/)
      .map((id) => {
        const target = root.getElementById(id);
        return target ? announcedText(target) : '';
      })
      .filter(Boolean)
      .join(' ');
    if (text) return text;
  }

  if (element.labels && element.labels.length) {
    const text = Array.from(element.labels)
      .map((node) => announcedText(node))
      .filter(Boolean)
      .join(' ');
    if (text) return text;
  }

  const own = announcedText(element);
  if (own) return own;

  const image = element.querySelector?.('img[alt], [role="img"][aria-label]');
  if (image) {
    const alternative = image.getAttribute('alt') || image.getAttribute('aria-label') || '';
    if (alternative.trim()) return alternative.trim();
  }

  const title = element.getAttribute('title');
  if (title && title.trim()) return title.trim();

  if (element.tagName === 'INPUT' && /^(submit|reset|button)$/i.test(element.type || '')) {
    if (element.value && element.value.trim()) return element.value.trim();
  }

  return '';
}

/** A readable `tag.class` for a failure message. */
function describe(element) {
  const tag = element.tagName.toLowerCase();
  if (element.id) return `${tag}[id=${element.id}]`;
  const className = typeof element.className === 'string' ? element.className.trim() : '';
  const name = element.getAttribute('name');
  if (name) return `${tag}[name=${name}]`;
  return className ? `${tag}.${className.split(/\s+/)[0]}` : tag;
}

/**
 * Asserts an element has an accessible name — the icon-button rule.
 *
 * @param {Element} element
 * @param {string|RegExp} [expected] the name it must have, when it matters
 */
export function expectAccessibleName(element, expected) {
  expect(element).toBeTruthy();
  const name = accessibleName(element);

  if (!name) {
    throw new Error(`${describe(element)} has no accessible name (aria-label, text or title).`);
  }
  if (expected instanceof RegExp) expect(name).toMatch(expected);
  else if (typeof expected === 'string') expect(name).toBe(expected);

  return name;
}

/**
 * Asserts every visible form control inside `container` is labelled.
 *
 * Hidden inputs, honeypots and buttons are skipped: the first two are not
 * announced and the third is covered by {@link expectAccessibleName}. A
 * `placeholder` is never a label (§8.3: no placeholder-only inputs).
 *
 * @param {Element} container
 */
export function expectLabelledInputs(container) {
  const controls = Array.from(container.querySelectorAll('input, select, textarea'));
  const unlabelled = [];

  for (const control of controls) {
    const type = String(control.type || '').toLowerCase();
    if (type === 'hidden' || type === 'submit' || type === 'reset' || type === 'button') continue;
    if (control.getAttribute('aria-hidden') === 'true') continue;
    if (control.closest('[aria-hidden="true"], [hidden]')) continue;
    if (!accessibleName(control)) unlabelled.push(describe(control));
  }

  if (unlabelled.length) {
    throw new Error(`Form controls without a label: ${unlabelled.join(', ')}`);
  }

  return controls.length;
}

/**
 * Asserts every button, link and custom control has an accessible name.
 *
 * @param {Element} container
 */
export function expectNamedControls(container) {
  const selector =
    'button, a[href], [role="button"], [role="link"], [role="menuitem"], [role="tab"], [role="switch"]';
  const nameless = Array.from(container.querySelectorAll(selector))
    .filter((control) => !control.closest('[aria-hidden="true"], [hidden]'))
    .filter((control) => !accessibleName(control))
    .map(describe);

  if (nameless.length) {
    throw new Error(`Controls without an accessible name: ${nameless.join(', ')}`);
  }
}

/**
 * Asserts no `id` inside `container` is used twice.
 *
 * Duplicate ids break every `aria-controls`, `aria-describedby` and `for` that
 * points at them — the first match wins and the second control is silently
 * mislabelled — which is why it is an error and not a warning.
 *
 * @param {Element} container
 */
export function expectNoDuplicateIds(container) {
  const counts = new Map();
  container.querySelectorAll('[id]').forEach((node) => {
    counts.set(node.id, (counts.get(node.id) || 0) + 1);
  });

  const duplicates = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([id, count]) => `${id} (${count}×)`);

  if (duplicates.length) throw new Error(`Duplicate ids: ${duplicates.join(', ')}`);
}

/**
 * Asserts a menu, tab strip or listbox carries the roles it claims.
 *
 * @param {Element} container
 * @param {'menu'|'tablist'|'listbox'|'radiogroup'} role
 * @param {{ items?: number, labelled?: boolean }} [expected]
 */
export function expectRoleGroup(container, role, expected = {}) {
  const group =
    container.getAttribute?.('role') === role
      ? container
      : container.querySelector(`[role="${role}"]`);
  if (!group) throw new Error(`No element with role="${role}" was rendered.`);

  const itemRole = {
    menu: 'menuitem',
    tablist: 'tab',
    listbox: 'option',
    radiogroup: 'radio',
  }[role];

  const items = group.querySelectorAll(`[role="${itemRole}"]`);
  if (typeof expected.items === 'number') expect(items).toHaveLength(expected.items);
  else expect(items.length).toBeGreaterThan(0);

  if (expected.labelled !== false) expectAccessibleName(group);

  return group;
}

/**
 * Asserts a group of controls has exactly one stop in the tab order.
 *
 * The roving-tabindex contract of §8.3: a tab strip is one Tab stop and the
 * arrows move inside it, so exactly one item may be `tabindex="0"`.
 *
 * @param {Element} container
 * @param {string} selector
 */
export function expectRovingTabIndex(container, selector) {
  const items = Array.from(container.querySelectorAll(selector));
  expect(items.length).toBeGreaterThan(0);

  const stops = items.filter((item) => item.getAttribute('tabindex') !== '-1');
  if (stops.length !== 1) {
    throw new Error(
      `Expected exactly one tab stop in "${selector}", found ${stops.length} of ${items.length}.`
    );
  }
}

/**
 * Asserts a dialog is announced as one: role, modality and a name.
 *
 * @param {Element} dialog
 */
export function expectDialogSemantics(dialog) {
  expect(dialog).toBeTruthy();
  expect(dialog.getAttribute('role')).toBe('dialog');
  expect(dialog.getAttribute('aria-modal')).toBe('true');
  expectAccessibleName(dialog);
}

/**
 * Asserts every image either describes itself or is marked decorative.
 *
 * @param {Element} container
 */
export function expectImageAlt(container) {
  const missing = Array.from(container.querySelectorAll('img'))
    .filter((image) => !image.hasAttribute('alt'))
    .filter((image) => image.getAttribute('role') !== 'none')
    .map(describe);

  if (missing.length) throw new Error(`Images without an alt attribute: ${missing.join(', ')}`);
}
