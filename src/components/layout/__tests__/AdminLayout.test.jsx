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

// The session's last minutes are the one state the shell draws differently.
// `expiresAt` is fixed when a test sets it, as a real session's is: computed
// on every render, a re-render a millisecond after the notice read the clock
// put the end a hair over four minutes away, which reads "in 5 minutes".
const mockSession = { expiringSoon: false, expiresAt: null };
jest.mock('../../../contexts/AdminAuthContext', () => ({
  useAdminAuth: () => ({
    role: 'admin',
    user: { name: 'Admin User', email: 'admin@squaresnacres.com' },
    logout: () => {},
    expiringSoon: mockSession.expiringSoon,
    expiresAt: mockSession.expiresAt,
    staySignedIn: () => Promise.resolve(),
  }),
}));

// The poller is the provider's business, not the shell's.
const mockNotifications = { newLeadCount: 0, recentLeads: [], hasUnseen: false };
jest.mock('../../../contexts/LeadNotificationsContext', () => ({
  LeadNotificationsProvider: ({ children }) => children,
  useLeadNotifications: () => ({ ...mockNotifications, markSeen: () => {} }),
}));

afterEach(() => {
  mockNotifications.newLeadCount = 0;
  mockNotifications.hasUnseen = false;
  mockSession.expiringSoon = false;
  mockSession.expiresAt = null;
});

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

describe('AdminLayout — the tab title (prompt 51)', () => {
  it('carries the count of new leads while the bell has news', async () => {
    mockNotifications.newLeadCount = 3;
    mockNotifications.hasUnseen = true;
    renderShell('/admin/leads');

    await waitFor(() => expect(document.title).toMatch(/^\(3\) Leads — Admin/));
  });

  it('carries none once they have been seen', async () => {
    mockNotifications.newLeadCount = 3;
    mockNotifications.hasUnseen = false;
    renderShell('/admin/leads');

    await waitFor(() => expect(document.title).toMatch(/^Leads — Admin/));
  });
});

describe('AdminLayout — the session notice (prompt 51)', () => {
  it('fetches and draws "Stay signed in" in the session’s last minutes', async () => {
    mockSession.expiringSoon = true;
    // Three and a half minutes left reads "4 minutes" for the next thirty
    // seconds, however long the notice's chunk takes to arrive.
    mockSession.expiresAt = new Date(Date.now() + 3.5 * 60 * 1000).toISOString();
    renderShell();

    expect(await screen.findByRole('button', { name: 'Stay signed in' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Your session ends in 4 minutes.');
  });

  it('draws nothing of it otherwise', async () => {
    renderShell();

    expect(await screen.findByText('Leads screen')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Stay signed in' })).not.toBeInTheDocument();
  });
});
