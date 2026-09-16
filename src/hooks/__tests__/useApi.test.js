/**
 * `useApi` — the four states, abort on unmount, and the ignored cancellation.
 *
 * A stray `act()` warning here is a failure: it means the hook wrote state
 * after the component had gone, which is exactly what the AbortController is
 * there to prevent.
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import ApiError from '../../services/apiError';
import useApi from '../useApi';

/** A component that shows whatever `useApi` currently holds. */
const Probe = ({ fetcher, deps = [], options, onState }) => {
  const state = useApi(fetcher, deps, options);
  onState?.(state);
  return (
    <div>
      <span data-testid="loading">{String(state.loading)}</span>
      <span data-testid="error">{state.error?.message ?? ''}</span>
      <span data-testid="data">{JSON.stringify(state.data)}</span>
      <span data-testid="meta">{JSON.stringify(state.meta)}</span>
      <button type="button" onClick={state.refetch}>
        refetch
      </button>
    </div>
  );
};

describe('useApi', () => {
  let warn;

  beforeEach(() => {
    warn = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('unwraps the envelope into data and meta', async () => {
    const fetcher = jest.fn(() => Promise.resolve({ data: [1, 2], meta: { total: 2 } }));
    render(<Probe fetcher={fetcher} />);

    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('data')).toHaveTextContent('[1,2]');
    expect(screen.getByTestId('meta')).toHaveTextContent('{"total":2}');
  });

  it('records an ApiError and stops loading', async () => {
    const fetcher = jest.fn(() => Promise.reject(new ApiError({ status: 500, message: 'Boom' })));
    render(<Probe fetcher={fetcher} />);

    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('Boom'));
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });

  it('ignores a cancellation instead of showing it as an error', async () => {
    const fetcher = jest.fn(() =>
      Promise.reject(new ApiError({ message: 'Request canceled', isCanceled: true }))
    );
    render(<Probe fetcher={fetcher} />);

    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(screen.getByTestId('error')).toHaveTextContent('');
  });

  it('does not call the fetcher while it is disabled', async () => {
    const fetcher = jest.fn(() => Promise.resolve({ data: 1 }));
    render(<Probe fetcher={fetcher} options={{ enabled: false }} />);

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('re-runs when the dependencies change and aborts the call in flight', async () => {
    const seen = [];
    const fetcher = jest.fn((signal) => {
      seen.push(signal);
      return Promise.resolve({ data: 'ok' });
    });

    const { rerender } = render(<Probe fetcher={fetcher} deps={['a']} />);
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    rerender(<Probe fetcher={fetcher} deps={['b']} />);
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    expect(seen[0].aborted).toBe(true);
    expect(seen[1].aborted).toBe(false);
  });

  it('does not re-run when only the fetcher identity changes', async () => {
    const calls = jest.fn();
    const { rerender } = render(
      <Probe
        fetcher={() => {
          calls();
          return Promise.resolve({ data: 1 });
        }}
        deps={['same']}
      />
    );
    await waitFor(() => expect(calls).toHaveBeenCalledTimes(1));

    rerender(
      <Probe
        fetcher={() => {
          calls();
          return Promise.resolve({ data: 1 });
        }}
        deps={['same']}
      />
    );
    await waitFor(() => expect(calls).toHaveBeenCalledTimes(1));
  });

  it('aborts on unmount without writing state afterwards', async () => {
    let settle;
    const signals = [];
    const fetcher = jest.fn((signal) => {
      signals.push(signal);
      return new Promise((resolve) => {
        settle = resolve;
      });
    });

    const { unmount } = render(<Probe fetcher={fetcher} />);
    await waitFor(() => expect(fetcher).toHaveBeenCalled());

    unmount();
    expect(signals[0].aborted).toBe(true);

    // The answer lands after the component is gone: nothing must be set.
    await act(async () => {
      settle({ data: 'late' });
      await Promise.resolve();
    });
  });

  it('refetches on demand', async () => {
    const fetcher = jest.fn(() => Promise.resolve({ data: 1 }));
    let state;
    render(<Probe fetcher={fetcher} onState={(next) => (state = next)} />);
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    await act(async () => {
      await state.refetch();
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
