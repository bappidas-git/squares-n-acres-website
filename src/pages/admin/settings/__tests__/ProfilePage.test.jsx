/**
 * Admin → My profile.
 *
 * QA-61: the phone box takes a number as people write it, and the profile
 * stores its ten digits. Capped at ten characters, "98450 12345" was cut to
 * "98450 1234" and refused.
 *
 * QA-64 and QA-65: the form follows the signed-in user, asks before an edit
 * is lost, and says what went wrong — and QA-65 the rest of what a person can
 * do to it: submit it twice, submit it unchanged, type into it while it
 * saves, leave while it saves, and get answers the form did not expect.
 */

import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ApiError from '../../../../services/apiError';
import ProfilePage from '../ProfilePage';
import authService from '../../../../services/authService';
import renderWith from '../../../../test-utils';

const mockUpdateUser = jest.fn();
const mockRefreshProfile = jest.fn();
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
    refreshProfile: mockRefreshProfile,
  }),
}));

const nameBox = () => screen.getByLabelText(/^Full name/);
const phoneBox = () => screen.getByLabelText(/^Phone/);
const avatarBox = () => screen.getByLabelText(/^Avatar URL/);
const saveButton = () => screen.getByRole('button', { name: 'Save profile' });

const saveWith = async (typed) => {
  await userEvent.clear(phoneBox());
  if (typed) await userEvent.type(phoneBox(), typed);
  await userEvent.click(saveButton());
};

/** The dirty flag and the options of the last registration with the guard. */
const lastGuard = () => mockUnsaved.mock.calls.at(-1);

/** A promise the test settles when it chooses. */
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
};

const fillPasswords = (current, next, confirm = next) => {
  fireEvent.change(screen.getByLabelText(/^Current password/), { target: { value: current } });
  fireEvent.change(screen.getByLabelText(/^New password/), { target: { value: next } });
  fireEvent.change(screen.getByLabelText(/^Confirm new password/), { target: { value: confirm } });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = SIGNED_IN;
  mockRefreshProfile.mockResolvedValue(SIGNED_IN);
  authService.updateProfile.mockImplementation(async (body) => ({
    data: { id: 1, email: 'admin@squaresnacres.com', ...body },
  }));
  authService.changePassword.mockResolvedValue({ data: null, message: 'Password updated.' });
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

  it('refuses what is not a mobile number before asking the API (QA-65)', async () => {
    renderWith(<ProfilePage />);

    await saveWith('98450 1234');

    expect(
      await screen.findByText('The phone number must be a valid Indian mobile number.')
    ).toBeInTheDocument();
    expect(authService.updateProfile).not.toHaveBeenCalled();
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
    expect(lastGuard()[0]).toBe(true);

    fireEvent.change(nameBox(), { target: { value: 'Asha Admin' } });
    expect(lastGuard()[0]).toBe(false);

    // A half-typed password is something to lose too.
    fireEvent.change(screen.getByLabelText(/^Current password/), { target: { value: 'x' } });
    expect(lastGuard()[0]).toBe(true);
  });

  it('names the avatar field in an API message', async () => {
    authService.updateProfile.mockRejectedValue(
      new ApiError({
        status: 422,
        message: 'The given data was invalid.',
        errors: { avatarUrl: ['The avatarUrl must be a valid URL.'] },
      })
    );
    renderWith(<ProfilePage />);

    fireEvent.change(avatarBox(), { target: { value: 'https://cdn.example.com/asha.png' } });
    await userEvent.click(saveButton());

    expect(await screen.findByText('The avatar URL must be a valid URL.')).toBeInTheDocument();
  });

  it('refuses a new password that is the current one', async () => {
    renderWith(<ProfilePage />);

    fillPasswords('Admin@123', 'Admin@123');
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }));

    expect(
      await screen.findByText('Choose a password different from the current one.')
    ).toBeInTheDocument();
    expect(authService.changePassword).not.toHaveBeenCalled();
  });
});

