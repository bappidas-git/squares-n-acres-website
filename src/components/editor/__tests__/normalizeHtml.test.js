/**
 * `normalizeHtml` (prompt 32) — the tidy-up between the editor and the
 * sanitiser. ProseMirror's trailing paragraph and a writer's spacing habits are
 * not content, and everything else is.
 */

import normalizeHtml from '../normalizeHtml';

describe('normalizeHtml', () => {
  it('trims the empty paragraph ProseMirror keeps at the end', () => {
    expect(normalizeHtml('<p>Words.</p><p></p>')).toBe('<p>Words.</p>');
    expect(normalizeHtml('<p>Words.</p><p><br></p>')).toBe('<p>Words.</p>');
    expect(normalizeHtml('<p>Words.</p><p><br/></p><p>&nbsp;</p>')).toBe('<p>Words.</p>');
  });

  it('collapses a chain of empty paragraphs into one', () => {
    expect(normalizeHtml('<p>A</p><p></p><p><br></p><p></p><p>B</p>')).toBe(
      '<p>A</p><p></p><p>B</p>'
    );
  });

  it('keeps a single deliberate blank line between two paragraphs', () => {
    expect(normalizeHtml('<p>A</p><p></p><p>B</p>')).toBe('<p>A</p><p></p><p>B</p>');
  });

  it('drops the empty paragraphs a document opens with', () => {
    expect(normalizeHtml('<p><br></p><p>A</p>')).toBe('<p>A</p>');
  });

  it('answers with nothing for a document that holds nothing', () => {
    expect(normalizeHtml('<p></p>')).toBe('');
    expect(normalizeHtml('<p><br></p><p></p>')).toBe('');
    expect(normalizeHtml('')).toBe('');
    expect(normalizeHtml(null)).toBe('');
    expect(normalizeHtml(undefined)).toBe('');
  });

  it('leaves real content alone, empty-looking tags included', () => {
    const html = '<h2>Heading</h2><p>Body</p><figure><img src="/a.png" alt="A"></figure><hr>';
    expect(normalizeHtml(html)).toBe(html);
  });

  it('keeps a paragraph that only holds an image', () => {
    const html = '<p><img src="/a.png" alt="A"></p>';
    expect(normalizeHtml(html)).toBe(html);
  });
});
