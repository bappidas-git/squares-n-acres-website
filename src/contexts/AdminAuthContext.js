import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authService } from '../services/api';
import { hasRouteAccess, getDefaultRoute } from '../config/rbac';

const AdminAuthContext = createContext(null);

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

export const AdminAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('adminUser');
    const token = localStorage.getItem('authToken');
    if (storedUser && token) {
      try {
        const parsed = JSON.parse(storedUser);
        // Validate that user object has required fields
        if (parsed && parsed.id && parsed.email && parsed.role) {
          setUser(parsed);
        } else {
          authService.logout();
        }
      } catch {
        authService.logout();
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password, remember = false) => {
    const response = await authService.login(email, password);
    const { user: userData, token, tokenExpiry } = response;

    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('authToken', token);
    storage.setItem('adminUser', JSON.stringify(userData));

    // Always keep in localStorage for the axios interceptor
    localStorage.setItem('authToken', token);
    localStorage.setItem('adminUser', JSON.stringify(userData));
    if (tokenExpiry) {
      localStorage.setItem('tokenExpiry', tokenExpiry);
    }

    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    await authService.logout();
  }, []);

  /**
   * Check if the current user's role can access a given route.
   * Uses centralized RBAC config — no hardcoded checks needed in components.
   */
  const canAccess = useCallback(
    (pathname) => {
      if (!user?.role) return false;
      return hasRouteAccess(user.role, pathname);
    },
    [user]
  );

  const getDefaultRouteForUser = useCallback(
    () => getDefaultRoute(user?.role),
    [user]
  );

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

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export default AdminAuthContext;