describe('ProfilePage — the profile form (QA-65)', () => {
  it('reads the account again when it opens', () => {
    renderWith(<ProfilePage />);
    expect(mockRefreshProfile).toHaveBeenCalled();
  });

  it('lets a box nobody typed in follow the account while another holds an edit', () => {
    const { rerender } = renderWith(<ProfilePage />);
    fireEvent.change(nameBox(), { target: { value: 'Typed Name' } });

    // A phone number changed on another device arrives with the refresh.
    mockUser = { ...SIGNED_IN, phone: '9845012345' };
    rerender(<ProfilePage />);

    expect(nameBox()).toHaveValue('Typed Name');
    expect(phoneBox()).toHaveValue('9845012345');
  });

  it('says there is nothing to save instead of sending the form unchanged', async () => {
    renderWith(<ProfilePage />);

    fireEvent.click(saveButton());

    expect(await screen.findByText('No changes to save.')).toBeInTheDocument();
    expect(authService.updateProfile).not.toHaveBeenCalled();
  });

  it('treats spaces and another way of writing the number as no change', async () => {
    renderWith(<ProfilePage />);
    fireEvent.change(nameBox(), { target: { value: '  Asha   Admin ' } });
    fireEvent.change(phoneBox(), { target: { value: '+91 98800-00010' } });

    fireEvent.click(saveButton());

    expect(await screen.findByText('No changes to save.')).toBeInTheDocument();
    expect(authService.updateProfile).not.toHaveBeenCalled();
    // The boxes show what is stored, and there is nothing left to lose.
    expect(nameBox()).toHaveValue('Asha Admin');
    expect(phoneBox()).toHaveValue('9880000010');
    expect(lastGuard()[0]).toBe(false);
  });

  it('sends a name with one space between its words', async () => {
    renderWith(<ProfilePage />);
    fireEvent.change(nameBox(), { target: { value: '  Asha     Rao  ' } });

    fireEvent.click(saveButton());

    await waitFor(() =>
      expect(authService.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Asha Rao' })
      )
    );
  });

  it.each([
    [
      'a name over 80 characters',
      'name',
      'N'.repeat(81),
      'The name may not be greater than 80 characters.',
    ],
    ['a one-letter name', 'name', 'A', 'The name must be at least 2 characters.'],
    ['an empty name', 'name', '   ', 'Enter your full name.'],
    ['an address that is not one', 'avatarUrl', 'not a url', 'The avatar URL must be a valid URL.'],
    [
      'an address over 500 characters',
      'avatarUrl',
      `https://cdn.example.com/${'a'.repeat(480)}.png`,
      'The avatar URL may not be greater than 500 characters.',
    ],
  ])(
    'refuses %s before asking the API, with the cursor in it',
    async (_, field, value, message) => {
      renderWith(<ProfilePage />);
      const box = { name: nameBox, avatarUrl: avatarBox }[field]();
      fireEvent.change(box, { target: { value } });

      fireEvent.click(saveButton());

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(authService.updateProfile).not.toHaveBeenCalled();
      await waitFor(() => expect(box).toHaveFocus());
    }
  );

  it('locks the boxes while it saves, and sends one request however often it is submitted', async () => {
    const answer = deferred();
    authService.updateProfile.mockReturnValue(answer.promise);
    renderWith(<ProfilePage />);
    fireEvent.change(nameBox(), { target: { value: 'Asha Rao' } });

    // Five submits in one task, before any render could disable the button.
    act(() => {
      for (let count = 0; count < 5; count += 1) fireEvent.submit(nameBox());
    });

    expect(authService.updateProfile).toHaveBeenCalledTimes(1);
    expect(nameBox()).toHaveAttribute('readonly');
    expect(phoneBox()).toHaveAttribute('readonly');
    expect(avatarBox()).toHaveAttribute('readonly');
    // Leaving now is asked about as what it is: the save goes on.
    expect(lastGuard()[1]).toEqual({
      question: expect.objectContaining({ title: 'Leave while your profile is saving?' }),
    });

    await act(async () => {
      answer.resolve({ data: { ...SIGNED_IN, name: 'Asha Rao' } });
      await answer.promise;
    });

    expect(nameBox()).not.toHaveAttribute('readonly');
    expect(await screen.findByText('Profile saved')).toBeInTheDocument();
  });

  it('shows a refusal about a field it does not have', async () => {
    authService.updateProfile.mockRejectedValue(
      new ApiError({
        status: 422,
        message: 'The given data was invalid.',
        errors: { email: ['The email has already been taken.'] },
      })
    );
    renderWith(<ProfilePage />);
    fireEvent.change(nameBox(), { target: { value: 'Asha Rao' } });

    fireEvent.click(saveButton());

    expect(await screen.findByText('The email has already been taken.')).toBeInTheDocument();
  });

  it('shows a refusal that names no field at all', async () => {
    authService.updateProfile.mockRejectedValue(
      new ApiError({ status: 422, message: 'The given data was invalid.', errors: {} })
    );
    renderWith(<ProfilePage />);
    fireEvent.change(nameBox(), { target: { value: 'Asha Rao' } });

    fireEvent.click(saveButton());

    expect(await screen.findByText('The given data was invalid.')).toBeInTheDocument();
  });

  it('does not take an answer that is not the record for a save', async () => {
    // A proxy's page, or a message with no user in it.
    authService.updateProfile.mockResolvedValue({ data: undefined });
    renderWith(<ProfilePage />);
    fireEvent.change(nameBox(), { target: { value: 'Asha Rao' } });

    fireEvent.click(saveButton());

    expect(await screen.findByText(/The server’s answer could not be read\./)).toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(nameBox()).toHaveValue('Asha Rao');
    expect(screen.queryByText('Profile saved')).not.toBeInTheDocument();
  });

  it('says so when a save fails after the screen was left', async () => {
    const answer = deferred();
    authService.updateProfile.mockReturnValue(answer.promise);
    // The screen goes; the toasts, which live above it, stay.
    const Screen = ({ open }) => (open ? <ProfilePage /> : <p>Dashboard</p>);
    const { rerender } = renderWith(<Screen open />);
    fireEvent.change(nameBox(), { target: { value: 'Asha Rao' } });
    fireEvent.click(saveButton());

    rerender(<Screen open={false} />);
    await act(async () => {
      answer.reject(new ApiError({ status: 500, message: 'Server Error' }));
      await answer.promise.catch(() => {});
    });

    expect(
      await screen.findByText('Your profile could not be saved. Server Error')
    ).toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('says so when a password change fails after the screen was left', async () => {
    const answer = deferred();
    authService.changePassword.mockReturnValue(answer.promise);
    const Screen = ({ open }) => (open ? <ProfilePage /> : <p>Dashboard</p>);
    const { rerender } = renderWith(<Screen open />);
    fillPasswords('Wrong123', 'Another123');
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));

    rerender(<Screen open={false} />);
    await act(async () => {
      answer.reject(
        new ApiError({
          status: 422,
          message: 'The given data was invalid.',
          errors: { currentPassword: ['Current password is incorrect.'] },
        })
      );
      await answer.promise.catch(() => {});
    });

    expect(
      await screen.findByText('Your password was not changed. Current password is incorrect.')
    ).toBeInTheDocument();
  });

  it('offers to discard an edit, and puts the stored values back', async () => {
    renderWith(<ProfilePage />);
    expect(screen.queryByRole('button', { name: 'Discard changes' })).not.toBeInTheDocument();

    fireEvent.change(nameBox(), { target: { value: 'Typed Name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));

    expect(nameBox()).toHaveValue('Asha Admin');
    expect(screen.queryByRole('button', { name: 'Discard changes' })).not.toBeInTheDocument();
    expect(lastGuard()[0]).toBe(false);
  });

  it('previews the avatar as the header draws it, and says when it does not load', () => {
    renderWith(<ProfilePage />);
    fireEvent.change(avatarBox(), { target: { value: 'https://cdn.example.com/missing.png' } });

    const picture = screen.getByAltText('Asha Admin');
    expect(screen.getByText('Avatar preview')).toBeInTheDocument();
    fireEvent.error(picture);

    // The initials, not the company's monogram, and a word about why, spoken.
    expect(screen.getByText('AA')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This picture could not be loaded, so your initials show instead. Check the address.'
      )
    ).toHaveAttribute('role', 'status');
  });
});

describe('ProfilePage — the password form (QA-65)', () => {
  it('sends one request however often it is submitted', async () => {
    const answer = deferred();
    authService.changePassword.mockReturnValue(answer.promise);
    renderWith(<ProfilePage />);
    fillPasswords('Admin@123', 'Another123');

    act(() => {
      for (let count = 0; count < 5; count += 1) {
        fireEvent.submit(screen.getByLabelText(/^Current password/));
      }
    });

    expect(authService.changePassword).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/^New password/)).toHaveAttribute('readonly');
    expect(lastGuard()[1]).toEqual({
      question: expect.objectContaining({ title: 'Leave while your password is being changed?' }),
    });

    await act(async () => {
      answer.resolve({ data: null, message: 'Password updated.' });
      await answer.promise;
    });
    expect(
      await screen.findByText('Password changed. Your other sessions have been signed out.')
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^New password/)).toHaveValue('');
  });

  it('refuses a new password over the API’s 100 characters before asking it', async () => {
    renderWith(<ProfilePage />);
    const long = 'a1'.repeat(51);
    fillPasswords('Admin@123', long);

    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByText('Use at most 100 characters.')).toBeInTheDocument();
    expect(authService.changePassword).not.toHaveBeenCalled();
  });

  it('says to wait when there were too many attempts', async () => {
    authService.changePassword.mockRejectedValue(
      new ApiError({ status: 429, message: 'Too Many Attempts.' })
    );
    renderWith(<ProfilePage />);
    fillPasswords('Wrong123', 'Another123');

    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));

    expect(
      await screen.findByText('Too many attempts. Try again in a minute.')
    ).toBeInTheDocument();
  });

  it('puts the cursor in the first field it refuses', async () => {
    renderWith(<ProfilePage />);

    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));

    await waitFor(() => expect(screen.getByLabelText(/^Current password/)).toHaveFocus());
  });

  it('tells the password manager whose password it is', () => {
    renderWith(<ProfilePage />);

    const username = screen.getByDisplayValue('admin@squaresnacres.com');
    expect(username).toHaveAttribute('autocomplete', 'username');
    expect(username).toHaveAttribute('name', 'username');
    expect(username).not.toBeVisible();
  });
});
