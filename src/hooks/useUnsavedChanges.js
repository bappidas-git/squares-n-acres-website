import { useEffect, useRef } from 'react';

import { useNavigationGuard } from '../contexts/NavigationGuardContext';

/**
 * Warns before unsaved changes are lost, in both ways they can be:
 *
 *   - closing or reloading the tab → the browser's own `beforeunload` prompt;
 *   - navigating inside the app → the confirm dialog of
 *     `NavigationGuardContext`, driven by the router's `useBlocker` (D97).
 *
 *   useUnsavedChanges(form.dirty);
 *
 * @param {boolean} dirty
 */
export default function useUnsavedChanges(dirty) {
  const { register } = useNavigationGuard();
  // One identity per mounted form, so two open forms cannot clear each other.
  const idRef = useRef(null);
  if (idRef.current === null) idRef.current = Symbol('unsaved-changes');

  useEffect(() => register(idRef.current, dirty), [register, dirty]);

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
