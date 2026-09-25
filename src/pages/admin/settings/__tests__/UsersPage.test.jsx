/*
 * `@testing-library/user-event` is pinned at 13.5 (§3.1), which — unlike v14 —
 * does not wrap its own interactions in `act`.
 */
/* eslint-disable testing-library/no-unnecessary-act */
/**
 * Admin → Settings → Users (QA-64).
 *
 * The screen is a `MasterDataPage` configuration; what is tested here is what
 * the configuration adds: the password rule the API keeps, the reset dialog,
 * the row that is the signed-in admin, and the session that row is.
 */

import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ToastProvider from '../../../../components/common/ToastProvider';
import UsersPage, { PASSWORD_RULE, passwordProblem } from '../UsersPage';
import authService from '../../../../services/authService';
import renderWith from '../../../../test-utils';
import storage from '../../../../utils/storage';
import userService from '../../../../services/userService';
import { AUTH_STORAGE_KEYS, clearSession } from '../../../../services/http';
import { AdminAuthProvider } from '../../../../contexts/AdminAuthContext';

jest.mock('../../../../services/authService');
jest.mock('../../../../services/userService', () => ({
  __esModule: true,
  default: {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    patch: jest.fn(),
    remove: jest.fn(),
    bulk: jest.fn(),
  },
}));

const ADMIN = {
  id: 1,
  name: 'Admin User',
  email: 'admin@squaresnacres.com',
  role: 'admin',
  phone: '9880000010',
  avatarUrl: null,
  isActive: true,
  lastLoginAt: '2026-09-25T08:00:00.000Z',
  createdAt: '2026-03-20T00:00:00.000Z',
};
const SALES = {
  ...ADMIN,
  id: 3,
  name: 'Sales User',
  email: 'sales@squaresnacres.com',
  role: 'sales',
  phone: '9880000012',
};

const envelope = (data) => ({
  data,
  meta: { page: 1, perPage: 20, total: data.length, totalPages: 1 },
});

const realRect = Element.prototype.getBoundingClientRect;
beforeAll(() => {
  Element.prototype.getBoundingClientRect = function boundingRect() {
    return { width: 120, height: 40, top: 0, left: 0, bottom: 40, right: 120, x: 0, y: 0 };
  };
});
afterAll(() => {
  Element.prototype.getBoundingClientRect = realRect;
});

const renderPage = () => {
  const session = {
    id: ADMIN.id,
    name: ADMIN.name,
    email: ADMIN.email,
    role: 'admin',
    phone: ADMIN.phone,
    avatarUrl: null,
  };
  storage.setItem(AUTH_STORAGE_KEYS.token, 'seeded-token');
  storage.setItem(AUTH_STORAGE_KEYS.user, session);
  storage.setItem(
    AUTH_STORAGE_KEYS.expiresAt,
    new Date(Date.now() + 6 * 3600 * 1000).toISOString()
  );
  authService.profile.mockResolvedValue({ data: session });

  return renderWith(
    <ToastProvider>
      <AdminAuthProvider>
        <UsersPage />
      </AdminAuthProvider>
    </ToastProvider>,
    { initialEntries: ['/admin/settings/users'] }
  );
};

const click = (element) =>
  act(async () => {
    await userEvent.click(element);
  });

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
  clearSession();

  authService.logout.mockResolvedValue({ data: null, message: 'Logged out.' });
  userService.list.mockResolvedValue(envelope([ADMIN, SALES]));
  userService.create.mockImplementation(async (body) => ({ data: { ...body, id: 9 } }));
  userService.update.mockImplementation(async (id, body) => ({ data: { ...ADMIN, ...body, id } }));
  userService.patch.mockResolvedValue({ data: SALES });
});

describe('passwordProblem', () => {
  it('asks for eight characters with a letter and a digit, as the API does', () => {
    for (const weak of ['short1', 'aaaaaaaa', '12345678', '        ']) {
      expect(passwordProblem(weak)).toBe(PASSWORD_RULE);
    }
    expect(passwordProblem('Str0ngPass')).toBeNull();
  });
});

