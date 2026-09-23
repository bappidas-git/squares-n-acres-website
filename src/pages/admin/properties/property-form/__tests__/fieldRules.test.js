import createInitialState from '../initialState';
import {
  anyFilled,
  clearedBySegment,
  convertArea,
  derivedPricePerSqft,
  heldPricePerSqft,
  isCommercial,
  isPlot,
  isResidential,
  isRentOrLease,
  plotAreaFrom,
  priceFieldsFor,
  pricingFieldsClearedBy,
  sellableSqft,
  showsAge,
  showsBhk,
  showsBuiltAreas,
  showsFloors,
  showsFurnishing,
  showsPlotDimensions,
  showsPossessionDate,
  showsPriceField,
} from '../fieldRules';

const values = (patch = {}) => ({ ...createInitialState(), ...patch });

describe('segment rules', () => {
  it('names the three segments apart', () => {
    expect(isResidential(values({ segment: 'residential' }))).toBe(true);
    expect(isCommercial(values({ segment: 'commercial' }))).toBe(true);
    expect(isPlot(values({ segment: 'land' }))).toBe(true);
    expect(isPlot(values({ segment: 'residential' }))).toBe(false);
  });

  it('shows bedrooms for a home and for nothing else', () => {
    expect(showsBhk(values({ segment: 'residential' }))).toBe(true);
    expect(showsBhk(values({ segment: 'commercial' }))).toBe(false);
    expect(showsBhk(values({ segment: 'land' }))).toBe(false);
  });

  it('shows the plot dimensions for land, and for a home that stands on its own plot', () => {
    expect(showsPlotDimensions(values({ segment: 'land' }))).toBe(true);
    expect(showsPlotDimensions(values({ segment: 'residential' }))).toBe(false);
    expect(showsPlotDimensions(values({ segment: 'residential' }), 'apartments')).toBe(false);
    // A villa's plot is half of what it is.
    expect(showsPlotDimensions(values({ segment: 'residential' }), 'villas')).toBe(true);
    expect(showsPlotDimensions(values({ segment: 'residential' }), 'independent-houses')).toBe(
      true
    );
  });

  it('keeps showing a plot measurement the listing already holds', () => {
    const held = values({ segment: 'residential' });
    held.area = { ...held.area, plotArea: 2400 };
    // Hidden, the figure was still saved and printed — with no control to fix it.
    expect(showsPlotDimensions(held, 'apartments')).toBe(true);
  });

  it('hides the built areas, furnishing and floors for land', () => {
    const land = values({ segment: 'land' });
    expect(showsBuiltAreas(land)).toBe(false);
    expect(showsFurnishing(land)).toBe(false);
    expect(showsFloors(land)).toBe(false);

    const office = values({ segment: 'commercial' });
    expect(showsBuiltAreas(office)).toBe(true);
    expect(showsFurnishing(office)).toBe(true);
    expect(showsFloors(office)).toBe(true);
  });
});

describe('status rules', () => {
  it('asks for a possession date while the building is not finished', () => {
    expect(showsPossessionDate(values({ constructionStatus: 'pre-launch' }))).toBe(true);
    expect(showsPossessionDate(values({ constructionStatus: 'under-construction' }))).toBe(true);
    expect(showsPossessionDate(values({ constructionStatus: 'ready-to-move' }))).toBe(false);
    expect(showsPossessionDate(values({ constructionStatus: 'resale' }))).toBe(false);
  });

  it('asks for an age once it is', () => {
    expect(showsAge(values({ constructionStatus: 'ready-to-move' }))).toBe(true);
    expect(showsAge(values({ constructionStatus: 'resale' }))).toBe(true);
    expect(showsAge(values({ constructionStatus: 'pre-launch' }))).toBe(false);
  });

  it('never shows both at once', () => {
    ['pre-launch', 'under-construction', 'ready-to-move', 'resale'].forEach((status) => {
      const listing = values({ constructionStatus: status });
      expect(showsPossessionDate(listing) && showsAge(listing)).toBe(false);
    });
  });
});

