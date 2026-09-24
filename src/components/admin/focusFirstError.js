/** A control the cursor can go to. */
const CONTROL =
  'input:not([type="hidden"]):not(:disabled), textarea:not(:disabled), select:not(:disabled), [contenteditable="true"], button:not(:disabled)';

/**
 * Puts the cursor in the first field of `root` that says it is wrong, and
 * brings it into view.
 *
 * A form longer than the screen said nothing when a save was refused over a
 * field below the fold — a latitude of 95, a connectivity row without its
 * distance: the Save button sat at the top, the messages sat further down, and
 * pressing it again did "nothing" again (QA-60). What counts as "says it is
 * wrong" is what every field of the kit already renders: `aria-invalid` on the
 * control, or its message (`role="alert"`) — the rich-text editor, a list of
 * rows and the form's own summary have a message but no invalid control. A
 * warning that does not stop the save carries `data-advisory` and is passed by.
 *
 * A message is traced to the control it describes (`aria-describedby`), else
 * to the first control of its field; one inside a folded disclosure — the SEO
 * panel's — is unfolded first.
 *
 * @param {Element|null|undefined} root the form, or the dialog holding it
 * @returns {boolean} whether anything was found
 */
export default function focusFirstError(root) {
  if (!root) return false;
  // A warning that does not stop the save — "ongoing and completed add up to
  // more than the total" — is an `Alert` too, marked `data-advisory`.
  const marked = [...root.querySelectorAll('[aria-invalid="true"], [role="alert"]')].find(
    (element) => !element.closest('[data-advisory]')
  );
  if (!marked) return false;

  for (
    let folded = marked.closest('details');
    folded;
    folded = folded.parentElement?.closest('details')
  ) {
    if (!folded.open) folded.open = true;
  }

  const target = controlFor(marked, root) ?? marked;
  target.focus?.({ preventScroll: true });
  target.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  return true;
}

/** The control a marked element stands for: itself, the one it describes, or its field's first. */
function controlFor(marked, root) {
  if (marked.matches(CONTROL)) return marked;

  if (marked.id) {
    const described = [...root.querySelectorAll('[aria-describedby]')].find((element) =>
      (element.getAttribute('aria-describedby') ?? '').split(/\s+/).includes(marked.id)
    );
    if (described) return described.matches(CONTROL) ? described : described.querySelector(CONTROL);
  }

  // The message sits after its control, inside the same field or row.
  for (let scope = marked.parentElement; scope && scope !== root; scope = scope.parentElement) {
    const control = scope.querySelector(CONTROL);
    if (control) return control;
  }
  return null;
}
