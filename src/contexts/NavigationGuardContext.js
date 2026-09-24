import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';

import ConfirmDialog from '../components/ui/ConfirmDialog';

/**
 * "You have unsaved changes" — for in-app navigation.
 *
 * `useBlocker` only exists inside a data router, which is why `App.js` mounts
 * `createBrowserRouter` + `RouterProvider` (D97). One blocker for the whole app
 * lives here; every dirty form registers with `useUnsavedChanges(dirty)` and
 * the provider asks the question once, in the design system's own dialog,
 * instead of each screen growing its own guard.
 *
 * Outside the provider — a component rendered by a test or a preview — the
 * context is an inert fallback, so a form never needs the router to render.
 */

export const UNSAVED_CHANGES_MESSAGE =
  'You have unsaved changes. Leave this page and discard them?';

const FALLBACK = { register: () => () => {}, isBlocking: false };

const NavigationGuardContext = createContext(null);

/**
 * @returns {{ register: (id: symbol, dirty: boolean, onDiscard?: () => void) => () => void,
 *   isBlocking: boolean }}
 */
export function useNavigationGuard() {
  return useContext(NavigationGuardContext) ?? FALLBACK;
}

export const NavigationGuardProvider = ({ children }) => {
  // A set of the forms that currently have unsaved changes. It is a ref because
  // registering must not re-render the tree; `blocking` is the rendered echo.
  const dirtyRef = useRef(new Set());
  // What each dirty form does once its changes are discarded — the article
  // form forgets the copy it autosaved to this browser (QA-55).
  const discardRef = useRef(new Map());
  const [blocking, setBlocking] = useState(false);

  const sync = useCallback(() => setBlocking(dirtyRef.current.size > 0), []);

  const register = useCallback(
    (id, dirty, onDiscard) => {
      if (dirty) dirtyRef.current.add(id);
      else dirtyRef.current.delete(id);
      if (dirty && onDiscard) discardRef.current.set(id, onDiscard);
      else discardRef.current.delete(id);
      sync();

      return () => {
        dirtyRef.current.delete(id);
        discardRef.current.delete(id);
        sync();
      };
    },
    [sync]
  );

  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) =>
        blocking && currentLocation.pathname !== nextLocation.pathname,
      [blocking]
    )
  );

  const value = useMemo(() => ({ register, isBlocking: blocking }), [register, blocking]);

  const leave = () => {
    // The answer is "discard", so the forms that were dirty no longer are —
    // and whatever they kept of those changes goes with them.
    for (const id of dirtyRef.current) discardRef.current.get(id)?.();
    dirtyRef.current.clear();
    discardRef.current.clear();
    setBlocking(false);
    blocker.proceed?.();
  };

  return (
    <NavigationGuardContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="Discard unsaved changes?"
        message={UNSAVED_CHANGES_MESSAGE}
        confirmLabel="Discard changes"
        cancelLabel="Stay on this page"
        danger
        onConfirm={leave}
        onClose={() => blocker.reset?.()}
      />
    </NavigationGuardContext.Provider>
  );
};

export { NavigationGuardContext };
export default NavigationGuardContext;
