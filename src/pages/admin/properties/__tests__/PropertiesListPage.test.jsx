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
import leadService from '../../../../services/leadService';
import propertyService from '../../../../services/propertyService';
import renderWith from '../../../../test-utils';
import storage from '../../../../utils/storage';
import { AUTH_STORAGE_KEYS, clearSession } from '../../../../services/http';
import { AdminAuthProvider } from '../../../../contexts/AdminAuthContext';
import { MasterDataProvider } from '../../../../contexts/MasterDataContext';
import { team } from '../../../../services/masterDataService';

jest.mock('../../../../services/authService');
jest.mock('../../../../services/propertyService');
jest.mock('../../../../services/leadService', () => ({
  __esModule: true,
  default: { adminList: jest.fn() },
}));
jest.mock('../../../../services/masterDataService', () => {
  const collection = (data) => ({
    list: jest.fn(() => Promise.resolve({ data })),
    adminList: jest.fn(() => Promise.resolve({ data })),
  });
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

/** An inactive listing with everything the publish rules ask for (QA-62). */
const READY_DRAFT = {
  ...ROWS[0],
  id: 3,
  slug: 'aurelia-court-2-bhk-koramangala',
  title: 'Aurelia Court',
  images: [{ id: 1, url: 'https://images.test/court.jpg', alt: 'The court', isCover: true }],
  shortDescription: 'Two bedrooms over the Koramangala park.',
  description: `<p>${'A two-bedroom apartment over the park in Koramangala. '.repeat(8)}</p>`,
  isActive: false,
  isFeatured: false,
  publishedAt: null,
};

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
  leadService.adminList.mockResolvedValue({ data: [], meta: { total: 0 } });
  // CRA resets every mock before each test: the advisors are answered here.
  team.adminList.mockResolvedValue({
    data: [
      { id: 2, name: 'Team Member 2', isActive: true },
      { id: 5, name: 'Team Member 5', isActive: false },
    ],
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

  describe('the flag toggles', () => {
    it('patch the record they belong to, and keep the row where it is (QA-62)', async () => {
      propertyService.patch.mockResolvedValue({
        data: { ...ROWS[0], isFeatured: true, updatedAt: '2026-09-25T06:00:00.000Z' },
      });
      renderAs('admin', { url: '/admin/properties?sort=title&order=asc' });
      await screen.findByText('Lakeview Heights');

      const featured = await screen.findByRole('button', { name: 'Featured — Lakeview Heights' });
      expect(featured).toHaveAttribute('aria-pressed', 'false');
      const listCalls = propertyService.adminList.mock.calls.length;

      await userEvent.click(featured);

      await waitFor(() =>
        expect(propertyService.patch).toHaveBeenCalledWith(1, { isFeatured: true })
      );
      expect(
        await screen.findByRole('button', { name: 'Featured — Lakeview Heights', pressed: true })
      ).toBeInTheDocument();
      expect(await screen.findByText('“Lakeview Heights” is now featured')).toBeInTheDocument();
      // Asked again, the page re-sorted: under "Updated" the row jumped to the
      // top and the toggle under the pointer was another listing's. It stays,
      // with what the server answered.
      expect(propertyService.adminList.mock.calls.length).toBe(listCalls);
      expect(within(screen.getByRole('table')).getByText('25 Sep 2026')).toBeInTheDocument();
    });

    it('ask for the page again when the view is narrowed by the flag they change', async () => {
      renderAs('admin', { url: '/admin/properties?isFeatured=false' });
      await screen.findByText('Lakeview Heights');
      const listCalls = propertyService.adminList.mock.calls.length;

      await userEvent.click(screen.getByRole('button', { name: 'Featured — Lakeview Heights' }));

      // Featured now, it no longer belongs in "Not featured".
      await waitFor(() =>
        expect(propertyService.adminList.mock.calls.length).toBeGreaterThan(listCalls)
      );
    });

    it('say a listing featured while unpublished is not on the home page yet (QA-62)', async () => {
      propertyService.adminList.mockResolvedValue(envelope([READY_DRAFT]));
      propertyService.patch.mockResolvedValue({ data: { ...READY_DRAFT, isFeatured: true } });
      renderAs('admin');
      await screen.findByText('Aurelia Court');

      await userEvent.click(screen.getByRole('button', { name: 'Featured — Aurelia Court' }));

      expect(
        await screen.findByText(
          '“Aurelia Court” is now featured. It is not published, so the home page shows it once it is.'
        )
      ).toBeInTheDocument();
    });

    it('refuse to publish a listing that is not ready, and say what it lacks (QA-62)', async () => {
      renderAs('admin');
      await screen.findByText('Nandi Ridge Plot');

      await userEvent.click(screen.getByRole('button', { name: 'Active — Nandi Ridge Plot' }));

      const dialog = await screen.findByRole('dialog', {
        name: '“Nandi Ridge Plot” is not ready to go live',
      });
      expect(
        within(dialog).getByText(
          'no photograph with a description · 0 of 300 characters of description · no one-line summary'
        )
      ).toBeInTheDocument();
      expect(within(dialog).getByRole('link', { name: 'Nandi Ridge Plot' })).toHaveAttribute(
        'href',
        '/admin/properties/edit/2'
      );
      expect(propertyService.patch).not.toHaveBeenCalled();
    });

    it('say a listing deleted elsewhere is gone, and refresh the page', async () => {
      propertyService.patch.mockRejectedValue(new ApiError({ status: 404, message: 'Not found' }));
      renderAs('admin');
      await screen.findByText('Lakeview Heights');
      const listCalls = propertyService.adminList.mock.calls.length;

      await userEvent.click(screen.getByRole('button', { name: 'Verified — Lakeview Heights' }));

      expect(await screen.findByText(/“Lakeview Heights” is no longer here/)).toBeInTheDocument();
      await waitFor(() =>
        expect(propertyService.adminList.mock.calls.length).toBeGreaterThan(listCalls)
      );
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
        await screen.findByRole('button', { name: 'Active — Lakeview Heights', pressed: true })
      );

      expect(await screen.findByText('Publish the description first.')).toBeInTheDocument();
      expect(
        await screen.findByRole('button', { name: 'Active — Lakeview Heights', pressed: true })
      ).toBeInTheDocument();
    });

    it('take back only the refused change, not an earlier one the API accepted', async () => {
      // The refetch after the accepted write stays in flight, so it is the
      // rollback — not a fresh answer — that decides what the chips show.
      propertyService.patch.mockImplementation((_id, body) =>
        'isActive' in body
          ? Promise.reject(new ApiError({ status: 500, message: 'Server error' }))
          : Promise.resolve({ data: { ...ROWS[0], ...body } })
      );
      propertyService.adminList
        .mockResolvedValueOnce(envelope())
        .mockImplementation(() => new Promise(() => {}));

      renderAs('admin');
      await screen.findByText('Lakeview Heights');

      await userEvent.click(screen.getByRole('button', { name: 'Featured — Lakeview Heights' }));
      await screen.findByRole('button', { name: 'Featured — Lakeview Heights', pressed: true });

      // A row's toggles wait for its write in flight before taking another.
      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: 'Active — Lakeview Heights' })
        ).not.toHaveAttribute('aria-disabled')
      );
      await userEvent.click(screen.getByRole('button', { name: 'Active — Lakeview Heights' }));
      expect(await screen.findByText('Server error')).toBeInTheDocument();

      expect(
        screen.getByRole('button', { name: 'Active — Lakeview Heights', pressed: true })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Featured — Lakeview Heights', pressed: true })
      ).toBeInTheDocument();
    });
  });

  describe('bulk actions', () => {
    it('applies one action to the ticked rows', async () => {
      renderAs('admin');
      await screen.findByText('Lakeview Heights');

      await userEvent.click(screen.getByRole('checkbox', { name: 'Select Nandi Ridge Plot' }));
      await userEvent.click(screen.getByRole('button', { name: 'Deactivate' }));

      await waitFor(() =>
        expect(propertyService.bulk).toHaveBeenCalledWith({ ids: [2], action: 'deactivate' })
      );
      expect(await screen.findByText('1 property updated.')).toBeInTheDocument();
    });

    it('marks a batch sold (prompt 51)', async () => {
      renderAs('admin');
      await screen.findByText('Lakeview Heights');

      await userEvent.click(screen.getByRole('checkbox', { name: 'Select Lakeview Heights' }));
      await userEvent.click(screen.getByRole('button', { name: 'Mark sold' }));

      await waitFor(() =>
        expect(propertyService.bulk).toHaveBeenCalledWith({
          ids: [1],
          action: 'availability',
          payload: { availability: 'sold' },
        })
      );
    });

    it('says so when a batch needed no change (prompt 51)', async () => {
      propertyService.bulk.mockResolvedValue({ data: { affected: 0 }, message: '0 updated.' });
      renderAs('admin');
      await screen.findByText('Lakeview Heights');

      await userEvent.click(screen.getByRole('checkbox', { name: 'Select Nandi Ridge Plot' }));
      await userEvent.click(screen.getByRole('button', { name: 'Mark reserved' }));
      expect(
        await screen.findByText('Nothing to change: the selected listings were already reserved.')
      ).toBeInTheDocument();
    });

    it('forgets a selection whose rows are no longer on screen', async () => {
      renderAs('admin');
      await screen.findByText('Lakeview Heights');

      await userEvent.click(screen.getByRole('checkbox', { name: 'Select Nandi Ridge Plot' }));
      expect(screen.getByText('1 selected')).toBeInTheDocument();

      // Narrowing the list takes the ticked row off screen …
      propertyService.adminList.mockResolvedValue(envelope([ROWS[0]]));
      await userEvent.selectOptions(screen.getByLabelText('Listing'), 'sale');
      await waitFor(() => expect(screen.queryByText('Nandi Ridge Plot')).not.toBeInTheDocument());

      // … and the selection with it: no bulk action can reach a row nobody sees.
      await waitFor(() => expect(screen.queryByText('1 selected')).not.toBeInTheDocument());
      expect(screen.queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument();
    });

    it('confirms before deleting, naming what it is about to remove', async () => {
      renderAs('admin');
      await screen.findByText('Lakeview Heights');

      await userEvent.click(screen.getByRole('checkbox', { name: 'Select Lakeview Heights' }));
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

    it('sets the availability without opening the form (prompt 51)', async () => {
      propertyService.patch.mockResolvedValue({ data: { ...ROWS[0], availability: 'sold' } });
      renderAs('admin');
      await screen.findByText('Lakeview Heights');

      await userEvent.click(screen.getByRole('button', { name: 'Actions for Lakeview Heights' }));
      await userEvent.click(await screen.findByRole('menuitem', { name: 'Availability…' }));
      const dialog = await screen.findByRole('dialog', {
        name: 'Availability of “Lakeview Heights”',
      });
      expect(within(dialog).getByRole('button', { name: 'Set availability' })).toBeDisabled();
      await userEvent.click(within(dialog).getByRole('radio', { name: 'Sold' }));
      await userEvent.click(within(dialog).getByRole('button', { name: 'Set availability' }));

      await waitFor(() =>
        expect(propertyService.patch).toHaveBeenCalledWith(1, { availability: 'sold' })
      );
      expect(await screen.findByText('“Lakeview Heights” is now Sold.')).toBeInTheDocument();
    });

    it('edits the price in a dialog and sends the pricing alone (prompt 51)', async () => {
      propertyService.patch.mockResolvedValue({ data: ROWS[0] });
      renderAs('admin');
      await screen.findByText('Lakeview Heights');

      await userEvent.click(screen.getByRole('button', { name: 'Actions for Lakeview Heights' }));
      await userEvent.click(await screen.findByRole('menuitem', { name: 'Edit price…' }));
      const dialog = await screen.findByRole('dialog', { name: 'Price of “Lakeview Heights”' });

      const price = within(dialog).getByLabelText(/^Price \(₹\)/);
      expect(price).toHaveValue('12400000');
      // A live listing may not be left without a price.
      await userEvent.clear(price);
      await userEvent.click(within(dialog).getByRole('button', { name: 'Save price' }));
      expect(
        await within(dialog).findByText(/A published listing needs a price/)
      ).toBeInTheDocument();
      expect(propertyService.patch).not.toHaveBeenCalled();

      await userEvent.type(price, '13500000');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Save price' }));

      await waitFor(() => expect(propertyService.patch).toHaveBeenCalled());
      const [id, body] = propertyService.patch.mock.calls[0];
      expect(id).toBe(1);
      expect(Object.keys(body)).toEqual(['pricing']);
      expect(body.pricing).toMatchObject({ price: 13500000, priceOnRequest: false });
      expect(await screen.findByText('“Lakeview Heights”: ₹1.35 Cr.')).toBeInTheDocument();
    });

    it('says how many leads keep the listing’s name, and offers to mark it sold instead', async () => {
      leadService.adminList.mockResolvedValue({ data: [], meta: { total: 3 } });
      propertyService.patch.mockResolvedValue({ data: { ...ROWS[0], availability: 'sold' } });
      renderAs('admin');
      await screen.findByText('Lakeview Heights');

      await userEvent.click(screen.getByRole('button', { name: 'Actions for Lakeview Heights' }));
      await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));
      const dialog = await screen.findByRole('dialog', { name: 'Delete this property?' });

      expect(
        await within(dialog).findByText(
          '3 leads reference this listing — they keep a snapshot of its name.'
        )
      ).toBeInTheDocument();
      expect(leadService.adminList).toHaveBeenCalledWith(
        { propertyId: 1, perPage: 1 },
        expect.anything()
      );
      expect(
        within(dialog).getByRole('button', { name: 'Deactivate instead' })
      ).toBeInTheDocument();
      await userEvent.click(within(dialog).getByRole('button', { name: 'Mark sold instead' }));

      await waitFor(() =>
        expect(propertyService.patch).toHaveBeenCalledWith(1, { availability: 'sold' })
      );
      expect(propertyService.remove).not.toHaveBeenCalled();
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

  it('narrows to one advisor’s listings from a link, naming a switched-off one', async () => {
    renderAs('admin', { url: '/admin/properties?agentId=5' });
    await screen.findByText('Lakeview Heights');

    expect(propertyService.adminList).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: '5' }),
      expect.anything()
    );
    expect(
      await screen.findByRole('option', { name: 'Team Member 5 (inactive)' })
    ).toBeInTheDocument();
  });

  it('reads a flag in the URL as a boolean, so the screen and the request agree', async () => {
    renderAs('admin', { url: '/admin/properties?isActive=false&isFeatured=1' });
    await screen.findByText('Lakeview Heights');

    const request = propertyService.adminList.mock.calls.at(-1)[0];
    expect(request.isActive).toBe(false);
    // `1` is not a boolean this screen writes: it is no filter at all, on the
    // screen and in the request — not "Any" beside a request for active rows.
    expect(request).not.toHaveProperty('isFeatured', expect.anything());
    expect(screen.getByLabelText('Published')).toHaveValue('false');
    expect(screen.getByLabelText('Featured')).toHaveValue('');
    expect(screen.getByText('Published: Inactive')).toBeInTheDocument();
  });

  it('shows a page size the URL asks for even when it is not one of the four offered', async () => {
    propertyService.adminList.mockResolvedValue(envelope(ROWS, { perPage: 37 }));
    renderAs('admin', { url: '/admin/properties?perPage=37' });
    await screen.findByText('Lakeview Heights');

    expect(screen.getByLabelText('Rows per page')).toHaveValue('37');
  });

  it('keeps the sort and the page size when the filters are reset', async () => {
    propertyService.adminList.mockResolvedValue(envelope(ROWS, { perPage: 50 }));
    renderAs('admin', {
      url: '/admin/properties?listingType=rent&sort=price&order=asc&perPage=50',
    });
    await screen.findByText('Lakeview Heights');

    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));

    await waitFor(() =>
      expect(propertyService.adminList).toHaveBeenLastCalledWith(
        expect.objectContaining({ sort: 'price', order: 'asc', perPage: 50, page: 1 }),
        expect.anything()
      )
    );
    expect(propertyService.adminList.mock.calls.at(-1)[0]).not.toHaveProperty(
      'listingType',
      'rent'
    );
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

  describe('the publish rules in the bulk bar (QA-62)', () => {
    it('names the listings that are not ready, and activates the ones that are', async () => {
      propertyService.adminList.mockResolvedValue(envelope([...ROWS, READY_DRAFT]));
      renderAs('admin');
      await screen.findByText('Aurelia Court');

      await userEvent.click(screen.getByRole('checkbox', { name: 'Select Nandi Ridge Plot' }));
      await userEvent.click(screen.getByRole('checkbox', { name: 'Select Aurelia Court' }));
      await userEvent.click(screen.getByRole('button', { name: 'Activate' }));

      const dialog = await screen.findByRole('dialog', {
        name: '1 of the 2 selected properties is not ready to go live',
      });
      expect(within(dialog).getByRole('link', { name: 'Nandi Ridge Plot' })).toBeInTheDocument();
      expect(propertyService.bulk).not.toHaveBeenCalled();

      await userEvent.click(within(dialog).getByRole('button', { name: 'Activate 1 property' }));
      await waitFor(() =>
        expect(propertyService.bulk).toHaveBeenCalledWith({ ids: [3], action: 'activate' })
      );
    });

    it('shows the API’s own refusal in the same dialog', async () => {
      propertyService.adminList.mockResolvedValue(envelope([READY_DRAFT]));
      propertyService.bulk.mockRejectedValue(
        new ApiError({
          status: 422,
          message: '“Aurelia Court” is not ready to go live: no price.',
          errors: { ids: ['“Aurelia Court”: no price.'] },
          data: { notReady: [{ id: 3, title: 'Aurelia Court', gaps: ['no price'] }] },
        })
      );
      renderAs('admin');
      await screen.findByText('Aurelia Court');

      await userEvent.click(screen.getByRole('checkbox', { name: 'Select Aurelia Court' }));
      await userEvent.click(screen.getByRole('button', { name: 'Activate' }));

      const dialog = await screen.findByRole('dialog', {
        name: '“Aurelia Court” is not ready to go live',
      });
      expect(within(dialog).getByText('no price')).toBeInTheDocument();
    });
  });

  it('disables the export when nothing matches (QA-62)', async () => {
    propertyService.adminList.mockResolvedValue(envelope([], { total: 0, totalPages: 0 }));
    renderAs('admin', { url: '/admin/properties?q=nothing' });
    await screen.findByText('No properties match');

    expect(screen.getByRole('button', { name: /Export CSV/ })).toBeDisabled();
  });

  it('shows no count, no pages and nothing to select once a request fails (QA-62)', async () => {
    renderAs('admin');
    await screen.findByText('Lakeview Heights');

    propertyService.adminList.mockRejectedValue(
      new ApiError({ status: 0, message: 'Unable to reach the server.', isNetworkError: true })
    );
    await userEvent.selectOptions(screen.getByLabelText('Listing'), 'rent');

    expect(await screen.findByText('Unable to reach the server.')).toBeInTheDocument();
    // The last answer's "2", its pager and its rows behind the error panel
    // said nothing true about a filter that was never answered.
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeInTheDocument();
    expect(screen.queryByText(/Showing 1–2 of 2/)).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select all rows on this page' })).toBeDisabled();
  });

  it('steps back a page once its last rows are deleted (QA-62)', async () => {
    propertyService.adminList.mockResolvedValue(
      envelope([ROWS[0]], { page: 2, perPage: 20, total: 21, totalPages: 2 })
    );
    renderAs('admin', { url: '/admin/properties?page=2' });
    await screen.findByText('Lakeview Heights');

    await userEvent.click(screen.getByRole('button', { name: 'Actions for Lakeview Heights' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete this property?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(propertyService.adminList).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1 }),
        expect.anything()
      )
    );
  });

  describe('a sales user (§7)', () => {
    it('reads the list and cannot write to it', async () => {
      renderAs('sales');
      await screen.findByText('Lakeview Heights');

      expect(await screen.findByText(/Read-only/)).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Add property' })).not.toBeInTheDocument();
      expect(
        screen.queryByRole('checkbox', { name: 'Select Lakeview Heights' })
      ).not.toBeInTheDocument();
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
