import createInitialState from '../initialState';
import suggestFaqs, { SUGGESTION_LIMIT, normaliseQuestion } from '../suggestFaqs';

/**
 * `suggestFaqs` is the one piece of prompt 20 that writes sentences a visitor
 * reads, so every branch is asserted on its text, not only on its presence:
 * the rule it obeys is "never claim more than the record holds", and a rule
 * like that is only real if a test can fail it.
 */

const values = (patch = {}) => ({ ...createInitialState(), title: 'Lakeview Heights', ...patch });

const pricing = (patch) => ({ pricing: { ...createInitialState().pricing, ...patch } });

const questionsOf = (suggestions) => suggestions.map((entry) => entry.question);

const answerFor = (suggestions, needle) =>
  suggestions.find((entry) => entry.question.toLowerCase().includes(needle))?.answer ?? '';

describe('the price question', () => {
  it('quotes a sale price', () => {
    const found = suggestFaqs(values(pricing({ price: 14200000 })));

    expect(questionsOf(found)).toContain('What is the price of Lakeview Heights?');
    expect(answerFor(found, 'price')).toBe('<p>Lakeview Heights is priced at ₹1.42 Cr.</p>');
  });

  it('quotes a range when both ends are set', () => {
    const found = suggestFaqs(values(pricing({ priceRangeMin: 8500000, priceRangeMax: 12000000 })));

    expect(answerFor(found, 'price')).toBe(
      '<p>Prices at Lakeview Heights run from ₹85 L to ₹1.2 Cr.</p>'
    );
  });

  it('falls back to the range across the unit configurations', () => {
    const found = suggestFaqs(
      values({
        unitConfigurations: [
          { id: 1, name: '2 BHK', price: 9000000, isActive: true },
          { id: 2, name: '3 BHK', price: 13000000, isActive: true },
        ],
      })
    );

    expect(answerFor(found, 'price')).toBe(
      '<p>Prices at Lakeview Heights run from ₹90 L to ₹1.3 Cr.</p>'
    );
  });

  it('says the price is on request rather than inventing one (§7)', () => {
    const found = suggestFaqs(values(pricing({ priceOnRequest: true, price: 14200000 })));

    expect(answerFor(found, 'price')).toContain('Price is available on request.');
    expect(answerFor(found, 'price')).not.toContain('₹');
  });

  it('quotes a rental per month, with the deposit and the maintenance', () => {
    const found = suggestFaqs(
      values({
        listingType: 'rent',
        ...pricing({
          rentPerMonth: 45000,
          securityDeposit: 300000,
          maintenanceChargesMonthly: 2500,
        }),
      })
    );

    expect(answerFor(found, 'price')).toBe(
      '<p>The rent for Lakeview Heights is ₹45,000/month. The security deposit is ₹3 L. Maintenance is ₹2,500/month.</p>'
    );
  });

  it('is not suggested at all when nothing is priced', () => {
    const found = suggestFaqs(values());

    expect(questionsOf(found)).not.toContain('What is the price of Lakeview Heights?');
  });
});

describe('the possession question', () => {
  it('names the project rather than the listing title', () => {
    const found = suggestFaqs(values({ projectName: 'Lakeview Park' }));

    expect(questionsOf(found)).toContain('When is Lakeview Park ready for possession?');
  });

  it('says possession is immediate for a ready-to-move listing', () => {
    const found = suggestFaqs(values({ constructionStatus: 'ready-to-move' }));

    expect(answerFor(found, 'possession')).toBe(
      '<p>Lakeview Heights is ready to move in, so possession is immediate.</p>'
    );
  });

  it('calls a resale a resale', () => {
    const found = suggestFaqs(values({ constructionStatus: 'resale' }));

    expect(answerFor(found, 'possession')).toContain('is a resale property');
  });

  it('gives the month and the year of a scheduled possession', () => {
    const found = suggestFaqs(
      values({ constructionStatus: 'under-construction', possessionDate: '2027-03-01' })
    );

    expect(answerFor(found, 'possession')).toBe(
      '<p>Possession at Lakeview Heights is scheduled for March 2027. The listing is marked “Under Construction”.</p>'
    );
  });

  it('says no date has been announced rather than promising one', () => {
    const found = suggestFaqs(values({ constructionStatus: 'pre-launch' }));

    expect(answerFor(found, 'possession')).toBe(
      '<p>Lakeview Heights is marked “Pre-Launch”. A possession date has not been announced yet.</p>'
    );
  });

  it('names the developer when the form knows one', () => {
    const found = suggestFaqs(values({ constructionStatus: 'ready-to-move' }), {
      developer: { id: 3, name: 'Nandi Ridge Developers' },
    });

    expect(answerFor(found, 'possession')).toContain('It is a Nandi Ridge Developers project.');
  });
});

