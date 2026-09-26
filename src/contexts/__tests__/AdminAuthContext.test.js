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

  describe('the signed-in user, written from more than one place (QA-65)', () => {
    /** A promise the test settles when it chooses. */
    const deferred = () => {
      let resolve;
      const promise = new Promise((done) => {
        resolve = done;
      });
      return { promise, resolve };
    };

    const storageEvent = (key, value) =>
      new StorageEvent('storage', {
        key,
        newValue: value === null ? null : JSON.stringify(value),
      });

    it('keeps a profile saved while the session confirmation was still on its way', async () => {
      seedSession(userOf(), hoursFromNow(6));
      const confirmation = deferred();
      authService.profile.mockReturnValue(confirmation.promise);

      const { getValue } = renderProvider('/admin/profile');
      await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));

      act(() => {
        getValue().updateUser({ ...userOf(), name: 'Saved Meanwhile' });
      });
      // The confirmation was asked before the save and describes the old name.
      await act(async () => {
        confirmation.resolve({ data: userOf() });
        await confirmation.promise;
      });

      expect(screen.getByTestId('name')).toHaveTextContent('Saved Meanwhile');
      expect(storage.getItem(AUTH_STORAGE_KEYS.user, null).name).toBe('Saved Meanwhile');
    });

    it('drops a refresh that a save overtook, and answers with the session', async () => {
      seedSession(userOf(), hoursFromNow(6));
      authService.profile.mockResolvedValue({ data: userOf() });
      const { getValue } = renderProvider('/admin/profile');
      await waitFor(() => expect(authService.profile).toHaveBeenCalledTimes(1));

      const late = deferred();
      authService.profile.mockReturnValue(late.promise);
      let answer;
      const refreshing = getValue()
        .refreshProfile()
        .then((user) => (answer = user));

      act(() => {
        getValue().updateUser({ name: 'Saved Meanwhile' });
      });
      await act(async () => {
        late.resolve({ data: userOf() });
        await refreshing;
      });

      expect(answer.name).toBe('Saved Meanwhile');
      expect(screen.getByTestId('name')).toHaveTextContent('Saved Meanwhile');
    });

    it('takes a refresh that nothing overtook', async () => {
      seedSession(userOf(), hoursFromNow(6));
      authService.profile.mockResolvedValue({ data: userOf() });
      const { getValue } = renderProvider('/admin/profile');
      await waitFor(() => expect(authService.profile).toHaveBeenCalledTimes(1));

      authService.profile.mockResolvedValue({ data: userOf('admin', 'Renamed Elsewhere') });
      await act(async () => {
        await getValue().refreshProfile();
      });

      expect(screen.getByTestId('name')).toHaveTextContent('Renamed Elsewhere');
      expect(storage.getItem(AUTH_STORAGE_KEYS.user, null).name).toBe('Renamed Elsewhere');
    });

    it('follows a profile saved in another tab, for this account only', async () => {
      seedSession(userOf(), hoursFromNow(6));
      authService.profile.mockResolvedValue({ data: userOf() });
      renderProvider('/admin/profile');
      await waitFor(() => expect(screen.getByTestId('name')).toHaveTextContent('Admin User'));

      act(() => {
        window.dispatchEvent(
          storageEvent(AUTH_STORAGE_KEYS.user, userOf('admin', 'Renamed In Another Tab'))
        );
      });
      expect(screen.getByTestId('name')).toHaveTextContent('Renamed In Another Tab');

      // Somebody else's record, and a value that is not one, change nothing.
      act(() => {
        window.dispatchEvent(
          storageEvent(AUTH_STORAGE_KEYS.user, { ...userOf('sales', 'Sales User'), id: 3 })
        );
        window.dispatchEvent(
          new StorageEvent('storage', { key: AUTH_STORAGE_KEYS.user, newValue: '{not json' })
        );
      });
      expect(screen.getByTestId('name')).toHaveTextContent('Renamed In Another Tab');
      expect(screen.getByTestId('role')).toHaveTextContent('admin');
    });

    it('ignores an older copy of the account written by another tab', async () => {
      const saved = { ...userOf('admin', 'Saved Here'), updatedAt: '2026-09-25T10:00:05.000Z' };
      seedSession(saved, hoursFromNow(6));
      authService.profile.mockResolvedValue({ data: saved });
      renderProvider('/admin/profile');
      await waitFor(() => expect(screen.getByTestId('name')).toHaveTextContent('Saved Here'));

      // Another tab's read, asked before this tab's save, lands afterwards.
      act(() => {
        window.dispatchEvent(
          storageEvent(AUTH_STORAGE_KEYS.user, {
            ...userOf('admin', 'Before The Save'),
            updatedAt: '2026-09-25T10:00:01.000Z',
          })
        );
      });

      expect(screen.getByTestId('name')).toHaveTextContent('Saved Here');
    });

    it('does not put a save that answers after the sign-out on the next session', async () => {
      seedSession(userOf(), hoursFromNow(6));
      authService.profile.mockResolvedValue({ data: userOf() });
      const { getValue } = renderProvider('/admin/profile');
      await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));

      await act(async () => {
        await getValue().logout({ silent: true });
      });
      act(() => {
        getValue().updateUser({ ...userOf(), name: 'Too Late' });
      });

      expect(screen.getByTestId('status')).toHaveTextContent('anonymous');
      expect(screen.getByTestId('name')).toHaveTextContent('');
      expect(storage.getItem(AUTH_STORAGE_KEYS.user, null)).toBeNull();
    });

    it('keeps a late save of one account off the next account’s session', async () => {
      seedSession(userOf(), hoursFromNow(6));
      authService.profile.mockResolvedValue({ data: userOf() });
      const { getValue } = renderProvider('/admin/profile');
      await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('authenticated'));
      // What the admin's profile form holds while its save is on the way.
      const updateUserOfTheForm = getValue().updateUser;

      await act(async () => {
        await getValue().logout({ silent: true });
      });
      authService.login.mockResolvedValue({
        data: {
          token: 'sales-token',
          expiresAt: hoursFromNow(24),
          user: { ...userOf('sales', 'Sales User'), id: 3 },
        },
      });
      await act(async () => {
        await getValue().login('sales@squaresnacres.com', 'Sales@123');
      });

      // The admin's save answers now.
      act(() => {
        updateUserOfTheForm({ ...userOf('admin', 'Admin Late Save') });
      });

      expect(screen.getByTestId('name')).toHaveTextContent('Sales User');
      expect(screen.getByTestId('role')).toHaveTextContent('sales');
      expect(storage.getItem(AUTH_STORAGE_KEYS.user, null).role).toBe('sales');
    });

    it('ignores a record of another account', async () => {
      seedSession(userOf(), hoursFromNow(6));
      authService.profile.mockResolvedValue({ data: userOf() });
      const { getValue } = renderProvider('/admin/profile');
      await waitFor(() => expect(screen.getByTestId('name')).toHaveTextContent('Admin User'));

      act(() => {
        getValue().updateUser({ ...userOf('sales', 'Sales User'), id: 3 });
      });

      expect(screen.getByTestId('name')).toHaveTextContent('Admin User');
      expect(screen.getByTestId('role')).toHaveTextContent('admin');
    });
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

  describe('the session ending (prompt 51)', () => {
    const minutesFromNow = (minutes) => new Date(Date.now() + minutes * 60000).toISOString();

    afterEach(() => {
      jest.useRealTimers();
    });

    it('says so five minutes before the end, and "Stay signed in" gives it a full lifetime', async () => {
      seedSession(userOf(), minutesFromNow(4));
      authService.profile.mockResolvedValue({ data: userOf() });
      const renewed = hoursFromNow(24);
      authService.refresh.mockResolvedValue({
        data: { token: 'seeded-token', expiresAt: renewed, user: userOf() },
      });

      const { getValue } = renderProvider();
      await waitFor(() => expect(getValue().expiringSoon).toBe(true));

      let extended;
      await act(async () => {
        extended = await getValue().staySignedIn();
      });

      expect(extended).toBe(true);
      expect(authService.refresh).toHaveBeenCalledTimes(1);
      expect(getValue().expiringSoon).toBe(false);
      expect(getValue().expiresAt).toBe(renewed);
      expect(storage.getItem(AUTH_STORAGE_KEYS.expiresAt)).toBe(renewed);
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    it('warns when the five minutes arrive, not before', async () => {
      jest.useFakeTimers();
      seedSession(userOf(), minutesFromNow(6));
      authService.profile.mockResolvedValue({ data: userOf() });

      const { getValue } = renderProvider();
      await waitFor(() => expect(authService.profile).toHaveBeenCalled());
      expect(getValue().expiringSoon).toBe(false);

      act(() => {
        jest.advanceTimersByTime(61000);
      });
      expect(getValue().expiringSoon).toBe(true);
    });

    it('takes the later end another tab’s "Stay signed in" wrote, instead of ending', async () => {
      jest.useFakeTimers();
      seedSession(userOf(), minutesFromNow(1));
      authService.profile.mockResolvedValue({ data: userOf() });

      const { getValue } = renderProvider();
      await waitFor(() => expect(authService.profile).toHaveBeenCalled());
      expect(getValue().expiringSoon).toBe(true);

      const renewed = hoursFromNow(24);
      act(() => {
        storage.setItem(AUTH_STORAGE_KEYS.expiresAt, renewed);
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: AUTH_STORAGE_KEYS.expiresAt,
            newValue: JSON.stringify(renewed),
          })
        );
      });
      expect(getValue().expiresAt).toBe(renewed);
      expect(getValue().expiringSoon).toBe(false);

      act(() => {
        jest.advanceTimersByTime(2 * 60000);
      });
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
      expect(authService.logout).not.toHaveBeenCalled();
    });

    it('ends the session at its end when nobody stayed', async () => {
      jest.useFakeTimers();
      seedSession(userOf(), minutesFromNow(1));
      authService.profile.mockResolvedValue({ data: userOf() });

      renderProvider();
      await waitFor(() => expect(authService.profile).toHaveBeenCalled());

      await act(async () => {
        jest.advanceTimersByTime(61000);
      });
      expect(screen.getByTestId('status')).toHaveTextContent('anonymous');
    });
  });
});
