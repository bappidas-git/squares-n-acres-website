import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import PATHS from '../routes/paths';
import authService from '../services/authService';
import storage from '../utils/storage';
import { AUTH_STORAGE_KEYS, clearSession, onUnauthorized, setAuthToken } from '../services/http';
import { can } from '../config/rbac';
import { useToast } from '../components/common/ToastProvider';

/**
 * Who is signed in to the admin panel (00_MASTER_CONTEXT.md §5.4).
 *
 * The session lives under the three `sna_auth_*` keys and the token reaches
 * every request through `services/http.js`. Expiry is enforced three ways —
 * a timer armed for `expiresAt`, a check on every admin route change, and the
 * server's 401 through `http.onUnauthorized` — and all three end in the same
 * place: storage cleared, one toast, one redirect to the login screen carrying
 * the location the user was on.
 *
 * Five minutes before the end the session asks whether to stay (prompt 51):
 * `expiringSoon` turns true, and `staySignedIn()` gives the same token a full
 * lifetime again through `POST /auth/refresh`. A tab whose session another tab
 * extended reads the new end from storage before its own timer ends anything.
 * The record forms keep their unsaved work in this browser when the session
 * ends regardless (`useLocalDraft`).
 */

const AdminAuthContext = createContext(null);

/** The one sentence §5.4 puts on the screen when a session ends by itself. */
export const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again.';

/** `setTimeout` is unreliable past a few weeks; a day covers every real TTL. */
const MAX_TIMER_MS = 24 * 60 * 60 * 1000;

/** How long before its end a session asks whether to stay (prompt 51). */
export const EXPIRY_WARNING_MS = 5 * 60 * 1000;

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

/** Admin screens — the login page is excluded: it is where a session ends. */
const isAdminLocation = (pathname = '') =>
  pathname.startsWith(`${PATHS.adminRoot}/`) && pathname !== PATHS.adminLogin;

const isExpired = (expiresAt) => {
  const at = Date.parse(expiresAt ?? '');
  return Number.isNaN(at) || at <= Date.now();
};

/** A stored session is usable only while it is complete and still in date. */
const readStoredSession = () => {
  const token = storage.getItem(AUTH_STORAGE_KEYS.token, null);
  const user = storage.getItem(AUTH_STORAGE_KEYS.user, null);
  const expiresAt = storage.getItem(AUTH_STORAGE_KEYS.expiresAt, null);
  if (!token || !user?.id || !user?.email || !user?.role) return null;
  if (isExpired(expiresAt)) return null;
  return { token, user, expiresAt };
};

const ANONYMOUS = { user: null, token: null, expiresAt: null, status: 'anonymous' };

/** Whether `user` is the account `session` is signed in as. */
const isSameAccount = (session, user) =>
  session?.status === 'authenticated' &&
  user?.id !== undefined &&
  String(session.user?.id) === String(user.id);

/**
 * Whether `next` is an older copy of the account than `held`, going by the
 * server's own `updatedAt` on both — a late read in another tab, written to
 * storage after this tab's save, would otherwise travel back here (QA-65).
 * A copy without the stamp (the login answer's six fields) cannot be judged,
 * and is not refused for it.
 */
const isOlderCopy = (next, held) => {
  const incoming = Date.parse(next?.updatedAt ?? '');
  const current = Date.parse(held?.updatedAt ?? '');
  return Number.isFinite(incoming) && Number.isFinite(current) && incoming < current;
};

