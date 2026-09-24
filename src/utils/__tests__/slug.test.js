import { slugify, slugifyPath, toPathSlugInput, toSlugInput } from '../slug';

describe('slugify', () => {
  it('writes the slug the API would derive from a title (§5.9)', () => {
    expect(slugify("Bengaluru's East — Whitefield")).toBe('bengalurus-east-whitefield');
    expect(slugify('  Khata Transfer: The Complete Checklist  ')).toBe(
      'khata-transfer-the-complete-checklist'
    );
    expect(slugify(null)).toBe('');
  });

  it('never ends in a separator when the limit cuts a word', () => {
    const slug = slugify(`${'a'.repeat(74)} b`);
    expect(slug).toBe('a'.repeat(74));
  });
});

describe('toSlugInput', () => {
  it('keeps one trailing hyphen, so a multi-word slug can be typed', () => {
    expect(toSlugInput('khata ')).toBe('khata-');
    expect(toSlugInput('khata  -- transfer')).toBe('khata-transfer');
  });

  it('spells an accented letter the way the title’s slug does (QA-55)', () => {
    expect(toSlugInput('Ümlaut')).toBe('umlaut');
    expect(toSlugInput('Crème brûlée')).toBe('creme-brulee');
    expect(toSlugInput('Ümlaut')).toBe(slugify('Ümlaut'));
  });

  it('forbids what the pattern forbids', () => {
    expect(toSlugInput('RERA & You!')).toBe('rera-and-you');
    expect(toSlugInput("owner's guide")).toBe('owners-guide');
  });
});

describe('path slugs', () => {
  it('slugifies each segment of a path on its own', () => {
    expect(slugifyPath('Buyer Assistance/Home Loan/')).toBe('buyer-assistance/home-loan');
  });

  it('keeps the separators while a path is typed', () => {
    expect(toPathSlugInput('/Buyer Assistance/')).toBe('buyer-assistance/');
  });
});
