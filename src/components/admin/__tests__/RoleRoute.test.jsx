/**
 * `RoleRoute` — guard 2 of §7, exercised through the real matrix.
 *
 * The provider is the real one with a seeded session, so the test fails if
 * `config/rbac.js` and the guard ever disagree.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import RoleRoute from '../RoleRoute';
import ToastProvider from '../../common/ToastProvider';
import authService from '../../../services/authService';
import storage from '../../../utils/storage';
import { AUTH_STORAGE_KEYS, clearSession } from '../../../services/http';
import { AdminAuthProvider } from '../../../contexts/AdminAuthContext';

jest.mock('../../../services/authService');

const userOf = (role) => ({
  id: 3,
  name: 'Sales User',
  email: `${role}@squaresnacres.com`,
  role,
  phone: '9880000012',
  avatarUrl: null,
});

const renderAs = (role, element) => {
  const user = userOf(role);
  storage.setItem(AUTH_STORAGE_KEYS.token, 'seeded-token');
  storage.setItem(AUTH_STORAGE_KEYS.user, user);
  storage.setItem(
    AUTH_STORAGE_KEYS.expiresAt,
    new Date(Date.now() + 6 * 3600 * 1000).toISOString()
  );
  authService.profile.mockResolvedValue({ data: user });

  return render(
    <MemoryRouter initialEntries={['/admin/settings']}>
      <ToastProvider>
        <AdminAuthProvider>{element}</AdminAuthProvider>
      </ToastProvider>
    </MemoryRouter>
  );
};

const Screen = () => <p>Site settings</p>;

describe('RoleRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    clearSession();
    authService.logout.mockResolvedValue({ data: null, message: 'Logged out.' });
  });

  it('renders Forbidden when the role may not open the area', async () => {
    renderAs(
      'sales',
      <RoleRoute permission={['settings', 'view']}>
        <Screen />
      </RoleRoute>
    );

    expect(await screen.findByText("You don't have access to this page.")).toBeInTheDocument();
    expect(screen.queryByText('Site settings')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to dashboard/i })).toHaveAttribute(
      'href',
      '/admin/dashboard'
    );
  });

  it('renders the screen when the role may open the area', async () => {
    renderAs(
      'manager',
      <RoleRoute permission={['settings', 'view']}>
        <Screen />
      </RoleRoute>
    );

    expect(await screen.findByText('Site settings')).toBeInTheDocument();
    expect(screen.queryByText("You don't have access to this page.")).not.toBeInTheDocument();
  });

  it('still honours an explicit allowedRoles list', async () => {
    renderAs(
      'manager',
      <RoleRoute allowedRoles={['admin']}>
        <Screen />
      </RoleRoute>
    );

    expect(await screen.findByText("You don't have access to this page.")).toBeInTheDocument();
  });
});
