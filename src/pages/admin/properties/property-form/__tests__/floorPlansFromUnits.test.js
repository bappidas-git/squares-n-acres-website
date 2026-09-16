import { floorPlansFromUnits } from '../tabs/FloorPlansTab';

/**
 * "Generate from unit configurations" is the one button on prompt 20's tabs
 * that writes rows an editor did not type, so the rule that stops it writing
 * them twice (§7) is asserted here rather than left to a render.
 */

const unit = (patch = {}) => ({
  id: 1,
  name: '2 BHK',
  floorPlanImageUrl: 'https://example.com/2bhk.png',
  floorPlanPdfUrl: '',
  superBuiltUpArea: 1180,
  carpetArea: 900,
  areaUnit: 'sqft',
  bedrooms: 2,
  price: 9500000,
  priceOnRequest: false,
  isActive: true,
  ...patch,
});

describe('floorPlansFromUnits', () => {
  it('turns a unit with a drawing into a floor plan', () => {
    expect(floorPlansFromUnits([unit()], [])).toEqual([
      {
        title: '2 BHK',
        imageUrl: 'https://example.com/2bhk.png',
        pdfUrl: '',
        area: 1180,
        areaUnit: 'sqft',
        bedrooms: 2,
        price: 9500000,
      },
    ]);
  });

  it('skips a unit with no drawing', () => {
    expect(floorPlansFromUnits([unit({ floorPlanImageUrl: '' })], [])).toEqual([]);
  });

  it('skips a configuration that is switched off', () => {
    expect(floorPlansFromUnits([unit({ isActive: false })], [])).toEqual([]);
  });

  it('skips a unit with no name to give the plan', () => {
    expect(floorPlansFromUnits([unit({ name: '  ' })], [])).toEqual([]);
  });

  it('falls back to the carpet area when there is no super built-up one', () => {
    expect(floorPlansFromUnits([unit({ superBuiltUpArea: null })], [])[0].area).toBe(900);
  });

  it('leaves the price out when the configuration is on request', () => {
    expect(floorPlansFromUnits([unit({ priceOnRequest: true })], [])[0].price).toBeNull();
  });

  it('adds nothing the second time round (§7)', () => {
    const units = [
      unit(),
      unit({ id: 2, name: '3 BHK', floorPlanImageUrl: 'https://e.com/3.png' }),
    ];

    const first = floorPlansFromUnits(units, []);
    expect(first).toHaveLength(2);

    const second = floorPlansFromUnits(units, first);
    expect(second).toEqual([]);
  });

  it('skips a title the list already holds, whatever its case', () => {
    expect(
      floorPlansFromUnits([unit()], [{ title: '  2 bhk ', imageUrl: 'https://e.com/x.png' }])
    ).toEqual([]);
  });

  it('skips a drawing the list already holds under another title', () => {
    expect(
      floorPlansFromUnits(
        [unit()],
        [{ title: '2 BHK — 1,180 sq ft', imageUrl: 'https://example.com/2bhk.png' }]
      )
    ).toEqual([]);
  });

  it('does not offer the same unit twice inside one press', () => {
    expect(floorPlansFromUnits([unit(), unit({ id: 2 })], [])).toHaveLength(1);
  });
});
