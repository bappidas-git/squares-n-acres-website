import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';

import AdminLayout from '../AdminLayout';
import theme from '../../../theme';

/**
 * The admin shell across a navigation.
 *
 * The route boundary keeps the shell mounted from one screen to the next
 * (`routes/RouteBoundary.jsx`), so the shell does on purpose what the remount
 * used to do by the way: the next screen starts at the top of the canvas, and
 * the phone's drawer closes. What it must not do is let go of the sidebar,
 * whose scroll position is the point of keeping it.
 */

jest.mock('../../../contexts/AdminAuthContext', () => ({
  useAdminAuth: () => ({
    role: 'admin',
    user: { name: 'Admin User', email: 'admin@squaresnacres.com' },
    logout: () => {},
  }),
}));

// The poller is the provider's business, not the shell's.
jest.mock('../../../contexts/LeadNotificationsContext', () => ({
  LeadNotificationsProvider: ({ children }) => children,
  useLeadNotifications: () => ({
    newLeadCount: 0,
    recentLeads: [],
    hasUnseen: false,
    markSeen: () => {},
  }),
}));

function renderShell(initialEntry = '/admin/leads') {
  const router = createMemoryRouter(
    [
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          { path: 'leads', element: <p>Leads screen</p> },
          { path: 'master-data/badges', element: <p>Badges screen</p> },
        ],
      },
    ],
    { initialEntries: [initialEntry] }
  );

  render(
    <HelmetProvider>
      <ThemeProvider theme={theme}>
        <RouterProvider router={router} />
      </ThemeProvider>
    </HelmetProvider>
  );

  return { router };
}

/** jsdom does no layout, so the canvas is given a scroll position to lose. */
function scrolledCanvas(top) {
  const main = screen.getByRole('main');
  Object.defineProperty(main, 'scrollTop', { configurable: true, writable: true, value: top });
  return main;
}

describe('AdminLayout', () => {
  it('starts the next screen at the top of the canvas', async () => {
    const { router } = renderShell();
    const main = scrolledCanvas(640);

    await act(() => router.navigate('/admin/master-data/badges'));

    expect(screen.getByText('Badges screen')).toBeInTheDocument();
    expect(main.scrollTop).toBe(0);
  });

  it('leaves the canvas where it is when only the query string changes', async () => {
    const { router } = renderShell();
    const main = scrolledCanvas(640);

    await act(() => router.navigate('/admin/leads?page=2'));

    expect(main.scrollTop).toBe(640);
  });

  it('keeps the same sidebar from one screen to the next', async () => {
    const { router } = renderShell();
    const sidebar = screen.getByRole('navigation', { name: 'Admin sections' });

    await act(() => router.navigate('/admin/master-data/badges'));

    expect(screen.getByRole('navigation', { name: 'Admin sections' })).toBe(sidebar);
  });

  describe('on a phone', () => {
    const { matchMedia } = window;

    beforeEach(() => {
      // Below `md`: every `max-width` query of `useBreakpoint` matches.
      window.matchMedia = (query) => ({
        matches: query.includes('max-width'),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      });
    });

    afterEach(() => {
      window.matchMedia = matchMedia;
    });

    it('closes the drawer when the screen changes without a tap in it — the back button', async () => {
      const { router } = renderShell();

      fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
      expect(screen.getByRole('dialog', { name: 'Admin menu' })).toBeInTheDocument();

      await act(() => router.navigate('/admin/master-data/badges'));

      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Admin menu' })).toBeNull());
      expect(screen.getByText('Badges screen')).toBeInTheDocument();
    });
  });
});