describe('the RERA question', () => {
  it('gives the number when the listing carries one', () => {
    const found = suggestFaqs(
      values({ reraRegistered: true, reraNumber: 'PRM/KA/RERA/1251/446/PR/010101/000001' })
    );

    expect(answerFor(found, 'rera')).toBe(
      '<p>Yes. The RERA registration number for Lakeview Heights is PRM/KA/RERA/1251/446/PR/010101/000001.</p>'
    );
  });

  it('promises details on request when there is no number', () => {
    const found = suggestFaqs(values());

    expect(answerFor(found, 'rera')).toBe('<p>Registration details will be shared on request.</p>');
  });
});

describe('the amenities question', () => {
  const amenities = [
    { id: 1, name: 'Power Backup' },
    { id: 2, name: 'Lift' },
    { id: 3, name: 'Swimming Pool' },
  ];

  it('names what the listing holds, in master-data order', () => {
    const found = suggestFaqs(values({ amenityIds: [3, 1, 2] }), { amenities });

    expect(answerFor(found, 'amenities')).toBe(
      '<p>Lakeview Heights offers Power Backup, Lift and Swimming Pool.</p>'
    );
  });

  it('names eight and counts the rest', () => {
    const many = Array.from({ length: 11 }, (_row, index) => ({
      id: index + 1,
      name: `Amenity ${index + 1}`,
    }));
    const found = suggestFaqs(values({ amenityIds: many.map((row) => row.id) }), {
      amenities: many,
    });

    expect(answerFor(found, 'amenities')).toContain('Amenity 8.');
    expect(answerFor(found, 'amenities')).toContain('3 further amenities are listed on this page.');
    expect(answerFor(found, 'amenities')).not.toContain('Amenity 9');
  });

  it('reads the embedded `amenities` of a record when there is one', () => {
    const found = suggestFaqs(
      values({ amenities: [{ id: 9, name: 'Clubhouse' }], amenityIds: [9] }),
      {}
    );

    expect(answerFor(found, 'amenities')).toContain('Clubhouse');
  });

  it('is not suggested when nothing is ticked (§7)', () => {
    const found = suggestFaqs(values({ amenityIds: [] }), { amenities });

    expect(questionsOf(found)).not.toContain('What amenities does Lakeview Heights offer?');
  });
});

describe('the location question', () => {
  it('names the locality, the city and the three nearest places', () => {
    const found = suggestFaqs(
      values({
        nearbyPlaces: [
          { id: 1, name: 'Whitefield Metro', distanceKm: 1.2 },
          { id: 2, name: 'Vydehi Hospital', distanceKm: 2 },
          { id: 3, name: 'Phoenix Marketcity', distanceKm: 3.4 },
          { id: 4, name: 'Never listed', distanceKm: 9 },
        ],
      }),
      { locality: { name: 'Whitefield' }, city: { name: 'Bengaluru' } }
    );

    expect(answerFor(found, 'located')).toBe(
      '<p>Lakeview Heights is in Whitefield, Bengaluru. Close by: Whitefield Metro (1.2 km), Vydehi Hospital (2 km) and Phoenix Marketcity (3.4 km).</p>'
    );
  });

  it('falls back to the address when no locality is chosen', () => {
    const state = values();
    state.location.address = '12 Sarjapur Road';
    const found = suggestFaqs(state, {});

    expect(answerFor(found, 'located')).toBe('<p>Lakeview Heights is at 12 Sarjapur Road.</p>');
  });

  it('is not suggested when the listing has no place at all', () => {
    const found = suggestFaqs(values(), {});

    expect(questionsOf(found)).not.toContain('Where is Lakeview Heights located?');
  });
});

