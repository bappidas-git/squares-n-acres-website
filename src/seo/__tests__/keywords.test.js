import {
  containsKeyword,
  countOccurrences,
  density,
  duplicatesIn,
  firstOccurrencePercent,
  inFirstPercent,
  isSameText,
  normalize,
  stem,
  tokens,
} from '../keywords';
import siteIndex from './fixtures/siteIndex.json';

describe('normalize', () => {
  it('lowercases, drops punctuation and collapses spaces', () => {
    expect(normalize('  Whitefield,   Bengaluru — ₹1.42 Cr ')).toBe('whitefield bengaluru 142 cr');
  });

  it('reads markup as the text it renders, with hyphens as spaces', () => {
    expect(normalize('<p>Ready-to-move <strong>flats</strong></p>')).toBe('ready to move flats');
  });

  it('answers an empty string for nothing', () => {
    expect(normalize(null)).toBe('');
  });
});

describe('stem', () => {
  it('folds the regular plural', () => {
    expect(stem('flats')).toBe('flat');
    expect(stem('villas')).toBe('villa');
  });

  it('folds the plural that adds an -es', () => {
    expect(stem('houses')).toBe('hous');
    expect(stem('boxes')).toBe('box');
  });

  it('folds the -ies plural', () => {
    expect(stem('cities')).toBe('city');
  });

  it('knows the Indian-English irregulars', () => {
    expect(stem('BHKs')).toBe('bhk');
    expect(stem('properties')).toBe('property');
  });

  it('leaves a short word and a word that only looks plural alone', () => {
    expect(stem('gas')).toBe('gas');
    expect(stem('class')).toBe('class');
  });
});

describe('containsKeyword', () => {
  it('matches the phrase itself', () => {
    expect(containsKeyword('Flats in Whitefield with a pool', 'flats in whitefield')).toBe(true);
  });

  it('matches across the plural', () => {
    expect(containsKeyword('A flat in Whitefield', 'flats in whitefield')).toBe(true);
    expect(containsKeyword('Flats in Whitefield', 'flat in whitefield')).toBe(true);
  });

  it('matches a hyphenated phrase typed with spaces, and the other way round', () => {
    expect(containsKeyword('A ready to move apartment', 'ready-to-move')).toBe(true);
    expect(containsKeyword('A ready-to-move apartment', 'ready to move')).toBe(true);
  });

  it('ignores case and punctuation', () => {
    expect(containsKeyword('WHITEFIELD, BENGALURU.', 'whitefield bengaluru')).toBe(true);
  });

  it('does not match a different word order', () => {
    expect(containsKeyword('Whitefield flats', 'flats in whitefield')).toBe(false);
  });

  it('does not match when a word comes between', () => {
    expect(containsKeyword('flats in east whitefield', 'flats in whitefield')).toBe(false);
  });

  it('answers false for an empty keyword', () => {
    expect(containsKeyword('anything at all', '')).toBe(false);
  });
});

describe('countOccurrences and density', () => {
  const text = 'Flats in Whitefield are popular. A flat in Whitefield sells fast.';

  it('counts every occurrence', () => {
    expect(countOccurrences(text, 'flats in whitefield')).toBe(2);
  });

  it('measures density as a share of the words', () => {
    expect(density(text, 'flats in whitefield')).toBeCloseTo((2 / 11) * 100, 5);
  });

  it('is zero when the keyword is absent or the body is empty', () => {
    expect(density(text, 'villas in hebbal')).toBe(0);
    expect(density('', 'anything')).toBe(0);
  });
});

describe('firstOccurrencePercent and inFirstPercent', () => {
  const opening = `${'Whitefield is east Bengaluru. '.repeat(1)}${'filler word here. '.repeat(30)}`;

  it('answers where the keyword first appears', () => {
    expect(firstOccurrencePercent('whitefield is the place', 'whitefield')).toBe(0);
  });

  it('answers null when the keyword is not there', () => {
    expect(firstOccurrencePercent('nothing here', 'whitefield')).toBeNull();
  });

  it('passes a keyword in the opening tenth', () => {
    expect(inFirstPercent(opening, 'whitefield', 10)).toBe(true);
  });

  it('fails a keyword that only turns up at the end', () => {
    const late = `${'filler word here. '.repeat(40)} Whitefield.`;
    expect(inFirstPercent(late, 'whitefield', 10)).toBe(false);
  });

  it('never asks a body for a window shorter than the keyword itself', () => {
    expect(inFirstPercent('flats in whitefield', 'flats in whitefield', 10)).toBe(true);
  });
});

describe('isSameText', () => {
  it('reads two strings that differ only in case as identical (§7)', () => {
    expect(isSameText('A meta description.', 'a META description')).toBe(true);
  });

  it('reads two different strings as different', () => {
    expect(isSameText('One description', 'Another description')).toBe(false);
  });

  it('reads an empty string as identical to nothing', () => {
    expect(isSameText('', '')).toBe(false);
  });
});

describe('duplicatesIn', () => {
  const read = (row) => row.seo.description;
  const first = siteIndex[0];

  it('finds a row that already uses the value', () => {
    const found = duplicatesIn(siteIndex, read, first.seo.description, {
      id: 999,
      type: 'article',
    });
    expect(found).toHaveLength(1);
    expect(found[0].id).toBe(first.id);
  });

  it('does not count the record being analysed', () => {
    expect(
      duplicatesIn(siteIndex, read, first.seo.description, { id: first.id, type: 'property' })
    ).toHaveLength(0);
  });

  it('answers nothing without an index or without a value', () => {
    expect(duplicatesIn(null, read, 'anything')).toEqual([]);
    expect(duplicatesIn(siteIndex, read, '')).toEqual([]);
  });
});

describe('tokens', () => {
  it('normalises and stems in one step', () => {
    expect(tokens('Ready-to-move Flats')).toEqual(['ready', 'to', 'move', 'flat']);
  });
});
