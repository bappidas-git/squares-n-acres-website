import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import authService from '../services/authService';
import storage from '../utils/storage';
import { AUTH_STORAGE_KEYS, clearSession, setAuthToken } from '../services/http';
import { getDefaultRoute, hasRouteAccess } from '../config/rbac';

/**
 * Who is signed in to the admin panel.
 *
 * The session lives under the three `sna_auth_*` keys of §5.4 and the token
 * reaches every request through `services/http.js`, which is also what calls
 * back here when an admin call answers 401. Prompt 12 adds the expiry timer,
 * the route-change check and the RBAC shell; this version keeps the surface
 * the existing screens use while moving it onto the new contract.
 */

const AdminAuthContext = createContext(null);

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

/** A stored session is usable only while it is complete and not yet expired. */
const readStoredUser = () => {
  const token = storage.getItem(AUTH_STORAGE_KEYS.token, null);
  const user = storage.getItem(AUTH_STORAGE_KEYS.user, null);
  const expiresAt = storage.getItem(AUTH_STORAGE_KEYS.expiresAt, null);
  if (!token || !user?.id || !user?.email || !user?.role) return null;
  if (expiresAt && Date.parse(expiresAt) <= Date.now()) return null;
  return user;
};

export const AdminAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restored = readStoredUser();
    if (restored) setUser(restored);
    else clearSession();
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authService.login({ email, password });
    setAuthToken(data.token);
    storage.setItem(AUTH_STORAGE_KEYS.user, data.user);
    storage.setItem(AUTH_STORAGE_KEYS.expiresAt, data.expiresAt ?? null);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      clearSession();
      setUser(null);
    }
  }, []);

  /** Whether the signed-in role may open a route (`config/rbac.js`). */
  const canAccess = useCallback(
    (pathname) => (user?.role ? hasRouteAccess(user.role, pathname) : false),
    [user]
  );

  const getDefaultRouteForUser = useCallback(() => getDefaultRoute(user?.role), [user]);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      isAuthenticated: !!user,
      role: user?.role || null,
      canAccess,
      getDefaultRoute: getDefaultRouteForUser,
    }),
    [user, loading, login, logout, canAccess, getDefaultRouteForUser]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};

export default AdminAuthContext;
