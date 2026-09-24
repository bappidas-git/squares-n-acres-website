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
 * @param {boolean} dirty
 * @param {{onDiscard?: () => void}} [options]
 */
export default function useUnsavedChanges(dirty, { onDiscard } = {}) {
  const { register } = useNavigationGuard();
  // One identity per mounted form, so two open forms cannot clear each other.
  const idRef = useRef(null);
  if (idRef.current === null) idRef.current = Symbol('unsaved-changes');

  // The latest callback, behind one stable function: a new arrow on every
  // render must not re-register the form.
  const discardRef = useRef(onDiscard);
  discardRef.current = onDiscard;
  const discard = useCallback(() => discardRef.current?.(), []);

  useEffect(() => register(idRef.current, dirty, discard), [register, dirty, discard]);

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