describe('UsersPage (QA-64)', () => {
  it('does not offer to delete or switch off your own account', async () => {
    renderPage();
    await screen.findByText('Sales User');

    expect(screen.queryByRole('button', { name: 'Delete Admin User' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Sales User' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Admin User is active' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Sales User is active' })).toBeEnabled();
  });

  it('says what deleting a user does to their leads', async () => {
    renderPage();
    await click(await screen.findByRole('button', { name: 'Delete Sales User' }));

    expect(
      await screen.findByText(
        '“Sales User” will be removed and their leads left unassigned. This cannot be undone.'
      )
    ).toBeInTheDocument();
  });

  it('says a switched-off user can no longer sign in', async () => {
    userService.patch.mockResolvedValue({ data: { ...SALES, isActive: false } });
    renderPage();

    await click(await screen.findByRole('switch', { name: 'Sales User is active' }));

    expect(await screen.findByText('“Sales User” can no longer sign in')).toBeInTheDocument();
  });

  it('refuses a new account whose password is letters only, before any request', async () => {
    renderPage();
    await click(await screen.findByRole('button', { name: 'Add user' }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByLabelText(/^Full name/), {
      target: { value: 'Priya Editor' },
    });
    fireEvent.change(within(dialog).getByLabelText(/^Email address/), {
      target: { value: 'priya@squaresnacres.com' },
    });
    fireEvent.change(within(dialog).getByLabelText(/^Password/), {
      target: { value: 'aaaaaaaa' },
    });
    await click(within(dialog).getByRole('button', { name: 'Create user' }));

    expect(await within(dialog).findByText(PASSWORD_RULE)).toBeInTheDocument();
    expect(userService.create).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText(/^Password/), {
      target: { value: 'Editor@123' },
    });
    await click(within(dialog).getByRole('button', { name: 'Create user' }));
    await waitFor(() => expect(userService.create).toHaveBeenCalled());
  });

  it('resets a password on Enter, and refuses one of digits only', async () => {
    renderPage();
    await click(await screen.findByRole('button', { name: 'Reset the password of Sales User' }));
    const dialog = await screen.findByRole('dialog');
    const box = within(dialog).getByLabelText(/^New password/);
    expect(within(dialog).getByText(/Sales User is signed out everywhere/)).toBeInTheDocument();

    fireEvent.change(box, { target: { value: '12345678' } });
    await act(async () => {
      await userEvent.type(box, '{enter}');
    });
    expect(within(dialog).getByText(PASSWORD_RULE)).toBeInTheDocument();
    expect(userService.patch).not.toHaveBeenCalled();

    fireEvent.change(box, { target: { value: 'N3wSales!' } });
    await act(async () => {
      await userEvent.type(box, '{enter}');
    });

    await waitFor(() =>
      expect(userService.patch).toHaveBeenCalledWith(3, { password: 'N3wSales!' })
    );
    expect(
      await screen.findByText('The password of Sales User has been reset.')
    ).toBeInTheDocument();
  });

  it('hands your own saved name to the session, so the header and My profile show it', async () => {
    renderPage();
    await click(await screen.findByRole('button', { name: 'Edit Admin User' }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByLabelText(/^Full name/), {
      target: { value: 'Asha Admin' },
    });
    await click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(userService.update).toHaveBeenCalled());
    await waitFor(() =>
      expect(storage.getItem(AUTH_STORAGE_KEYS.user)).toEqual(
        expect.objectContaining({ id: 1, name: 'Asha Admin', role: 'admin' })
      )
    );
  });

  it('leaves the session alone when somebody else is saved', async () => {
    userService.update.mockImplementation(async (id, body) => ({ data: { ...SALES, ...body } }));
    renderPage();
    await click(await screen.findByRole('button', { name: 'Edit Sales User' }));
    const dialog = await screen.findByRole('dialog');

    fireEvent.change(within(dialog).getByLabelText(/^Full name/), {
      target: { value: 'Sam Sales' },
    });
    await click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(userService.update).toHaveBeenCalled());
    expect(storage.getItem(AUTH_STORAGE_KEYS.user)).toEqual(
      expect.objectContaining({ id: 1, name: 'Admin User' })
    );
  });
});
