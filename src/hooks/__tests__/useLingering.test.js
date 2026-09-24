import { act, renderHook } from '@testing-library/react';

import useLingering from '../useLingering';

/**
 * A dialog that is closed by clearing its state fades out drawn from that
 * state; `useLingering` keeps what it showed until it has gone (QA-54, QA-55).
 */
describe('useLingering', () => {
  const setup = (initial) =>
    renderHook(({ value }) => useLingering(value), { initialProps: { value: initial } });

  it('shows the value while it is set', () => {
    const { result } = setup({ title: 'Khata' });
    expect(result.current[0]).toEqual({ title: 'Khata' });
  });

  it('keeps the last value once it is cleared, until it is released', () => {
    const asked = { title: 'Khata' };
    const { result, rerender } = setup(asked);

    rerender({ value: null });
    expect(result.current[0]).toBe(asked);

    act(() => result.current[1]());
    expect(result.current[0]).toBeNull();
  });

  it('shows a new value at once, in the render it arrives in', () => {
    const { result, rerender } = setup(null);
    expect(result.current[0]).toBeNull();

    const next = { title: 'RERA' };
    rerender({ value: next });
    expect(result.current[0]).toBe(next);

    const later = { title: 'Stamp duty' };
    rerender({ value: later });
    expect(result.current[0]).toBe(later);
  });
});
