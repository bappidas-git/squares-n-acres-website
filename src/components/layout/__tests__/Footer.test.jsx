/**
 * The footer's line of the firm's own particulars: the founding year from
 * Site settings leads it, and nothing is drawn for a field left empty.
 */

import { screen } from '@testing-library/react';

import Footer from '../Footer';
import renderWith from '../../../test-utils';

let mockGeneral = {};

jest.mock('../../../contexts/SiteSettingsContext', () => ({
  __esModule: true,
  useSiteSettings: () => ({
    settings: { general: mockGeneral, footer: { showNewsletter: false } },
    siteName: 'Squares N Acres',
    tagline: '',
    getContact: () => ({}),
  }),
}));

jest.mock('../../../contexts/MasterDataContext', () => ({
  __esModule: true,
  useMasterData: () => ({ propertyTypes: [], localities: [], loading: false }),
}));

jest.mock('../../../hooks/useNavPages', () => ({
  __esModule: true,
  default: () => ({ header: [], footer: [] }),
}));

describe('Footer', () => {
  it('prints the established year ahead of the registrations', () => {
    mockGeneral = { establishedYear: 1933, reraNumber: 'PRM/KA/1', gstNumber: '29ABC' };
    renderWith(<Footer />);
    expect(screen.getByText('Est. 1933 · RERA PRM/KA/1 · GST 29ABC')).toBeInTheDocument();
  });

  it('leaves the year out while it is empty', () => {
    mockGeneral = { establishedYear: null, reraNumber: 'PRM/KA/1' };
    renderWith(<Footer />);
    expect(screen.getByText('RERA PRM/KA/1')).toBeInTheDocument();
    expect(screen.queryByText(/Est\./)).not.toBeInTheDocument();
  });
});
