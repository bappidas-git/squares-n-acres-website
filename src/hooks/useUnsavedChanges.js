import { useCallback, useEffect, useRef } from 'react';

import { useNavigationGuard } from '../contexts/NavigationGuardContext';

/**
 * Warns before unsaved changes are lost, in both ways they can be:
 *
 *   - closing or reloading the tab → the browser's own `beforeunload` prompt;
 *   - navigating inside the app → the confirm dialog of
 *     `NavigationGuardContext`, driven by the router's `useBlocker` (D97).
 *
 *   useUnsavedChanges(form.dirty);
 *   useUnsavedChanges(form.dirty, { onDiscard: clearDraft });
 *
 * `onDiscard` runs when the editor answers the in-app question with "Discard
 * changes" — never on a reload or a closed tab, which is exactly when a copy
 * kept for recovery must survive.
 *
 * `question` words the in-app dialog for work that is not an edit — the
 * uploads of the media library, which leaving stops (QA-63):
 *
 *   useUnsavedChanges(queue.busy, { question: { title: 'Leave while files are uploading?', … } });
 *
 * @param {boolean} dirty
 * @param {{onDiscard?: () => void, question?: {title?: string, message?: string,
 *   confirmLabel?: string, cancelLabel?: string}}} [options]
 */
export default function useUnsavedChanges(dirty, { onDiscard, question } = {}) {
  const { register } = useNavigationGuard();
  // One identity per mounted form, so two open forms cannot clear each other.
  const idRef = useRef(null);
  if (idRef.current === null) idRef.current = Symbol('unsaved-changes');

  // The latest callback, behind one stable function: a new arrow on every
  // render must not re-register the form.
  const discardRef = useRef(onDiscard);
  discardRef.current = onDiscard;
  const discard = useCallback(() => discardRef.current?.(), []);

  // The question is read by its words, so an object written inline in the
  // caller's render does not re-register the screen on every render.
  const questionKey = question ? JSON.stringify(question) : '';
  const questionRef = useRef(question);
  questionRef.current = question;

  useEffect(
    () => register(idRef.current, dirty, discard, questionKey ? questionRef.current : undefined),
    [register, dirty, discard, questionKey]
  );

  useEffect(() => {
    if (!dirty) return undefined;

    const warn = (event) => {
      event.preventDefault();
      // Browsers ignore the text and show their own, but a non-empty
      // `returnValue` is still what asks them to show it at all.
      event.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
}
