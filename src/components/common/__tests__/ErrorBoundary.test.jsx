import { useState } from 'react';
import { fireEvent, screen, within } from '@testing-library/react';

import ErrorBoundary from '../ErrorBoundary';
import renderWith from '../../../test-utils';
import { ERRORS } from '../../../config/copy';

/**
 * The crash screen, verified here rather than by throwing from a real
 * component in the running app (§9 of prompt 43): a boundary is the one piece
 * of the UI whose only trigger is a bug, so a unit test is the only honest way
 * to see it.
 *
 * React logs every caught error to `console.error` itself, on top of the
 * boundary's own line. Both are expected, and silencing them is what keeps the
 * suite's output readable — `componentDidCatch` is asserted on the spy instead.
 */

const Boom = ({ fail = true }) => {
  if (fail) throw new Error('Kaboom');
  return <p>All is well</p>;
};

describe('ErrorBoundary', () => {
  let errorSpy;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('renders its children while nothing throws', () => {
    renderWith(
      <ErrorBoundary>
        <Boom fail={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('All is well')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows the branded screen with Reload and Go home when a child throws', () => {
    renderWith(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: ERRORS.boundary.title })
    ).toBeInTheDocument();
    expect(screen.getByText(ERRORS.boundary.text)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: ERRORS.boundary.reload })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: ERRORS.boundary.goHome })).toBeInTheDocument();

    // The monogram is decorative: the heading is the accessible name here, so
    // the mark carries an empty alt and no role of its own.
    expect(within(alert).getByAltText('')).toBeInTheDocument();
  });

  it('logs the error it caught', () => {
    renderWith(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(errorSpy).toHaveBeenCalled();
    const logged = errorSpy.mock.calls.some(([first]) =>
      String(first).includes('Application error:')
    );
    expect(logged).toBe(true);
  });

  it('renders the head a page boundary hands it', () => {
    renderWith(
      <ErrorBoundary head={<span data-testid="head" />}>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('head')).toBeInTheDocument();
  });

  it('offers "Reload this page" in the admin variant', () => {
    renderWith(
      <ErrorBoundary variant="inline">
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByRole('button', { name: ERRORS.boundary.reloadPage })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: ERRORS.boundary.reload })).toBeNull();
  });

  it('reloads the window from the Reload button', () => {
    const reload = jest.fn();
    const original = window.location;
    delete window.location;
    window.location = { ...original, reload, href: '/' };

    try {
      renderWith(
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByRole('button', { name: ERRORS.boundary.reload }));
      expect(reload).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: ERRORS.boundary.goHome }));
      expect(window.location.href).toBe('/');
    } finally {
      window.location = original;
    }
  });

  /**
   * The admin canvas's inline boundary is keyed on the pathname
   * (`AdminLayout`), and so is the route boundary on the public site
   * (`routes/RouteBoundary.jsx`): that is what makes a crashed page recover on
   * the next navigation without a full reload (§7). A key change remounts the
   * boundary, so `hasError` starts false again — that is the behaviour
   * asserted here, with the key stood in for by a state change so the test
   * needs no router.
   */
  it('recovers when its key changes, without a reload', () => {
    const Harness = () => {
      const [route, setRoute] = useState('/crashes');

      return (
        <>
          <button type="button" onClick={() => setRoute('/works')}>
            Navigate
          </button>
          <ErrorBoundary key={route}>
            <Boom fail={route === '/crashes'} />
          </ErrorBoundary>
        </>
      );
    };

    renderWith(<Harness />);

    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Navigate' }));

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('All is well')).toBeInTheDocument();
  });

  /**
   * The route boundary is not keyed on the pathname inside the admin panel —
   * a new key would remount the whole admin shell below it — so there the
   * pathname is its `resetKey` (`routes/RouteBoundary.jsx`).
   */
  describe('resetKey', () => {
    /** A boundary whose `resetKey` walks through `routes`, one per click. */
    const Walk = ({ routes, children }) => {
      const [index, setIndex] = useState(0);
      const route = routes[index];

      return (
        <>
          <button type="button" onClick={() => setIndex((current) => current + 1)}>
            Navigate
          </button>
          <ErrorBoundary resetKey={route}>{children(route)}</ErrorBoundary>
        </>
      );
    };

    it('clears a screen that is showing when it changes, without a reload', () => {
      renderWith(
        <Walk routes={['/crashes', '/works']}>
          {(route) => <Boom fail={route === '/crashes'} />}
        </Walk>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Navigate' }));

      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.getByText('All is well')).toBeInTheDocument();
    });

    it('shows the screen for a page that throws as it is navigated to, and clears it on the next', () => {
      renderWith(
        <Walk routes={['/works', '/crashes', '/works-again']}>
          {(route) => <Boom fail={route === '/crashes'} />}
        </Walk>
      );

      expect(screen.getByText('All is well')).toBeInTheDocument();

      // The render that moved the key is the one that threw: the screen stays.
      fireEvent.click(screen.getByRole('button', { name: 'Navigate' }));
      expect(screen.getByRole('alert')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Navigate' }));
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.getByText('All is well')).toBeInTheDocument();
    });

    it('leaves children that did not throw mounted when it changes', () => {
      const Counter = () => {
        const [count, setCount] = useState(0);
        return (
          <button type="button" onClick={() => setCount((current) => current + 1)}>
            Clicked {count}
          </button>
        );
      };

      renderWith(<Walk routes={['/one', '/two']}>{() => <Counter />}</Walk>);

      fireEvent.click(screen.getByRole('button', { name: 'Clicked 0' }));
      fireEvent.click(screen.getByRole('button', { name: 'Navigate' }));

      // A remount would have started the count again at 0.
      expect(screen.getByRole('button', { name: 'Clicked 1' })).toBeInTheDocument();
    });
  });
});
