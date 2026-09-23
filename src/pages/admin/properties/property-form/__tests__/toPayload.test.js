import createInitialState, {
  makeDocument,
  makeFaq,
  makeImage,
  makeNearbyPlace,
  makeOtherCharge,
  makeSpecification,
  makeUnitConfiguration,
  resetTmpIds,
} from '../initialState';
import fromRecord from '../fromRecord';
import toPayload, { formPathOf, keptRowIndexes } from '../toPayload';

const base = (patch = {}) => ({ ...createInitialState(), ...patch });

const filled = () =>
  base({
    title: 'Lakeview Heights 3 BHK',
    slug: 'lakeview-heights-3-bhk',
    propertyTypeId: 1,
    description: 'A long description. '.repeat(20),
    shortDescription: 'Three bedrooms in Whitefield.',
    location: { ...createInitialState().location, localityId: 1, cityId: 1 },
    pricing: { ...createInitialState().pricing, price: 16500000 },
    area: { ...createInitialState().area, superBuiltUpArea: 1650 },
  });

beforeEach(() => resetTmpIds());

describe('identity and read-only fields', () => {
  it('never sends a key the API computes or embeds', () => {
    const payload = toPayload(filled());
    const forbidden = [
      'id',
      'createdAt',
      'updatedAt',
      'publishedAt',
      'viewCount',
      'enquiryCount',
      'createdBy',
      'updatedBy',
      'propertyType',
      'amenities',
      'badges',
      'locality',
      'developer',
    ];

    forbidden.forEach((key) => expect(payload).not.toHaveProperty(key));
    expect(payload.location).not.toHaveProperty('locality');
    expect(payload.location).not.toHaveProperty('city');
    expect(payload.project).not.toHaveProperty('developer');
  });

  it('sends every branch of §6.1, even the ones nobody opened', () => {
    const payload = toPayload(base());

    expect(payload.pricing.currency).toBe('INR');
    expect(payload.area.areaUnit).toBe('sqft');
    expect(payload.configuration.servantRoom).toBe(false);
    expect(payload.project.approvals).toEqual([]);
    expect(Object.keys(payload.sectionVisibility)).toHaveLength(18);
    expect(payload.seo.robots.index).toBe(true);
  });
});

describe('row ids', () => {
  it('drops a temporary id and keeps a numeric one', () => {
    const payload = toPayload(
      base({
        images: [
          makeImage({ url: 'https://example.com/a.jpg', alt: 'A' }),
          makeImage({ id: 12, url: 'https://example.com/b.jpg', alt: 'B' }),
        ],
      })
    );

    expect(payload.images[0]).not.toHaveProperty('id');
    expect(payload.images[1].id).toBe(12);
    expect(JSON.stringify(payload)).not.toContain('tmp-');
  });

  it('never sends an id for a list the contract stores without one', () => {
    const payload = toPayload(
      base({
        specifications: [
          makeSpecification('flooring', { label: 'Living room', value: 'Vitrified' }),
        ],
        pricing: {
          ...createInitialState().pricing,
          otherCharges: [makeOtherCharge({ label: 'Club', amount: 250000 })],
        },
      })
    );

    expect(payload.specifications[0]).not.toHaveProperty('id');
    expect(payload.pricing.otherCharges[0]).not.toHaveProperty('id');
  });
});

describe('empty rows', () => {
  it('leaves out a row nobody filled in', () => {
    const payload = toPayload(
      base({
        images: [makeImage(), makeImage({ url: 'https://example.com/a.jpg', alt: 'A' })],
        documents: [
          makeDocument(),
          makeDocument({ title: 'Brochure', url: 'https://x.test/b.pdf' }),
        ],
        faqs: [makeFaq(), makeFaq({ question: 'Is it ready?', answer: 'Yes.' })],
        nearbyPlaces: [makeNearbyPlace(), makeNearbyPlace({ name: 'Hope Farm Metro' })],
        unitConfigurations: [makeUnitConfiguration(), makeUnitConfiguration({ name: '3 BHK' })],
      })
    );

    expect(payload.images).toHaveLength(1);
    expect(payload.documents).toHaveLength(1);
    expect(payload.faqs).toHaveLength(1);
    expect(payload.nearbyPlaces).toHaveLength(1);
    expect(payload.unitConfigurations).toHaveLength(1);
  });

  it('keeps a unit configuration that has only a price', () => {
    const payload = toPayload(
      base({ unitConfigurations: [makeUnitConfiguration({ price: 9500000 })] })
    );
    expect(payload.unitConfigurations).toHaveLength(1);
  });
});

