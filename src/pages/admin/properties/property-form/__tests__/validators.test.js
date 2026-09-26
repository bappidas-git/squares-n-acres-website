import createInitialState, {
  makeDocument,
  makeFaq,
  makeFloorPlan,
  makeImage,
  makeUnitConfiguration,
  resetTmpIds,
} from '../initialState';
import {
  validateAgent,
  validateAll,
  validateBasics,
  validateDocuments,
  validateFaqs,
  validateFloorPlans,
  validateForActivation,
  validateLocation,
  validateMedia,
  validatePricing,
  validateProject,
  validateSeo,
  validateSimilar,
  validateUnits,
} from '../validators';
import { firstTabWithErrors, groupErrorsByTab, tabOfPath } from '../tabs';

const base = (patch = {}) => ({ ...createInitialState(), ...patch });

const saveable = (patch = {}) =>
  base({
    title: 'Lakeview Heights 3 BHK',
    slug: 'lakeview-heights-3-bhk',
    propertyTypeId: 1,
    location: { ...createInitialState().location, localityId: 1, cityId: 1 },
    pricing: { ...createInitialState().pricing, price: 16500000 },
    ...patch,
  });

beforeEach(() => resetTmpIds());

describe('validateBasics', () => {
  it('asks for the fields the API makes mandatory', () => {
    const errors = validateBasics(base());

    expect(errors.title).toMatch(/required/i);
    expect(errors.slug).toMatch(/required/i);
    expect(errors.propertyTypeId).toBeDefined();
  });

  it('refuses a title under ten characters', () => {
    expect(validateBasics(base({ title: 'Too short' })).title).toMatch(/at least 10/);
    expect(validateBasics(base({ title: 'Long enough title' })).title).toBeUndefined();
  });

  it('refuses a slug that is not a slug', () => {
    expect(validateBasics(base({ slug: 'Not A Slug' })).slug).toMatch(/lowercase/);
    expect(validateBasics(base({ slug: 'a-real-slug' })).slug).toBeUndefined();
  });

  it('asks for a possession date while the listing is under construction', () => {
    const under = base({ constructionStatus: 'under-construction' });
    expect(validateBasics(under).possessionDate).toMatch(/required/i);

    const ready = base({ constructionStatus: 'ready-to-move' });
    expect(validateBasics(ready).possessionDate).toBeUndefined();
  });

  it('refuses a date that is not one, in the words of the month picker', () => {
    const errors = validateBasics(
      base({ constructionStatus: 'under-construction', possessionDate: '2026-13-45' })
    );
    expect(errors.possessionDate).toMatch(/month and the year/);
  });

  it('leaves the possession date alone while the status hides it', () => {
    // A finished building has no possession date field, and the save does not
    // send one — a stale value could not be fixed from a control nobody sees.
    const errors = validateBasics(
      base({ constructionStatus: 'ready-to-move', possessionDate: '2026-13-45' })
    );
    expect(errors.possessionDate).toBeUndefined();
  });

  it('refuses a negative age', () => {
    expect(validateBasics(base({ ageOfPropertyYears: -2 })).ageOfPropertyYears).toMatch(/negative/);
  });
});

describe('validateLocation', () => {
  it('asks for a locality', () => {
    expect(validateLocation(base())['location.localityId']).toMatch(/locality/i);
  });

  it('checks the coordinate ranges', () => {
    const location = { ...createInitialState().location, latitude: 120, longitude: -200 };
    const errors = validateLocation(base({ location }));

    expect(errors['location.latitude']).toMatch(/−90 and 90/);
    expect(errors['location.longitude']).toMatch(/−180 and 180/);
  });

  it('checks a pincode when one is given', () => {
    const location = {
      ...createInitialState().location,
      localityId: 1,
      cityId: 1,
      pincode: '56006',
    };
    expect(validateLocation(base({ location }))['location.pincode']).toMatch(/six digits/);
  });
});

