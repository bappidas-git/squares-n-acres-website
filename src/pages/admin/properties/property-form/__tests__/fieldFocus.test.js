import { findFieldElement, propertyFieldId, resolveFieldPath } from '../fieldFocus';
import { roundCoordinate } from '../components/coordinates';

describe('resolveFieldPath', () => {
  it('translates what the SEO analysers call a field into the form’s own', () => {
    expect(resolveFieldPath('content')).toBe('description');
    expect(resolveFieldPath('excerpt')).toBe('shortDescription');
  });

  it('points "pricing" at the rent on a rental and the price on a sale', () => {
    expect(resolveFieldPath('pricing', { listingType: 'lease' })).toBe('pricing.rentPerMonth');
    expect(resolveFieldPath('pricing', { listingType: 'sale' })).toBe('pricing.price');
  });

  it('points "reraNumber" at the switch while the number field does not exist', () => {
    expect(resolveFieldPath('reraNumber', { reraRegistered: false })).toBe('reraRegistered');
    expect(resolveFieldPath('reraNumber', { reraRegistered: true })).toBe('reraNumber');
  });
});

describe('findFieldElement', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('finds a control with no id by the message it carries', () => {
    document.body.innerHTML = `
      <div role="tabpanel">
        <input aria-invalid="true" aria-describedby="a-error" />
        <span id="a-error">Name this place.</span>
        <input id="pin" aria-invalid="true" aria-describedby="b-error" />
        <span id="b-error">A pincode is six digits.</span>
      </div>
      <section data-error-summary></section>`;

    expect(findFieldElement('location.pincode', { message: 'A pincode is six digits.' }).id).toBe(
      'pin'
    );
  });

  it('prefers its own id, then an ancestor’s', () => {
    document.body.innerHTML = `<div id="${propertyFieldId('images')}"></div>`;
    expect(findFieldElement('images.3.alt').id).toBe('property-images');
  });

  it('falls back to the error summary only when asked to', () => {
    document.body.innerHTML = '<div role="tabpanel"></div><section data-error-summary></section>';
    expect(findFieldElement('location.cityId', { fallback: false })).toBeNull();
    expect(findFieldElement('location.cityId')).toHaveAttribute('data-error-summary');
  });
});

describe('roundCoordinate', () => {
  it('keeps an empty coordinate empty rather than writing 0', () => {
    expect(roundCoordinate(null)).toBeNull();
    expect(roundCoordinate('')).toBeNull();
    expect(roundCoordinate('12.97123456')).toBe(12.971235);
  });
});
