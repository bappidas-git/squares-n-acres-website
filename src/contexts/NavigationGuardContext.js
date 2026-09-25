import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';

import ConfirmDialog from '../components/ui/ConfirmDialog';
import PATHS from '../routes/paths';

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

const FALLBACK = {
  register: () => () => {},
  isBlocking: false,
  confirmDiscard: () => Promise.resolve(true),
};

/**
 * A trip to the sign-in page that means to come back — `state.from`, which the
 * session's end and `ProtectedRoute` both send — is not a navigation anybody
 * chose, and there is no staying: the session is over. Asked about it, the
 * editor saw a blank page behind "Discard unsaved changes?", and "Stay on this
 * page" left them on it with no way out (QA-62). The forms that keep drafts
 * write them as they go. Signing out on purpose carries no `from`, and is still
 * asked.
 *
 * @param {{pathname: string, state?: object}} location
 * @returns {boolean}
 */
const isSessionEnd = (location) =>
  location?.pathname === PATHS.adminLogin && Boolean(location?.state?.from);

const NavigationGuardContext = createContext(null);

/**
 * What the dialog asks when nothing more particular was registered.
 *
 * A screen whose work in hand is not a form can word its own question — the
 * media library's uploads, which leaving stops (QA-63). It is used when that
 * screen is the only one with something to lose; two at once get this one.
 */
const DEFAULT_QUESTION = {
  title: 'Discard unsaved changes?',
  message: UNSAVED_CHANGES_MESSAGE,
  confirmLabel: 'Discard changes',
  cancelLabel: 'Stay on this page',
};

/**
 * @returns {{ register: (id: symbol, dirty: boolean, onDiscard?: () => void,
 *   question?: {title?: string, message?: string, confirmLabel?: string,
 *   cancelLabel?: string}) => () => void,
 *   isBlocking: boolean, confirmDiscard: () => Promise<boolean> }}
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
  // The question a registration words for itself, when it words one (QA-63).
  const questionRef = useRef(new Map());
  const [blocking, setBlocking] = useState(false);
  const [question, setQuestion] = useState(DEFAULT_QUESTION);

  const sync = useCallback(() => {
    const size = dirtyRef.current.size;
    setBlocking(size > 0);
    // Nothing left to lose keeps the last question, so a dialog fading out
    // after "Leave" does not change its words on the way out.
    if (size === 0) return;
    const [only] = dirtyRef.current;
    const own = size === 1 ? questionRef.current.get(only) : null;
    setQuestion(own ? { ...DEFAULT_QUESTION, ...own } : DEFAULT_QUESTION);
  }, []);

  const register = useCallback(
    (id, dirty, onDiscard, asked) => {
      if (dirty) dirtyRef.current.add(id);
      else dirtyRef.current.delete(id);
      if (dirty && onDiscard) discardRef.current.set(id, onDiscard);
      else discardRef.current.delete(id);
      if (dirty && asked) questionRef.current.set(id, asked);
      else questionRef.current.delete(id);
      sync();

      return () => {
        dirtyRef.current.delete(id);
        discardRef.current.delete(id);
        questionRef.current.delete(id);
        sync();
      };
    },
    [sync]
  );

  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) =>
        blocking &&
        currentLocation.pathname !== nextLocation.pathname &&
        !isSessionEnd(nextLocation),
      [blocking]
    )
  );

  // The same question for something that is not a navigation — signing out,
  // which ends the session before it moves anywhere, so the blocker only ever
  // asked once there was nothing left to stay in (QA-62). Resolves `true` when
  // there is nothing to lose or the editor discards, `false` when they stay.
  const [asking, setAsking] = useState(null);
  const confirmDiscard = useCallback(
    () =>
      dirtyRef.current.size === 0
        ? Promise.resolve(true)
        : new Promise((resolve) => setAsking(() => resolve)),
    []
  );

  const value = useMemo(
    () => ({ register, isBlocking: blocking, confirmDiscard }),
    [register, blocking, confirmDiscard]
  );

  /** The answer is "discard": the dirty forms are not, and forget what they kept. */
  const discardAll = () => {
    for (const id of dirtyRef.current) discardRef.current.get(id)?.();
    dirtyRef.current.clear();
    discardRef.current.clear();
    questionRef.current.clear();
    setBlocking(false);
  };

  const leave = () => {
    discardAll();
    if (asking) {
      asking(true);
      setAsking(null);
      return;
    }
    blocker.proceed?.();
  };

  const stay = () => {
    if (asking) {
      asking(false);
      setAsking(null);
      return;
    }
    blocker.reset?.();
  };

  return (
    <NavigationGuardContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={blocker.state === 'blocked' || Boolean(asking)}
        title={question.title}
        message={question.message}
        confirmLabel={question.confirmLabel}
        cancelLabel={question.cancelLabel}
        danger
        onConfirm={leave}
        onClose={stay}
      />
    </NavigationGuardContext.Provider>
  );
};

export { NavigationGuardContext };
export default NavigationGuardContext;
