/**
 * Admin → Master data → Localities, the list (QA-60): what a row offers and
 * says in the drag list the screen opens on.
 */

import { screen, within } from '@testing-library/react';

import LocalitiesPage from '../LocalitiesPage';
import DevelopersPage from '../DevelopersPage';
import masterDataService from '../../../../services/masterDataService';
import renderWith from '../../../../test-utils';

jest.mock('../../../../contexts/MasterDataContext', () => ({
  __esModule: true,
  useMasterData: () => ({ refresh: jest.fn() }),
}));

const page = (rows) => ({
  data: rows,
  meta: { page: 1, perPage: 20, total: rows.length, totalPages: 1 },
});

beforeEach(() => {
  jest.restoreAllMocks();
});

describe('LocalitiesPage (QA-60)', () => {
  it('offers the site’s page of a live locality only, and says which are featured', async () => {
    jest.spyOn(masterDataService.localities, 'adminList').mockResolvedValue(
      page([
        {
          id: 1,
          name: 'Whitefield',
          slug: 'whitefield',
          zone: 'east',
          order: 1,
          isActive: true,
          isFeatured: true,
          propertyCount: 3,
        },
        {
          id: 2,
          name: 'Hoskote',
          slug: 'hoskote',
          zone: 'east',
          order: 2,
          isActive: false,
          isFeatured: false,
          propertyCount: 0,
        },
      ])
    );
    renderWith(<LocalitiesPage />);

    const live = await screen.findByRole('listitem', { name: /^Whitefield,/ });
    const off = screen.getByRole('listitem', { name: /^Hoskote,/ });

    expect(within(live).getByRole('link', { name: 'View Whitefield on the site' })).toHaveAttribute(
      'href',
      '/localities/whitefield'
    );
    // Switched off, its page answers 404: there is nothing to view.
    expect(within(off).queryByRole('link', { name: /View Hoskote/ })).toBeNull();
    expect(within(live).getByText(/· Featured/)).toBeInTheDocument();
    expect(within(off).queryByText(/· Featured/)).toBeNull();
  });
});

describe('DevelopersPage (QA-60)', () => {
  it('offers the site’s page of a live developer only', async () => {
    jest.spyOn(masterDataService.developers, 'adminList').mockResolvedValue(
      page([
        {
          id: 1,
          name: 'Aurelia Estates',
          slug: 'aurelia-estates',
          order: 1,
          isActive: true,
          isFeatured: true,
          propertyCount: 5,
        },
        {
          id: 2,
          name: 'Old Builders',
          slug: 'old-builders',
          order: 2,
          isActive: false,
          isFeatured: false,
          propertyCount: 0,
        },
      ])
    );
    renderWith(<DevelopersPage />);

    const live = await screen.findByRole('listitem', { name: /^Aurelia Estates,/ });
    const off = screen.getByRole('listitem', { name: /^Old Builders,/ });
    expect(
      within(live).getByRole('link', { name: 'View Aurelia Estates on the site' })
    ).toBeInTheDocument();
    expect(within(off).queryByRole('link', { name: /View Old Builders/ })).toBeNull();
    expect(within(live).getByText(/· Featured/)).toBeInTheDocument();
  });
});
