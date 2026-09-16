import { screen } from '@testing-library/react';

import PropertyCard from '../PropertyCard';
import renderWith from '../../../test-utils';

/** A trimmed `PropertySummary` of §6.1 — only what the card reads. */
const property = {
  id: 1,
  slug: 'lakeview-heights-3-bhk-whitefield',
  title: 'Lakeview Heights – 3 BHK Apartment in Whitefield',
  listingType: 'sale',
  constructionStatus: 'under-construction',
  isVerified: true,
  isFeatured: true,
  images: [
    { id: 1, url: 'https://example.test/second.jpg', alt: 'Second', isCover: false },
    { id: 2, url: 'https://example.test/cover.jpg', alt: 'The cover shot', isCover: true },
  ],
  pricing: { price: 14200000, priceOnRequest: false },
  area: { superBuiltUpArea: 1650, carpetArea: 1180, areaUnit: 'sqft' },
  configuration: { bedrooms: 3, bathrooms: 3 },
  propertyType: { id: 1, name: 'Apartments', slug: 'apartments' },
  badges: [{ id: 1, name: 'New Launch', slug: 'new-launch', color: 'info', icon: 'mdi:new-box' }],
  location: {
    locality: { id: 1, name: 'Whitefield', slug: 'whitefield' },
    city: { id: 1, name: 'Bengaluru', slug: 'bengaluru' },
  },
};

describe('PropertyCard', () => {
  it('renders the price, area, configuration and status of the new shape', () => {
    renderWith(<PropertyCard property={property} />);

    expect(screen.getByText('₹1.42 Cr')).toBeInTheDocument();
    expect(screen.getByText('1,650 sq ft')).toBeInTheDocument();
    expect(screen.getByText('3 BHK')).toBeInTheDocument();
    expect(screen.getByText('Under Construction')).toBeInTheDocument();
    expect(screen.getByText('Whitefield, Bengaluru')).toBeInTheDocument();
  });

  it('uses the image marked as the cover, with its own alt text', () => {
    renderWith(<PropertyCard property={property} />);

    const image = screen.getByAltText('The cover shot');
    expect(image).toHaveAttribute('src', 'https://example.test/cover.jpg');
  });

  it('shows the badges and the verified mark', () => {
    renderWith(<PropertyCard property={property} />);

    expect(screen.getByText('New Launch')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('For sale')).toBeInTheDocument();
  });

  it('links to the details page by slug', () => {
    renderWith(<PropertyCard property={property} />);

    expect(screen.getByRole('link', { name: property.title })).toHaveAttribute(
      'href',
      '/properties/lakeview-heights-3-bhk-whitefield'
    );
  });

  it('prices a rent listing per month and falls back to the property type', () => {
    renderWith(
      <PropertyCard
        property={{
          ...property,
          listingType: 'rent',
          pricing: { rentPerMonth: 45000 },
          configuration: { bedrooms: null },
        }}
      />
    );

    expect(screen.getByText('₹45,000/month')).toBeInTheDocument();
    expect(screen.getByText('For rent')).toBeInTheDocument();
    expect(screen.getByText('Apartments')).toBeInTheDocument();
  });

  it('says "Price on Request" rather than inventing a number', () => {
    renderWith(
      <PropertyCard property={{ ...property, pricing: { price: null, priceOnRequest: true } }} />
    );

    expect(screen.getByText('Price on Request')).toBeInTheDocument();
  });

  it('renders nothing without a property', () => {
    const { container } = renderWith(<PropertyCard property={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('carries a shortlist heart that says what pressing it would do', () => {
    renderWith(<PropertyCard property={property} />);

    const heart = screen.getByRole('button', { name: `Save to shortlist — ${property.title}` });
    expect(heart).toHaveAttribute('aria-pressed', 'false');
  });
});
