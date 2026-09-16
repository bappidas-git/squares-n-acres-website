/**
 * `useApiList` — the URL round-trip, the page reset and the debounced search.
 */

import { MemoryRouter, useLocation } from 'react-router-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import ApiError from '../../services/apiError';
import useApiList from '../useApiList';

const DEFAULTS = { page: 1, perPage: 12, categorySlug: '', q: '' };
const PARAM_KEYS = { page: 'int', categorySlug: 'string', q: 'string', tagIds: 'csv' };

/** Shows the params, the items and the current query string. */
const Probe = ({ fetcher, options, onState }) => {
  const state = useApiList(fetcher, {
    syncToUrl: true,
    paramKeys: PARAM_KEYS,
    defaults: DEFAULTS,
    ...options,
  });
  const location = useLocation();
  onState?.(state);

  return (
    <div>
      <span data-testid="search">{location.search}</span>
      <span data-testid="params">{JSON.stringify(state.params)}</span>
      <span data-testid="items">{JSON.stringify(state.items)}</span>
      <span data-testid="loading">{String(state.loading)}</span>
      <span data-testid="error">{state.error?.message ?? ''}</span>
    </div>
  );
};

const renderList = (fetcher, { entries = ['/'], options } = {}) => {
  let state;
  const utils = render(
    <MemoryRouter initialEntries={entries}>
      <Probe fetcher={fetcher} options={options} onState={(next) => (state = next)} />
    </MemoryRouter>
  );
  return { ...utils, getState: () => state };
};

const ok = (items = [], meta = { total: items.length }) =>
  jest.fn(() => Promise.resolve({ data: items, meta }));

describe('useApiList', () => {
  it('starts from the defaults and calls the fetcher once', async () => {
    const fetcher = ok([{ id: 1 }]);
    renderList(fetcher);

    await waitFor(() => expect(screen.getByTestId('items')).toHaveTextContent('[{"id":1}]'));
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toMatchObject({ page: 1, perPage: 12 });
  });

  it('reads the params out of the URL', async () => {
    const fetcher = ok();
    renderList(fetcher, { entries: ['/?page=3&categorySlug=legal-rera&tagIds=4,7'] });

    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(fetcher.mock.calls[0][0]).toMatchObject({
      page: 3,
      categorySlug: 'legal-rera',
      tagIds: ['4', '7'],
    });
  });

  it('falls back to page 1 when the URL carries nonsense', async () => {
    const fetcher = ok();
    renderList(fetcher, { entries: ['/?page=abc'] });

    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(fetcher.mock.calls[0][0].page).toBe(1);
  });

  it('writes a page change back to the URL and leaves defaults out of it', async () => {
    const fetcher = ok();
    const { getState } = renderList(fetcher);
    await waitFor(() => expect(fetcher).toHaveBeenCalled());

    act(() => getState().setPage(2));
    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent('page=2'));
    expect(screen.getByTestId('search').textContent).not.toMatch(/perPage/);
  });

  it('resets the page when a filter changes', async () => {
    const fetcher = ok();
    const { getState } = renderList(fetcher, { entries: ['/?page=4'] });
    await waitFor(() => expect(fetcher).toHaveBeenCalled());

    act(() => getState().setFilters({ categorySlug: 'market-trends' }));
    await waitFor(() =>
      expect(screen.getByTestId('search')).toHaveTextContent('categorySlug=market-trends')
    );
    expect(screen.getByTestId('search').textContent).not.toMatch(/page=4/);
    expect(getState().params.page).toBe(1);
  });

  it('serialises an array filter as a comma-separated list', async () => {
    const fetcher = ok();
    const { getState } = renderList(fetcher);
    await waitFor(() => expect(fetcher).toHaveBeenCalled());

    act(() => getState().setFilters({ tagIds: [2, 5] }));
    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent('tagIds=2%2C5'));
  });

  it('puts everything back with resetFilters', async () => {
    const fetcher = ok();
    const { getState } = renderList(fetcher, { entries: ['/?page=2&categorySlug=legal-rera'] });
    await waitFor(() => expect(fetcher).toHaveBeenCalled());

    act(() => getState().resetFilters());
    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent(''));
    expect(getState().params).toMatchObject(DEFAULTS);
  });

  it('surfaces an ApiError', async () => {
    const fetcher = jest.fn(() =>
      Promise.reject(new ApiError({ status: 500, message: 'Server is down' }))
    );
    renderList(fetcher);

    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('Server is down'));
  });

  it('debounces the search term', async () => {
    jest.useFakeTimers();
    try {
      const fetcher = ok();
      const { getState } = renderList(fetcher, { options: { debounceMs: 300 } });
      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      const initial = fetcher.mock.calls.length;

      act(() => getState().setFilters({ q: 'whi' }));
      expect(fetcher.mock.calls.length).toBe(initial);

      await act(async () => {
        jest.advanceTimersByTime(400);
      });
      expect(fetcher.mock.calls.at(-1)[0].q).toBe('whi');
    } finally {
      jest.useRealTimers();
    }
  });
});
