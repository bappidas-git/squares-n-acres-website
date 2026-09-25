import rebase from '../rebase';

/**
 * An editor's changes replayed onto a version saved since (QA-62): what
 * "Load their version" keeps as the draft to restore.
 */
describe('rebase', () => {
  const base = {
    title: 'Aurelia Court',
    projectName: 'Aurelia',
    pricing: { price: 1, bookingAmount: 2 },
    images: [{ id: 1, url: 'a' }],
    isFeatured: false,
  };

  it('is their version when this editor changed nothing', () => {
    const theirs = { ...base, title: 'Theirs' };
    expect(rebase(base, base, theirs)).toBe(theirs);
  });

  it('keeps their changes and puts this editor’s on top, field by field', () => {
    const mine = { ...base, projectName: 'Mine', pricing: { ...base.pricing, bookingAmount: 5 } };
    const theirs = {
      ...base,
      title: 'Theirs',
      isFeatured: true,
      pricing: { price: 9, bookingAmount: 2 },
    };

    expect(rebase(base, mine, theirs)).toEqual({
      title: 'Theirs',
      projectName: 'Mine',
      pricing: { price: 9, bookingAmount: 5 },
      images: [{ id: 1, url: 'a' }],
      isFeatured: true,
    });
  });

  it('takes a list whole from the side that changed it', () => {
    const mine = {
      ...base,
      images: [
        { id: 1, url: 'a' },
        { id: 2, url: 'b' },
      ],
    };
    const theirs = { ...base, images: [] };
    expect(rebase(base, mine, theirs).images).toEqual(mine.images);
  });

  it('lets this editor win where both changed the same value', () => {
    expect(rebase(base, { ...base, title: 'Mine' }, { ...base, title: 'Theirs' }).title).toBe(
      'Mine'
    );
  });
});
