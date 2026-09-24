/**
 * `RichTextEditor` (prompt 32).
 *
 * jsdom cannot lay out a document, so what is asserted here is the contract
 * around ProseMirror rather than typing itself: that the editor mounts with the
 * value it was given, that the toolbar is reachable, that a read-only form
 * hides it, and — the one that matters most — that what leaves through
 * `onChange` has already been through the sanitiser.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';

import RichTextEditor from '../RichTextEditor';

const draw = (props = {}) =>
  render(<RichTextEditor label="Body" value="" onChange={() => {}} {...props} />);

describe('RichTextEditor', () => {
  it('mounts with the value it was given', () => {
    draw({ value: '<h2>Heading</h2><p>Body</p>' });

    expect(screen.getByRole('textbox', { name: 'Body' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Heading' })).toBeInTheDocument();
  });

  it('renders a labelled toolbar with pressed states', () => {
    draw();

    const toolbar = screen.getByRole('toolbar', { name: 'Formatting' });
    expect(toolbar).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('combobox', { name: 'Text style' })).toBeInTheDocument();
  });

  it('emits sanitised HTML when the document changes', () => {
    jest.useFakeTimers();
    const onChange = jest.fn();
    const ref = { current: null };

    render(<RichTextEditor ref={ref} label="Body" value="" onChange={onChange} />);

    act(() => {
      ref.current.insertHtml('<p>Hello <script>window.alert(1)</script>world</p>');
      jest.advanceTimersByTime(300);
    });

    expect(onChange).toHaveBeenCalled();
    const emitted = onChange.mock.calls.at(-1)[0];
    expect(emitted).toContain('Hello');
    expect(emitted).not.toContain('alert');
    expect(emitted).not.toContain('<script');
    jest.useRealTimers();
  });

  it('keeps a figure and a data-sna-block placeholder through a round trip', () => {
    jest.useFakeTimers();
    const onChange = jest.fn();
    const stored =
      '<h2>Guide</h2>' +
      '<figure class="sna-figure" data-align="center" data-width="full">' +
      '<img src="https://example.com/a.png" alt="A plan" loading="lazy">' +
      '<figcaption>The plan</figcaption></figure>' +
      '<table><tbody><tr><td>Cell</td></tr></tbody></table>' +
      '<div data-sna-block="properties" data-ids="1,3"></div>';

    const ref = { current: null };
    render(<RichTextEditor ref={ref} label="Body" value={stored} onChange={onChange} />);

    act(() => {
      ref.current.insertHtml('<p>Added.</p>');
      jest.advanceTimersByTime(300);
    });

    const emitted = onChange.mock.calls.at(-1)[0];
    expect(emitted).toContain('<figcaption>The plan</figcaption>');
    expect(emitted).toContain('alt="A plan"');
    expect(emitted).toContain('<table>');
    expect(emitted).toContain('data-sna-block="properties"');
    expect(emitted).toContain('data-ids="1,3"');
    jest.useRealTimers();
  });

  describe('a stored document nobody has edited (QA-55)', () => {
    // A stored body keeps the newlines between its blocks; the editor never
    // writes them, so the document read back is a different string.
    const stored = '<h2>Guide</h2>\n<p>One two three.</p>\n<p>Four five six.</p>';

    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('stays quiet while a save disables the form and enables it again', () => {
      const onChange = jest.fn();
      const { rerender } = render(
        <RichTextEditor label="Body" value={stored} onChange={onChange} />
      );

      rerender(<RichTextEditor label="Body" value={stored} onChange={onChange} disabled />);
      rerender(<RichTextEditor label="Body" value={stored} onChange={onChange} />);
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('stays quiet when the body is clicked into and left', () => {
      const onChange = jest.fn();
      render(<RichTextEditor label="Body" value={stored} onChange={onChange} />);
      const box = screen.getByRole('textbox', { name: 'Body' });

      fireEvent.focus(box);
      fireEvent.blur(box);
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(onChange).not.toHaveBeenCalled();
    });

    it('hands back the stored string once an edit is undone', () => {
      const onChange = jest.fn();
      const ref = { current: null };
      render(<RichTextEditor ref={ref} label="Body" value={stored} onChange={onChange} />);

      act(() => {
        ref.current.insertHtml('<p>Added.</p>');
        jest.advanceTimersByTime(300);
      });
      expect(onChange.mock.calls.at(-1)[0]).toContain('Added.');

      fireEvent.keyDown(screen.getByRole('textbox', { name: 'Body' }), {
        key: 'z',
        code: 'KeyZ',
        ctrlKey: true,
      });
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(onChange.mock.calls.at(-1)[0]).toBe(stored);
    });
  });

  describe('a value from outside (QA-55)', () => {
    it('replaces the document with a record that arrives after the editor mounted', async () => {
      const onChange = jest.fn();
      const { rerender } = render(<RichTextEditor label="Body" value="" onChange={onChange} />);

      rerender(
        <RichTextEditor
          label="Body"
          value={'<h2>Khata</h2>\n<p>A khata is the record of a property.</p>'}
          onChange={onChange}
        />
      );

      expect(await screen.findByRole('heading', { name: 'Khata' })).toBeInTheDocument();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('lands on the newest of two values that arrive together', async () => {
      const { rerender } = render(<RichTextEditor label="Body" value="" onChange={() => {}} />);

      rerender(<RichTextEditor label="Body" value="<h2>First</h2>" onChange={() => {}} />);
      rerender(<RichTextEditor label="Body" value="<h2>Second</h2>" onChange={() => {}} />);

      expect(await screen.findByRole('heading', { name: 'Second' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'First' })).not.toBeInTheDocument();
    });
  });

  it('reports an outline and the counters through its ref', () => {
    const ref = { current: null };
    render(
      <RichTextEditor
        ref={ref}
        label="Body"
        value="<h2>First</h2><p>One two three.</p><h3>Second</h3>"
        onChange={() => {}}
      />
    );

    expect(ref.current.getOutline().map((heading) => heading.text)).toEqual(['First', 'Second']);

    const stats = ref.current.getStats();
    expect(stats.words).toBeGreaterThan(0);
    expect(stats.characters).toBeGreaterThan(0);
    expect(stats.readingTime).toBeGreaterThanOrEqual(1);
  });

  it('drops the block inserts in the compact variant', () => {
    draw({ variant: 'compact' });

    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Call to action' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Listings' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Table' })).toBeNull();
  });

  it('hides the toolbar and stops accepting text in a read-only form', () => {
    draw({ disabled: true, value: '<p>Read only</p>' });

    expect(screen.queryByRole('toolbar', { name: 'Formatting' })).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Body' })).toHaveAttribute(
      'contenteditable',
      'false'
    );
  });

  it('shows the label, the helper and an error the form puts on it', () => {
    draw({ helper: 'Ten words at least.', error: 'This is required.' });

    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('This is required.');
  });
});
