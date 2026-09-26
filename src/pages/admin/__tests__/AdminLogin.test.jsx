import { screen } from '@testing-library/react';

import AdminLogin from '../AdminLogin';
import renderWith from '../../../test-utils';

jest.mock('../../../contexts/AdminAuthContext', () => ({
  __esModule: true,
  useAdminAuth: () => ({ login: jest.fn(), isAuthenticated: false, role: null }),
}));

describe('AdminLogin (prompt 51)', () => {
  it('tells a locked-out user who can let them back in', () => {
    renderWith(<AdminLogin />, { initialEntries: ['/admin/login'] });

    expect(
      screen.getByText(
        'Forgot your password? Ask an administrator to reset it from Settings → Users.'
      )
    ).toBeInTheDocument();
  });
});