export const AdminAuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [state, setState] = useState({ ...ANONYMOUS, status: 'loading' });
  // Within five minutes of the end: the layout offers "Stay signed in".
  const [expiringSoon, setExpiringSoon] = useState(false);
  /** The session as last rendered, for the listeners registered once. */
  const stateRef = useRef(state);
  stateRef.current = state;

  /**
   * True from the moment a session is torn down until the next sign-in.
   * A single dead token produces a burst of 401s (and the sign-out call itself
   * may answer 401), so this keeps every teardown to one toast and one
   * redirect.
   */
  const torndownRef = useRef(false);

  /** The location a redirect should come back to, readable from callbacks. */
  const locationRef = useRef(location);
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  /**
   * How many times the signed-in user has been written since the page opened:
   * a sign-in, a save of "My profile" or of your own row on the Users screen, a
   * save in another tab. A profile read carries the count it was asked at, and
   * one that lands after a newer write is older than what the session holds.
   * Taken as it came, the session confirmation of a reload — slow to answer —
   * put the name saved in the meantime back to the old one, in the header, in
   * storage and in the form, and the next save wrote it back (QA-65).
   */
  const userWritesRef = useRef(0);

  const clearState = useCallback(() => {
    // A profile read still on its way belongs to the session that just ended.
    userWritesRef.current += 1;
    clearSession();
    setState(ANONYMOUS);
  }, []);

  /**
   * @param {{ silent?: boolean }} [options] `silent` skips the redirect, for
   *   the callers that navigate themselves.
   */
  const logout = useCallback(
    async ({ silent = false } = {}) => {
      torndownRef.current = true;
      try {
        await authService.logout();
      } catch {
        // The token may already be revoked or expired server-side; the local
        // session goes away either way.
      }
      clearState();
      if (!silent) navigate(PATHS.adminLogin, { replace: true });
    },
    [clearState, navigate]
  );

  /** Ends the session the user did not ask to end: clear, tell, send to login. */
  const endSession = useCallback(
    ({ revoke = false } = {}) => {
      if (torndownRef.current) return;
      const from = locationRef.current;
      if (revoke) logout({ silent: true });
      else {
        torndownRef.current = true;
        clearState();
      }
      // A stale admin token found while the visitor is reading a public page is
      // not worth a toast or a redirect — only admin screens react.
      if (!isAdminLocation(from?.pathname)) return;
      toast.warning(SESSION_EXPIRED_MESSAGE);
      navigate(PATHS.adminLogin, { state: { from }, replace: true });
    },
    [clearState, logout, navigate, toast]
  );

  /**
   * The end another tab's "Stay signed in" wrote, taken here — read before any
   * timer of this tab ends or warns about a session that is no longer ending.
   *
   * @returns {boolean} whether a later end was found and taken
   */
  const adoptStoredExpiry = useCallback(() => {
    const current = stateRef.current;
    if (current.status !== 'authenticated') return false;
    if (storage.getItem(AUTH_STORAGE_KEYS.token, null) !== current.token) return false;
    const stored = storage.getItem(AUTH_STORAGE_KEYS.expiresAt, null);
    if (!stored || isExpired(stored)) return false;
    if (Date.parse(stored) <= Date.parse(current.expiresAt ?? '')) return false;
    setState((previous) =>
      previous.status === 'authenticated' ? { ...previous, expiresAt: stored } : previous
    );
    return true;
  }, []);

  // The 401 handler is registered before anything can issue a request.
  useEffect(() => onUnauthorized(() => endSession()), [endSession]);

  // Restore: a token that is still in date signs the user straight back in,
  // and the profile call confirms with the server that it is still good.
  useEffect(() => {
    const stored = readStoredSession();
    if (!stored) {
      clearState();
      return undefined;
    }

    torndownRef.current = false;
    setAuthToken(stored.token);
    setState({ ...stored, status: 'authenticated' });

    let active = true;
    const asked = userWritesRef.current;
    authService
      .profile()
      .then(({ data }) => {
        if (!active || !data || asked !== userWritesRef.current) return;
        if (isOlderCopy(data, stateRef.current.user)) return;
        storage.setItem(AUTH_STORAGE_KEYS.user, data);
        setState((previous) => ({ ...previous, user: data }));
      })
      .catch((error) => {
        // A 401 already ran through `endSession`; anything else (the API being
        // down) leaves the restored session alone — a blip is not a sign-out.
        if (active && error?.status === 401) clearState();
      });

    return () => {
      active = false;
    };
  }, [clearState]);

  // The session ends on its own the moment the token does, even if the user
  // never navigates again — and says so five minutes before (prompt 51).
  useEffect(() => {
    if (state.status !== 'authenticated' || !state.expiresAt) {
      setExpiringSoon(false);
      return undefined;
    }
    const remaining = Date.parse(state.expiresAt) - Date.now();
    if (Number.isNaN(remaining)) return undefined;
    setExpiringSoon(remaining <= EXPIRY_WARNING_MS);
    const timer = setTimeout(
      () => {
        if (!adoptStoredExpiry()) endSession({ revoke: true });
      },
      Math.max(Math.min(remaining, MAX_TIMER_MS), 0)
    );
    const warning =
      remaining > EXPIRY_WARNING_MS
        ? setTimeout(
            () => {
              if (!adoptStoredExpiry()) setExpiringSoon(true);
            },
            Math.min(remaining - EXPIRY_WARNING_MS, MAX_TIMER_MS)
          )
        : null;
    return () => {
      clearTimeout(timer);
      if (warning) clearTimeout(warning);
    };
  }, [state.status, state.expiresAt, endSession, adoptStoredExpiry]);

  // …and on every admin route change, which catches a machine that was asleep
  // while the timer should have fired.
  useEffect(() => {
    if (state.status !== 'authenticated') return;
    if (!isAdminLocation(location.pathname)) return;
    if (isExpired(state.expiresAt) && !adoptStoredExpiry()) endSession({ revoke: true });
  }, [location.pathname, state.status, state.expiresAt, endSession, adoptStoredExpiry]);

  // Signing out in one tab signs out the others: the token key disappearing is
  // the signal, a new token (a sign-in elsewhere) is not.
  //
  // A profile saved in one tab reaches the others through the stored user: the
  // header of a tab left open went on showing the old name, and its "My
  // profile", saved, put the old name back over the new one (QA-65). Only the
  // same account is taken — a user written for anybody else is not this
  // session's business.
  useEffect(() => {
    const handleStorage = (event) => {
      // "Stay signed in" in another tab: this one's session ends later too.
      if (event.key === AUTH_STORAGE_KEYS.expiresAt) {
        adoptStoredExpiry();
        return;
      }
      if (event.key === AUTH_STORAGE_KEYS.user) {
        let next = null;
        try {
          next = JSON.parse(event.newValue ?? 'null');
        } catch {
          return;
        }
        if (!next?.email || !next?.role || !isSameAccount(stateRef.current, next)) return;
        if (isOlderCopy(next, stateRef.current.user)) return;
        userWritesRef.current += 1;
        setState((previous) =>
          isSameAccount(previous, next) ? { ...previous, user: next } : previous
        );
        return;
      }
      if (event.key !== AUTH_STORAGE_KEYS.token || event.newValue) return;
      torndownRef.current = true;
      clearState();
      if (isAdminLocation(locationRef.current?.pathname)) {
        navigate(PATHS.adminLogin, { replace: true });
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [adoptStoredExpiry, clearState, navigate]);

  const login = useCallback(async (email, password) => {
    const { data } = await authService.login({ email, password });
    torndownRef.current = false;
    userWritesRef.current += 1;
    setAuthToken(data.token);
    storage.setItem(AUTH_STORAGE_KEYS.user, data.user);
    storage.setItem(AUTH_STORAGE_KEYS.expiresAt, data.expiresAt ?? null);
    setState({
      user: data.user,
      token: data.token,
      expiresAt: data.expiresAt ?? null,
      status: 'authenticated',
    });
    return data.user;
  }, []);

  /**
   * "Stay signed in": the same session, a full lifetime from now (prompt 51).
   * A refusal because the session has already ended ends it here too, through
   * the 401 handler; any other failure is said, and the session runs on.
   *
   * @returns {Promise<boolean>} whether the session was extended
   */
  const staySignedIn = useCallback(async () => {
    try {
      const { data } = await authService.refresh();
      const current = stateRef.current;
      if (!data?.expiresAt || current.status !== 'authenticated') return false;
      if (data.token && data.token !== current.token) setAuthToken(data.token);
      storage.setItem(AUTH_STORAGE_KEYS.expiresAt, data.expiresAt);
      setState((previous) =>
        previous.status === 'authenticated'
          ? { ...previous, token: data.token ?? previous.token, expiresAt: data.expiresAt }
          : previous
      );
      return true;
    } catch (error) {
      if (error?.status !== 401) {
        toast.error('The session could not be extended. Save your work, then sign in again.');
      }
      return false;
    }
  }, [toast]);

  /**
   * Reads the signed-in user again. An answer that is no longer news — a write
   * landed while it was on its way, or the session has ended or changed hands
   * since — is dropped, and the session's user is what comes back.
   */
  const refreshProfile = useCallback(async () => {
    const asked = userWritesRef.current;
    const { data } = await authService.profile();
    if (!data) return null;
    const current = stateRef.current;
    if (asked !== userWritesRef.current || !isSameAccount(current, data)) return current.user;
    if (isOlderCopy(data, current.user)) return current.user;
    storage.setItem(AUTH_STORAGE_KEYS.user, data);
    setState((previous) =>
      isSameAccount(previous, data) ? { ...previous, user: data } : previous
    );
    return data;
  }, []);

  /**
   * Keeps the cached user in step after a profile save.
   *
   * Only while the session it belongs to is the one signed in: a save sent
   * before signing out that answers after the next sign-in is somebody else's,
   * and merged in it put the previous account's name — and role — on the new
   * session (QA-65).
   */
  const updateUser = useCallback((patch) => {
    const current = stateRef.current;
    if (current.status !== 'authenticated' || !current.user) return current.user;
    if (patch?.id !== undefined && !isSameAccount(current, patch)) return current.user;

    const next = { ...current.user, ...patch };
    userWritesRef.current += 1;
    // Two writes in one tick must build on each other, not on the same render.
    stateRef.current = { ...current, user: next };
    storage.setItem(AUTH_STORAGE_KEYS.user, next);
    setState((previous) => ({ ...previous, user: next }));
    return next;
  }, []);

  const role = state.user?.role ?? null;

  const value = useMemo(
    () => ({
      user: state.user,
      role,
      status: state.status,
      isAuthenticated: state.status === 'authenticated',
      login,
      logout,
      can: (area, action) => can(role, area, action),
      refreshProfile,
      updateUser,
      expiresAt: state.expiresAt,
      expiringSoon,
      staySignedIn,
    }),
    [
      state.user,
      state.status,
      state.expiresAt,
      role,
      login,
      logout,
      refreshProfile,
      updateUser,
      expiringSoon,
      staySignedIn,
    ]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};

export default AdminAuthContext;
