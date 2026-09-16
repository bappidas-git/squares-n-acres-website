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
 */

const AdminAuthContext = createContext(null);

/** The one sentence §5.4 puts on the screen when a session ends by itself. */
export const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again.';

/** `setTimeout` is unreliable past a few weeks; a day covers every real TTL. */
const MAX_TIMER_MS = 24 * 60 * 60 * 1000;

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

export const AdminAuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [state, setState] = useState({ ...ANONYMOUS, status: 'loading' });

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

  const clearState = useCallback(() => {
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
    authService
      .profile()
      .then(({ data }) => {
        if (!active || !data) return;
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
  // never navigates again.
  useEffect(() => {
    if (state.status !== 'authenticated' || !state.expiresAt) return undefined;
    const remaining = Date.parse(state.expiresAt) - Date.now();
    if (Number.isNaN(remaining)) return undefined;
    const timer = setTimeout(
      () => endSession({ revoke: true }),
      Math.max(Math.min(remaining, MAX_TIMER_MS), 0)
    );
    return () => clearTimeout(timer);
  }, [state.status, state.expiresAt, endSession]);

  // …and on every admin route change, which catches a machine that was asleep
  // while the timer should have fired.
  useEffect(() => {
    if (state.status !== 'authenticated') return;
    if (!isAdminLocation(location.pathname)) return;
    if (isExpired(state.expiresAt)) endSession({ revoke: true });
  }, [location.pathname, state.status, state.expiresAt, endSession]);

  // Signing out in one tab signs out the others: the token key disappearing is
  // the signal, a new token (a sign-in elsewhere) is not.
  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== AUTH_STORAGE_KEYS.token || event.newValue) return;
      torndownRef.current = true;
      clearState();
      if (isAdminLocation(locationRef.current?.pathname)) {
        navigate(PATHS.adminLogin, { replace: true });
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [clearState, navigate]);

  const login = useCallback(async (email, password) => {
    const { data } = await authService.login({ email, password });
    torndownRef.current = false;
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

  const refreshProfile = useCallback(async () => {
    const { data } = await authService.profile();
    if (!data) return null;
    storage.setItem(AUTH_STORAGE_KEYS.user, data);
    setState((previous) => ({ ...previous, user: data }));
    return data;
  }, []);

  /** Keeps the cached user in step after a profile save. */
  const updateUser = useCallback(
    (patch) => {
      const next = { ...(state.user ?? {}), ...patch };
      storage.setItem(AUTH_STORAGE_KEYS.user, next);
      setState((previous) => ({ ...previous, user: next }));
      return next;
    },
    [state.user]
  );

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
    }),
    [state.user, state.status, role, login, logout, refreshProfile, updateUser]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};

export default AdminAuthContext;