describe('normalisation', () => {
  it('turns an empty string into null for every nullable field', () => {
    const payload = toPayload(
      base({ projectName: '', videoUrl: '', possessionDate: '', furnishing: '' })
    );

    expect(payload.projectName).toBeNull();
    expect(payload.videoUrl).toBeNull();
    expect(payload.possessionDate).toBeNull();
    expect(payload.furnishing).toBeNull();
    expect(payload.location.pincode).toBeNull();
    expect(payload.agent.phone).toBeNull();
  });

  it('keeps an empty string where the contract asks for a string', () => {
    const payload = toPayload(base());

    expect(payload.description).toBe('');
    expect(payload.shortDescription).toBe('');
    expect(payload.seo.title).toBe('');
    expect(payload.seo.redirect.toPath).toBe('');
  });

  it('trims what it is given', () => {
    const payload = toPayload(base({ title: '  Lakeview Heights 3 BHK  ' }));
    expect(payload.title).toBe('Lakeview Heights 3 BHK');
  });

  it('turns a numeric string into a number and an empty one into null', () => {
    const payload = toPayload(
      base({
        pricing: { ...createInitialState().pricing, price: '16500000', securityDeposit: '' },
        configuration: { ...createInitialState().configuration, bedrooms: '3' },
      })
    );

    expect(payload.pricing.price).toBe(16500000);
    expect(payload.pricing.securityDeposit).toBeNull();
    expect(payload.configuration.bedrooms).toBe(3);
  });
});

