import { screen } from '@testing-library/react';

import TitleBlock from '../TitleBlock';
import renderWith from '../../../../test-utils';

/** A §6.1 record carrying both ways of saying the listing is verified. */
const property = {
  id: 1,
  slug: 'lakeview-heights-3-bhk-whitefield',
  title: 'Lakeview Heights – 3 BHK Apartment in Whitefield',
  listingType: 'sale',
  isVerified: true,
  badges: [
    { id: 1, name: 'Ready to Move', slug: 'ready-to-move' },
    { id: 2, name: 'Verified', slug: 'verified' },
  ],
  location: {
    locality: { id: 1, name: 'Whitefield', slug: 'whitefield' },
    city: { id: 1, name: 'Bengaluru', slug: 'bengaluru' },
    showExactLocation: false,
  },
};

describe('TitleBlock', () => {
  it('prints "Verified" once, as the built-in chip, and keeps the other badges', () => {
    renderWith(<TitleBlock property={property} />);

    expect(screen.getAllByText('Verified')).toHaveLength(1);
    expect(screen.getByText('Ready to Move')).toBeInTheDocument();
    expect(screen.getByText('For sale')).toBeInTheDocument();
  });

  it('says nothing about verification when the record is not verified', () => {
    renderWith(
      <TitleBlock property={{ ...property, isVerified: false, badges: [property.badges[0]] }} />
    );

    expect(screen.queryByText('Verified')).not.toBeInTheDocument();
    expect(screen.getByText('Ready to Move')).toBeInTheDocument();
  });

  it('names the locality and says the exact address is shared on request', () => {
    renderWith(<TitleBlock property={property} />);

    expect(screen.getByText('Whitefield, Bengaluru')).toBeInTheDocument();
    expect(screen.getByText('Exact location shared on request.')).toBeInTheDocument();
  });
});
