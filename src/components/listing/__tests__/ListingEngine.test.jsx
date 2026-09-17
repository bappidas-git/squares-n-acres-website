/**
 * `ListingEngine` — the server-driven listing: what it asks for, what it shows
 * of the facets, and what it offers when nothing matches.
 */

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { useLocation } from 'react-router-dom';

import ListingEngine from '../ListingEngine';
import propertyService from '../../../services/propertyService';
import renderWith from '../../../test-utils';
import { listingRouteByKey } from '../listingRoutes';

jest.mock('../../../services/propertyService', () => ({
  __esModule: true,
  default: { list: jest.fn(), suggestions: jest.fn() },
}));

const master = {
  localities: [
    { id: 4, name: 'Whitefield', slug: 'whitefield', order: 1, isActive: true },
    { id: 7, name: 'Hebbal', slug: 'hebbal', order: 2, isActive: true },
  ],
  propertyTypes: [
    {
      id: 1,
      name: 'Apartments',
      slug: 'apartments',
      segment: 'residential',
      order: 1,
      isActive: true,
    },
    { id: 2, name: 'Villas', slug: 'villas', segment: 'residential', order: 2, isActive: true },
  ],
  amenities: [],
  badges: [],
  developers: [],
  banks: [],
  cities: [{ id: 1, name: 'Bengaluru', slug: 'bengaluru' }],
  loading: false,
};

jest.mock('../../../contexts/MasterDataContext', () => ({
  __esModule: true,
  useMasterData: () => master,
}));

const property = (id, title) => ({
  id,
  slug: `listing-${id}`,
  title,
  listingType: 'sale',
  constructionStatus: 'ready-to-move',
  images: [{ id: 1, url: 'https://example.test/cover.jpg', alt: 'Cover', isCover: true }],
  pricing: { price: 14200000 },
  area: { superBuiltUpArea: 1650, areaUnit: 'sqft' },
  configuration: { bedrooms: 3 },
  location: {
    locality: { id: 4, name: 'Whitefield', slug: 'whitefield' },
    city: { id: 1, name: 'Bengaluru', slug: 'bengaluru' },
  },
});

const FACETS = {
  propertyType: [
    { id: 1, name: 'Apartments', count: 18 },
    { id: 2, name: 'Villas', count: 6 },
  ],
  locality: [
    { id: 4, name: 'Whitefield', count: 12 },
    { id: 7, name: 'Hebbal', count: 9 },
  ],
  bedrooms: [
    { value: 3, count: 14 },
    { value: 2, count: 8 },
  ],
  constructionStatus: [{ value: 'ready-to-move', count: 21 }],
};

const answer = (items, total = items.length) => ({
  data: items,
  meta: {
    page: 1,
    perPage: 12,
    total,
    totalPages: Math.max(1, Math.ceil(total / 12)),
    facets: FACETS,
  },
});

/** Shows the query string the engine has written. */
const UrlProbe = () => {
  const location = useLocation();
  return <span data-testid="search">{location.search}</span>;
};

const render = (routeKey = 'buy', { entries = ['/buy'], ...props } = {}) =>
  renderWith(
    <>
      <ListingEngine routeConfig={listingRouteByKey(routeKey)} {...props} />
      <UrlProbe />
    </>,
    { initialEntries: entries }
  );

const lastCall = () => propertyService.list.mock.calls.at(-1)[0];

beforeEach(() => {
  jest.clearAllMocks();
  propertyService.suggestions.mockResolvedValue({ data: null });
  propertyService.list.mockResolvedValue(
    answer([property(1, 'Lakeview Heights'), property(2, 'Aurelia Park Residences')], 24)
  );
});

describe('the request', () => {
  it('sends the route’s fixed filters and the contract’s defaults', async () => {
    render('buy');

    await waitFor(() => expect(propertyService.list).toHaveBeenCalled());
    expect(lastCall()).toMatchObject({
      listingType: 'sale',
      page: 1,
      perPage: 12,
      sort: 'relevance',
    });
  });

  it('reads the filters out of the URL', async () => {
    render('properties', {
      entries: ['/properties?localityId=4&bedrooms=3&sort=price-desc&page=2'],
    });

    await waitFor(() => expect(propertyService.list).toHaveBeenCalled());
    expect(lastCall()).toMatchObject({
      localityId: ['4'],
      bedrooms: ['3'],
      sort: 'price-desc',
      page: 2,
    });
  });

  it('ignores a price that is not a number (§7)', async () => {
    render('buy', { entries: ['/buy?minPrice=abc'] });

    await waitFor(() => expect(propertyService.list).toHaveBeenCalled());
    expect(lastCall().minPrice).toBeUndefined();
  });
});

