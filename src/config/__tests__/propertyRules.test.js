import {
  DESCRIPTION_MIN,
  PUBLISH_FIELDS,
  notReadyMessage,
  publishGaps,
  publishProblems,
} from '../propertyRules';

/**
 * The publish rules, as the form and the API both read them (QA-62): the
 * sentence an editor sees under a field is the sentence a 422 answers with, and
 * the list's toggles and bulk bar are refused by the same four rules.
 */
describe('propertyRules', () => {
  const ready = {
    title: 'Aurelia Court',
    listingType: 'sale',
    images: [{ url: 'https://images.test/court.jpg', alt: 'The court' }],
    shortDescription: 'Two bedrooms over the park.',
    description: `<p>${'x'.repeat(DESCRIPTION_MIN)}</p>`,
    pricing: { price: 9_500_000 },
  };

  it('lets a complete listing go live', () => {
    expect(publishProblems(ready)).toEqual({});
  });

  it('names everything a listing lacks, keyed the way a 422 keys it', () => {
    expect(
      publishProblems({
        ...ready,
        images: [{ url: 'https://images.test/court.jpg', alt: '  ' }],
        shortDescription: '',
        description: '<p>Too short &nbsp; by far.</p>',
        pricing: {},
      })
    ).toEqual({
      // The image is there; its description is what is missing — under its own
      // box since prompt 51, and asked for only now, as the listing goes live.
      'images.0.alt': 'Describe this image — screen readers and search engines read it.',
      description:
        'A published listing needs a description of at least 300 characters (this one has 17).',
      shortDescription: 'A published listing needs a one-line summary.',
      'pricing.price': 'A published listing needs a price, a price range, or “Price on request”.',
    });
    expect(publishProblems({ ...ready, images: [] })).toEqual({
      images: 'A published listing needs at least one image with a description.',
    });
  });

  it('counts the photographs that still need a description (prompt 51)', () => {
    const listing = {
      ...ready,
      images: [
        { url: 'https://images.test/a.jpg', alt: 'The court' },
        { url: 'https://images.test/b.jpg', alt: '' },
        { url: 'https://images.test/c.jpg', alt: null },
      ],
    };
    expect(publishGaps(publishProblems(listing), listing)).toEqual([
      '2 photographs without a description',
    ]);
  });

  it('asks a rental for its rent, and takes "on request" or a whole range as a price', () => {
    expect(publishProblems({ ...ready, listingType: 'rent' })).toEqual({
      'pricing.rentPerMonth': 'A published rental needs a monthly rent, or “Price on request”.',
    });
    expect(publishProblems({ ...ready, pricing: { priceOnRequest: true } })).toEqual({});
    expect(publishProblems({ ...ready, pricing: { priceRangeMin: 1, priceRangeMax: 2 } })).toEqual(
      {}
    );
    expect(publishProblems({ ...ready, pricing: { priceRangeMin: 1 } })).toHaveProperty([
      'pricing.price',
    ]);
  });

  it('says the same thing in short phrases for a list of several listings', () => {
    const bare = { title: 'Bare', listingType: 'lease', description: '<p>Hi</p>' };
    const gaps = publishGaps(publishProblems(bare), bare);

    expect(gaps).toEqual([
      'no photograph with a description',
      '2 of 300 characters of description',
      'no one-line summary',
      'no rent',
    ]);
    expect(notReadyMessage(bare, gaps)).toBe(
      '“Bare” is not ready to go live: no photograph with a description, 2 of 300 characters of description, no one-line summary, no rent.'
    );
  });

  it('lists the fields whose change a live listing is asked about', () => {
    expect(PUBLISH_FIELDS).toEqual(
      expect.arrayContaining(['isActive', 'images', 'description', 'shortDescription', 'pricing'])
    );
    expect(PUBLISH_FIELDS).not.toContain('isFeatured');
  });
});
