/**
 * The accessibility contract of the property page's two custom controls: the
 * gallery and the section chip bar (prompt 42 §4.5).
 */

import { screen } from '@testing-library/react';

import PropertyGallery from '../PropertyGallery';
import SectionNav from '../SectionNav';
import renderWith from '../../../../test-utils';
import {
  expectImageAlt,
  expectNamedControls,
  expectNoDuplicateIds,
} from '../../../../test-utils/a11y';

const IMAGES = [
  { id: 1, url: 'https://example.test/a.jpg', alt: 'The living room', isPrimary: true, order: 1 },
  { id: 2, url: 'https://example.test/b.jpg', alt: 'The balcony', order: 2 },
  { id: 3, url: 'https://example.test/c.jpg', alt: '', order: 3 },
];

const SECTIONS = [
  { key: 'overview', label: 'Overview' },
  { key: 'amenities', label: 'Amenities' },
  { key: 'location', label: 'Location' },
];

describe('PropertyGallery', () => {
  it('names every control and gives every photograph an alt', () => {
    const { container } = renderWith(
      <PropertyGallery images={IMAGES} title="Skyline Crest" propertyId={1} />
    );

    expectNamedControls(container);
    expectImageAlt(container);
    expectNoDuplicateIds(container);
  });
});

describe('SectionNav', () => {
  it('is a named landmark whose current chip says so', () => {
    const { container } = renderWith(<SectionNav sections={SECTIONS} />);

    expect(screen.getByRole('navigation', { name: /sections of this property/i })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'true');

    expectNamedControls(container);
    expectNoDuplicateIds(container);
  });
});