describe('priceFieldsFor', () => {
  it('quotes a sale once and a tenancy per month', () => {
    expect(priceFieldsFor('sale')).toContain('price');
    expect(priceFieldsFor('sale')).toContain('priceRangeMin');
    expect(priceFieldsFor('sale')).not.toContain('rentPerMonth');

    expect(priceFieldsFor('rent')).toContain('rentPerMonth');
    expect(priceFieldsFor('rent')).toContain('securityDeposit');
    expect(priceFieldsFor('rent')).not.toContain('price');
  });

  it('treats a lease like a rental (D90)', () => {
    expect(priceFieldsFor('lease')).toEqual(priceFieldsFor('rent'));
    expect(isRentOrLease(values({ listingType: 'lease' }))).toBe(true);
    expect(isRentOrLease(values({ listingType: 'sale' }))).toBe(false);
  });

  it('answers for one field at a time', () => {
    expect(showsPriceField('sale', 'pricePerSqft')).toBe(true);
    expect(showsPriceField('rent', 'pricePerSqft')).toBe(false);
  });

  it('keeps the other charges and the on-request switch through a change of type', () => {
    const dropped = pricingFieldsClearedBy('sale', 'rent');
    expect(dropped).toContain('price');
    expect(dropped).toContain('priceRangeMin');
    expect(dropped).not.toContain('otherCharges');
    expect(dropped).not.toContain('priceOnRequest');

    expect(pricingFieldsClearedBy('rent', 'sale')).toContain('rentPerMonth');
    expect(pricingFieldsClearedBy('rent', 'lease')).toEqual([]);
  });
});

describe('clearedBySegment', () => {
  it('clears the rooms when a home becomes land', () => {
    const patch = clearedBySegment('land');
    expect(patch['configuration.bedrooms']).toBeNull();
    expect(patch['configuration.servantRoom']).toBe(false);
    expect(patch['configuration.kitchenType']).toBe('');
    expect(patch['area.superBuiltUpArea']).toBeNull();
    expect(patch.furnishing).toBe('');
    expect(patch.floorNumber).toBeNull();
  });

  it('keeps the plot when land becomes a home — a villa stands on one', () => {
    const patch = clearedBySegment('residential');
    expect(patch).not.toHaveProperty('area.plotLength');
    expect(patch).not.toHaveProperty('area.plotArea');
    expect(patch).not.toHaveProperty('configuration.bedrooms');
    expect(patch).not.toHaveProperty('area.superBuiltUpArea');
  });

  it('keeps the facing and the ownership when a home becomes land', () => {
    const patch = clearedBySegment('land');
    expect(patch).not.toHaveProperty('facing');
    expect(patch).not.toHaveProperty('ownership');
    expect(patch.ageOfPropertyYears).toBeNull();
  });

  it('clears the rooms and the plot but keeps the built areas for a commercial unit', () => {
    const patch = clearedBySegment('commercial');
    expect(patch['configuration.bathrooms']).toBeNull();
    expect(patch['area.plotLength']).toBeNull();
    expect(patch).not.toHaveProperty('area.carpetArea');
    expect(patch).not.toHaveProperty('furnishing');
    // An office has a car park; only land loses the parking.
    expect(patch).not.toHaveProperty('configuration.parkingCovered');
  });
});

describe('anyFilled', () => {
  it('is what decides whether a change is worth a confirm', () => {
    const blank = values();
    expect(anyFilled(blank, Object.keys(clearedBySegment('land')))).toBe(false);

    const home = values();
    home.configuration = { ...home.configuration, bedrooms: 3 };
    expect(anyFilled(home, Object.keys(clearedBySegment('land')))).toBe(true);
  });

  it('reads a `false` switch and a `0` differently', () => {
    const listing = values();
    listing.configuration = { ...listing.configuration, servantRoom: false, bedrooms: 0 };
    expect(anyFilled(listing, ['configuration.servantRoom'])).toBe(false);
    expect(anyFilled(listing, ['configuration.bedrooms'])).toBe(true);
  });
});

