import { Route, Routes } from 'react-router-dom';
import { screen, waitFor } from '@testing-library/react';

import ApiError from '../../../services/apiError';
import LocalityDetail from '../LocalityDetail';
import ToastProvider from '../../../components/common/ToastProvider';
import masterDataService from '../../../services/masterDataService';
import propertyService from '../../../services/propertyService';
import renderWith from '../../../test-utils';

jest.mock('../../../services/masterDataService', () => ({
  __esModule: true,
  default: { localities: { bySlug: jest.fn() } },
}));

jest.mock('../../../services/propertyService', () => ({
  __esModule: true,
  default: { list: jest.fn() },
}));

/** A §6.2 locality with every section filled in. */
const whitefield = {
  id: 1,
  name: 'Whitefield',
  slug: 'whitefield',
  zone: 'east',
  city: { id: 1, name: 'Bengaluru', slug: 'bengaluru' },
  heroImageUrl: 'https://example.test/whitefield.jpg',
  description: '<p>An established technology corridor on the eastern edge.</p>',
  shortDescription: 'Gated apartments, metro stations and international schools.',
  highlights: ['Purple Line metro connectivity', 'International schools inside the catchment'],
  connectivity: [
    { label: 'Metro', value: 'Purple Line, along Whitefield Main Road' },
    { label: 'Kempegowda Airport', value: '45 km' },
  ],
  pincodes: ['560066', '560067'],
  latitude: 12.9698,
  longitude: 77.75,
  avgPricePerSqft: 8200,
  priceTrendNote: 'Indicative range for apartments; confirm against current market data.',
  propertyCount: 3,
  seo: { description: 'Property in Whitefield, Bengaluru.' },
};

const property = {
  id: 11,
  slug: 'lakeview-heights-3-bhk-whitefield',
  title: 'Lakeview Heights – 3 BHK Apartment in Whitefield',
  listingType: 'sale',
  images: [{ id: 1, url: 'https://example.test/cover.jpg', alt: 'Cover', isCover: true }],
  pricing: { price: 14200000 },
  area: { superBuiltUpArea: 1650, areaUnit: 'sqft' },
  configuration: { bedrooms: 3 },
  location: {
    locality: { id: 1, name: 'Whitefield', slug: 'whitefield' },
    city: { id: 1, name: 'Bengaluru', slug: 'bengaluru' },
  },
};

const envelope = (data, meta) => ({ data, meta: meta ?? null });

const render = () =>
  renderWith(
    <ToastProvider>
      <Routes>
        <Route path="/localities/:slug" element={<LocalityDetail />} />
      </Routes>
    </ToastProvider>,
    { initialEntries: ['/localities/whitefield'] }
  );

beforeEach(() => {
  jest.clearAllMocks();
  masterDataService.localities.bySlug.mockResolvedValue(envelope(whitefield));
  propertyService.list.mockResolvedValue(
    envelope([property], { page: 1, perPage: 6, total: 3, totalPages: 1 })
  );
});

describe('LocalityDetail', () => {
  it('renders the guide of a locality that carries every section', async () => {
    render();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Properties in Whitefield' })
    ).toBeInTheDocument();

    expect(screen.getByText('East Bengaluru · Bengaluru')).toBeInTheDocument();
    expect(screen.getByText('₹8,200/sq ft')).toBeInTheDocument();
    expect(screen.getByText('560066, 560067')).toBeInTheDocument();

    expect(screen.getByRole('heading', { level: 2, name: 'About Whitefield' })).toBeInTheDocument();
    expect(
      screen.getByText('An established technology corridor on the eastern edge.')
    ).toBeInTheDocument();
    expect(screen.getByText('Purple Line metro connectivity')).toBeInTheDocument();

    expect(screen.getByRole('heading', { level: 2, name: 'Connectivity' })).toBeInTheDocument();
    expect(screen.getByText('Metro')).toBeInTheDocument();
    expect(screen.getByText('Purple Line, along Whitefield Main Road')).toBeInTheDocument();

    expect(screen.getByRole('heading', { level: 2, name: 'Price trend' })).toBeInTheDocument();
    expect(screen.getByTitle('Map of Whitefield, Bengaluru').getAttribute('src')).toBe(
      'https://www.google.com/maps?q=12.9698,77.75&z=15&output=embed'
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Looking for a home in Whitefield?' })
    ).toBeInTheDocument();
  });

  it('asks the API for the locality named in the URL', async () => {
    render();

    await screen.findByRole('heading', { level: 1, name: 'Properties in Whitefield' });
    expect(masterDataService.localities.bySlug).toHaveBeenCalledWith(
      'whitefield',
      expect.objectContaining({ signal: expect.anything() })
    );
  });

  it('shows the listings of the locality with a link to the full search', async () => {
    render();

    expect(await screen.findByRole('link', { name: /View all 3 properties/ })).toHaveAttribute(
      'href',
      '/properties?localityId=1'
    );
    expect(
      screen.getByRole('heading', { level: 2, name: 'Properties in Whitefield' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Lakeview Heights – 3 BHK Apartment in Whitefield')
    ).toBeInTheDocument();
    expect(propertyService.list).toHaveBeenCalledWith(
      expect.objectContaining({ localityId: 1, perPage: 6, sort: 'relevance' }),
      expect.anything()
    );
  });

  it('hides the sections a thin locality has nothing for', async () => {
    masterDataService.localities.bySlug.mockResolvedValue(
      envelope({
        id: 2,
        name: 'Hennur',
        slug: 'hennur',
        zone: null,
        city: { id: 1, name: 'Bengaluru', slug: 'bengaluru' },
        description: '',
        shortDescription: '',
        highlights: [],
        connectivity: [],
        pincodes: [],
        latitude: null,
        longitude: null,
        avgPricePerSqft: null,
        priceTrendNote: null,
        propertyCount: 0,
      })
    );
    propertyService.list.mockResolvedValue(
      envelope([], { page: 1, perPage: 6, total: 0, totalPages: 0 })
    );

    render();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Properties in Hennur' })
    ).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Properties in Hennur', level: 2 })).toBeNull()
    );
    expect(screen.queryByRole('heading', { name: 'About Hennur' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Connectivity' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Price trend' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Hennur on the map' })).toBeNull();
    expect(screen.queryByTitle(/^Map of/)).toBeNull();

    // The enquiry form is never hidden: a lead must always be possible.
    expect(
      screen.getByRole('heading', { level: 2, name: 'Looking for a home in Hennur?' })
    ).toBeInTheDocument();
  });

  it('renders the 404 page for a slug the API does not know', async () => {
    masterDataService.localities.bySlug.mockRejectedValue(
      new ApiError({ status: 404, message: 'Locality not found.' })
    );

    render();

    expect(
      await screen.findByRole('heading', { level: 1, name: /Page Not Found/i })
    ).toBeInTheDocument();
    expect(screen.queryByText('Properties in Whitefield')).toBeNull();
  });

  it('offers a retry when the API fails for another reason', async () => {
    masterDataService.localities.bySlug.mockRejectedValue(
      new ApiError({ status: 500, message: 'The server is having a bad day.' })
    );

    render();

    expect(await screen.findByText('We could not load this locality')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
