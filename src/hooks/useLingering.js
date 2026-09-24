import { useCallback, useState } from 'react';

/**
 * What a dialog shows: `value` while it is set, and once it has been cleared,
 * the last value it had — until `release`, the dialog's `onExited`.
 *
 * A dialog here is closed by clearing the state it is drawn from, and then
 * takes its exit transition to leave. Drawn from that state, it faded out as
 * something else: an edit as an empty "New badge", a delete confirmation
 * without its sentence, the usage guard as "“undefined” cannot be deleted"
 * over an empty list (QA-54). The article list's own confirmations and the
 * bulk bar's did the same (QA-55).
 *
 *   const [shown, release] = useLingering(deleting);
 *   <ConfirmDialog open={Boolean(deleting)} title={shown?.title} onExited={release} />
 *
 * @template T
 * @param {T|null} value
 * @returns {[T|null, () => void]}
 */
export default function useLingering(value) {
  const [kept, setKept] = useState(value);
  // Kept in the render it arrives in (React's "storing information from
  // previous renders"), so no frame of the dialog is drawn without it.
  if (value !== null && value !== undefined && value !== kept) setKept(value);
  const release = useCallback(() => setKept(null), []);
  return [value ?? kept, release];
}
