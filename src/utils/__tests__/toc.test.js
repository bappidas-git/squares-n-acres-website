import sanitizeHtml from '../../components/editor/sanitize';
import { assignHeadingIds, buildToc, listHeadings, tocIds, tocLength } from '../toc';

/**
 * The contract this suite protects is that one string names one heading on
 * both sides: what `SafeHtml` writes into the body and what the article page
 * draws the contents list from. Both go through `assignHeadingIds`, so the
 * test that matters is the last one.
 */

const BODY = `
  <p>Intro.</p>
  <h2>What the Act was written to fix</h2>
  <p>Text.</p>
  <h3>Before the Act</h3>
  <h3>After the Act</h3>
  <h2>Five things to read</h2>
  <h4>Not in the list</h4>
  <h2>Five things to read</h2>
`;

describe('listHeadings', () => {
  it('collects h2 and h3 in document order and ignores every other level', () => {
    expect(listHeadings(BODY).map((heading) => [heading.level, heading.text])).toEqual([
      [2, 'What the Act was written to fix'],
      [3, 'Before the Act'],
      [3, 'After the Act'],
      [2, 'Five things to read'],
      [2, 'Five things to read'],
    ]);
  });

  it('slugs the text of a heading, marks up and all', () => {
    const [heading] = listHeadings('<h2>Stamp duty &amp; <em>registration</em> charges</h2>');
    expect(heading.id).toBe('stamp-duty-and-registration-charges');
    expect(heading.text).toBe('Stamp duty & registration charges');
  });

  it('gives two headings with the same words two ids', () => {
    const ids = listHeadings(BODY).map((heading) => heading.id);
    expect(ids).toEqual([
      'what-the-act-was-written-to-fix',
      'before-the-act',
      'after-the-act',
      'five-things-to-read',
      'five-things-to-read-2',
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('falls back to "section" for a heading with no sluggable text', () => {
    expect(listHeadings('<h2>—</h2><h2>???</h2>').map((h) => h.id)).toEqual([
      'section',
      'section-2',
    ]);
  });

  it('answers with nothing for an empty or absent body', () => {
    expect(listHeadings('')).toEqual([]);
    expect(listHeadings(undefined)).toEqual([]);
    expect(listHeadings('<p>No headings here.</p>')).toEqual([]);
  });
});

describe('buildToc', () => {
  it('nests every h3 under the h2 above it', () => {
    const toc = buildToc(BODY);
    expect(toc.map((entry) => entry.text)).toEqual([
      'What the Act was written to fix',
      'Five things to read',
      'Five things to read',
    ]);
    expect(toc[0].children.map((child) => child.text)).toEqual(['Before the Act', 'After the Act']);
    expect(toc[1].children).toEqual([]);
  });

  it('keeps an h3 that has no h2 above it at the top level', () => {
    const toc = buildToc('<h3>Opening at the third level</h3><h2>Then a second</h2>');
    expect(toc.map((entry) => [entry.level, entry.text])).toEqual([
      [3, 'Opening at the third level'],
      [2, 'Then a second'],
    ]);
  });

  it('counts and flattens the whole tree for the scroll spy', () => {
    const toc = buildToc(BODY);
    expect(tocLength(toc)).toBe(5);
    expect(tocIds(toc)).toEqual([
      'what-the-act-was-written-to-fix',
      'before-the-act',
      'after-the-act',
      'five-things-to-read',
      'five-things-to-read-2',
    ]);
    expect(tocLength()).toBe(0);
  });
});

describe('assignHeadingIds', () => {
  it('writes the ids the contents list links to onto the rendered body', () => {
    const body = new DOMParser().parseFromString(`<body>${BODY}</body>`, 'text/html').body;
    assignHeadingIds(body);

    const rendered = [...body.querySelectorAll('h2, h3')].map((node) => node.getAttribute('id'));
    expect(rendered).toEqual(tocIds(buildToc(BODY)));
  });

  it('agrees with the contents list after the body has been sanitised', () => {
    const clean = sanitizeHtml(BODY);
    const body = new DOMParser().parseFromString(`<body>${clean}</body>`, 'text/html').body;
    assignHeadingIds(body);

    expect([...body.querySelectorAll('h2, h3')].map((node) => node.id)).toEqual(
      tocIds(buildToc(clean))
    );
  });
});
