/**
 * `PropertyRow` — what it asks the API for, and when it decides not to exist.
 */

import { screen, waitFor } from '@testing-library/react';

import PropertyRow, { FEATURED_PER_PAGE } from '../PropertyRow';
import propertyService from '../../../../services/propertyService';
import renderWith from '../../../../test-utils';

jest.mock('../../../../services/propertyService', () => ({
  __esModule: true,
  default: { list: jest.fn(), featured: jest.fn() },
}));

const property = (id) => ({
  id,
  slug: `listing-${id}`,
  title: `Listing ${id}`,
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

const answer = (count) => ({
  data: Array.from({ length: count }, (_, index) => property(index + 1)),
  meta: { page: 1, perPage: 8, total: count, totalPages: 1 },
});

const row = (props) =>
  renderWith(
    <PropertyRow title="Featured properties" viewAllHref="/properties?isFeatured=true" {...props} />
  );

beforeEach(() => {
  jest.clearAllMocks();
  propertyService.list.mockResolvedValue(answer(6));
  propertyService.featured.mockResolvedValue(answer(6));
});

describe('PropertyRow', () => {
  it('asks for eight listings with the row’s own filters', async () => {
    row({ params: { listingType: 'rent' } });

    await waitFor(() => expect(propertyService.list).toHaveBeenCalled());
    expect(propertyService.list).toHaveBeenCalledWith(
      { listingType: 'rent', perPage: 8 },
      expect.anything()
    );
  });

  it('reads the featured endpoint when it is the featured row', async () => {
    row({ featured: true });

    await waitFor(() => expect(propertyService.featured).toHaveBeenCalled());
    expect(propertyService.list).not.toHaveBeenCalled();
    expect(await screen.findByText('Featured properties')).toBeInTheDocument();
  });

  it('asks for every featured listing, up to a page of 24 — not the top eight (QA-62)', async () => {
    propertyService.featured.mockResolvedValue(answer(11));
    row({ featured: true });

    await waitFor(() =>
      expect(propertyService.featured).toHaveBeenCalledWith({ perPage: 24 }, expect.anything())
    );
    // The ninth, tenth and eleventh are on the row: featured from the list's
    // star or the form's switch, a listing past the eighth was never shown.
    expect(await screen.findAllByText(/^Listing \d+$/)).toHaveLength(11);
    expect(FEATURED_PER_PAGE).toBe(24);
  });

  it('asks for as many as a hand-picked set holds, up to the same cap (QA-62)', async () => {
    propertyService.list.mockResolvedValue(answer(10));
    row({ params: { ids: '1,2,3,4,5,6,7,8,9,10', perPage: 10 } });

    expect(await screen.findAllByText(/^Listing \d+$/)).toHaveLength(10);
    expect(propertyService.list).toHaveBeenCalledWith(
      { ids: '1,2,3,4,5,6,7,8,9,10', perPage: 10 },
      expect.anything()
    );
  });

  it('renders the heading, the cards and a "View all" that carries the filter', async () => {
    row({ params: { listingType: 'rent' }, viewAllHref: '/rent' });

    expect(await screen.findAllByText(/^Listing \d$/)).toHaveLength(6);
    expect(screen.getByRole('heading', { name: 'Featured properties' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View all/ })).toHaveAttribute('href', '/rent');
  });

  it('is absent below three results, heading and all (§7)', async () => {
    propertyService.list.mockResolvedValue(answer(2));
    const { container } = row({ params: {} });

    await waitFor(() => expect(propertyService.list).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(screen.queryByText('Featured properties')).not.toBeInTheDocument();
  });

  it('honours a `minItems` of its own', async () => {
    propertyService.list.mockResolvedValue(answer(2));
    row({ params: {}, minItems: 2 });

    expect(await screen.findByRole('heading', { name: 'Featured properties' })).toBeInTheDocument();
  });

  it('is absent when the request fails rather than showing an error band', async () => {
    propertyService.list.mockRejectedValue(new Error('network'));
    const { container } = row({ params: {} });

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('holds the row’s height with skeletons while it waits', () => {
    propertyService.list.mockReturnValue(new Promise(() => {}));
    row({ params: {} });

    // The heading is already there and the row's controls are not, which is
    // what keeps the page below it from moving when the listings arrive.
    expect(screen.getByRole('heading', { name: 'Featured properties' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /View all/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/^Listing \d$/)).not.toBeInTheDocument();
  });
});
