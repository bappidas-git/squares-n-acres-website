import { screen } from '@testing-library/react';

import Price from '../Price';
import renderWith from '../../../test-utils';

describe('Price', () => {
  it('formats crore and lakh amounts', () => {
    const { rerender } = renderWith(<Price value={14200000} />);
    expect(screen.getByText('₹1.42 Cr')).toBeInTheDocument();

    rerender(<Price value={8550000} />);
    expect(screen.getByText('₹85.5 L')).toBeInTheDocument();
  });

  it('appends /month for rent listings', () => {
    renderWith(<Price value={45000} listingType="rent" />);
    expect(screen.getByText('₹45,000/month')).toBeInTheDocument();
  });

  it('renders a range and the on-request label', () => {
    const { rerender } = renderWith(<Price min={8500000} max={12000000} />);
    expect(screen.getByText('₹85 L – ₹1.2 Cr')).toBeInTheDocument();

    rerender(<Price value={8500000} onRequest />);
    expect(screen.getByText('Price on Request')).toBeInTheDocument();
  });

  it('renders the em dash when there is no price', () => {
    renderWith(<Price value={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
