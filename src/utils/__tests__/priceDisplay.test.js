import { hasPriceRange, showsOnwards } from '../priceDisplay';

const sale = (pricing, extra = {}) => ({ listingType: 'sale', pricing, ...extra });

describe('the headline rules the price card and the form preview share', () => {
  it('prints one price as the price, not as a starting figure', () => {
    // The preview used to add "onwards" under every sale price.
    expect(showsOnwards(sale({ price: 15000000 }))).toBe(false);
  });

  it('adds "onwards" to the bottom of a range or of several unit types', () => {
    expect(showsOnwards(sale({ priceRangeMin: 8500000, priceRangeMax: 12000000 }))).toBe(true);
    expect(
      showsOnwards(
        sale({ price: 15000000 }, { unitConfigurations: [{ name: '2 BHK' }, { name: '3 BHK' }] })
      )
    ).toBe(true);
  });

  it('never for a rental or a price on request', () => {
    expect(showsOnwards({ listingType: 'rent', pricing: { rentPerMonth: 45000 } })).toBe(false);
    expect(showsOnwards(sale({ priceOnRequest: true, priceRangeMin: 1, priceRangeMax: 2 }))).toBe(
      false
    );
  });

  it('calls a range a range only when its two ends differ', () => {
    expect(hasPriceRange(sale({ priceRangeMin: 9000000, priceRangeMax: 9000000 }))).toBe(false);
    expect(hasPriceRange(sale({ priceRangeMin: 9000000, priceRangeMax: 12000000 }))).toBe(true);
  });
});
