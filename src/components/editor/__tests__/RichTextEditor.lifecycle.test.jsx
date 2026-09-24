/**
 * `RichTextEditor` across an editor instance Tiptap has already destroyed.
 *
 * `useEditor` destroys an instance whose component has not committed within a
 * millisecond of creating it and hands over a new one a render later — a slow
 * first load of the article form in the browser. The render drawn with the old
 * instance still runs its effects, and reading a destroyed editor throws: the
 * whole form went to "Something went wrong" (QA-55). jsdom commits too quickly
 * for the timer to win, so the first instance is destroyed here by hand, at
 * the moment the timer would have.
 */

import { act, render, screen } from '@testing-library/react';

import RichTextEditor from '../RichTextEditor';

let mockDestroyNext = false;

jest.mock('@tiptap/react', () => {
  const actual = jest.requireActual('@tiptap/react');
  return {
    ...actual,
    useEditor: (...args) => {
      const editor = actual.useEditor(...args);
      if (mockDestroyNext && editor) {
        mockDestroyNext = false;
        editor.destroy();
      }
      return editor;
    },
  };
});

describe('RichTextEditor — an instance destroyed before its first commit (QA-55)', () => {
  afterEach(() => {
    mockDestroyNext = false;
  });

  it('waits for the instance that replaces it instead of throwing', async () => {
    mockDestroyNext = true;
    const onChange = jest.fn();

    render(
      <RichTextEditor
        label="Body"
        value={'<h2>Khata</h2>\n<p>A khata is the record of a property.</p>'}
        onChange={onChange}
      />
    );

    expect(await screen.findByRole('heading', { name: 'Khata' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Body' })).toBeInTheDocument();

    // The replacement loads the stored body as it is; nothing was edited.
    await act(async () => {
      await new Promise((done) => setTimeout(done, 300));
    });
    expect(onChange).not.toHaveBeenCalled();
  });
});