describe('the results', () => {
  it('heads the page with the filters and the count', async () => {
    render('buy');

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Properties for sale in Bengaluru'
    );
    expect(await screen.findByText('24 properties')).toBeInTheDocument();
    expect(await screen.findByText('Lakeview Heights')).toBeInTheDocument();
  });

  it('names the locality in the heading once one is chosen', async () => {
    render('buy', { entries: ['/buy?localityId=4'] });

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Properties for sale in Whitefield, Bengaluru'
    );
  });
});

describe('the facets', () => {
  it('counts each choice against the result set (§5.7)', async () => {
    render('buy');

    // The count sits inside the option's own label, so it is part of the
    // checkbox's accessible name: "Whitefield 12".
    expect(await screen.findByRole('checkbox', { name: /Whitefield\D*12/ })).toBeInTheDocument();
    expect(await screen.findByRole('checkbox', { name: /Apartments\D*18/ })).toBeInTheDocument();
  });

  it('applies a choice to the URL and to the next request', async () => {
    render('buy');

    fireEvent.click(await screen.findByRole('checkbox', { name: /Whitefield/ }));

    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent('localityId=4'));
    await waitFor(() => expect(lastCall()).toMatchObject({ localityId: ['4'] }));
  });

  it('shows what is applied as a removable chip', async () => {
    render('buy', { entries: ['/buy?localityId=4'] });

    const chip = await screen.findByRole('button', { name: /Whitefield/ });
    fireEvent.click(chip);

    await waitFor(() => expect(screen.getByTestId('search')).not.toHaveTextContent('localityId'));
  });

  it('locks the chip of a filter the route fixed', async () => {
    render('buy');

    await screen.findByText('Filters:');
    expect(screen.getByText('Buy')).toBeInTheDocument();
    expect(screen.getByText('(set by this page)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Buy/ })).toBeNull();
  });
});

describe('the empty state', () => {
  beforeEach(() => {
    propertyService.list.mockResolvedValue({
      data: [],
      meta: { page: 1, perPage: 12, total: 0, totalPages: 0, facets: FACETS },
    });
  });

  it('offers to drop the most restrictive filter first', async () => {
    render('buy', { entries: ['/buy?minPrice=10000000&localityId=4&amenityIds=2'] });

    expect(await screen.findByText('No properties match these filters')).toBeInTheDocument();

    const offers = screen.getAllByRole('button', { name: /^Any / }).map((node) => node.textContent);
    expect(offers).toEqual(['Any budget', 'Any amenities', 'Any locality']);
  });

  it('drops the filter the visitor picked', async () => {
    render('buy', { entries: ['/buy?minPrice=10000000'] });

    fireEvent.click(await screen.findByRole('button', { name: 'Any budget' }));

    await waitFor(() => expect(screen.getByTestId('search')).not.toHaveTextContent('minPrice'));
  });

  it('offers the whole locality when one is filtered', async () => {
    render('buy', { entries: ['/buy?localityId=4&minPrice=10000000'] });

    expect(
      await screen.findByRole('button', { name: 'View all in Whitefield' })
    ).toBeInTheDocument();
  });
});

describe('an embedded engine', () => {
  it('keeps its filters out of the page’s query string and pages through `?p=`', async () => {
    propertyService.list.mockResolvedValue(answer([property(1, 'Lakeview Heights')], 30));

    renderWith(
      <>
        <ListingEngine
          embedded
          headingLevel={null}
          routeConfig={{
            key: 'embed',
            path: '/localities/whitefield',
            fixed: {},
            noun: 'Properties',
            breadcrumbs: [],
          }}
          fixedParams={{ localityId: ['4'], listingType: 'sale' }}
        />
        <UrlProbe />
      </>,
      { initialEntries: ['/localities/whitefield'] }
    );

    await waitFor(() => expect(propertyService.list).toHaveBeenCalled());
    expect(lastCall()).toMatchObject({ localityId: ['4'], listingType: 'sale' });
    expect(screen.getByTestId('search')).toHaveTextContent('');
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: 'Page 2' }));

    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent('p=2'));
    await waitFor(() => expect(lastCall()).toMatchObject({ page: 2 }));
  });
});
