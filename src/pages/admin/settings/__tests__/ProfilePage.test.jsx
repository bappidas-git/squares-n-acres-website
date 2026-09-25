/**
 * Admin → My profile (QA-61): the phone box takes a number as people write it,
 * and the profile stores its ten digits. Capped at ten characters, "98450
 * 12345" was cut to "98450 1234" and refused.
 */

import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ProfilePage from '../ProfilePage';
import authService from '../../../../services/authService';
import renderWith from '../../../../test-utils';

const mockUpdateUser = jest.fn();
const mockUnsaved = jest.fn();

const SIGNED_IN = {
  id: 1,
  name: 'Asha Admin',
  email: 'admin@squaresnacres.com',
  phone: '9880000010',
  avatarUrl: null,
};
// The signed-in user the screen reads; a test may replace it and re-render.
let mockUser = SIGNED_IN;

jest.mock('../../../../services/authService', () => ({
  __esModule: true,
  default: { updateProfile: jest.fn(), changePassword: jest.fn() },
}));

jest.mock('../../../../hooks/useUnsavedChanges', () => ({
  __esModule: true,
  default: (...args) => mockUnsaved(...args),
}));

jest.mock('../../../../contexts/AdminAuthContext', () => ({
  useAdminAuth: () => ({
    user: mockUser,
    role: 'admin',
    updateUser: mockUpdateUser,
  }),
}));

const phoneBox = () => screen.getByLabelText(/^Phone/);

const saveWith = async (typed) => {
  await userEvent.clear(phoneBox());
  if (typed) await userEvent.type(phoneBox(), typed);
  await userEvent.click(screen.getByRole('button', { name: 'Save profile' }));
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = SIGNED_IN;
  authService.updateProfile.mockImplementation(async (body) => ({
    data: { id: 1, email: 'admin@squaresnacres.com', ...body },
  }));
});

describe('ProfilePage — the phone number (QA-61)', () => {
  it('has room for a number as people write it', () => {
    renderWith(<ProfilePage />);

    // Read off the box: the user-event this suite runs types past a cap.
    expect(phoneBox()).toHaveAttribute('maxlength', '18');
  });

  it('saves "+91 98450 12345" as its ten digits, and shows them', async () => {
    renderWith(<ProfilePage />);

    await saveWith('+91 98450 12345');

    await waitFor(() =>
      expect(authService.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ phone: '9845012345' })
      )
    );
    expect(mockUpdateUser).toHaveBeenCalledWith(expect.objectContaining({ phone: '9845012345' }));
    await waitFor(() => expect(phoneBox()).toHaveValue('9845012345'));
  });

  it('sends what is not a mobile number as typed, for the API to refuse', async () => {
    renderWith(<ProfilePage />);

    await saveWith('98450 1234');

    await waitFor(() =>
      expect(authService.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ phone: '98450 1234' })
      )
    );
  });

  it('sends an emptied box as no number', async () => {
    renderWith(<ProfilePage />);

    await saveWith('');

    await waitFor(() =>
      expect(authService.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ phone: null })
      )
    );
  });
});

describe('ProfilePage — QA-64', () => {
  const nameBox = () => screen.getByLabelText(/^Full name/);

  it('follows the signed-in user while nothing has been typed', () => {
    const { rerender } = renderWith(<ProfilePage />);
    expect(nameBox()).toHaveValue('Asha Admin');

    // The session is confirmed with the API after the screen opened, or the
    // name was saved on the Users screen.
    mockUser = { ...SIGNED_IN, name: 'Asha Rao' };
    rerender(<ProfilePage />);

    expect(nameBox()).toHaveValue('Asha Rao');
  });

  it('keeps what was typed when the user changes underneath it', () => {
    const { rerender } = renderWith(<ProfilePage />);
    fireEvent.change(nameBox(), { target: { value: 'Typed Name' } });

    mockUser = { ...SIGNED_IN, name: 'Asha Rao' };
    rerender(<ProfilePage />);

    expect(nameBox()).toHaveValue('Typed Name');
  });

  it('asks before leaving with an edit, and not without one', () => {
    renderWith(<ProfilePage />);
    // Both cards register, and neither has anything to lose yet.
    expect(mockUnsaved.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(mockUnsaved.mock.calls.every(([dirty]) => dirty === false)).toBe(true);

    // Only the card that changed renders again, so its answer is the last one.
    fireEvent.change(nameBox(), { target: { value: 'Typed Name' } });
    expect(mockUnsaved).toHaveBeenLastCalledWith(true);

    fireEvent.change(nameBox(), { target: { value: 'Asha Admin' } });
    expect(mockUnsaved).toHaveBeenLastCalledWith(false);

    // A half-typed password is something to lose too.
    fireEvent.change(screen.getByLabelText(/^Current password/), { target: { value: 'x' } });
    expect(mockUnsaved).toHaveBeenLastCalledWith(true);
  });

  it('names the avatar field in an API message', async () => {
    authService.updateProfile.mockRejectedValue(
      Object.assign(new Error('The given data was invalid.'), {
        status: 422,
        fieldError: (field) =>
          field === 'avatarUrl' ? 'The avatarUrl must be a valid URL.' : undefined,
      })
    );
    renderWith(<ProfilePage />);

    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(await screen.findByText('The avatar URL must be a valid URL.')).toBeInTheDocument();
  });

  it('refuses a new password that is the current one', async () => {
    renderWith(<ProfilePage />);

    fireEvent.change(screen.getByLabelText(/^Current password/), {
      target: { value: 'Admin@123' },
    });
    fireEvent.change(screen.getByLabelText(/^New password/), { target: { value: 'Admin@123' } });
    fireEvent.change(screen.getByLabelText(/^Confirm new password/), {
      target: { value: 'Admin@123' },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }));

    expect(
      await screen.findByText('Choose a password different from the current one.')
    ).toBeInTheDocument();
    expect(authService.changePassword).not.toHaveBeenCalled();
  });
});
