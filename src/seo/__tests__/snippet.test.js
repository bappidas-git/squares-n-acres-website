import {
  DESCRIPTION_CHARS,
  DESCRIPTION_FONT_SIZE_PX,
  DESCRIPTION_MAX_PX,
  TITLE_CHARS,
  TITLE_FONT_SIZE_PX,
  TITLE_MAX_PX,
  descriptionWidth,
  measureSnippet,
  measureWidth,
  titleWidth,
  truncateDescription,
  truncateTitle,
  truncateToWidth,
  widthFromTable,
} from '../snippet';

/**
 * jsdom has a `document` and no 2D context, so these numbers are the width
 * table's — which is the point of D85: the same input measures the same in
 * Node, in Jest and in the seed scripts.
 */
describe('the width table', () => {
  it('measures a character at its Helvetica advance width', () => {
    expect(widthFromTable('M', 1000)).toBe(833);
    expect(widthFromTable('i', 1000)).toBe(222);
    expect(widthFromTable(' ', 1000)).toBe(278);
  });

  it('scales with the font size', () => {
    expect(widthFromTable('M', 20)).toBeCloseTo(16.66, 2);
    expect(widthFromTable('M', 10)).toBeCloseTo(8.33, 2);
  });

  it('adds its characters up', () => {
    expect(widthFromTable('Mi', 1000)).toBe(833 + 222);
  });

  it('knows the rupee sign and the dashes a property title uses', () => {
    expect(widthFromTable('₹', 1000)).toBe(556);
    expect(widthFromTable('–', 1000)).toBe(556);
    expect(widthFromTable('—', 1000)).toBe(1000);
  });

  it('charges an unknown character the width of a digit', () => {
    expect(widthFromTable('ಬ', 1000)).toBe(556);
  });

  it('measures nothing as nothing', () => {
    expect(widthFromTable('', 20)).toBe(0);
  });
});

describe('measureWidth', () => {
  it('falls back to the table when there is no canvas, and rounds', () => {
    expect(measureWidth('Whitefield', TITLE_FONT_SIZE_PX)).toBe(
      Math.round(widthFromTable('Whitefield', TITLE_FONT_SIZE_PX))
    );
  });

  it('is deterministic', () => {
    expect(measureWidth('Squares N Acres')).toBe(measureWidth('Squares N Acres'));
  });

  it('measures nothing as zero', () => {
    expect(measureWidth('')).toBe(0);
    expect(measureWidth(null)).toBe(0);
  });
});

describe('titleWidth and descriptionWidth', () => {
  it('measure the same string differently, because the fonts differ', () => {
    const text = '3 BHK Apartment in Whitefield';
    expect(titleWidth(text)).toBeGreaterThan(descriptionWidth(text));
    expect(descriptionWidth(text)).toBe(Math.round(widthFromTable(text, DESCRIPTION_FONT_SIZE_PX)));
  });

  it('put a title of the recommended length inside the pixel limit', () => {
    const title = '3 BHK Apartment for Sale in Whitefield, Bengaluru';
    expect(title.length).toBeLessThanOrEqual(TITLE_CHARS.max);
    expect(titleWidth(title)).toBeLessThanOrEqual(TITLE_MAX_PX);
  });

  it('put a description at the lower guide inside the pixel limit', () => {
    const description =
      'Ready-to-move 2 and 3 BHK apartments off Whitefield Main Road, with a clubhouse, a swimming pool and two covered parking bays.';
    expect(description.length).toBeGreaterThanOrEqual(DESCRIPTION_CHARS.min);
    expect(descriptionWidth(description)).toBeLessThanOrEqual(DESCRIPTION_MAX_PX);
  });
});

describe('truncateToWidth', () => {
  it('leaves a string that fits alone', () => {
    expect(truncateToWidth('Short title', 580)).toBe('Short title');
  });

  it('cuts at a word boundary and adds an ellipsis', () => {
    const cut = truncateToWidth('One two three four five six seven eight nine ten', 120);
    expect(cut.endsWith('…')).toBe(true);
    expect(cut.slice(0, -1).trim().split(' ').every(Boolean)).toBe(true);
    expect(
      truncateToWidth('One two three four five six seven eight nine ten', 120).length
    ).toBeLessThan('One two three four five six seven eight nine ten'.length);
  });

  it('does not leave a dangling separator before the ellipsis', () => {
    expect(truncateToWidth('A long headline — and more words after it', 150)).not.toMatch(
      /[–—-]…$/
    );
  });

  it('keeps the result inside the width it was given', () => {
    const cut = truncateTitle(
      'A very long property headline that runs well past the limit '.repeat(4)
    );
    expect(titleWidth(cut)).toBeLessThanOrEqual(TITLE_MAX_PX);
  });

  it('truncates a description at its own font size', () => {
    const cut = truncateDescription('word '.repeat(80));
    expect(descriptionWidth(cut)).toBeLessThanOrEqual(DESCRIPTION_MAX_PX);
  });
});

describe('measureSnippet', () => {
  it('reports characters, pixels and the guide for a title', () => {
    const measured = measureSnippet('3 BHK Apartment in Whitefield', 'title');
    expect(measured.chars).toBe(29);
    expect(measured.maxPixels).toBe(TITLE_MAX_PX);
    expect(measured.guide).toBe(TITLE_CHARS);
    expect(measured.overflows).toBe(false);
  });

  it('reports the description guide and flags an overflow', () => {
    const measured = measureSnippet('word '.repeat(80), 'description');
    expect(measured.guide).toBe(DESCRIPTION_CHARS);
    expect(measured.overflows).toBe(true);
  });

  it('counts an astral character once', () => {
    expect(measureSnippet('a😀b').chars).toBe(3);
  });
});
