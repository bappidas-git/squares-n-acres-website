import { screen } from '@testing-library/react';

import TestimonialsSection, { averageRating, shownTestimonials } from '../TestimonialsSection';
import renderWith from '../../../../test-utils';

/** The quotes an editor tied to this listing with the testimonial form's "Property" box. */
const quote = (patch = {}) => ({
  id: 1,
  name: 'R. Kumar',
  designation: 'Home buyer',
  location: 'Whitefield, Bengaluru',
  rating: 5,
  message: 'They found us the right flat in a week.',
  propertyId: 1,
  isActive: true,
  isSample: false,
  ...patch,
});

const property = { id: 1, title: '3 BHK in Greenfield Axis', projectName: 'Greenfield Axis' };

describe('shownTestimonials', () => {
  const ORIGINAL_ENV = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_ENV;
  });

  it('drops an inactive quote, and a sample in a production build (D41)', () => {
    const rows = [quote(), quote({ id: 2, isActive: false }), quote({ id: 3, isSample: true })];

    expect(shownTestimonials(rows).map((row) => row.id)).toEqual([1, 3]);

    process.env.NODE_ENV = 'production';
    expect(shownTestimonials(rows).map((row) => row.id)).toEqual([1]);
  });

  it('is empty for anything that is not a list', () => {
    expect(shownTestimonials(undefined)).toEqual([]);
    expect(shownTestimonials({ data: [] })).toEqual([]);
  });
});

describe('averageRating', () => {
  it('is the mean to one decimal place, and null when nothing is rated', () => {
    expect(averageRating([quote({ rating: 5 }), quote({ rating: 4 }), quote({ rating: 4 })])).toBe(
      4.3
    );
    expect(averageRating([quote({ rating: null })])).toBeNull();
    expect(averageRating([])).toBeNull();
  });
});

describe('TestimonialsSection', () => {
  it('names the project, shows the quotes and the clients’ mean rating', () => {
    renderWith(
      <TestimonialsSection
        property={property}
        testimonials={[quote(), quote({ id: 2, name: 'S. Menon', rating: 4 })]}
      />
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'What clients say about Greenfield Axis' })
    ).toBeInTheDocument();
    expect(screen.getByText('From clients who bought or rented here.')).toBeInTheDocument();
    expect(screen.getByText('R. Kumar')).toBeInTheDocument();
    expect(screen.getByText('S. Menon')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '4.5 out of 5, 2 reviews' })).toBeInTheDocument();
    // The page's heading replaces the carousel's own.
    expect(screen.queryByText('What our clients say')).not.toBeInTheDocument();
  });

  it('is the scroll target of its navigation item', () => {
    renderWith(<TestimonialsSection property={property} testimonials={[quote()]} />);
    expect(
      screen.getByRole('region', { name: 'What clients say about Greenfield Axis' })
    ).toHaveAttribute('id', 'section-testimonials');
    expect(screen.getByText('From a client who bought or rented here.')).toBeInTheDocument();
  });

  it('renders nothing when no quote survives the filter', () => {
    const { container } = renderWith(
      <TestimonialsSection property={property} testimonials={[quote({ isActive: false })]} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
