/**
 * Admin → My profile (QA-61): the phone box takes a number as people write it,
 * and the profile stores its ten digits. Capped at ten characters, "98450
 * 12345" was cut to "98450 1234" and refused.
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ProfilePage from '../ProfilePage';
import authService from '../../../../services/authService';
import renderWith from '../../../../test-utils';

const mockUpdateUser = jest.fn();

jest.mock('../../../../services/authService', () => ({
  __esModule: true,
  default: { updateProfile: jest.fn(), changePassword: jest.fn() },
}));

jest.mock('../../../../contexts/AdminAuthContext', () => ({
  useAdminAuth: () => ({
    user: {
      id: 1,
      name: 'Asha Admin',
      email: 'admin@squaresnacres.com',
      phone: '9880000010',
      avatarUrl: null,
    },
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
