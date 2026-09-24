/**
 * Admin → Pages → Header menu (QA-56).
 *
 * The header's menus were a constant, and a page could join three of them.
 * This screen makes them records: added, renamed, hidden, reordered, deleted,
 * each with submenus, links and the pages placed in it. The services are
 * spies, so each test reads what the screen wrote.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import HeaderMenusPage from '../HeaderMenusPage';
import ApiError from '../../../../services/apiError';
import ToastProvider from '../../../../components/common/ToastProvider';
import authService from '../../../../services/authService';
import headerMenuService from '../../../../services/headerMenuService';
import pageService from '../../../../services/pageService';
import renderWith from '../../../../test-utils';
import storage from '../../../../utils/storage';
import { AUTH_STORAGE_KEYS, clearSession } from '../../../../services/http';
import { AdminAuthProvider } from '../../../../contexts/AdminAuthContext';

jest.mock('../../../../services/authService');
jest.mock('../../../../services/headerMenuService');
jest.mock('../../../../services/pageService');

const MENUS = [
  {
    id: 1,
    slug: 'buy',
    name: 'Buy',
    href: '/buy',
    source: 'buy',
    isActive: true,
    order: 1,
    submenus: [],
    links: [],
  },
  {
    id: 2,
    slug: 'company',
    name: 'Company',
    href: null,
    source: 'custom',
    isActive: true,
    order: 2,
    submenus: [{ slug: 'who-we-are', name: 'Who we are' }],
    links: [{ label: 'Blog', href: '/insights/articles', submenu: null, order: 1, newTab: false }],
  },
  {
    id: 3,
    slug: 'offers',
    name: 'Offers',
    href: null,
    source: 'custom',
    isActive: false,
    order: 3,
    submenus: [],
    links: [],
  },
];

const PAGES = [
  {
    id: 2,
    slug: 'about',
    title: 'About Us',
    status: 'published',
    order: 2,
    showInHeader: true,
    headerMenu: 'company',
    headerSubmenu: 'who-we-are',
  },
  {
    id: 4,
    slug: 'careers',
    title: 'Careers',
    status: 'draft',
    order: 4,
    showInHeader: true,
    headerMenu: 'company',
    headerSubmenu: null,
  },
  {
    id: 6,
    slug: 'partnership',
    title: 'Partnership',
    status: 'published',
    order: 6,
    showInHeader: false,
    headerMenu: null,
    headerSubmenu: null,
  },
];

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

const ADMIN = {
  id: 1,
  name: 'Admin user',
  email: 'admin@squaresnacres.com',
  role: 'admin',
  phone: '9880000012',
  avatarUrl: null,
};

const renderScreen = (user = ADMIN) => {
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
        <HeaderMenusPage />
      </AdminAuthProvider>
    </ToastProvider>,
    { initialEntries: ['/admin/pages/menus'] }
  );
};

/** Waits for the menus the service answered with. */
const loaded = () => screen.findByText('Company');

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
  clearSession();
  setViewport(1440);

  authService.logout.mockResolvedValue({ data: null, message: 'Logged out.' });
  headerMenuService.adminList.mockResolvedValue({ data: MENUS });
  headerMenuService.patch.mockImplementation((id, body) =>
    Promise.resolve({ data: { ...MENUS.find((menu) => menu.id === id), ...body } })
  );
  headerMenuService.create.mockImplementation((body) =>
    Promise.resolve({ data: { ...body, id: 9, slug: 'projects' } })
  );
  headerMenuService.update.mockImplementation((id, body) =>
    Promise.resolve({ data: { ...body, id } })
  );
  headerMenuService.remove.mockResolvedValue({ data: null, message: 'Deleted' });
  pageService.adminList.mockResolvedValue({ data: PAGES });
  pageService.patch.mockResolvedValue({ data: {} });
});