describe('validatePricing', () => {
  it('lets a draft be unpriced — that is a publication rule, not a save rule', () => {
    expect(validatePricing(base())).toEqual({});
  });

  it('accepts a complete range and refuses an inverted one', () => {
    const pricing = {
      ...createInitialState().pricing,
      priceRangeMin: 9000000,
      priceRangeMax: 8000000,
    };
    expect(validatePricing(base({ pricing }))['pricing.priceRangeMax']).toMatch(/above the lowest/);

    const ordered = { ...pricing, priceRangeMin: 8000000, priceRangeMax: 9000000 };
    expect(validatePricing(base({ pricing: ordered }))['pricing.priceRangeMax']).toBeUndefined();
  });

  it('refuses half a range', () => {
    const pricing = { ...createInitialState().pricing, priceRangeMin: 8000000 };
    expect(validatePricing(base({ pricing }))['pricing.priceRangeMax']).toMatch(/both ends/);
  });

  it('does not hold a rental listing to the sale rules', () => {
    const halfRange = base({
      listingType: 'rent',
      pricing: { ...createInitialState().pricing, priceRangeMin: 8000000 },
    });
    expect(validatePricing(halfRange)).toEqual({});
  });

  it('refuses a negative amount', () => {
    const pricing = { ...createInitialState().pricing, price: -1 };
    expect(validatePricing(base({ pricing }))['pricing.price']).toMatch(/negative/);
  });
});

