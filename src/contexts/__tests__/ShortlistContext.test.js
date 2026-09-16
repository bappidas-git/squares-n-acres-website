/**
 * `ShortlistContext` — what a visitor saves, where it is kept, and what two
 * open tabs do about each other.
 *
 * The shortlist is the one visitor-side list in `localStorage` rather than in
 * the session: somebody comparing four projects over a fortnight expects to
 * find them still there.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { SHORTLIST_KEY, ShortlistProvider, useShortlist } from '../ShortlistContext';
import storage from '../../utils/storage';

const Probe = ({ onState }) => {
  const shortlist = useShortlist();
  onState?.(shortlist);

  return (
    <div>
      <span data-testid="count">{shortlist.count}</span>
      <span data-testid="ids">{shortlist.ids.join(',')}</span>
      <span data-testid="has-7">{String(shortlist.has(7))}</span>
      <button type="button" onClick={() => shortlist.toggle(7)}>
        toggle
      </button>
    </div>
  );
};

const renderShortlist = (onState) =>
  render(
    <ShortlistProvider>
      <Probe onState={onState} />
    </ShortlistProvider>
  );

beforeEach(() => {
  window.localStorage.clear();
});

describe('ShortlistContext', () => {
  it('starts from what is already in storage', () => {
    storage.setItem(SHORTLIST_KEY, ['4', '9']);

    renderShortlist();

    expect(screen.getByTestId('count')).toHaveTextContent('2');
    expect(screen.getByTestId('ids')).toHaveTextContent('4,9');
  });

  it('saves and unsaves through one toggle, and says which it did', () => {
    let api;
    renderShortlist((value) => {
      api = value;
    });

    let saved;
    act(() => {
      saved = api.toggle(7);
    });
    expect(saved).toBe(true);
    expect(screen.getByTestId('has-7')).toHaveTextContent('true');
    expect(storage.getItem(SHORTLIST_KEY)).toEqual(['7']);

    act(() => {
      saved = api.toggle(7);
    });
    expect(saved).toBe(false);
    expect(screen.getByTestId('has-7')).toHaveTextContent('false');
    expect(storage.getItem(SHORTLIST_KEY)).toEqual([]);
  });

  it('survives a remount — that is the whole point of the list', () => {
    const { unmount } = renderShortlist();

    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
    expect(screen.getByTestId('count')).toHaveTextContent('1');

    unmount();
    renderShortlist();

    expect(screen.getByTestId('count')).toHaveTextContent('1');
    expect(screen.getByTestId('has-7')).toHaveTextContent('true');
  });

  it('compares ids as strings, so a number and its text are one entry', () => {
    let api;
    renderShortlist((value) => {
      api = value;
    });

    act(() => {
      api.add(7);
      api.add('7');
    });

    expect(screen.getByTestId('ids')).toHaveTextContent('7');
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });

  it('reports what it did and refuses an id that is not one', () => {
    let api;
    renderShortlist((value) => {
      api = value;
    });

    let result;
    act(() => {
      result = api.add(null);
    });
    expect(result).toBe(false);

    act(() => {
      result = api.remove(7);
    });
    expect(result).toBe(false);

    act(() => {
      api.add(7);
    });
    act(() => {
      result = api.add(7);
    });
    expect(result).toBe(false);
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });

  it('empties the list on clear', () => {
    storage.setItem(SHORTLIST_KEY, ['1', '2', '3']);
    let api;
    renderShortlist((value) => {
      api = value;
    });

    act(() => api.clear());

    expect(screen.getByTestId('count')).toHaveTextContent('0');
    expect(storage.getItem(SHORTLIST_KEY)).toEqual([]);
  });

  it('follows a second tab rather than overwriting it', () => {
    renderShortlist();
    expect(screen.getByTestId('count')).toHaveTextContent('0');

    act(() => {
      storage.setItem(SHORTLIST_KEY, ['11', '12']);
      window.dispatchEvent(new StorageEvent('storage', { key: SHORTLIST_KEY }));
    });

    expect(screen.getByTestId('ids')).toHaveTextContent('11,12');
  });

  it('ignores a corrupted entry instead of throwing', () => {
    window.localStorage.setItem(SHORTLIST_KEY, 'not json');

    renderShortlist();

    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('is safe outside a provider — a card in a test reads an empty list', () => {
    render(<Probe />);

    expect(screen.getByTestId('count')).toHaveTextContent('0');
    expect(screen.getByTestId('has-7')).toHaveTextContent('false');
    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });
});