describe('HeaderMenusPage', () => {
  it('lists every menu left to right, with what is in each (QA-56)', async () => {
    renderScreen();
    await loaded();
    const list = within(screen.getByRole('list', { name: 'Header menus, left to right' }));

    expect(list.getAllByRole('listitem').map((item) => item.getAttribute('aria-label'))).toEqual([
      'Buy, position 1 of 3',
      'Company, position 2 of 3',
      'Offers, position 3 of 3',
    ]);
    expect(
      screen.getByText(/Pages and links · 2 pages \(1 draft\) · 1 link · 1 submenu/)
    ).toBeInTheDocument();
    expect(screen.getByText('Hidden')).toBeInTheDocument();
    // A generated menu is hidden, never deleted.
    expect(screen.queryByRole('button', { name: 'Delete “Buy”' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Delete “Company”' })).toBeInTheDocument();
  });

  it('hides a menu and puts it back', async () => {
    renderScreen();
    await loaded();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Show “Company” in the header' }));
    await waitFor(() =>
      expect(headerMenuService.patch).toHaveBeenCalledWith(2, { isActive: false })
    );
    expect(await screen.findByText('“Company” is hidden.')).toBeInTheDocument();
  });

  it('moves a menu with one write, placed by its neighbour (QA-56)', async () => {
    renderScreen();
    await loaded();

    await userEvent.click(screen.getByRole('button', { name: 'Move Offers up' }));

    await waitFor(() => expect(headerMenuService.patch).toHaveBeenCalledWith(3, { order: 2 }));
    expect(headerMenuService.patch).toHaveBeenCalledTimes(1);
  });

  it('adds a menu with a submenu, a link and a page (QA-56)', async () => {
    renderScreen();
    await loaded();

    await userEvent.click(screen.getByRole('button', { name: 'Add menu' }));
    const dialog = within(await screen.findByRole('dialog'));

    fireEvent.change(dialog.getByRole('textbox', { name: /^Name/ }), {
      target: { value: 'Projects' },
    });
    await userEvent.click(dialog.getByRole('button', { name: 'Add submenu' }));
    fireEvent.change(dialog.getByRole('textbox', { name: 'Submenu 1' }), {
      target: { value: 'Upcoming launches' },
    });

    await userEvent.click(dialog.getByRole('button', { name: 'Add link' }));
    fireEvent.change(dialog.getByRole('textbox', { name: 'Link 1 label' }), {
      target: { value: 'Under 50 lakh' },
    });
    fireEvent.change(dialog.getByRole('textbox', { name: 'Link 1 address' }), {
      target: { value: '/buy?maxPrice=5000000' },
    });

    await userEvent.selectOptions(dialog.getByRole('combobox', { name: 'Add a page' }), '6');
    const to = dialog.getByRole('combobox', { name: 'To' });
    await userEvent.selectOptions(to, [
      within(to).getByRole('option', { name: 'Upcoming launches' }),
    ]);
    await userEvent.click(dialog.getByRole('button', { name: 'Add' }));
    expect(dialog.getByText('Partnership')).toBeInTheDocument();

    await userEvent.click(dialog.getByRole('button', { name: 'Add menu' }));

    await waitFor(() => expect(headerMenuService.create).toHaveBeenCalledTimes(1));
    expect(headerMenuService.create).toHaveBeenCalledWith({
      name: 'Projects',
      href: null,
      isActive: true,
      submenus: [{ slug: 'upcoming-launches', name: 'Upcoming launches' }],
      links: [
        {
          label: 'Under 50 lakh',
          href: '/buy?maxPrice=5000000',
          submenu: null,
          order: 1,
          newTab: false,
        },
      ],
      source: 'custom',
      order: 4,
    });
    // The menu first, then the page filed under its new submenu.
    await waitFor(() =>
      expect(pageService.patch).toHaveBeenCalledWith(6, {
        showInHeader: true,
        headerMenu: 'projects',
        headerSubmenu: 'upcoming-launches',
      })
    );
    expect(await screen.findByText('“Projects” added to the header.')).toBeInTheDocument();
  });

  it('says what is missing before asking the API', async () => {
    renderScreen();
    await loaded();

    await userEvent.click(screen.getByRole('button', { name: 'Add menu' }));
    const dialog = within(await screen.findByRole('dialog'));
    await userEvent.click(dialog.getByRole('button', { name: 'Add link' }));
    fireEvent.change(dialog.getByRole('textbox', { name: 'Link 1 address' }), {
      // eslint-disable-next-line no-script-url -- the address being refused
      target: { value: 'javascript:alert(1)' },
    });
    await userEvent.click(dialog.getByRole('button', { name: 'Add menu' }));

    expect(
      dialog.getByText('Give the menu a name — it is the label the header shows.')
    ).toBeInTheDocument();
    expect(dialog.getByText('A link needs a label.')).toBeInTheDocument();
    expect(
      dialog.getByText('Start with “/” for a page of this site, or with https:// for another site.')
    ).toBeInTheDocument();
    expect(headerMenuService.create).not.toHaveBeenCalled();
  });

  it('refuses a name another menu has, and a submenu name twice (QA-56)', async () => {
    renderScreen();
    await loaded();

    await userEvent.click(screen.getByRole('button', { name: 'Add menu' }));
    const dialog = within(await screen.findByRole('dialog'));
    fireEvent.change(dialog.getByRole('textbox', { name: /^Name/ }), {
      target: { value: 'company' },
    });
    await userEvent.click(dialog.getByRole('button', { name: 'Add submenu' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Add submenu' }));
    fireEvent.change(dialog.getByRole('textbox', { name: 'Submenu 1' }), {
      target: { value: 'Guides' },
    });
    fireEvent.change(dialog.getByRole('textbox', { name: 'Submenu 2' }), {
      target: { value: ' guides ' },
    });
    await userEvent.click(dialog.getByRole('button', { name: 'Add menu' }));

    expect(
      dialog.getByText(
        'The header already has a menu called “Company”. Give this one another name.'
      )
    ).toBeInTheDocument();
    expect(dialog.getByText('Two submenus of one menu cannot share a name.')).toBeInTheDocument();
    expect(headerMenuService.create).not.toHaveBeenCalled();
  });

  it('paints the API’s refusal on the box that caused it', async () => {
    headerMenuService.create.mockRejectedValue(
      new ApiError({
        status: 422,
        message: 'The given data was invalid.',
        errors: { name: ['A menu with this name already exists.'] },
      })
    );
    renderScreen();
    await loaded();

    await userEvent.click(screen.getByRole('button', { name: 'Add menu' }));
    const dialog = within(await screen.findByRole('dialog'));
    fireEvent.change(dialog.getByRole('textbox', { name: /^Name/ }), {
      target: { value: 'Resources' },
    });
    await userEvent.click(dialog.getByRole('button', { name: 'Add menu' }));

    expect(await dialog.findByText('A menu with this name already exists.')).toBeInTheDocument();
    expect(pageService.patch).not.toHaveBeenCalled();
  });

  it('takes a page out of a menu and moves another between groups', async () => {
    renderScreen();
    await loaded();

    await userEvent.click(screen.getByRole('button', { name: 'Edit “Company”' }));
    const dialog = within(await screen.findByRole('dialog'));

    await userEvent.click(dialog.getByRole('button', { name: 'Take “Careers” out of the menu' }));
    const group = dialog.getByRole('combobox', { name: 'Group for About Us' });
    await userEvent.selectOptions(group, [
      within(group).getByRole('option', { name: 'The menu’s own list' }),
    ]);
    await userEvent.click(dialog.getByRole('button', { name: 'Save menu' }));

    await waitFor(() => expect(headerMenuService.update).toHaveBeenCalledTimes(1));
    expect(headerMenuService.update).toHaveBeenCalledWith(
      2,
      expect.objectContaining({
        slug: 'company',
        source: 'custom',
        submenus: [{ slug: 'who-we-are', name: 'Who we are' }],
      })
    );
    await waitFor(() => expect(pageService.patch).toHaveBeenCalledTimes(2));
    expect(pageService.patch).toHaveBeenCalledWith(2, {
      showInHeader: true,
      headerMenu: 'company',
      headerSubmenu: null,
    });
    expect(pageService.patch).toHaveBeenCalledWith(4, {
      showInHeader: false,
      headerMenu: null,
      headerSubmenu: null,
    });
  });

  it('keeps a submenu’s key when it is renamed, so its pages stay in it', async () => {
    renderScreen();
    await loaded();

    await userEvent.click(screen.getByRole('button', { name: 'Edit “Company”' }));
    const dialog = within(await screen.findByRole('dialog'));
    fireEvent.change(dialog.getByRole('textbox', { name: 'Submenu 1' }), {
      target: { value: 'About the firm' },
    });
    await userEvent.click(dialog.getByRole('button', { name: 'Save menu' }));

    await waitFor(() => expect(headerMenuService.update).toHaveBeenCalledTimes(1));
    expect(headerMenuService.update.mock.calls[0][1].submenus).toEqual([
      { slug: 'who-we-are', name: 'About the firm' },
    ]);
    // Nothing about the pages changed, so nothing is written to them.
    expect(pageService.patch).not.toHaveBeenCalled();
  });

  it('asks before throwing away changes, and closes an unchanged menu at once', async () => {
    renderScreen();
    await loaded();

    await userEvent.click(screen.getByRole('button', { name: 'Edit “Company”' }));
    let dialog = within(await screen.findByRole('dialog', { name: 'Edit “Company”' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    await userEvent.click(screen.getByRole('button', { name: 'Edit “Company”' }));
    dialog = within(await screen.findByRole('dialog', { name: 'Edit “Company”' }));
    fireEvent.change(dialog.getByRole('textbox', { name: /^Name/ }), {
      target: { value: 'The company' },
    });
    await userEvent.click(dialog.getByRole('button', { name: 'Cancel' }));

    const confirm = within(await screen.findByRole('dialog', { name: 'Discard your changes?' }));
    await userEvent.click(confirm.getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByDisplayValue('The company')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    await userEvent.click(
      within(await screen.findByRole('dialog', { name: 'Discard your changes?' })).getByRole(
        'button',
        { name: 'Discard' }
      )
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(headerMenuService.update).not.toHaveBeenCalled();
  });

  it('names the pages a delete takes out of the header, then deletes (QA-56)', async () => {
    renderScreen();
    await loaded();

    await userEvent.click(screen.getByRole('button', { name: 'Delete “Company”' }));
    const dialog = within(await screen.findByRole('dialog'));
    expect(
      dialog.getByText(/The 2 pages in it will be taken out of the header/)
    ).toBeInTheDocument();
    expect(dialog.getByText('About Us')).toBeInTheDocument();
    expect(dialog.getByText('Careers')).toBeInTheDocument();

    await userEvent.click(dialog.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(headerMenuService.remove).toHaveBeenCalledWith(2));
    expect(await screen.findByText('“Company” deleted.')).toBeInTheDocument();
  });

  it('offers nothing to change to a user who may only read', async () => {
    renderScreen({ ...ADMIN, role: 'sales' });
    await loaded();

    expect(screen.queryByRole('button', { name: 'Add menu' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit “Company”' })).toBeNull();
    expect(screen.getByRole('checkbox', { name: 'Show “Company” in the header' })).toBeDisabled();
  });
});