describe('validateMedia', () => {
  it('leaves a missing description to the publishing rules, so a draft saves (prompt 51)', () => {
    const values = base({ images: [makeImage({ url: 'https://example.com/a.jpg' })] });
    expect(validateMedia(values)['images.0.alt']).toBeUndefined();
    // …and a description that is too long is still refused on any save.
    const long = base({
      images: [makeImage({ url: 'https://example.com/a.jpg', alt: 'x'.repeat(500) })],
    });
    expect(validateMedia(long)['images.0.alt']).toBeDefined();
  });

  it('says nothing about an empty row', () => {
    expect(validateMedia(base({ images: [makeImage()] }))).toEqual({});
  });

  it('refuses a URL that is not one', () => {
    expect(validateMedia(base({ videoUrl: 'youtube.com/watch' })).videoUrl).toMatch(/https?:\/\//);
    expect(validateMedia(base({ videoUrl: 'https://youtube.com/watch' })).videoUrl).toBeUndefined();
  });
});

describe('validateUnits', () => {
  it('asks a configuration for a name and for an area or a price', () => {
    const values = base({ unitConfigurations: [makeUnitConfiguration({ bedrooms: 3 })] });
    const errors = validateUnits(values);

    expect(errors['unitConfigurations.0.name']).toBeDefined();
    expect(errors['unitConfigurations.0.superBuiltUpArea']).toMatch(/area or a price/);
  });

  it('accepts a named configuration with a price', () => {
    const values = base({
      unitConfigurations: [makeUnitConfiguration({ name: '3 BHK', price: 16500000 })],
    });
    expect(validateUnits(values)).toEqual({});
  });
});

describe('the repeating lists', () => {
  it('asks a floor plan for a title and an image', () => {
    const errors = validateFloorPlans(base({ floorPlans: [makeFloorPlan({ title: 'Type A' })] }));
    expect(errors['floorPlans.0.imageUrl']).toMatch(/needs an image/);
  });

  it('asks a document for a title and a file', () => {
    const errors = validateDocuments(
      base({ documents: [makeDocument({ url: 'https://x.test/a.pdf' })] })
    );
    expect(errors['documents.0.title']).toMatch(/Name this document/);
  });

  it('asks an FAQ for both halves', () => {
    const errors = validateFaqs(base({ faqs: [makeFaq({ question: 'Is it ready?' })] }));
    expect(errors['faqs.0.answer']).toMatch(/Write the answer/);
    expect(validateFaqs(base({ faqs: [makeFaq()] }))).toEqual({});
  });

  it('checks a timeline milestone and a percentage', () => {
    const errors = validateProject(base({ constructionProgressPercent: 140 }));
    expect(errors.constructionProgressPercent).toMatch(/between 0 and 100/);
  });
});

describe('validateSimilar', () => {
  it('caps the picks at six', () => {
    expect(
      validateSimilar(base({ similarPropertyIds: [1, 2, 3, 4, 5, 6, 7] })).similarPropertyIds
    ).toMatch(/at most 6/);
  });

  it('refuses the listing itself', () => {
    const errors = validateSimilar(base({ similarPropertyIds: [7] }), { propertyId: '7' });
    expect(errors.similarPropertyIds).toMatch(/similar to itself/);
  });
});

describe('validateAgent', () => {
  it('checks the phone numbers and the e-mail', () => {
    const agent = { ...createInitialState().agent, phone: '12345', email: 'nobody' };
    const errors = validateAgent(base({ agent }));

    expect(errors['agent.phone']).toMatch(/Indian mobile/);
    expect(errors['agent.email']).toMatch(/valid e-mail/);
  });

  it('accepts an empty agent', () => {
    expect(validateAgent(base())).toEqual({});
  });

  it('reads a number as the listing will store it (QA-61)', () => {
    const agent = {
      ...createInitialState().agent,
      phone: '+91 98450 12345',
      whatsapp: '098450 12345',
    };
    expect(validateAgent(base({ agent }))).toEqual({});
    expect(
      validateAgent(base({ agent: { ...agent, phone: '98450 1234' } }))['agent.phone']
    ).toMatch(/Indian mobile/);
  });
});

describe('an address is at most 500 characters, as the API takes it (QA-65)', () => {
  /** An address of exactly `length` characters. */
  const address = (length, start = 'https://cdn.example.com/') =>
    `${start}${'a'.repeat(length - start.length - 4)}.jpg`;

  it('refuses a longer one by the field’s name, before the round trip', () => {
    const location = {
      ...createInitialState().location,
      localityId: 1,
      cityId: 1,
      mapEmbedUrl: address(501, 'https://www.google.com/maps/embed?pb='),
    };
    const values = base({
      location,
      videoUrl: address(501),
      images: [makeImage({ url: address(501), alt: 'The living room', isCover: true })],
      agent: { ...createInitialState().agent, photoUrl: address(501) },
    });

    expect(validateLocation(values)['location.mapEmbedUrl']).toBe(
      'The map URL can be at most 500 characters.'
    );
    expect(validateMedia(values)).toEqual({
      videoUrl: 'The video URL can be at most 500 characters.',
      'images.0.url': 'The image address can be at most 500 characters.',
    });
    expect(validateAgent(values)['agent.photoUrl']).toBe(
      'The photo address can be at most 500 characters.'
    );
  });

  it('takes 500', () => {
    const values = base({
      videoUrl: address(500),
      images: [makeImage({ url: address(500), alt: 'The living room', isCover: true })],
    });
    expect(validateMedia(values)).toEqual({});
  });

  it('refuses the SEO tab’s three addresses in the panel’s words', () => {
    const seo = (patch) => ({ ...createInitialState().seo, ...patch });
    const errors = validateSeo(
      base({
        seo: seo({
          canonicalUrl: address(501),
          og: { ...createInitialState().seo.og, imageUrl: address(501) },
          twitter: { ...createInitialState().seo.twitter, imageUrl: address(501) },
        }),
      })
    );

    expect(errors).toEqual({
      'seo.canonicalUrl': 'The canonical URL can be at most 500 characters.',
      'seo.og.imageUrl': 'The share image address can be at most 500 characters.',
      'seo.twitter.imageUrl': 'The X image address can be at most 500 characters.',
    });
    // 500, and 500 once trimmed — the panel sends the address without its spaces.
    expect(
      validateSeo(
        base({
          seo: seo({
            canonicalUrl: address(500),
            og: { ...createInitialState().seo.og, imageUrl: `${address(500)}  ` },
          }),
        })
      )
    ).toEqual({});
  });

  it('stops the save: validateAll carries the refusal', () => {
    const values = saveable({
      images: [makeImage({ url: address(501), alt: 'The pool', isCover: true })],
    });
    expect(validateAll(values)).toEqual({
      'images.0.url': 'The image address can be at most 500 characters.',
    });
  });
});

describe('validateForActivation (PROP-04)', () => {
  const publishable = () =>
    saveable({
      isActive: true,
      shortDescription: 'Three bedrooms in Whitefield.',
      description: `<p>${'A well written description. '.repeat(20)}</p>`,
      images: [makeImage({ url: 'https://example.com/a.jpg', alt: 'The building' })],
    });

  it('blocks a publication with no image, keyed to the gallery', () => {
    const values = publishable();
    values.images = [];

    // Keyed to the gallery, which prints it: `images.0.url` belonged to no
    // control, so the Media badge counted a message the tab never showed.
    expect(validateForActivation(values).errors.images).toMatch(/at least one image/);
  });

  it('blocks a publication until every image is described, each under its box (prompt 51)', () => {
    const values = publishable();
    values.images = [
      makeImage({ url: 'https://example.com/a.jpg', alt: 'The living room', isCover: true }),
      makeImage({ url: 'https://example.com/b.jpg' }),
    ];

    const { errors } = validateForActivation(values);
    expect(errors['images.1.alt']).toMatch(/Describe this image/);
    expect(errors['images.0.alt']).toBeUndefined();
    expect(errors.images).toBeUndefined();

    // The same gallery saves as a draft.
    expect(validateForActivation({ ...values, isActive: false }).errors['images.1.alt']).toBe(
      undefined
    );
  });

  it('blocks a publication with a thin description', () => {
    const values = publishable();
    values.description = '<p>Too short.</p>';

    expect(validateForActivation(values).errors.description).toMatch(/at least 300 characters/);
  });

  it('blocks a publication with no summary', () => {
    const values = publishable();
    values.shortDescription = '';

    expect(validateForActivation(values).errors.shortDescription).toMatch(/one-line summary/);
  });

  it('blocks a publication with no price, and accepts “on request”', () => {
    const values = publishable();
    values.pricing = { ...createInitialState().pricing };
    expect(validateForActivation(values).errors['pricing.price']).toMatch(/needs a price/);

    values.pricing = { ...createInitialState().pricing, priceOnRequest: true };
    expect(validateForActivation(values).errors['pricing.price']).toBeUndefined();
  });

  it('asks a published rental for a monthly rent instead', () => {
    const values = { ...publishable(), listingType: 'rent' };
    values.pricing = { ...createInitialState().pricing };
    expect(validateForActivation(values).errors['pricing.rentPerMonth']).toMatch(/monthly rent/);

    values.pricing = { ...createInitialState().pricing, rentPerMonth: 45000 };
    expect(validateForActivation(values).errors['pricing.rentPerMonth']).toBeUndefined();
  });

  it('blocks nothing while the listing is a draft', () => {
    const values = {
      ...publishable(),
      isActive: false,
      images: [],
      description: '',
      shortDescription: '',
    };
    expect(validateForActivation(values).errors).toEqual({});
  });

  it('passes a listing that is ready', () => {
    expect(validateForActivation(publishable()).errors).toEqual({});
  });

  it('warns without blocking', () => {
    const ids = validateForActivation(publishable()).warnings.map((warning) => warning.id);

    expect(ids).toEqual(
      expect.arrayContaining(['description-words', 'amenities', 'faqs', 'plans'])
    );
  });

  it('stops warning once the gaps are filled', () => {
    const values = publishable();
    values.amenityIds = [1, 2, 3, 4, 5, 6, 7, 8];
    values.faqs = [makeFaq({ question: 'Is it ready?', answer: 'Yes.' })];
    values.floorPlans = [makeFloorPlan({ title: 'Type A', imageUrl: 'https://x.test/a.png' })];
    values.highlights = ['One', 'Two'];

    const ids = validateForActivation(values).warnings.map((warning) => warning.id);
    expect(ids).not.toEqual(expect.arrayContaining(['amenities', 'faqs', 'plans', 'highlights']));
  });
});

describe('validateAll', () => {
  it('lets a draft with the mandatory fields through', () => {
    expect(validateAll(saveable())).toEqual({});
  });

  it('lets a draft through on the Basics fields alone, unpriced', () => {
    const basicsOnly = base({
      title: 'Lakeview Heights 3 BHK',
      slug: 'lakeview-heights-3-bhk',
      propertyTypeId: 1,
      location: { ...createInitialState().location, localityId: 1, cityId: 1 },
    });
    expect(validateAll(basicsOnly)).toEqual({});
  });

  it('adds the activation blockers when the listing is published', () => {
    const errors = validateAll(saveable({ isActive: true }));
    expect(errors.description).toBeDefined();
    expect(errors.shortDescription).toBeDefined();
  });
});

describe('errors → tabs', () => {
  it('sends every path to the tab that owns it', () => {
    expect(tabOfPath('title')).toBe('basics');
    expect(tabOfPath('location.localityId')).toBe('location');
    expect(tabOfPath('nearbyPlaces.0.name')).toBe('location');
    expect(tabOfPath('pricing.otherCharges.1.amount')).toBe('pricing');
    expect(tabOfPath('configuration.bedrooms')).toBe('area');
    expect(tabOfPath('images.0.alt')).toBe('media');
    expect(tabOfPath('seo.title')).toBe('seo');
    // An unknown key still lands somewhere an editor can open.
    expect(tabOfPath('somethingElse')).toBe('basics');
  });

  it('counts them per tab and names the first tab to open', () => {
    const errors = validateAll(base());
    const counts = groupErrorsByTab(errors);

    expect(counts.basics).toBeGreaterThan(0);
    expect(counts.location).toBe(1);
    expect(counts.pricing).toBeUndefined();
    expect(firstTabWithErrors(errors)).toBe('basics');
    expect(firstTabWithErrors({ 'location.localityId': 'Choose a locality.' })).toBe('location');
    expect(firstTabWithErrors({})).toBeNull();
  });
});
