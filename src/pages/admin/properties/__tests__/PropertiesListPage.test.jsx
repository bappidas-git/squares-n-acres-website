/**
 * Admin → Properties: the list screen (prompt 22).
 *
 * The service is a set of spies, so what the screen asks the API for is the
 * assertion — that is the whole point of the rewrite: the table pages, sorts
 * and filters on the server (BUG-19), and the writes it offers are the ones
 * §7 gives the signed-in role.
 */

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ApiError from '../../../../services/apiError';
import PropertiesListPage from '../PropertiesListPage';
import ToastProvider from '../../../../components/common/ToastProvider';
import authService from '../../../../services/authService';
import propertyService from '../../../../services/propertyService';
import renderWith from '../../../../test-utils';
import storage from '../../../../utils/storage';
import { AUTH_STORAGE_KEYS, clearSession } from '../../../../services/http';
import { AdminAuthProvider } from '../../../../contexts/AdminAuthContext';
import { MasterDataProvider } from '../../../../contexts/MasterDataContext';

jest.mock('../../../../services/authService');
jest.mock('../../../../services/propertyService');
jest.mock('../../../../services/masterDataService', () => {
  const collection = (data) => ({ list: jest.fn(() => Promise.resolve({ data })) });
  const service = {
    localities: collection([{ id: 4, name: 'Whitefield', order: 1, isActive: true }]),
    cities: collection([{ id: 1, name: 'Bengaluru', isActive: true }]),
    propertyTypes: collection([{ id: 1, name: 'Apartment', order: 1, isActive: true }]),
    amenities: collection([]),
    badges: collection([]),
    developers: collection([{ id: 2, name: 'Aurelia Estates', order: 1, isActive: true }]),
    banks: collection([]),
    team: collection([]),
  };
  return { __esModule: true, default: service, ...service };
});

const ROWS = [
  {
    id: 1,
    slug: 'lakeview-heights-3-bhk-whitefield',
    title: 'Lakeview Heights',
    listingType: 'sale',
    segment: 'residential',
    propertyType: { id: 1, name: 'Apartment', slug: 'apartments' },
    constructionStatus: 'ready-to-move',
    availability: 'available',
    images: [{ id: 1, url: 'https://images.test/cover.jpg', alt: '', order: 1, isCover: true }],
    location: { locality: { id: 4, name: 'Whitefield' }, city: { id: 1, name: 'Bengaluru' } },
    pricing: { price: 12400000, priceOnRequest: false, rentPerMonth: null },
    area: { superBuiltUpArea: 1650, carpetArea: 1188, areaUnit: 'sqft' },
    configuration: { bedrooms: 3 },
    project: { developer: { id: 2, name: 'Aurelia Estates' } },
    seo: { score: 82, scoreBand: 'good' },
    isActive: true,
    isFeatured: false,
    isVerified: true,
    priorityOrder: 5,
    viewCount: 120,
    enquiryCount: 4,
    publishedAt: '2026-09-01T06:00:00.000Z',
    updatedAt: '2026-09-15T06:00:00.000Z',
  },
  {
    id: 2,
    slug: 'nandi-ridge-plot-devanahalli',
    title: 'Nandi Ridge Plot',
    listingType: 'rent',
    segment: 'land',
    propertyType: { id: 9, name: 'Residential Plot', slug: 'residential-plots' },
    constructionStatus: 'under-construction',
    availability: 'reserved',
    images: [],
    location: { locality: { id: 5, name: 'Devanahalli' }, city: { id: 1, name: 'Bengaluru' } },
    pricing: { price: null, priceOnRequest: true, rentPerMonth: null },
    area: { plotArea: 2400, areaUnit: 'sqft' },
    configuration: {},
    project: {},
    seo: { score: null, scoreBand: 'none' },
    isActive: false,
    isFeatured: true,
    isVerified: false,
    priorityOrder: 0,
    viewCount: 8,
    enquiryCount: 0,
    publishedAt: null,
    updatedAt: '2026-09-14T06:00:00.000Z',
  },
];

const envelope = (data = ROWS, meta = {}) => ({
  data,
  meta: { page: 1, perPage: 20, total: data.length, totalPages: 1, ...meta },
});

/** jsdom has no layout, so the breakpoint hook is told which side it is on. */
const setViewport = (width) => {
  window.matchMedia = (query) => {
    const max = /max-width:\s*([\d.]+)px/.exec(query);
    const min = /min-width:\s*([\d.]+)px/.exec(query);
    const matches =
      (max ? width <= Number(max[1]) : true) && (min ? width >= Number(min[1]) : true);
    return {
      matches,
      media: query,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    };
  };
};

// MUI reads an anchor's box when a menu opens; jsdom gives every element a 0×0
// one, which it takes for "not laid out". This fiction at least does not warn.
const realRect = Element.prototype.getBoundingClientRect;
beforeAll(() => {
  Element.prototype.getBoundingClientRect = function boundingRect() {
    return { width: 120, height: 40, top: 0, left: 0, bottom: 40, right: 120, x: 0, y: 0 };
  };
});
afterAll(() => {
  Element.prototype.getBoundingClientRect = realRect;
});

