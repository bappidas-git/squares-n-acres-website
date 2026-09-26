import { act, renderHook } from '@testing-library/react';

import storage from '../../utils/storage';
import useLocalDraft, { AUTOSAVE_INTERVAL_MS } from '../useLocalDraft';

const KEY = 'sna_page_draft:7';
const STORED_AT = '2026-09-20T10:00:00.000Z';

const later = (iso, ms) => new Date(Date.parse(iso) + ms).toISOString();

/** The hook over props the test changes as a form would. */
const setup = (initial = {}) =>
  renderHook((props) => useLocalDraft(props), {
    initialProps: {
      key: KEY,
      values: { title: 'About us' },
      dirty: false,
      storedAt: STORED_AT,
      version: STORED_AT,
      ...initial,
    },
  });

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useLocalDraft — the offer', () => {
  it('offers a copy newer than the stored record, and gives it up once', () => {
    const copy = { values: { title: 'About us, rewritten' }, savedAt: later(STORED_AT, 60000) };
    storage.setItem(KEY, copy);

    const { result } = setup();

    expect(result.current.offer).toEqual(copy);
    let taken;
    act(() => {
      taken = result.current.take();
    });
    expect(taken).toEqual(copy);
    expect(result.current.offer).toBeNull();
  });

  it('drops a copy the record was saved after, without asking', () => {
    storage.setItem(KEY, { values: { title: 'Old' }, savedAt: later(STORED_AT, -60000) });

    const { result } = setup();

    expect(result.current.offer).toBeNull();
    expect(storage.getItem(KEY)).toBeNull();
  });

  it('waits for the stored record before comparing', () => {
    const copy = { values: { title: 'Kept' }, savedAt: later(STORED_AT, 60000) };
    storage.setItem(KEY, copy);

    const { result, rerender } = setup({ ready: false, storedAt: null });
    expect(result.current.offer).toBeNull();

    rerender({ key: KEY, values: { title: 'About us' }, dirty: false, storedAt: STORED_AT });
    expect(result.current.offer).toEqual(copy);
  });

  it('offers nothing to a form that cannot save', () => {
    storage.setItem(KEY, { values: { title: 'Kept' }, savedAt: later(STORED_AT, 60000) });
    const { result } = setup({ enabled: false });
    expect(result.current.offer).toBeNull();
  });

  it('"Discard it" removes the copy and the offer', () => {
    storage.setItem(KEY, { values: { title: 'Kept' }, savedAt: later(STORED_AT, 60000) });
    const { result } = setup();

    act(() => result.current.dismiss());

    expect(result.current.offer).toBeNull();
    expect(storage.getItem(KEY)).toBeNull();
  });
});

describe('useLocalDraft — keeping the work', () => {
  it('writes a dirty form every ten seconds, with the version it was made from', () => {
    jest.useFakeTimers();
    const { result, rerender } = setup();
    const edited = { title: 'About Squares & Acres' };
    rerender({ key: KEY, values: edited, dirty: true, storedAt: STORED_AT, version: STORED_AT });

    act(() => {
      jest.advanceTimersByTime(AUTOSAVE_INTERVAL_MS);
    });

    const copy = storage.getItem(KEY);
    expect(copy.values).toEqual(edited);
    expect(copy.version).toBe(STORED_AT);
    expect(result.current.savedAt).toBe(copy.savedAt);
    expect(result.current.changed).toBe(false);

    rerender({
      key: KEY,
      values: { title: 'Typed since' },
      dirty: true,
      storedAt: STORED_AT,
      version: STORED_AT,
    });
    expect(result.current.changed).toBe(true);
  });

  it('writes nothing while the form is clean or a save is on its way', () => {
    jest.useFakeTimers();
    const { rerender } = setup();
    act(() => {
      jest.advanceTimersByTime(AUTOSAVE_INTERVAL_MS);
    });
    expect(storage.getItem(KEY)).toBeNull();

    rerender({ key: KEY, values: { title: 'Saving' }, dirty: true, paused: true });
    act(() => {
      jest.advanceTimersByTime(AUTOSAVE_INTERVAL_MS);
    });
    expect(storage.getItem(KEY)).toBeNull();
  });

  it('reads the version when it writes, from a function', () => {
    let version = 'v1';
    const { result } = setup({ dirty: true, version: () => version });
    version = 'v2';

    act(() => {
      result.current.keep();
    });

    expect(storage.getItem(KEY).version).toBe('v2');
  });

  it('keeps a dirty form that goes away, and a tab that is closed', () => {
    const { rerender, unmount } = setup();
    rerender({ key: KEY, values: { title: 'Closed mid-sentence' }, dirty: true });

    window.dispatchEvent(new Event('pagehide'));
    expect(storage.getItem(KEY).values.title).toBe('Closed mid-sentence');

    storage.removeItem(KEY);
    unmount();
    expect(storage.getItem(KEY).values.title).toBe('Closed mid-sentence');
  });

  it('keeps nothing after "Discard changes"', () => {
    const { result, rerender, unmount } = setup();
    rerender({ key: KEY, values: { title: 'Thrown away' }, dirty: true });

    act(() => result.current.forget());
    unmount();

    expect(storage.getItem(KEY)).toBeNull();
  });

  it('keeps nothing once saved, and offers what the form hands it', () => {
    const { result, rerender } = setup();
    rerender({ key: KEY, values: { title: 'Mine' }, dirty: true });
    act(() => {
      result.current.keep();
    });

    act(() => result.current.clear());
    expect(storage.getItem(KEY)).toBeNull();
    expect(result.current.savedAt).toBeNull();

    const theirs = { values: { title: 'Theirs, with mine' }, savedAt: STORED_AT, version: 'v9' };
    act(() => {
      result.current.put(theirs);
    });
    expect(result.current.offer).toEqual(theirs);
    expect(storage.getItem(KEY)).toEqual(theirs);
  });
});
