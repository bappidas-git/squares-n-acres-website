/**
 * `AdminAuthContext` — session restore, expiry and the §7 matrix.
 *
 * The three things that must never regress: a reload keeps a signed-in user
 * signed in (and re-checks with the server), a token past its date never
 * reaches the API at all, and `can()` answers from `config/rbac.js` rather
 * than from a role comparison written by hand.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import ApiError from '../../services/apiError';
import ToastProvider from '../../components/common/ToastProvider';
import authService from '../../services/authService';
import storage from '../../utils/storage';
import { AUTH_STORAGE_KEYS, clearSession } from '../../services/http';
import { AdminAuthProvider, useAdminAuth } from '../AdminAuthContext';

jest.mock('../../services/authService');

const userOf = (role = 'admin', name = 'Admin User') => ({
  id: 1,
  name,
  email: `${role}@squaresnacres.com`,
  role,
  phone: '9880000010',
  avatarUrl: null,
});

const hoursFromNow = (hours) => new Date(Date.now() + hours * 3600 * 1000).toISOString();

const seedSession = (user, expiresAt) => {
  storage.setItem(AUTH_STORAGE_KEYS.token, 'seeded-token');
  storage.setItem(AUTH_STORAGE_KEYS.user, user);
  storage.setItem(AUTH_STORAGE_KEYS.expiresAt, expiresAt);
};

const Probe = ({ onState }) => {
  const value = useAdminAuth();
  onState?.(value);
  return (
    <div>
      <span data-testid="status">{value.status}</span>
      <span data-testid="name">{value.user?.name ?? ''}</span>
      <span data-testid="role">{value.role ?? ''}</span>
    </div>
  );
};

const renderProvider = (pathname = '/admin/leads/12') => {
  let value;
  const utils = render(
    <MemoryRouter initialEntries={[pathname]}>
      <ToastProvider>
        <AdminAuthProvider>
          <Probe onState={(next) => (value = next)} />
        </AdminAuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
  return { ...utils, getValue: () => value };
};

describe('AdminAuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    clearSession();
    authService.logout.mockResolvedValue({ data: null, message: 'Logged out.' });
  });

  it('restores a token that is still in date and re-validates it with the profile call', async () => {
    seedSession(userOf(), hoursFromNow(6));
    authService.profile.mockResolvedValue({ data: userOf('admin', 'Renamed Admin') });

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
    expect(authService.profile).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByTestId('name')).toHaveTextContent('Renamed Admin'));
    expect(storage.getItem(AUTH_STORAGE_KEYS.user, null).name).toBe('Renamed Admin');
  });

  it('clears a token that has expired without asking the server', async () => {
    seedSession(userOf(), hoursFromNow(-1));

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'));
    expect(authService.profile).not.toHaveBeenCalled();
    expect(storage.getItem(AUTH_STORAGE_KEYS.token, null)).toBeNull();
    expect(storage.getItem(AUTH_STORAGE_KEYS.user, null)).toBeNull();
  });

  it('clears a token the server has revoked', async () => {
    seedSession(userOf(), hoursFromNow(6));
    authService.profile.mockRejectedValue(
      new ApiError({ status: 401, message: 'Unauthenticated' })
    );

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'));
    expect(storage.getItem(AUTH_STORAGE_KEYS.token, null)).toBeNull();
  });

  it('keeps the session when the profile check cannot reach the server', async () => {
    seedSession(userOf(), hoursFromNow(6));
    authService.profile.mockRejectedValue(
      new ApiError({ status: 0, message: 'Network down', isNetworkError: true })
    );

    renderProvider();

    await waitFor(() => expect(authService.profile).toHaveBeenCalled());
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(storage.getItem(AUTH_STORAGE_KEYS.token, null)).toBe('seeded-token');
  });

  it('stores the session the login answer describes', async () => {
    const expiresAt = hoursFromNow(24);
    authService.profile.mockResolvedValue({ data: userOf() });
    authService.login.mockResolvedValue({
      data: { token: 'fresh-token', expiresAt, user: userOf('manager', 'Manager User') },
    });

    const { getValue } = renderProvider('/admin/login');
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('anonymous'));

    await act(async () => {
      await getValue().login('manager@squaresnacres.com', 'Manager@123');
    });

    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('manager'));
    expect(storage.getItem(AUTH_STORAGE_KEYS.token, null)).toBe('fresh-token');
    expect(storage.getItem(AUTH_STORAGE_KEYS.expiresAt, null)).toBe(expiresAt);
  });

  it('delegates can() to the §7 matrix', async () => {
    seedSession(userOf('sales', 'Sales User'), hoursFromNow(6));
    authService.profile.mockResolvedValue({ data: userOf('sales', 'Sales User') });

    const { getValue } = renderProvider();
    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('sales'));

    expect(getValue().can('properties', 'view')).toBe(true);
    expect(getValue().can('properties', 'create')).toBe(false);
    expect(getValue().can('leads', 'view')).toBe(true);
    expect(getValue().can('settings', 'view')).toBe(false);
    expect(getValue().can('users', 'view')).toBe(false);
    expect(getValue().can('profile', 'view')).toBe(true);
  });
});