const userOf = (role) => ({
  id: role === 'sales' ? 3 : 1,
  name: `${role} user`,
  email: `${role}@squaresnacres.com`,
  role,
  phone: '9880000012',
  avatarUrl: null,
});

/** Renders the screen with a signed-in session of the given role (§7). */
const renderAs = (role, { url = '/admin/properties' } = {}) => {
  const user = userOf(role);
  storage.setItem(AUTH_STORAGE_KEYS.token, 'seeded-token');
  storage.setItem(AUTH_STORAGE_KEYS.user, user);
  storage.setItem(
    AUTH_STORAGE_KEYS.expiresAt,
    new Date(Date.now() + 6 * 3600 * 1000).toISOString()
  );
  authService.profile.mockResolvedValue({ data: user });

  return renderWith(
    <ToastProvider>
      <AdminAuthProvider>
        <MasterDataProvider>
          <PropertiesListPage />
        </MasterDataProvider>
      </AdminAuthProvider>
    </ToastProvider>,
    { initialEntries: [url] }
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
  clearSession();
  setViewport(1280);

  authService.logout.mockResolvedValue({ data: null, message: 'Logged out.' });
  propertyService.adminList.mockResolvedValue(envelope());
  propertyService.patch.mockResolvedValue({ data: ROWS[0] });
  propertyService.remove.mockResolvedValue({ data: null, message: 'Deleted' });
  propertyService.duplicate.mockResolvedValue({ data: { ...ROWS[0], id: 99 } });
  propertyService.bulk.mockResolvedValue({
    data: { affected: 1 },
    message: '1 property updated.',
  });
});

