/**
 * `src/utils/articleUtils.js` (prompt 33).
 *
 * The three derived numbers of §6.8 have to agree with what the API stores —
 * `mock-server/lib/html.js` does the same arithmetic on the way in — and the
 * two scheduling conversions have to be true in Asia/Kolkata whatever zone the
 * machine running them is set to (D22).
 */

import {
  EXCERPT_MAX_LENGTH,
  dateTimeLocalToIso,
  generateExcerpt,
  isFutureDateTime,
  plainText,
  readingTime,
  toDateTimeLocal,
  wordCount,
} from '../articleUtils';

describe('plainText', () => {
  it('reads the text of a document and collapses its whitespace', () => {
    expect(plainText('<h2>Khata</h2>\n<p>A  <strong>B</strong> khata\nis a record.</p>')).toBe(
      'Khata A B khata is a record.'
    );
  });

  it('answers an empty string for anything that is not markup with text in it', () => {
    expect(plainText('')).toBe('');
    expect(plainText(null)).toBe('');
    expect(plainText(undefined)).toBe('');
    expect(plainText(42)).toBe('');
    expect(plainText('   ')).toBe('');
  });
});

describe('generateExcerpt', () => {
  it('takes the first paragraph, not the heading above it', () => {
    const html = '<h2>What RERA fixes</h2><p>The registration page is a public record.</p>';
    expect(generateExcerpt(html)).toBe('The registration page is a public record.');
  });

  it('skips a paragraph that holds nothing but markup', () => {
    const html = '<p><br></p><p>  </p><p>The second paragraph is the first one with words.</p>';
    expect(generateExcerpt(html)).toBe('The second paragraph is the first one with words.');
  });

  it('falls back to the whole text when the body has no paragraph', () => {
    expect(generateExcerpt('<ul><li>Khata</li><li>Encumbrance</li></ul>')).toBe(
      'Khata Encumbrance'
    );
  });

  it('cuts a long paragraph at a word boundary and never exceeds the field', () => {
    const sentence = 'Bengaluru buyers read the approval before the brochure. ';
    const excerpt = generateExcerpt(`<p>${sentence.repeat(20)}</p>`);

    expect(excerpt.length).toBeLessThanOrEqual(EXCERPT_MAX_LENGTH);
    expect(excerpt.endsWith('…')).toBe(true);
    // A boundary cut, so the last word is whole rather than sliced in half.
    expect(excerpt).toMatch(/[a-z]…$/);
  });

  it('leaves a paragraph that already fits exactly as it is', () => {
    expect(generateExcerpt('<p>Short enough.</p>')).toBe('Short enough.');
  });

  it('answers an empty string for an empty body', () => {
    expect(generateExcerpt('')).toBe('');
    expect(generateExcerpt(null)).toBe('');
  });
});

describe('wordCount', () => {
  it('counts the words of the text, not the tags around them', () => {
    expect(wordCount('<p>One <em>two</em> three</p><p>four</p>')).toBe(4);
  });

  it('counts a hyphenated word once and a spaced figure twice', () => {
    expect(wordCount('<p>end-to-end</p>')).toBe(1);
    expect(wordCount('<p>3 BHK</p>')).toBe(2);
  });

  it('is zero for an empty document', () => {
    expect(wordCount('')).toBe(0);
    expect(wordCount('<p></p>')).toBe(0);
  });
});

describe('readingTime', () => {
  it('rounds up to whole minutes at 200 words a minute (§6.8)', () => {
    expect(readingTime(200)).toBe(1);
    expect(readingTime(201)).toBe(2);
    expect(readingTime(1240)).toBe(7);
  });

  it('is at least a minute for an article with words in it', () => {
    expect(readingTime(1)).toBe(1);
  });

  it('is zero for an empty one, rather than claiming a minute', () => {
    expect(readingTime(0)).toBe(0);
    expect(readingTime(null)).toBe(0);
    expect(readingTime(NaN)).toBe(0);
  });
});

describe('the scheduling conversions', () => {
  it('renders an instant as IST wall-clock time', () => {
    // 03:30 UTC is 09:00 in Bengaluru.
    expect(toDateTimeLocal('2026-10-12T03:30:00.000Z')).toBe('2026-10-12T09:00');
  });

  it('crosses the date boundary the way IST does', () => {
    expect(toDateTimeLocal('2026-10-11T19:00:00.000Z')).toBe('2026-10-12T00:30');
  });

  it('reads a typed value as IST and stores it as UTC', () => {
    expect(dateTimeLocalToIso('2026-10-12T09:00')).toBe('2026-10-12T03:30:00.000Z');
  });

  it('round-trips an instant through the input and back', () => {
    const iso = '2027-01-31T18:45:00.000Z';
    expect(dateTimeLocalToIso(toDateTimeLocal(iso))).toBe(iso);
  });

  it('answers nothing for a value that is not a moment', () => {
    expect(toDateTimeLocal('')).toBe('');
    expect(toDateTimeLocal(null)).toBe('');
    expect(toDateTimeLocal('not a date')).toBe('');
    expect(dateTimeLocalToIso('')).toBeNull();
    expect(dateTimeLocalToIso('2026-10-12')).toBeNull();
    expect(dateTimeLocalToIso('12/10/2026 09:00')).toBeNull();
  });

  it('knows a future moment from a past one', () => {
    const now = Date.parse('2026-10-12T03:30:00.000Z');

    expect(isFutureDateTime('2026-10-12T09:01', now)).toBe(true);
    expect(isFutureDateTime('2026-10-12T09:00', now)).toBe(false);
    expect(isFutureDateTime('2026-10-11T09:00', now)).toBe(false);
    expect(isFutureDateTime('', now)).toBe(false);
  });
});
