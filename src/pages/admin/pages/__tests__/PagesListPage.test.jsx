/**
 * Admin → Pages: the list screen (QA-56).
 *
 * The service is a set of spies, so what the screen asks the API for — and
 * what it refuses to ask — is the assertion. The audit's list defects each have
 * a test here: the status chip that also opened the form, the built-in pages
 * that were missing, the home page listed at `/home`, a bulk delete that took
 * protected pages down with the rest, the search that could not find an
 * address as the list prints it, and the empty page after the last delete.
 */

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';

import PagesListPage from '../PagesListPage';
import ToastProvider from '../../../../components/common/ToastProvider';
import authService from '../../../../services/authService';
import headerMenuService from '../../../../services/headerMenuService';
import pageService from '../../../../services/pageService';
import renderWith from '../../../../test-utils';
import storage from '../../../../utils/storage';
import { AUTH_STORAGE_KEYS, clearSession } from '../../../../services/http';
import { AdminAuthProvider } from '../../../../contexts/AdminAuthContext';

jest.mock('../../../../services/authService');
jest.mock('../../../../services/pageService');
jest.mock('../../../../services/headerMenuService');

const page = (overrides) => ({
  template: 'standard',
  status: 'published',
  showInHeader: false,
  headerMenu: null,
  headerSubmenu: null,
  showInFooter: false,
  footerColumn: null,
  order: 1,
  seo: { score: 70, scoreBand: 'ok' },
  updatedAt: '2026-09-15T06:00:00.000Z',
  ...overrides,
});

const HOME = page({ id: 1, slug: 'home', title: 'Home' });
const ABOUT = page({
  id: 2,
  slug: 'about',
  title: 'About Us',
  showInHeader: true,
  headerMenu: 'company',
  headerSubmenu: 'who-we-are',
  order: 2,
});
const LOAN = page({
  id: 3,
  slug: 'buyer-assistance/home-loan',
  title: 'Home Loan Assistance',
  status: 'draft',
  showInHeader: true,
  headerMenu: 'offers',
  order: 3,
});
const BUY = page({
  id: 17,
  slug: 'buy',
  title: 'Buy',
  template: 'system',
  showInHeader: false,
  order: 4,
  seo: {},
});
const ROWS = [HOME, ABOUT, LOAN, BUY];

const MENUS = [
  {
    id: 7,
    slug: 'company',
    name: 'Company',
    isActive: true,
    submenus: [{ slug: 'who-we-are', name: 'Who we are' }],
    links: [],
  },
  { id: 8, slug: 'offers', name: 'Offers', isActive: false, submenus: [], links: [] },
];

const envelope = (data = ROWS, meta = {}) => ({
  data,
  meta: { page: 1, perPage: 20, total: data.length, totalPages: 1, ...meta },
});

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

// MUI reads an anchor's box when a menu opens; jsdom's is 0×0.
const realRect = Element.prototype.getBoundingClientRect;
beforeAll(() => {
  Element.prototype.getBoundingClientRect = function boundingRect() {
    return { width: 120, height: 40, top: 0, left: 0, bottom: 40, right: 120, x: 0, y: 0 };
  };
});
afterAll(() => {
  Element.prototype.getBoundingClientRect = realRect;
});

const ADMIN = {
  id: 1,
  name: 'Admin user',
  email: 'admin@squaresnacres.com',
  role: 'admin',
  phone: '9880000012',
  avatarUrl: null,
};

/** Wherever a navigation away from the list landed. */
function Elsewhere() {
  const location = useLocation();
  return <p data-testid="elsewhere">{`${location.pathname}${location.search}`}</p>;
}

const renderList = ({ url = '/admin/pages' } = {}) => {
  storage.setItem(AUTH_STORAGE_KEYS.token, 'seeded-token');
  storage.setItem(AUTH_STORAGE_KEYS.user, ADMIN);
  storage.setItem(
    AUTH_STORAGE_KEYS.expiresAt,
    new Date(Date.now() + 6 * 3600 * 1000).toISOString()
  );
  authService.profile.mockResolvedValue({ data: ADMIN });

  return renderWith(
    <ToastProvider>
      <AdminAuthProvider>
        <Routes>
          <Route path="/admin/pages" element={<PagesListPage />} />
          <Route path="*" element={<Elsewhere />} />
        </Routes>
      </AdminAuthProvider>
    </ToastProvider>,
    { initialEntries: [url] }
  );
};

