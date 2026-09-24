/* eslint-disable testing-library/no-node-access --
   `focusFirstError` is about which element of a document gets the focus: the
   document and its active element are what these tests read. */
/**
 * The small helpers the master-data forms share (QA-60): stable keys for a
 * list of plain values, the first field in error, a free slug to suggest, and
 * the redirects a moved record leaves behind.
 */

import { renderHook, act } from '@testing-library/react';

import ApiError from '../../../services/apiError';
import focusFirstError from '../focusFirstError';
import redirectMoves, { describeMoves } from '../redirectMoves';
import redirectService from '../../../services/redirectService';
import useRowKeys from '../useRowKeys';
import withSlugSuggestion from '../slugSuggestion';

jest.mock('../../../services/redirectService');

describe('useRowKeys', () => {
  it('keeps a key with its row through a move, a removal and an addition', () => {
    const { result, rerender } = renderHook(({ length }) => useRowKeys(length), {
      initialProps: { length: 3 },
    });
    const [a, b, c] = result.current.keys;
    expect(new Set([a, b, c]).size).toBe(3);

    act(() => result.current.move(0, 2));
    rerender({ length: 3 });
    expect(result.current.keys).toEqual([b, c, a]);

    act(() => result.current.remove(1));
    rerender({ length: 2 });
    expect(result.current.keys).toEqual([b, a]);

    rerender({ length: 3 });
    const [, , added] = result.current.keys;
    expect([b, a]).not.toContain(added);
    expect(result.current.keys.slice(0, 2)).toEqual([b, a]);
  });

  it('shortens with a list that shrank from outside', () => {
    const { result, rerender } = renderHook(({ length }) => useRowKeys(length), {
      initialProps: { length: 2 },
    });
    rerender({ length: 0 });
    expect(result.current.keys).toEqual([]);
  });
});

describe('focusFirstError', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('puts the cursor in the first control that says it is wrong', () => {
    document.body.innerHTML = `
      <form id="f">
        <input id="a" />
        <input id="b" aria-invalid="true" />
        <input id="c" aria-invalid="true" />
      </form>`;
    expect(focusFirstError(document.getElementById('f'))).toBe(true);
    expect(document.activeElement.id).toBe('b');
  });

  it('follows a message to the control it describes, and unfolds a disclosure', () => {
    document.body.innerHTML = `
      <form id="f">
        <details id="d"><summary>More</summary>
          <div aria-describedby="m other"><div contenteditable="true" id="editor"></div></div>
          <span id="m" role="alert">Write something.</span>
        </details>
      </form>`;
    focusFirstError(document.getElementById('f'));
    expect(document.getElementById('d').open).toBe(true);
    expect(document.activeElement.id).toBe('editor');
  });

  it('passes by a warning that does not stop the save', () => {
    document.body.innerHTML = `
      <form id="f">
        <div data-advisory=""><div role="alert">Check the figures.</div></div>
        <input id="late" aria-invalid="true" />
      </form>`;
    focusFirstError(document.getElementById('f'));
    expect(document.activeElement.id).toBe('late');
  });

  it('reports that there was nothing to find', () => {
    document.body.innerHTML = '<form id="f"><input /></form>';
    expect(focusFirstError(document.getElementById('f'))).toBe(false);
    expect(focusFirstError(null)).toBe(false);
  });
});

describe('withSlugSuggestion', () => {
  const taken = new ApiError({
    status: 409,
    message: 'The slug has already been taken.',
    errors: { slug: ['The slug has already been taken.'] },
  });

  it('puts the free variant in front of the field', async () => {
    const checkSlug = jest.fn().mockResolvedValue({ data: { suggestion: 'mysuru-2' } });
    const error = await withSlugSuggestion(taken, 'mysuru', { checkSlug, excludeId: 4 });
    expect(checkSlug).toHaveBeenCalledWith('mysuru', { excludeId: 4 });
    expect(error.status).toBe(409);
    expect(error.errors.slug).toEqual(['The slug has already been taken. Try “mysuru-2”.']);
  });

  it('hands back the refusal when there is nothing better to say', async () => {
    const failing = jest.fn().mockRejectedValue(new Error('offline'));
    expect(await withSlugSuggestion(taken, 'mysuru', { checkSlug: failing })).toBe(taken);
    const same = jest.fn().mockResolvedValue({ data: { suggestion: 'mysuru' } });
    expect(await withSlugSuggestion(taken, 'mysuru', { checkSlug: same })).toBe(taken);
    const other = new ApiError({ status: 422 });
    expect(await withSlugSuggestion(other, 'mysuru', { checkSlug: same })).toBe(other);
    expect(await withSlugSuggestion(taken, '', { checkSlug: same })).toBe(taken);
  });
});

describe('redirectMoves', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redirectService.deactivateByFromPath.mockResolvedValue(null);
    redirectService.upsertByFromPath.mockResolvedValue({ data: {} });
  });

  it('switches off a rule for the new address, then sends the old one to it', async () => {
    const result = await redirectMoves([['/buy/villas', '/buy/luxury-villas']], 'moved');
    expect(redirectService.deactivateByFromPath).toHaveBeenCalledWith('/buy/luxury-villas');
    expect(redirectService.upsertByFromPath).toHaveBeenCalledWith({
      fromPath: '/buy/villas',
      toPath: '/buy/luxury-villas',
      statusCode: 301,
      note: 'moved',
    });
    expect(result).toEqual({ done: [['/buy/villas', '/buy/luxury-villas']], failed: [] });
  });

  it('writes each move on its own and skips one that goes nowhere', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    redirectService.upsertByFromPath
      .mockRejectedValueOnce(new Error('refused'))
      .mockResolvedValueOnce({ data: {} });
    const result = await redirectMoves([
      ['/buy/villas', '/buy/luxury-villas'],
      ['/rent/villas', '/rent/luxury-villas'],
      ['/same', '/same'],
    ]);
    expect(result.failed).toEqual([['/buy/villas', '/buy/luxury-villas']]);
    expect(result.done).toEqual([['/rent/villas', '/rent/luxury-villas']]);
    expect(redirectService.upsertByFromPath).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it('says what it did in a sentence', () => {
    expect(describeMoves({ done: [['/a', '/b']], failed: [] })).toEqual({
      info: '/a now redirects to the new address.',
      error: null,
    });
    expect(
      describeMoves({
        done: [
          ['/a', '/b'],
          ['/c', '/d'],
        ],
        failed: [['/e', '/f']],
      })
    ).toEqual({
      info: '/a and /c now redirect to the new address.',
      error: 'Saved, but /e could not be redirected. Add it under SEO → Redirects.',
    });
  });
});
