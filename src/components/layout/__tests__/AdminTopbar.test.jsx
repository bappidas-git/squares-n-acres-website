/**
 * The admin topbar's account menu (QA-65).
 *
 * "My profile" opened from "My profile" is the same page, not another entry
 * in the history — a second entry made Back land on the page again and, with
 * an edit in hand, leave it without asking. And a long name or address sits on
 * one line, the whole of it in the tooltip.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';

import AdminTopbar from '../AdminTopbar';
import theme from '../../../theme';

const LONG_NAME = 'Bartholomew Maximilian Wolfeschlegelsteinhausenbergerdorff Jr';
const LONG_EMAIL = 'bartholomew.longname-with-a-very-long-address@squaresnacres-example.com';

jest.mock('../../../contexts/AdminAuthContext', () => ({
  useAdminAuth: () => ({
    role: 'sales',
    user: {
      name: 'Bartholomew Maximilian Wolfeschlegelsteinhausenbergerdorff Jr',
      email: 'bartholomew.longname-with-a-very-long-address@squaresnacres-example.com',
    },
    logout: () => {},
  }),
}));

jest.mock('../NotificationsMenu', () => () => null);

function topbarAt(initialEntries) {
  const Topbar = () => (
    <AdminTopbar title="Admin" isMobile={false} collapsed={false} onToggleCollapse={() => {}} />
  );
  const router = createMemoryRouter(
    [
      { path: '/admin/dashboard', element: <Topbar /> },
      { path: '/admin/profile', element: <Topbar /> },
    ],
    { initialEntries, initialIndex: initialEntries.length - 1 }
  );
  render(
    <ThemeProvider theme={theme}>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
  return router;
}

const openMenu = () => fireEvent.click(screen.getByRole('button', { name: /account menu/ }));

describe('AdminTopbar — the account menu', () => {
  it('goes to My profile from another screen, as a new entry', async () => {
    const router = topbarAt(['/admin/dashboard']);

    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'My profile' }));

    expect(router.state.location.pathname).toBe('/admin/profile');
    await act(() => router.navigate(-1));
    expect(router.state.location.pathname).toBe('/admin/dashboard');
  });

  it('does not stack My profile on itself (QA-65)', async () => {
    const router = topbarAt(['/admin/dashboard', '/admin/profile']);

    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: 'My profile' }));
    expect(router.state.location.pathname).toBe('/admin/profile');

    // One Back leaves the page, as it would have before the click.
    await act(() => router.navigate(-1));
    expect(router.state.location.pathname).toBe('/admin/dashboard');
  });

  it('keeps a long name and address to a line each, whole in the tooltip (QA-65)', async () => {
    topbarAt(['/admin/dashboard']);

    openMenu();

    const menu = screen.getByRole('menu');
    expect(menu).toHaveTextContent(LONG_NAME);
    expect(screen.getByTitle(LONG_NAME)).toBeInTheDocument();
    expect(screen.getByTitle(LONG_EMAIL)).toHaveTextContent(LONG_EMAIL);
  });
});
