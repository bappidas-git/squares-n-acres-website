import { useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { Outlet, RouterProvider, createMemoryRouter } from 'react-router-dom';

import RouteBoundary from '../RouteBoundary';
import { isAdminPath } from '../paths';

/**
 * The route boundary and the admin shell below it.
 *
 * Keyed on the pathname everywhere, it remounted the whole admin shell on
 * every click in the sidebar: the menu jumped back to its top, and the lead
 * poller started over. These tests render it the way `routes/index.js` does —
 * inside a data router, above the outlet — with stand-ins for the shell and
 * the pages, each of which says which mount of it is on screen.
 */

let mounts = 0;

/** Says which mount of it this is: a remount shows a new number. */
const Mounted = ({ name, children = null }) => {
  const [mount] = useState(() => {
    mounts += 1;
    return mounts;
  });

  return (
    <div>
      <p>
        {name} #{mount}
      </p>
      {children}
    </div>
  );
};

const Boom = () => {
  throw new Error('Kaboom');
};

function renderRoutes(initialEntry) {
  const router = createMemoryRouter(
    [
      {
        element: (
          <RouteBoundary>
            <Outlet />
          </RouteBoundary>
        ),
        children: [
          {
            path: '/admin',
            element: (
              <Mounted name="Admin shell">
                <Outlet />
              </Mounted>
            ),
            children: [
              { path: 'leads', element: <p>Leads screen</p> },
              { path: 'master-data/badges', element: <p>Badges screen</p> },
              { path: 'broken', element: <Boom /> },
            ],
          },
          // One element for every public URL, as the listing routes share one
          // page: only the key tells React two pathnames apart.
          { path: '/:slug', element: <Mounted name="Public page" /> },
        ],
      },
    ],
    { initialEntries: [initialEntry] }
  );

  render(
    <HelmetProvider>
      <RouterProvider router={router} />
    </HelmetProvider>
  );

  return { router };
}

describe('RouteBoundary', () => {
  let errorSpy;

  beforeEach(() => {
    mounts = 0;
    // React and the boundary both log a caught error; that is expected here.
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('keeps the admin shell mounted from one screen to the next', async () => {
    const { router } = renderRoutes('/admin/leads');

    expect(screen.getByText('Admin shell #1')).toBeInTheDocument();
    expect(screen.getByText('Leads screen')).toBeInTheDocument();

    await act(() => router.navigate('/admin/master-data/badges'));

    expect(screen.getByText('Badges screen')).toBeInTheDocument();
    expect(screen.getByText('Admin shell #1')).toBeInTheDocument();
  });

  it('still remounts a public page on every pathname', async () => {
    const { router } = renderRoutes('/about');

    expect(screen.getByText('Public page #1')).toBeInTheDocument();

    await act(() => router.navigate('/contact'));

    expect(screen.getByText('Public page #2')).toBeInTheDocument();
  });

  it('clears a crash inside the admin panel on the next navigation', async () => {
    const { router } = renderRoutes('/admin/leads');

    await act(() => router.navigate('/admin/broken'));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText(/Admin shell/)).toBeNull();

    await act(() => router.navigate('/admin/leads'));

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Leads screen')).toBeInTheDocument();
  });
});

describe('isAdminPath', () => {
  it('is the admin root and everything below it', () => {
    expect(isAdminPath('/admin')).toBe(true);
    expect(isAdminPath('/admin/login')).toBe(true);
    expect(isAdminPath('/admin/master-data/segments')).toBe(true);
  });

  it('matches by segment, not by the first five letters', () => {
    expect(isAdminPath('/administration')).toBe(false);
    expect(isAdminPath('/')).toBe(false);
    expect(isAdminPath('/insights/articles/admin')).toBe(false);
    expect(isAdminPath(undefined)).toBe(false);
  });
});