describe('PropertiesListPage', () => {
  it('renders one row per property the service answers with', async () => {
    renderAs('admin');

    expect(await screen.findByText('Lakeview Heights')).toBeInTheDocument();
    expect(screen.getByText('Nandi Ridge Plot')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Properties/ })).toBeInTheDocument();
  });

  it('asks the API for the page, the page size and the sort (§5.6)', async () => {
    renderAs('admin');
    await screen.findByText('Lakeview Heights');

    expect(propertyService.adminList).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, perPage: 20, sort: 'updatedAt', order: 'desc' }),
      expect.anything()
    );
  });

  it('reads the filters out of the URL rather than narrowing in the browser', async () => {
    renderAs('admin', {
      url: '/admin/properties?listingType=rent&constructionStatus=resale,pre-launch',
    });
    await screen.findByText('Lakeview Heights');

    expect(propertyService.adminList).toHaveBeenCalledWith(
      expect.objectContaining({
        listingType: 'rent',
        constructionStatus: ['resale', 'pre-launch'],
      }),
      expect.anything()
    );
  });

  it('shows the locality, the type and the price of each listing', async () => {
    renderAs('admin');
    await screen.findByText('Lakeview Heights');

    // Inside the table: "Not analysed" is also one of the SEO filter's options.
    const table = within(screen.getByRole('table'));
    expect(table.getByText('Whitefield · Apartment')).toBeInTheDocument();
    expect(table.getByText('₹1.24 Cr')).toBeInTheDocument();
    // A listing with no number is on request, whatever the flag says.
    expect(table.getByText('On request')).toBeInTheDocument();
    expect(table.getByText('82 · Good')).toBeInTheDocument();
    expect(table.getByText('Not analysed')).toBeInTheDocument();
    expect(table.getByText('3 BHK · 1,650 sq ft')).toBeInTheDocument();
  });

  describe('the flag chips', () => {
    it('patch the record they belong to', async () => {
      renderAs('admin');
      await screen.findByText('Lakeview Heights');

      await userEvent.click(
        await screen.findByRole('button', { name: 'Not featured — Lakeview Heights' })
      );

      await waitFor(() =>
        expect(propertyService.patch).toHaveBeenCalledWith(1, { isFeatured: true })
      );
      expect(
        await screen.findByRole('button', { name: 'Featured — Lakeview Heights' })
      ).toBeInTheDocument();
    });

    it('put the old value back when the API refuses', async () => {
      propertyService.patch.mockRejectedValue(
        new ApiError({
          status: 422,
          message: 'The given data was invalid.',
          errors: { isActive: ['Publish the description first.'] },
        })
      );
      renderAs('admin');
      await screen.findByText('Lakeview Heights');

      await userEvent.click(
        await screen.findByRole('button', { name: 'Active — Lakeview Heights' })
      );

      expect(await screen.findByText('Publish the description first.')).toBeInTheDocument();
      expect(
        await screen.findByRole('button', { name: 'Active — Lakeview Heights' })
      ).toBeInTheDocument();
    });
  });

  describe('bulk actions', () => {
    it('applies one action to the ticked rows', async () => {
      renderAs('admin');
      await screen.findByText('Lakeview Heights');

      await userEvent.click(screen.getByRole('checkbox', { name: 'Select row 2' }));
      await userEvent.click(screen.getByRole('button', { name: 'Deactivate' }));

      await waitFor(() =>
        expect(propertyService.bulk).toHaveBeenCalledWith({ ids: [2], action: 'deactivate' })
      );
      expect(await screen.findByText('1 property updated.')).toBeInTheDocument();
    });

    it('confirms before deleting, naming what it is about to remove', async () => {
      renderAs('admin');
      await screen.findByText('Lakeview Heights');

      await userEvent.click(screen.getByRole('checkbox', { name: 'Select row 1' }));
      await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByText(/1 property will be deleted/)).toBeInTheDocument();
      expect(propertyService.bulk).not.toHaveBeenCalled();

      await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
      await waitFor(() =>
        expect(propertyService.bulk).toHaveBeenCalledWith({ ids: [1], action: 'delete' })
      );
    });
  });

  describe('row actions', () => {
    it('duplicates a listing and opens the copy', async () => {
      renderAs('admin');
      await screen.findByText('Lakeview Heights');

      await userEvent.click(screen.getByRole('button', { name: 'Actions for Lakeview Heights' }));
      await userEvent.click(await screen.findByRole('menuitem', { name: 'Duplicate' }));

      await waitFor(() => expect(propertyService.duplicate).toHaveBeenCalledWith(1));
    });

    it('confirms a delete with the title of the listing', async () => {
      renderAs('admin');
      await screen.findByText('Lakeview Heights');

      await userEvent.click(screen.getByRole('button', { name: 'Actions for Lakeview Heights' }));
      await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));

      const dialog = await screen.findByRole('dialog', { name: 'Delete this property?' });
      expect(within(dialog).getByText(/“Lakeview Heights” will be deleted/)).toBeInTheDocument();

      await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
      await waitFor(() => expect(propertyService.remove).toHaveBeenCalledWith(1));
    });

    it('previews an unpublished listing instead of linking to a 404', async () => {
      renderAs('admin');
      await screen.findByText('Nandi Ridge Plot');

      await userEvent.click(screen.getByRole('button', { name: 'Actions for Nandi Ridge Plot' }));

      expect(await screen.findByRole('menuitem', { name: 'Preview' })).toHaveAttribute(
        'href',
        expect.stringContaining('/properties/nandi-ridge-plot-devanahalli?preview=admin')
      );
    });
  });

  it('exports every match of the current filter, not the page on screen (D44)', async () => {
    renderAs('admin', { url: '/admin/properties?listingType=sale' });
    await screen.findByText('Lakeview Heights');

    await userEvent.click(screen.getByRole('button', { name: /Export CSV/ }));

    await waitFor(() =>
      expect(propertyService.adminList).toHaveBeenCalledWith(
        expect.objectContaining({ listingType: 'sale', perPage: 'all' })
      )
    );
    expect(await screen.findByText('2 properties exported.')).toBeInTheDocument();
  });

  describe('the empty state', () => {
    it('offers to reset the filters when a filtered list comes back empty', async () => {
      propertyService.adminList.mockResolvedValue(envelope([], { total: 0, totalPages: 0 }));
      renderAs('admin', { url: '/admin/properties?q=nothing' });

      expect(await screen.findByText('No properties match')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reset filters' })).toBeInTheDocument();
    });

    it('offers the first page when the address is past the end of the list', async () => {
      propertyService.adminList.mockResolvedValue(
        envelope([], { page: 5, total: 2, totalPages: 1 })
      );
      renderAs('admin', { url: '/admin/properties?page=5' });

      expect(await screen.findByText('Nothing on this page')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Go to first page' })).toBeInTheDocument();
      expect(screen.getByText('Page 5 of 1 — no rows on this page')).toBeInTheDocument();
    });

    it('invites the first listing when nothing is filtered and nothing exists', async () => {
      propertyService.adminList.mockResolvedValue(envelope([], { total: 0, totalPages: 0 }));
      renderAs('admin');

      expect(await screen.findByText('No properties yet')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Add your first property' })).toBeInTheDocument();
    });
  });

  describe('a sales user (§7)', () => {
    it('reads the list and cannot write to it', async () => {
      renderAs('sales');
      await screen.findByText('Lakeview Heights');

      expect(await screen.findByText(/Read-only/)).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Add property' })).not.toBeInTheDocument();
      expect(screen.queryByRole('checkbox', { name: 'Select row 1' })).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Active — Lakeview Heights' })
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Actions for/ })).not.toBeInTheDocument();
    });

    it('keeps "View on site" and the export', async () => {
      renderAs('sales');
      await screen.findByText('Lakeview Heights');

      expect(
        await screen.findByRole('link', { name: 'View Lakeview Heights on the site' })
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Export CSV/ })).toBeInTheDocument();
    });
  });
});
