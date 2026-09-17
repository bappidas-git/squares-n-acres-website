/**
 * `HeroSearch` — the tab strip, the budget buckets that follow it, and the URL
 * a submission produces.
 */

import { fireEvent, screen } from '@testing-library/react';
import { useLocation } from 'react-router-dom';

import HeroSearch, { buildSearchUrl, resolveTabs } from '../HeroSearch';
import renderWith from '../../../../test-utils';

const master = {
  propertyTypes: [
    { id: 1, name: 'Apartments', slug: 'apartments', segment: 'residential', order: 1 },
    { id: 2, name: 'Villas', slug: 'villas', segment: 'residential', order: 2 },
    { id: 11, name: 'Office Spaces', slug: 'office-spaces', segment: 'commercial', order: 11 },
    { id: 9, name: 'Residential Plots', slug: 'residential-plots', segment: 'land', order: 9 },
  ],
  localities: [],
  amenities: [],
  badges: [],
  developers: [],
  banks: [],
  cities: [],
  loading: false,
};

jest.mock('../../../../contexts/MasterDataContext', () => ({
  __esModule: true,
  useMasterData: () => master,
}));

// The type-ahead has its own suite; here it is a box that takes words.
jest.mock('../../../common/GlobalSearch', () => ({
  __esModule: true,
  default: ({ inputId, value, onChange }) => (
    <input
      id={inputId}
      data-testid="global-search"
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
    />
  ),
}));

/** Prints the current address, so a test can assert where a submit landed. */
function Address() {
  const location = useLocation();
  return <output data-testid="address">{`${location.pathname}${location.search}`}</output>;
}

const renderHero = (props) =>
  renderWith(
    <>
      <HeroSearch {...props} />
      <Address />
    </>,
    { initialEntries: ['/'] }
  );

const address = () => screen.getByTestId('address').textContent;
const budgetOptions = () =>
  Array.from(screen.getByLabelText('Budget').options).map((option) => option.textContent);

describe('resolveTabs', () => {
  it('falls back to all five when settings name none', () => {
    expect(resolveTabs(undefined).map((tab) => tab.value)).toEqual([
      'sale',
      'rent',
      'lease',
      'commercial',
      'plots',
    ]);
  });

  it('keeps the order settings chose and drops a tab that is not a tab', () => {
    expect(resolveTabs(['plots', 'sale', 'nonsense']).map((tab) => tab.value)).toEqual([
      'plots',
      'sale',
    ]);
  });
});

describe('buildSearchUrl', () => {
  it('sends nothing when nothing was chosen', () => {
    expect(buildSearchUrl('sale', { bedrooms: [] })).toBe('/buy');
  });

  it('writes the contract\u2019s own parameter names', () => {
    expect(
      buildSearchUrl('rent', {
        localityId: 4,
        propertyTypeId: '1',
        budget: '20000-35000',
        bedrooms: [2, 3],
      })
    ).toBe('/rent?propertyTypeId=1&localityId=4&bedrooms=2%2C3&minPrice=20000&maxPrice=35000');
  });

  it('drops the bedrooms of a tab that has none', () => {
    expect(buildSearchUrl('plots', { bedrooms: [2] })).toBe('/plots');
  });

  it('leaves `maxPrice` out of the open-ended bucket', () => {
    expect(buildSearchUrl('sale', { budget: '100000000-', bedrooms: [] })).toBe(
      '/buy?minPrice=100000000'
    );
  });

  it('follows the commercial toggle to the lease route', () => {
    expect(buildSearchUrl('commercial', { intent: 'lease', bedrooms: [] })).toBe('/lease');
  });
});

describe('HeroSearch', () => {
  it('renders no tab strip for a single configured tab (§7)', () => {
    renderHero({ tabs: ['sale'] });
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Budget')).toBeInTheDocument();
  });

  it('switches the budget buckets when the tab changes', () => {
    renderHero({});

    expect(budgetOptions()).toContain('₹75 L – ₹1 Cr');
    expect(budgetOptions()).not.toContain('₹20 K – ₹35 K');

    fireEvent.click(screen.getByRole('tab', { name: 'Rent' }));

    expect(budgetOptions()).toContain('₹20 K – ₹35 K');
    expect(budgetOptions()).not.toContain('₹75 L – ₹1 Cr');
  });

  it('offers the property types of the tab it is on', () => {
    renderHero({});
    expect(screen.getByRole('option', { name: 'Apartments' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Office Spaces' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Commercial' }));
    expect(screen.getByRole('option', { name: 'Office Spaces' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Apartments' })).not.toBeInTheDocument();
  });

  it('builds the listing URL from the whole form', () => {
    renderHero({});

    fireEvent.click(screen.getByRole('tab', { name: 'Rent' }));
    fireEvent.change(screen.getByTestId('global-search'), { target: { value: 'koramangala' } });
    fireEvent.change(screen.getByLabelText('Property type'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Budget'), { target: { value: '20000-35000' } });
    fireEvent.click(screen.getByRole('button', { name: '2 BHK' }));
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    // The parameters come out in the listing engine's own canonical order.
    expect(address()).toBe(
      '/rent?propertyTypeId=1&bedrooms=2&minPrice=20000&maxPrice=35000&q=koramangala'
    );
  });

  it('never carries a budget across a change of tab (D90)', () => {
    renderHero({});

    fireEvent.change(screen.getByLabelText('Budget'), { target: { value: '10000000-15000000' } });
    fireEvent.click(screen.getByRole('tab', { name: 'Rent' }));
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(address()).toBe('/rent');
  });

  it('keeps the BHK chips off the tabs that have no bedrooms', () => {
    renderHero({});
    expect(screen.getByRole('button', { name: '3 BHK' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Plots' }));
    expect(screen.queryByRole('button', { name: '3 BHK' })).not.toBeInTheDocument();
  });

  it('sends the commercial tab to /lease when the toggle says lease', () => {
    renderHero({});

    fireEvent.click(screen.getByRole('tab', { name: 'Commercial' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lease' }));
    fireEvent.change(screen.getByLabelText('Property type'), { target: { value: '11' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(address()).toBe('/lease?propertyTypeId=11');
  });
});