describe('plotAreaFrom', () => {
  it('multiplies feet into square feet', () => {
    expect(plotAreaFrom(30, 40, 'sqft', 'sqft')).toBe(1200);
  });

  it('converts metres into the unit the area is stored in', () => {
    // 10 m × 10 m = 100 m², and one square metre is 10.7639 sq ft.
    expect(plotAreaFrom(10, 10, 'sqm', 'sqft')).toBe(1076.39);
    expect(plotAreaFrom(30, 40, 'sqft', 'sqyd')).toBeCloseTo(133.33, 2);
  });

  it('refuses a dimension that is not a positive number', () => {
    expect(plotAreaFrom('', 40, 'sqft', 'sqft')).toBeNull();
    expect(plotAreaFrom(0, 40, 'sqft', 'sqft')).toBeNull();
    expect(plotAreaFrom(-30, 40, 'sqft', 'sqft')).toBeNull();
    expect(plotAreaFrom('abc', 40, 'sqft', 'sqft')).toBeNull();
  });
});

describe('the per-sq-ft rate (D33)', () => {
  const priced = (area, pricing = { price: 15000000 }) =>
    values({
      area: { ...createInitialState().area, ...area },
      pricing: { ...createInitialState().pricing, ...pricing },
    });

  it('divides the price by the super built-up area', () => {
    expect(derivedPricePerSqft(priced({ superBuiltUpArea: 1500 }))).toBe(10000);
  });

  it('falls back to the carpet area, then to the plot area', () => {
    expect(derivedPricePerSqft(priced({ superBuiltUpArea: null, carpetArea: 1200 }))).toBe(12500);
    expect(
      derivedPricePerSqft(priced({ superBuiltUpArea: null, carpetArea: null, plotArea: 2400 }))
    ).toBe(6250);
  });

  it('converts the area before it divides', () => {
    expect(sellableSqft({ superBuiltUpArea: 1, areaUnit: 'acre' })).toBe(43560);
    expect(derivedPricePerSqft(priced({ plotArea: 1, areaUnit: 'guntha' }))).toBe(13774);
  });

  it('has none for a rental or for a price on request', () => {
    const rent = priced({ superBuiltUpArea: 1500 }, { rentPerMonth: 45000 });
    rent.listingType = 'rent';
    expect(derivedPricePerSqft(rent)).toBeNull();

    expect(
      derivedPricePerSqft(
        priced({ superBuiltUpArea: 1500 }, { price: 15000000, priceOnRequest: true })
      )
    ).toBeNull();
  });

  it('has none without a price or without an area', () => {
    expect(derivedPricePerSqft(priced({ superBuiltUpArea: 1500 }, { price: null }))).toBeNull();
    expect(derivedPricePerSqft(priced({}))).toBeNull();
    expect(derivedPricePerSqft(priced({ superBuiltUpArea: 0 }))).toBeNull();
  });
});

describe('heldPricePerSqft', () => {
  const sale = (pricePerSqft) =>
    values({
      listingType: 'sale',
      pricing: { ...createInitialState().pricing, price: 15000000, pricePerSqft },
      area: { ...createInitialState().area, superBuiltUpArea: 1500 },
    });

  it('reads a stored rate that is the division as still following the price', () => {
    // The first save stores the derived rate (D33); read back as "typed", it
    // froze, and doubling the price left the old figure on the site.
    expect(heldPricePerSqft(sale(10000))).toBeNull();
  });

  it('keeps a rate somebody negotiated', () => {
    expect(heldPricePerSqft(sale(9500))).toBe(9500);
  });

  it('holds no rate at all for a rental', () => {
    const rental = { ...sale(44), listingType: 'rent' };
    expect(heldPricePerSqft(rental)).toBeNull();
  });
});

describe('convertArea', () => {
  it('moves a figure from one unit to another, to two decimals', () => {
    expect(convertArea(1076.39, 'sqft', 'sqm')).toBe(100);
    expect(convertArea(1, 'acre', 'sqft')).toBe(43560);
  });

  it('leaves an empty figure empty', () => {
    expect(convertArea('', 'sqft', 'sqm')).toBeNull();
    expect(convertArea(null, 'sqft', 'sqm')).toBeNull();
  });
});

describe('showsAge', () => {
  it('asks a finished building its age, and a plot never', () => {
    expect(showsAge(values({ segment: 'residential', constructionStatus: 'resale' }))).toBe(true);
    expect(showsAge(values({ segment: 'land', constructionStatus: 'ready-to-move' }))).toBe(false);
  });
});
