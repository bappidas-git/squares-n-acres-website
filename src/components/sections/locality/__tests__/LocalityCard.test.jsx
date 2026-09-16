import { screen } from '@testing-library/react';

import LocalityCard from '../LocalityCard';
import renderWith from '../../../../test-utils';

/** A §6.2 locality, trimmed to what the card reads. */
const locality = {
  id: 1,
  name: 'Whitefield',
  slug: 'whitefield',
  zone: 'east',
  heroImageUrl: 'https://example.test/whitefield.jpg',
  avgPricePerSqft: 8200,
  propertyCount: 24,
  isFeatured: true,
};

describe('LocalityCard', () => {
  it('renders the name, zone, indicative price and listing count', () => {
    renderWith(<LocalityCard locality={locality} />);

    expect(screen.getByRole('heading', { level: 3, name: 'Whitefield' })).toBeInTheDocument();
    expect(screen.getByText('East Bengaluru')).toBeInTheDocument();
    expect(screen.getByText('₹8,200/sq ft avg')).toBeInTheDocument();
    expect(screen.getByText('24 properties')).toBeInTheDocument();
    expect(screen.getByText('Featured')).toBeInTheDocument();
  });

  it('links to the locality guide', () => {
    renderWith(<LocalityCard locality={locality} />);

    expect(screen.getByRole('link')).toHaveAttribute('href', '/localities/whitefield');
  });

  it('shows the image as decoration — the link already names the locality', () => {
    renderWith(<LocalityCard locality={locality} />);

    const image = screen.getByAltText('');
    expect(image).toHaveAttribute('src', 'https://example.test/whitefield.jpg');
  });

  it('keeps the image box and draws the monogram when there is no photograph', () => {
    renderWith(<LocalityCard locality={{ ...locality, heroImageUrl: null }} />);

    expect(screen.getByTestId('lazy-image-placeholder')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Whitefield' })).toBeInTheDocument();
  });

  it('leaves out the price, the zone and the count a locality does not carry', () => {
    renderWith(
      <LocalityCard
        locality={{
          id: 2,
          name: 'Hennur',
          slug: 'hennur',
          zone: null,
          avgPricePerSqft: null,
          propertyCount: undefined,
          isFeatured: false,
        }}
      />
    );

    expect(screen.getByRole('heading', { level: 3, name: 'Hennur' })).toBeInTheDocument();
    expect(screen.queryByText(/sq ft avg/)).not.toBeInTheDocument();
    expect(screen.queryByText(/properties/)).not.toBeInTheDocument();
    expect(screen.queryByText('Featured')).not.toBeInTheDocument();
  });

  it('says "1 property" rather than "1 properties"', () => {
    renderWith(<LocalityCard locality={{ ...locality, propertyCount: 1 }} />);

    expect(screen.getByText('1 property')).toBeInTheDocument();
  });

  it('renders the compact variant as an overlay, without the price row', () => {
    renderWith(<LocalityCard locality={locality} variant="compact" />);

    expect(screen.getByRole('heading', { level: 3, name: 'Whitefield' })).toBeInTheDocument();
    expect(screen.getByText('24 properties')).toBeInTheDocument();
    expect(screen.queryByText('₹8,200/sq ft avg')).not.toBeInTheDocument();
    expect(screen.queryByText('East Bengaluru')).not.toBeInTheDocument();
  });

  it('renders nothing without a record', () => {
    const { container } = renderWith(<LocalityCard locality={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
