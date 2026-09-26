import { screen } from '@testing-library/react';

import ListingsCountLink from '../ListingsCountLink';
import renderWith from '../../../../test-utils';

describe('ListingsCountLink (prompt 51)', () => {
  it('opens the live listings it counts', () => {
    renderWith(<ListingsCountLink count={3} param="localityId" value={7} describe="in Hebbal" />);

    const link = screen.getByRole('link', { name: '3 live listings in Hebbal' });
    expect(link).toHaveAttribute('href', '/admin/properties?localityId=7&isActive=true');
    expect(link).toHaveTextContent('3');
  });

  it('names one listing as one', () => {
    renderWith(<ListingsCountLink count={1} param="segment" value="plots" describe="in Plots" />);
    expect(screen.getByRole('link', { name: '1 live listing in Plots' })).toHaveAttribute(
      'href',
      '/admin/properties?segment=plots&isActive=true'
    );
  });

  it('is a number, not a link, when there is nothing to open', () => {
    renderWith(<ListingsCountLink count={0} param="badgeIds" value={2} describe="with Hot" />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
