import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, Outlet, RouterProvider, createMemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';

import { NavigationGuardProvider, useNavigationGuard } from '../NavigationGuardContext';
import theme from '../../theme';
import useUnsavedChanges from '../../hooks/useUnsavedChanges';

/**
 * The in-app "Discard unsaved changes?" question (D97).
 *
 * A form can hand the guard what to forget when its changes are thrown away —
 * the article form's copy autosaved to this browser. Offering that copy back
 * on the next visit asked the editor to restore changes they had just chosen
 * to discard (QA-55); a reload or a closed tab never gets here, which is
 * exactly when the copy is worth keeping.
 */

function Form({ onDiscard }) {
  const [text, setText] = useState('');
  useUnsavedChanges(text !== '', { onDiscard });
  return (
    <label>
      Headline
      <input value={text} onChange={(event) => setText(event.target.value)} />
    </label>
  );
}

/** What the topbar's "Logout" does: ask the guard, then go (or stay). */
function SignOut({ onSignedOut }) {
  const { confirmDiscard } = useNavigationGuard();
  return (
    <button
      type="button"
      onClick={async () => {
        if (await confirmDiscard()) onSignedOut();
      }}
    >
      Sign out
    </button>
  );
}

function renderGuarded(onDiscard, { onSignedOut = () => {} } = {}) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <NavigationGuardProvider>
            <nav>
              <Link to="/form">Form</Link> <Link to="/elsewhere">Elsewhere</Link>{' '}
              <Link to="/admin/login" state={{ from: { pathname: '/form' } }}>
                Session over
              </Link>{' '}
              <SignOut onSignedOut={onSignedOut} />
            </nav>
            <Outlet />
          </NavigationGuardProvider>
        ),
        children: [
          { path: 'form', element: <Form onDiscard={onDiscard} /> },
          { path: 'elsewhere', element: <p>Somewhere else</p> },
          { path: 'admin/login', element: <p>Sign in</p> },
        ],
      },
    ],
    { initialEntries: ['/form'] }
  );

  render(
    <ThemeProvider theme={theme}>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
  return router;
}

describe('NavigationGuardProvider', () => {
  it('runs what a dirty form keeps of its changes only once they are discarded (QA-55)', async () => {
    const onDiscard = jest.fn();
    renderGuarded(onDiscard);

    fireEvent.change(screen.getByLabelText('Headline'), { target: { value: 'Khata' } });
    fireEvent.click(screen.getByRole('link', { name: 'Elsewhere' }));

    expect(await screen.findByText('Discard unsaved changes?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Stay on this page' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onDiscard).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Headline')).toHaveValue('Khata');

    fireEvent.click(screen.getByRole('link', { name: 'Elsewhere' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Discard changes' }));

    expect(await screen.findByText('Somewhere else')).toBeInTheDocument();
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it('leaves a clean form alone', async () => {
    const onDiscard = jest.fn();
    renderGuarded(onDiscard);

    fireEvent.change(screen.getByLabelText('Headline'), { target: { value: 'K' } });
    fireEvent.change(screen.getByLabelText('Headline'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('link', { name: 'Elsewhere' }));

    expect(await screen.findByText('Somewhere else')).toBeInTheDocument();
    expect(screen.queryByText('Discard unsaved changes?')).not.toBeInTheDocument();
    expect(onDiscard).not.toHaveBeenCalled();
  });

  it('lets a session that ended reach the sign-in page without asking (QA-62)', async () => {
    const onDiscard = jest.fn();
    renderGuarded(onDiscard);

    fireEvent.change(screen.getByLabelText('Headline'), { target: { value: 'Khata' } });
    // The session's end sends the sign-in page a `from`: there is no staying.
    fireEvent.click(screen.getByRole('link', { name: 'Session over' }));

    expect(await screen.findByText('Sign in')).toBeInTheDocument();
    expect(screen.queryByText('Discard unsaved changes?')).not.toBeInTheDocument();
    // Not a discard: a form that keeps drafts keeps this one.
    expect(onDiscard).not.toHaveBeenCalled();
  });

  it('asks before signing out, while there is still a session to stay in (QA-62)', async () => {
    const onDiscard = jest.fn();
    const onSignedOut = jest.fn();
    renderGuarded(onDiscard, { onSignedOut });

    fireEvent.change(screen.getByLabelText('Headline'), { target: { value: 'Khata' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Stay on this page' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onSignedOut).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Headline')).toHaveValue('Khata');

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Discard changes' }));
    await waitFor(() => expect(onSignedOut).toHaveBeenCalledTimes(1));
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it('signs out of a clean form without a question', async () => {
    const onSignedOut = jest.fn();
    renderGuarded(jest.fn(), { onSignedOut });

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(onSignedOut).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Discard unsaved changes?')).not.toBeInTheDocument();
  });
});
