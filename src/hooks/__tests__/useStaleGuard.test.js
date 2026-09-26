import { act, renderHook } from '@testing-library/react';

import ApiError from '../../services/apiError';
import ToastProvider from '../../components/common/ToastProvider';
import useStaleGuard, { isStaleWrite } from '../useStaleGuard';

const wrapper = ({ children }) => <ToastProvider>{children}</ToastProvider>;

const stale = () =>
  new ApiError({
    status: 409,
    message: 'Manager User saved this page after you opened it.',
    data: {
      conflict: 'stale',
      current: {
        updatedAt: 'v9',
        updatedBy: { id: 2, name: 'Manager User' },
        updatedByName: 'Manager User',
      },
    },
  });

const setup = (storedAt = 'v1') =>
  renderHook((props) => useStaleGuard(props), { wrapper, initialProps: { storedAt } });

describe('useStaleGuard', () => {
  it('names the version the form was made from, and follows the stored record', () => {
    const { result, rerender } = setup('v1');
    expect(result.current.stamp({ title: 'A' })).toEqual({ title: 'A', updatedAt: 'v1' });

    rerender({ storedAt: 'v2' });
    expect(result.current.stamp({ title: 'A' })).toEqual({ title: 'A', updatedAt: 'v2' });

    // A restored draft is saved against the version it was made from.
    act(() => result.current.adopt('v0'));
    expect(result.current.current()).toBe('v0');
  });

  it('leaves a create alone', () => {
    const { result } = setup(null);
    expect(result.current.stamp({ title: 'A' })).toEqual({ title: 'A' });
  });

  it('answers the refusal with the dialog, and nothing else', () => {
    const { result } = setup();
    expect(isStaleWrite(stale())).toBe(true);
    expect(isStaleWrite(new ApiError({ status: 409, message: 'The slug has been taken.' }))).toBe(
      false
    );

    let handled;
    act(() => {
      handled = result.current.onError(stale());
    });
    expect(handled).toBe(true);
    expect(result.current.conflict).toEqual(
      expect.objectContaining({ updatedAt: 'v9', updatedByName: 'Manager User' })
    );

    act(() => {
      handled = result.current.onError(new ApiError({ status: 422, message: 'Invalid.' }));
    });
    expect(handled).toBe(false);
  });

  it('"Save mine anyway" saves over the version the refusal named', async () => {
    const { result } = setup('v1');
    act(() => {
      result.current.onError(stale());
    });

    let sent = null;
    await act(async () => {
      await result.current.overwrite(async () => {
        sent = result.current.stamp({ title: 'Mine' });
        return true;
      });
    });

    expect(sent).toEqual({ title: 'Mine', updatedAt: 'v9' });
    expect(result.current.conflict).toBeNull();
  });

  it('"Load their version" loads it and offers these edits back on top of it', async () => {
    const { result } = setup('v1');
    act(() => {
      result.current.onError(stale());
    });
    const put = jest.fn();
    const load = jest.fn();
    const theirs = { id: 3, title: 'Theirs', intro: 'Their intro', updatedAt: 'v9' };

    await act(async () => {
      await result.current.reload({
        fetchLatest: async () => ({ data: theirs }),
        toValues: ({ title, intro }) => ({ title, intro }),
        form: {
          baseline: { title: 'Base', intro: 'Base intro' },
          values: { title: 'Mine', intro: 'Base intro' },
        },
        draft: { put },
        load,
      });
    });

    expect(load).toHaveBeenCalledWith(theirs);
    expect(put).toHaveBeenCalledWith(
      expect.objectContaining({ values: { title: 'Mine', intro: 'Their intro' }, version: 'v9' })
    );
    expect(result.current.conflict).toBeNull();
  });
});
