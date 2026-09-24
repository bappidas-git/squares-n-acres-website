import { render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { RouterProvider, createMemoryRouter, createRoutesFromElements } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';

import adminRoutes from '../adminRoutes';
import theme from '../../theme';

/**
 * The admin route table's own 404 (QA-56).
 *
 * An `/admin/…` address that no screen answers — a typo, or
 * `/admin/pages/edit/` with its id missing — fell through to the public
 * site's 404, with the public header and a property search, and a signed-in
 * editor was out of the panel. It is answered inside the admin layout now.
 */

jest.mock('../../contexts/AdminAuthContext', () => ({
  useAdminAuth: () => ({
    status: 'authenticated',
    isAuthenticated: true,
    role: 'admin',
    user: { name: 'Admin User', email: 'admin@squaresnacres.com' },
    can: () => true,
    logout: () => {},
  }),
}));

jest.mock('../../contexts/LeadNotificationsContext', () => ({
  LeadNotificationsProvider: ({ children }) => children,
  useLeadNotifications: () => ({
    newLeadCount: 0,
    recentLeads: [],
    hasUnseen: false,
    markSeen: () => {},
  }),
}));

function renderAt(path) {
  const router = createMemoryRouter(createRoutesFromElements(adminRoutes), {
    initialEntries: [path],
  });
  render(
    <HelmetProvider>
      <ThemeProvider theme={theme}>
        <RouterProvider router={router} />
      </ThemeProvider>
    </HelmetProvider>
  );
}

describe('admin routes', () => {
  it.each(['/admin/pages/whatever', '/admin/pages/edit/', '/admin/no-such-screen'])(
    'answers %s with the admin 404, inside the admin layout',
    async (path) => {
      renderAt(path);

      expect(
        await screen.findByRole('heading', { name: 'There is no such screen in the admin panel.' })
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go to dashboard' })).toHaveAttribute(
        'href',
        '/admin/dashboard'
      );
      // The admin sidebar is still there: the editor never left the panel.
      expect(screen.getAllByRole('navigation', { name: 'Admin sections' }).length).toBeGreaterThan(
        0
      );
    }
  );
});