const lastListCall = () => pageService.adminList.mock.calls.at(-1)[0];

/** Waits for the rows the service answered with. */
const rowsLoaded = (title = 'About Us') => screen.findByText(title);

/** The table row a page's title is in. */
const rowOf = (title) =>
  // eslint-disable-next-line testing-library/no-node-access -- a row is found by the title in it
  within(screen.getByRole('table')).getByText(title, { exact: true }).closest('tr');

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
  clearSession();
  setViewport(1440);

  authService.logout.mockResolvedValue({ data: null, message: 'Logged out.' });
  pageService.adminList.mockResolvedValue(envelope());
  pageService.patch.mockResolvedValue({ data: LOAN });
  pageService.remove.mockResolvedValue({ data: null, message: 'Deleted' });
  pageService.bulk.mockResolvedValue({ data: { affected: 1 }, message: '1 page deleted.' });
  pageService.previewToken.mockResolvedValue({ data: { token: 'tok-1' } });
  headerMenuService.adminList.mockResolvedValue({ data: MENUS });
});

describe('PagesListPage', () => {
  it('lists the home page at the site root, not at /home (QA-56)', async () => {
    renderList();
    await rowsLoaded();
    const table = within(screen.getByRole('table'));

    const home = rowOf('Home');
    expect(within(home).getByText('/')).toBeInTheDocument();
    expect(table.queryByText('/home')).toBeNull();
    // Protected: its address is fixed and it is never deleted.
    expect(within(home).getByRole('img', { name: 'Protected' })).toBeInTheDocument();
  });

  it('lists a built-in page with a status that is not a switch, and no SEO score (QA-56)', async () => {
    renderList();
    await rowsLoaded();

    const buy = rowOf('Buy');
    expect(within(buy).getByText('Built-in')).toBeInTheDocument();
    expect(within(buy).queryByRole('button', { name: /publish “Buy”/ })).toBeNull();
    expect(within(buy).getByText('Site templates')).toBeInTheDocument();

    await userEvent.click(within(buy).getByRole('button', { name: 'Actions for Buy' }));
    const menu = await screen.findByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: /View on the site/ })).toBeInTheDocument();
    expect(within(menu).queryByRole('menuitem', { name: /Delete/ })).toBeNull();
    expect(within(menu).queryByRole('menuitem', { name: /Duplicate/ })).toBeNull();
  });

  it('names each page’s place in the header by the menus’ own names (QA-56)', async () => {
    renderList();
    await rowsLoaded();

    expect(within(rowOf('About Us')).getByText('Company › Who we are')).toBeInTheDocument();
    expect(within(rowOf('Home Loan Assistance')).getByText('Offers (hidden)')).toBeInTheDocument();
  });

  it('publishes from the status chip without opening the form (QA-56)', async () => {
    renderList();
    await rowsLoaded();
    const table = within(screen.getByRole('table'));

    await userEvent.click(
      table.getByRole('button', { name: 'Draft — publish “Home Loan Assistance”' })
    );

    await waitFor(() => expect(pageService.patch).toHaveBeenCalledWith(3, { status: 'published' }));
    expect(screen.queryByTestId('elsewhere')).toBeNull();
    expect(await screen.findByText('“Home Loan Assistance” is live.')).toBeInTheDocument();
  });

  it('puts the status back when the API refuses the change', async () => {
    pageService.patch.mockRejectedValue(
      Object.assign(new Error('Nope.'), { status: 500, errors: {} })
    );
    renderList();
    await rowsLoaded();
    const table = within(screen.getByRole('table'));

    await userEvent.click(
      table.getByRole('button', { name: 'Draft — publish “Home Loan Assistance”' })
    );

    expect(
      await table.findByRole('button', { name: 'Draft — publish “Home Loan Assistance”' })
    ).toBeInTheDocument();
  });

  it('asks before unpublishing a page the site links to (QA-56)', async () => {
    pageService.patch.mockResolvedValue({ data: { ...HOME, status: 'draft' } });
    renderList();
    await rowsLoaded();
    const table = within(screen.getByRole('table'));

    await userEvent.click(table.getByRole('button', { name: 'Published — unpublish “Home”' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Unpublish this page?')).toBeInTheDocument();
    expect(pageService.patch).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Unpublish' }));
    await waitFor(() => expect(pageService.patch).toHaveBeenCalledWith(1, { status: 'draft' }));
  });

  it('names the protected pages a bulk delete would skip, and deletes the rest (QA-56)', async () => {
    renderList();
    await rowsLoaded();
    const table = within(screen.getByRole('table'));

    await userEvent.click(table.getByRole('checkbox', { name: 'Select Home' }));
    await userEvent.click(table.getByRole('checkbox', { name: 'Select Home Loan Assistance' }));
    await userEvent.click(table.getByRole('checkbox', { name: 'Select Buy' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('2 pages cannot be deleted')).toBeInTheDocument();
    expect(within(dialog).getByText(/The home page cannot be deleted/)).toBeInTheDocument();
    expect(within(dialog).getByText(/“Buy” is built into the site/)).toBeInTheDocument();
    expect(pageService.bulk).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete the other 1' }));
    await waitFor(() =>
      expect(pageService.bulk).toHaveBeenCalledWith({ ids: [3], action: 'delete' })
    );
  });

  it('asks once before a bulk delete of pages that may all go', async () => {
    renderList();
    await rowsLoaded();
    const table = within(screen.getByRole('table'));

    await userEvent.click(table.getByRole('checkbox', { name: 'Select Home Loan Assistance' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Delete the selected pages?')).toBeInTheDocument();
    expect(within(dialog).getByText(/1 page will be deleted/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(pageService.bulk).toHaveBeenCalledWith({ ids: [3], action: 'delete' })
    );
    // One question, not two.
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('runs nothing when every selected page is protected', async () => {
    renderList();
    await rowsLoaded();
    const table = within(screen.getByRole('table'));

    await userEvent.click(table.getByRole('checkbox', { name: 'Select Buy' }));
    await userEvent.click(screen.getByRole('button', { name: 'Unpublish' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('One page cannot be unpublished')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'OK' }));
    expect(pageService.bulk).not.toHaveBeenCalled();
  });

  it('finds a page by its address as the list prints it (QA-56)', async () => {
    renderList({ url: '/admin/pages?q=%2Fbuyer-assistance%2Fhome-loan%2F' });
    await screen.findByRole('table');

    expect(lastListCall()).toEqual(expect.objectContaining({ q: 'buyer-assistance/home-loan' }));
  });

  it('reads a pasted site address, and the root as the home page', async () => {
    renderList({ url: '/admin/pages?q=https%3A%2F%2Fsquaresnacres.com%2F' });
    await screen.findByRole('table');

    expect(lastListCall()).toEqual(expect.objectContaining({ q: 'home' }));
  });

  it('reads a status or template no option names as no filter (QA-56)', async () => {
    renderList({ url: '/admin/pages?status=bogus&template=nope' });
    await screen.findByRole('table');

    expect(lastListCall()).toEqual(expect.objectContaining({ status: '', template: '' }));
    expect(screen.queryByRole('button', { name: /Remove filter Status/ })).toBeNull();
  });

  it('says a page past the last is empty, and offers the first (QA-56)', async () => {
    pageService.adminList.mockResolvedValue(envelope([], { page: 4, total: 4, totalPages: 1 }));
    renderList({ url: '/admin/pages?page=4' });

    expect(await screen.findByText('Nothing on this page')).toBeInTheDocument();
    expect(screen.queryByText('No pages yet')).toBeNull();
    expect(screen.getByRole('button', { name: 'Go to first page' })).toBeInTheDocument();
  });

  it('steps back a page when a delete empties the one on screen (QA-56)', async () => {
    pageService.adminList.mockImplementation((params) =>
      Promise.resolve(
        Number(params.page) === 2
          ? envelope([LOAN], { page: 2, perPage: 20, total: 21, totalPages: 2 })
          : envelope(ROWS, { page: 1, perPage: 20, total: 21, totalPages: 2 })
      )
    );
    renderList({ url: '/admin/pages?page=2' });
    await rowsLoaded('Home Loan Assistance');
    const table = within(screen.getByRole('table'));

    await userEvent.click(table.getByRole('button', { name: 'Actions for Home Loan Assistance' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /Delete/ }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(pageService.remove).toHaveBeenCalledWith(3));
    await waitFor(() => expect(lastListCall()).toEqual(expect.objectContaining({ page: 1 })));
  });

  it('links to the header menu screen', async () => {
    renderList();
    await screen.findByRole('table');

    expect(screen.getByRole('link', { name: 'Header menu' })).toHaveAttribute(
      'href',
      '/admin/pages/menus'
    );
  });
});