describe('invariants', () => {
  it('marks the first image as cover when none is marked', () => {
    const payload = toPayload(
      base({
        images: [
          makeImage({ url: 'https://example.com/a.jpg', alt: 'A' }),
          makeImage({ url: 'https://example.com/b.jpg', alt: 'B' }),
        ],
      })
    );

    expect(payload.images.map((image) => image.isCover)).toEqual([true, false]);
  });

  it('keeps exactly one cover when several are marked', () => {
    const payload = toPayload(
      base({
        images: [
          makeImage({ url: 'https://example.com/a.jpg', alt: 'A' }),
          makeImage({ url: 'https://example.com/b.jpg', alt: 'B', isCover: true }),
          makeImage({ url: 'https://example.com/c.jpg', alt: 'C', isCover: true }),
        ],
      })
    );

    expect(payload.images.filter((image) => image.isCover)).toHaveLength(1);
    expect(payload.images[1].isCover).toBe(true);
  });

  it('renumbers every ordered list 1..n', () => {
    const payload = toPayload(
      base({
        images: [
          makeImage({ url: 'https://example.com/a.jpg', alt: 'A', order: 9 }),
          makeImage({ url: 'https://example.com/b.jpg', alt: 'B', order: 4 }),
        ],
        faqs: [
          makeFaq({ question: 'Q1', answer: 'A1', order: 7 }),
          makeFaq({ question: 'Q2', answer: 'A2' }),
        ],
      })
    );

    expect(payload.images.map((image) => image.order)).toEqual([1, 2]);
    expect(payload.faqs.map((faq) => faq.order)).toEqual([1, 2]);
  });

  it('mirrors the slug onto the SEO branch (D34)', () => {
    const payload = toPayload(
      base({ slug: 'lakeview-heights-3-bhk', seo: { ...createInitialState().seo, slug: 'stale' } })
    );
    expect(payload.seo.slug).toBe('lakeview-heights-3-bhk');
  });

  it('caps the editor’s similar picks at six', () => {
    const payload = toPayload(base({ similarPropertyIds: [1, 2, 3, 4, 5, 6, 7, 8] }));
    expect(payload.similarPropertyIds).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('carries the computed SEO score through untouched', () => {
    const seo = {
      ...createInitialState().seo,
      score: 84,
      scoreBand: 'good',
      testsPassed: 17,
      testsTotal: 20,
      lastAnalyzedAt: '2026-09-16T09:00:00.000Z',
      analysis: {
        basic: [{ id: 'title', status: 'pass', message: 'ok' }],
        additional: [],
        titleReadability: [],
        contentReadability: [],
      },
    };
    const payload = toPayload(base({ seo }));

    expect(payload.seo.score).toBe(84);
    expect(payload.seo.scoreBand).toBe('good');
    expect(payload.seo.testsPassed).toBe(17);
    expect(payload.seo.analysis.basic).toHaveLength(1);
    expect(payload.seo.lastAnalyzedAt).toBe('2026-09-16T09:00:00.000Z');
  });
});

describe('pricePerSqft (D33)', () => {
  it('derives it from the price and the super built-up area when it is empty', () => {
    const payload = toPayload(filled());
    expect(payload.pricing.pricePerSqft).toBe(10000);
  });

  it('falls back to the carpet area when there is no super built-up area', () => {
    const values = filled();
    values.area = { ...values.area, superBuiltUpArea: null, carpetArea: 1000 };
    expect(toPayload(values).pricing.pricePerSqft).toBe(16500);
  });

  it('never overwrites a figure the editor typed', () => {
    const values = filled();
    values.pricing = { ...values.pricing, pricePerSqft: 9500 };
    expect(toPayload(values).pricing.pricePerSqft).toBe(9500);
  });

  it('stays null when there is nothing to divide', () => {
    expect(toPayload(base()).pricing.pricePerSqft).toBeNull();
  });
});

describe('round trip', () => {
  it('is stable through fromRecord', () => {
    const values = filled();
    values.images = [
      makeImage({ id: 3, url: 'https://example.com/a.jpg', alt: 'A' }),
      makeImage({ url: 'https://example.com/b.jpg', alt: 'B' }),
    ];
    values.faqs = [makeFaq({ question: 'Is it ready?', answer: 'Yes.' })];
    values.specifications = [makeSpecification('kitchen', { label: 'Counter', value: 'Granite' })];
    values.similarPropertyIds = [2, 3];

    const once = toPayload(values);
    const twice = toPayload(fromRecord(once));

    expect(twice).toEqual(once);
  });
});

describe('fields the form hides for this listing', () => {
  it('does not send a possession date the status does not ask for', () => {
    const payload = toPayload({
      ...filled(),
      constructionStatus: 'ready-to-move',
      possessionDate: '2027-03',
    });
    expect(payload.possessionDate).toBeNull();
  });

  it('does not send an age for a plot', () => {
    const payload = toPayload({
      ...filled(),
      segment: 'land',
      constructionStatus: 'ready-to-move',
      ageOfPropertyYears: 4,
    });
    expect(payload.ageOfPropertyYears).toBeNull();
  });

  it('sends no per-sq-ft rate for a rental', () => {
    const payload = toPayload({
      ...filled(),
      listingType: 'rent',
      pricing: { ...createInitialState().pricing, rentPerMonth: 45000, pricePerSqft: 44 },
    });
    expect(payload.pricing.pricePerSqft).toBeNull();
  });
});

describe('a 422 on a row the save left out', () => {
  it('lands on the form’s row, not the payload’s', () => {
    const values = {
      ...filled(),
      unitConfigurations: [
        makeUnitConfiguration({ name: '' }),
        makeUnitConfiguration({ name: '3 BHK' }),
      ],
    };

    // The blank first row is not sent, so the API's row 0 is the form's row 1.
    const kept = keptRowIndexes(values);
    expect(formPathOf('unitConfigurations.0.name', kept)).toBe('unitConfigurations.1.name');
    expect(formPathOf('title', kept)).toBe('title');
  });
});
