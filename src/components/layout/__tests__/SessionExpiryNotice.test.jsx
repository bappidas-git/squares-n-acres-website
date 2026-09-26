import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SessionExpiryNotice, { timeLeft } from '../SessionExpiryNotice';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';

jest.mock('../../../contexts/AdminAuthContext', () => ({
  __esModule: true,
  useAdminAuth: jest.fn(),
}));

const inMinutes = (minutes) => new Date(Date.now() + minutes * 60000).toISOString();

describe('SessionExpiryNotice (prompt 51)', () => {
  it('draws nothing while the session is not ending', () => {
    useAdminAuth.mockReturnValue({ expiringSoon: false, expiresAt: inMinutes(60) });
    const { container } = render(<SessionExpiryNotice />);
    expect(container).toBeEmptyDOMElement();
  });

  it('says how long is left, and "Stay signed in" asks for a full lifetime', async () => {
    const staySignedIn = jest.fn().mockResolvedValue(true);
    useAdminAuth.mockReturnValue({
      expiringSoon: true,
      expiresAt: inMinutes(3.5),
      staySignedIn,
    });

    render(<SessionExpiryNotice />);

    expect(screen.getByRole('alert')).toHaveTextContent('Your session ends in 4 minutes.');
    await userEvent.click(screen.getByRole('button', { name: 'Stay signed in' }));
    expect(staySignedIn).toHaveBeenCalledTimes(1);
  });

  it('counts down in whole minutes, and never below one', () => {
    const now = Date.parse('2026-09-26T10:00:00.000Z');
    expect(timeLeft('2026-09-26T10:05:00.000Z', now)).toBe('in 5 minutes');
    expect(timeLeft('2026-09-26T10:01:30.000Z', now)).toBe('in 2 minutes');
    expect(timeLeft('2026-09-26T10:00:40.000Z', now)).toBe('in less than a minute');
    expect(timeLeft(null, now)).toBe('in less than a minute');
  });
});