describe('the configuration question', () => {
  it('lists the unit configurations with their areas', () => {
    const found = suggestFaqs(
      values({
        unitConfigurations: [
          { id: 1, name: '2 BHK', superBuiltUpArea: 1245, areaUnit: 'sqft', isActive: true },
          { id: 2, name: '3 BHK', superBuiltUpArea: 1650, areaUnit: 'sqft', isActive: true },
          { id: 3, name: 'Sold out', superBuiltUpArea: 900, areaUnit: 'sqft', isActive: false },
        ],
      }),
      { propertyType: { name: 'Apartments' } }
    );

    expect(answerFor(found, 'configurations')).toBe(
      '<p>Lakeview Heights is offered as 2 BHK (1,245 sq ft) and 3 BHK (1,650 sq ft). All configurations are apartments.</p>'
    );
  });

  it('falls back to the bedroom count', () => {
    const state = values();
    state.configuration.bedrooms = 3;
    state.configuration.bathrooms = 2;
    const found = suggestFaqs(state, {});

    expect(answerFor(found, 'configurations')).toBe(
      '<p>Lakeview Heights is offered as 3 BHK. It has 2 bathrooms.</p>'
    );
  });

  it('is not suggested when the listing has neither', () => {
    const found = suggestFaqs(values(), {});

    expect(questionsOf(found)).not.toContain('What configurations are available?');
  });
});

describe('the suggestion set', () => {
  const full = () =>
    values({
      ...pricing({ price: 14200000 }),
      constructionStatus: 'under-construction',
      possessionDate: '2027-03-01',
      reraNumber: 'PRM/KA/RERA/0001',
      reraRegistered: true,
      amenityIds: [1],
      configuration: { ...createInitialState().configuration, bedrooms: 3 },
    });

  const context = {
    amenities: [{ id: 1, name: 'Lift' }],
    locality: { name: 'Whitefield' },
    city: { name: 'Bengaluru' },
  };

  it('offers at most five even when six are available', () => {
    const found = suggestFaqs(full(), context);

    expect(found).toHaveLength(SUGGESTION_LIMIT);
  });

  it('leaves out a question that is already answered, whatever its spelling', () => {
    const state = full();
    state.faqs = [
      { id: 1, question: '  what IS the price of lakeview heights ??  ', answer: '<p>Ask us.</p>' },
    ];

    const found = suggestFaqs(state, context);

    expect(questionsOf(found)).not.toContain('What is the price of Lakeview Heights?');
    // The sixth candidate takes the freed place rather than the list shrinking.
    expect(questionsOf(found)).toContain('What configurations are available?');
    expect(found).toHaveLength(SUGGESTION_LIMIT);
  });

  it('answers in `<p>` HTML and escapes what the editor typed', () => {
    const found = suggestFaqs(values({ title: 'Lakeview <b>Heights</b>' }), {});

    found.forEach((entry) => {
      expect(entry.answer.startsWith('<p>')).toBe(true);
      expect(entry.answer.endsWith('</p>')).toBe(true);
    });
    expect(answerFor(found, 'rera')).not.toContain('<b>');
  });

  it('returns nothing but the two questions every listing can answer when it is empty', () => {
    const found = suggestFaqs({}, {});

    expect(questionsOf(found)).toEqual([
      'When is this project ready for possession?',
      'Is this property RERA registered?',
    ]);
  });
});

describe('normaliseQuestion', () => {
  it('reduces a question to the words it is made of', () => {
    expect(normaliseQuestion('  What IS the price of “Lakeview Heights”? ')).toBe(
      'what is the price of lakeview heights'
    );
  });

  it('survives an empty value', () => {
    expect(normaliseQuestion(undefined)).toBe('');
  });
});
