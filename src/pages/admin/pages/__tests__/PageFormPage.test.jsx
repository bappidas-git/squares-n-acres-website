/**
 * Admin → Pages → add / edit (QA-56).
 *
 * The block editor and the SEO panel have suites of their own; here they are
 * stand-ins that report what the form handed them, so what is asserted is the
 * form's part: what it saves, when it refuses to, and what it offers for a
 * built-in page, the home page and a live page whose address moves.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';

import PageFormPage from '../PageFormPage';
import ApiError from '../../../../services/apiError';
import ToastProvider from '../../../../components/common/ToastProvider';
import authService from '../../../../services/authService';
import headerMenuService from '../../../../services/headerMenuService';
import openInNewTab from '../../../../utils/openInNewTab';
import pageService from '../../../../services/pageService';
import redirectService from '../../../../services/redirectService';
import renderWith from '../../../../test-utils';
import storage from '../../../../utils/storage';
import { AUTH_STORAGE_KEYS, clearSession } from '../../../../services/http';
import { AdminAuthProvider } from '../../../../contexts/AdminAuthContext';

jest.mock('../../../../services/authService');
jest.mock('../../../../services/pageService');
jest.mock('../../../../services/headerMenuService');
jest.mock('../../../../services/redirectService');
jest.mock('../../../../utils/openInNewTab');
// `useBlocker` needs a data router; the test renders a `MemoryRouter`.
jest.mock('../../../../contexts/NavigationGuardContext', () => ({
  __esModule: true,
  useNavigationGuard: () => ({ register: () => () => {}, isBlocking: false }),
  NavigationGuardProvider: ({ children }) => children,
  UNSAVED_CHANGES_MESSAGE: 'unsaved',
}));
jest.mock('../../../../components/cms/BlockEditor/BlockEditor', () => ({
  __esModule: true,
  default: function MockBlockEditor({ blocks, onChange }) {
    return (
      <div data-testid="block-editor">
        {`${blocks.length} blocks`}
        <button
          type="button"
          onClick={() =>
            onChange([
              ...blocks,
              {
                id: `tmp-${blocks.length + 1}`,
                type: 'richText',
                order: blocks.length + 1,
                data: { html: '<p>More.</p>' },
              },
            ])
          }
        >
          Add a block
        </button>
      </div>
    );
  },
}));
jest.mock('../../../../components/seo/SeoPanel', () => ({
  __esModule: true,
  default: function MockSeoPanel({ fixedPath, onSlugChange }) {
    return (
      <div
        data-testid="seo-panel"
        data-fixed-path={fixedPath ?? ''}
        data-slug-editable={onSlugChange ? 'yes' : 'no'}
      />
    );
  },
}));

const RECORD = {
  id: 5,
  slug: 'about',
  title: 'About Us',
  template: 'about',
  status: 'published',
  heroImageUrl: null,
  blocks: [{ id: 1, type: 'richText', order: 1, data: { html: '<p>Hello.</p>' } }],
  leadSource: null,
  order: 2,
  showInHeader: true,
  headerMenu: 'company',
  headerSubmenu: null,
  showInFooter: true,
  footerColumn: 'company',
  seo: { focusKeyword: '', title: '', description: '', slug: 'about' },
  updatedAt: '2026-09-15T06:00:00.000Z',
};

const DRAFT = {
  ...RECORD,
  id: 6,
  slug: 'buyer-assistance/home-loan',
  title: 'Home Loan Assistance',
  template: 'service',
  status: 'draft',
  showInHeader: false,
  headerMenu: null,
  showInFooter: false,
  footerColumn: null,
  seo: { ...RECORD.seo, slug: 'buyer-assistance/home-loan' },
};

const BUY = {
  ...RECORD,
  id: 17,
  slug: 'buy',
  title: 'Buy',
  template: 'system',
  status: 'published',
  blocks: [],
  showInHeader: false,
  headerMenu: null,
  showInFooter: false,
  footerColumn: null,
  seo: { ...RECORD.seo, slug: 'buy' },
};

const HOME = {
  ...RECORD,
  id: 1,
  slug: 'home',
  title: 'Home',
  template: 'landing',
  showInHeader: false,
  headerMenu: null,
  showInFooter: false,
  footerColumn: null,
  seo: { ...RECORD.seo, slug: 'home' },
};

const MENUS = [
  { id: 1, slug: 'buy', name: 'Buy', source: 'buy', isActive: true, submenus: [], links: [] },
  {
    id: 9,
    slug: 'company',
    name: 'Company',
    source: 'custom',
    isActive: true,
    submenus: [
      { slug: 'who-we-are', name: 'Who we are' },
      { slug: 'work-with-us', name: 'Work with us' },
    ],
    links: [],
  },
  { id: 12, slug: 'offers', name: 'Offers', source: 'custom', isActive: false, submenus: [] },
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

/** Wherever a navigation away from the form landed. */
function Elsewhere() {
  const location = useLocation();
  return <p data-testid="elsewhere">{`${location.pathname}${location.search}`}</p>;
}

/** Renders the form at `/admin/pages/edit/:id`, or at `/add` with no id. */
const renderForm = ({ record = RECORD, id = String(record?.id ?? '') } = {}) => {
  storage.setItem(AUTH_STORAGE_KEYS.token, 'seeded-token');
  storage.setItem(AUTH_STORAGE_KEYS.user, ADMIN);
  storage.setItem(
    AUTH_STORAGE_KEYS.expiresAt,
    new Date(Date.now() + 6 * 3600 * 1000).toISOString()
  );
  authService.profile.mockResolvedValue({ data: ADMIN });
  if (record) pageService.adminGet.mockResolvedValue({ data: record });

  const url = id ? `/admin/pages/edit/${id}` : '/admin/pages/add';
  const path = id ? '/admin/pages/edit/:id' : '/admin/pages/add';

  return renderWith(
    <ToastProvider>
      <AdminAuthProvider>
        <Routes>
          <Route path={path} element={<PageFormPage />} />
          <Route path="*" element={<Elsewhere />} />
        </Routes>
      </AdminAuthProvider>
    </ToastProvider>,
    { initialEntries: [url] }
  );
};

/** The form, once the record is in it. */
const loaded = async (title = RECORD.title) => screen.findByDisplayValue(title);

const actionBar = () => {
  const bars = screen.getAllByRole('button', { name: 'Save' });
  return bars[bars.length - 1];
};

const lastUpdateBody = () => pageService.update.mock.calls.at(-1)[1];

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
  clearSession();
  setViewport(1440);

  authService.logout.mockResolvedValue({ data: null, message: 'Logged out.' });
  headerMenuService.adminList.mockResolvedValue({ data: MENUS });
  pageService.checkSlug.mockResolvedValue({ data: { available: true } });
  pageService.update.mockImplementation((id, body) =>
    Promise.resolve({ data: { ...RECORD, ...body, id: Number(id) } })
  );
  pageService.create.mockImplementation((body) =>
    Promise.resolve({ data: { ...RECORD, ...body, id: 40 } })
  );
  pageService.previewToken.mockResolvedValue({ data: { token: 'tok-1' } });
  redirectService.deactivateByFromPath.mockResolvedValue(null);
  redirectService.upsertByFromPath.mockResolvedValue({ data: {} });
  openInNewTab.mockReturnValue(true);
});

describe('PageFormPage', () => {
  describe('a save the rules refuse (prompt 51)', () => {
    it('says so instead of doing nothing, and writes nothing', async () => {
      renderForm({
        record: {
          ...RECORD,
          // A features block with a card that has no title: the message lands
          // inside the block, which used to be collapsed and silent.
          blocks: [
            {
              id: 1,
              type: 'features',
              order: 1,
              data: {
                title: 'Why us',
                items: [{ id: 'a', icon: 'mdi:star', title: '', text: '' }],
              },
            },
          ],
        },
      });
      const title = await loaded();

      fireEvent.change(title, { target: { value: 'About Squares N Acres' } });
      await userEvent.click(actionBar());

      expect(
        await screen.findByText('Fix the highlighted fields before saving.')
      ).toBeInTheDocument();
      expect(pageService.update).not.toHaveBeenCalled();
    });

    it('refuses a block type the API does not know, and says so', async () => {
      renderForm({
        record: { ...RECORD, blocks: [{ id: 1, type: 'retired', order: 1, data: {} }] },
      });
      const title = await loaded();

      fireEvent.change(title, { target: { value: 'About Squares N Acres' } });
      await userEvent.click(actionBar());

      expect(
        await screen.findByText('Fix the highlighted fields before saving.')
      ).toBeInTheDocument();
      expect(pageService.update).not.toHaveBeenCalled();
    });
  });

  describe('saving', () => {
    it('does not write a page nothing has changed on (QA-56)', async () => {
      renderForm();
      await loaded();

      await userEvent.click(actionBar());

      expect(await screen.findByText('No changes to save.')).toBeInTheDocument();
      expect(pageService.update).not.toHaveBeenCalled();
    });

    it('keeps the form on screen through a save instead of reloading it (QA-56)', async () => {
      renderForm();
      const title = await loaded();

      fireEvent.change(title, { target: { value: 'About Squares N Acres' } });
      await userEvent.click(actionBar());

      await waitFor(() => expect(pageService.update).toHaveBeenCalledTimes(1));
      expect(await screen.findByText('Page saved. It is live.')).toBeInTheDocument();
      // The answer is the record: no second read, no skeleton, the same box.
      expect(pageService.adminGet).toHaveBeenCalledTimes(1);
      expect(screen.getByDisplayValue('About Squares N Acres')).toBe(title);
      expect(screen.queryByText('Loading the page…')).toBeNull();
    });

    it('takes a title of up to 150 characters and refuses a longer one (QA-56)', async () => {
      renderForm();
      const title = await loaded();

      fireEvent.change(title, { target: { value: 'A'.repeat(151) } });
      await userEvent.click(actionBar());
      expect(
        await screen.findByText('The title may not be longer than 150 characters.')
      ).toBeInTheDocument();
      expect(pageService.update).not.toHaveBeenCalled();

      fireEvent.change(title, { target: { value: 'A'.repeat(150) } });
      await userEvent.click(actionBar());
      await waitFor(() => expect(pageService.update).toHaveBeenCalledTimes(1));
      expect(lastUpdateBody().title).toHaveLength(150);
    });

    it('refuses a one-letter title, as the API does', async () => {
      renderForm();
      const title = await loaded();

      fireEvent.change(title, { target: { value: 'A' } });
      await userEvent.click(actionBar());

      expect(
        await screen.findByText('The title must be at least 2 characters.')
      ).toBeInTheDocument();
      expect(pageService.update).not.toHaveBeenCalled();
    });

    it('saves on Ctrl+S, once however long the key is held (QA-56)', async () => {
      renderForm();
      const title = await loaded();

      fireEvent.change(title, { target: { value: 'About the company' } });
      fireEvent.keyDown(window, { key: 's', ctrlKey: true });
      fireEvent.keyDown(window, { key: 's', ctrlKey: true, repeat: true });

      await waitFor(() => expect(pageService.update).toHaveBeenCalledTimes(1));
      expect(lastUpdateBody().title).toBe('About the company');
    });

    it('moves a new page to its own address, replacing the add route', async () => {
      renderForm({ record: null, id: '' });
      const title = await screen.findByRole('textbox', { name: /Title/ });

      fireEvent.change(title, { target: { value: 'Partner with us' } });
      expect(await screen.findByDisplayValue('partner-with-us')).toBeInTheDocument();
      await userEvent.click(actionBar());

      await waitFor(() => expect(pageService.create).toHaveBeenCalledTimes(1));
      expect(pageService.create.mock.calls[0][0]).toEqual(
        expect.objectContaining({ title: 'Partner with us', slug: 'partner-with-us' })
      );
      expect(await screen.findByTestId('elsewhere')).toHaveTextContent('/admin/pages/edit/40');
    });
  });

  describe('publishing', () => {
    it('publishes a draft in one press', async () => {
      pageService.update.mockImplementation((id, body) =>
        Promise.resolve({ data: { ...DRAFT, ...body } })
      );
      renderForm({ record: DRAFT });
      await loaded(DRAFT.title);

      await userEvent.click(screen.getAllByRole('button', { name: 'Publish' })[0]);

      await waitFor(() => expect(pageService.update).toHaveBeenCalledTimes(1));
      expect(lastUpdateBody().status).toBe('published');
      expect(await screen.findByText('Page saved. It is live.')).toBeInTheDocument();
    });

    it('puts a refused publish back to draft (QA-56)', async () => {
      pageService.update.mockRejectedValue(
        new ApiError({
          status: 422,
          message: 'The given data was invalid.',
          errors: { title: ['The title has already been taken.'] },
        })
      );
      renderForm({ record: DRAFT });
      await loaded(DRAFT.title);

      await userEvent.click(screen.getAllByRole('button', { name: 'Publish' })[0]);

      await waitFor(() => expect(pageService.update).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(screen.getByRole('radio', { name: 'Draft' })).toBeChecked());
      // "Publish" is offered again, and a plain save would not publish.
      expect(screen.getAllByRole('button', { name: 'Publish' }).length).toBeGreaterThan(0);
    });
  });

  describe('preview', () => {
    it('opens an unchanged page without saving it again (QA-56)', async () => {
      renderForm({ record: DRAFT });
      await loaded(DRAFT.title);

      await userEvent.click(screen.getAllByRole('button', { name: 'Preview' })[0]);

      await waitFor(() => expect(openInNewTab).toHaveBeenCalledTimes(1));
      expect(openInNewTab).toHaveBeenCalledWith('/buyer-assistance/home-loan?preview=tok-1');
      expect(pageService.update).not.toHaveBeenCalled();
    });

    it('saves a changed page first, and says so on the button', async () => {
      renderForm({ record: DRAFT });
      const title = await loaded(DRAFT.title);

      fireEvent.change(title, { target: { value: 'Home loans, handled' } });
      await userEvent.click(screen.getAllByRole('button', { name: 'Save & preview' })[0]);

      await waitFor(() => expect(pageService.update).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(openInNewTab).toHaveBeenCalledTimes(1));
    });
  });

  describe('a live page whose address changes', () => {
    it('offers a 301 from the old address, and writes it after the save (QA-56)', async () => {
      renderForm();
      await loaded();

      // A saved page's URL arrives unlocked: it is a live address, not a draft.
      const slug = screen.getByDisplayValue('about');
      fireEvent.change(slug, { target: { value: 'about-us' } });

      expect(await screen.findByText(/This page is live at/)).toBeInTheDocument();
      expect(
        screen.getByRole('switch', { name: 'Send visitors from /about to the new address (301)' })
      ).toHaveAttribute('aria-checked', 'true');

      await userEvent.click(actionBar());

      await waitFor(() =>
        expect(redirectService.upsertByFromPath).toHaveBeenCalledWith(
          expect.objectContaining({ fromPath: '/about', toPath: '/about-us', statusCode: 301 })
        )
      );
      // A rule that sent the new address elsewhere would now loop.
      expect(redirectService.deactivateByFromPath).toHaveBeenCalledWith('/about-us');
      expect(await screen.findByText('/about now redirects to /about-us.')).toBeInTheDocument();
    });

    it('writes no redirect when the editor turns it off', async () => {
      renderForm();
      await loaded();

      fireEvent.change(screen.getByDisplayValue('about'), { target: { value: 'company' } });
      await userEvent.click(
        await screen.findByRole('switch', {
          name: 'Send visitors from /about to the new address (301)',
        })
      );
      await userEvent.click(actionBar());

      await waitFor(() => expect(pageService.update).toHaveBeenCalledTimes(1));
      expect(redirectService.upsertByFromPath).not.toHaveBeenCalled();
    });
  });

  describe('protected pages', () => {
    it('edits a built-in page’s name and place, and nothing the site generates (QA-56)', async () => {
      pageService.update.mockImplementation((id, body) =>
        Promise.resolve({ data: { ...BUY, ...body } })
      );
      renderForm({ record: BUY });
      const name = await loaded('Buy');

      expect(screen.getByText(/A built-in page: the site generates it/)).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /Name/ })).toBe(name);
      expect(screen.getByDisplayValue('/buy')).toHaveAttribute('readonly');
      expect(screen.getByRole('combobox', { name: /Template/ })).toBeDisabled();
      expect(screen.getByRole('radio', { name: 'Draft' })).toBeDisabled();
      expect(screen.queryByTestId('block-editor')).toBeNull();
      expect(screen.queryByTestId('seo-panel')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Publish' })).toBeNull();
      expect(screen.getAllByRole('link', { name: /View on the site/ })[0]).toHaveAttribute(
        'href',
        '/buy'
      );

      fireEvent.change(name, { target: { value: 'Buy a home' } });
      await userEvent.click(actionBar());

      await waitFor(() => expect(pageService.update).toHaveBeenCalledTimes(1));
      expect(lastUpdateBody()).toEqual(
        expect.objectContaining({
          title: 'Buy a home',
          slug: 'buy',
          template: 'system',
          status: 'published',
          blocks: [],
        })
      );
    });

    it('shows the home page at the site root and keeps its address (QA-56)', async () => {
      renderForm({ record: HOME });
      await loaded('Home');

      expect(screen.getByDisplayValue('/')).toHaveAttribute('readonly');
      expect(screen.queryByDisplayValue('home')).toBeNull();
      const panel = screen.getByTestId('seo-panel');
      expect(panel).toHaveAttribute('data-fixed-path', '/');
      expect(panel).toHaveAttribute('data-slug-editable', 'no');
    });
  });

  describe('placement in the header', () => {
    it('offers every menu, hidden ones marked, and the submenus of the one chosen (QA-56)', async () => {
      renderForm();
      await loaded();

      const menu = screen.getByRole('combobox', { name: /Header menu/ });
      await waitFor(() =>
        expect(within(menu).getByRole('option', { name: 'Offers (hidden)' })).toBeInTheDocument()
      );
      expect(within(menu).getByRole('option', { name: 'Buy' })).toBeInTheDocument();

      const submenu = screen.getByRole('combobox', { name: /Submenu/ });
      await userEvent.selectOptions(submenu, 'work-with-us');
      await userEvent.click(actionBar());

      await waitFor(() => expect(pageService.update).toHaveBeenCalledTimes(1));
      expect(lastUpdateBody()).toEqual(
        expect.objectContaining({
          showInHeader: true,
          headerMenu: 'company',
          headerSubmenu: 'work-with-us',
        })
      );
    });

    it('lets go of the submenu when the menu changes', async () => {
      renderForm({ record: { ...RECORD, headerSubmenu: 'who-we-are' } });
      await loaded();

      await userEvent.selectOptions(
        await screen.findByRole('combobox', { name: /Header menu/ }),
        'buy'
      );
      expect(screen.queryByRole('combobox', { name: /Submenu/ })).toBeNull();
      await userEvent.click(actionBar());

      await waitFor(() => expect(pageService.update).toHaveBeenCalledTimes(1));
      expect(lastUpdateBody()).toEqual(
        expect.objectContaining({ headerMenu: 'buy', headerSubmenu: null })
      );
    });

    it('names a menu the page is in that no longer exists', async () => {
      renderForm({ record: { ...RECORD, headerMenu: 'ghost' } });
      await loaded();

      expect(await screen.findByRole('option', { name: 'ghost (not found)' })).toBeInTheDocument();
    });

    it('says the menus did not load rather than calling the page’s one missing (QA-56)', async () => {
      headerMenuService.adminList
        .mockRejectedValueOnce(new ApiError({ status: 0, message: 'Unable to reach the server.' }))
        .mockResolvedValue({ data: MENUS });
      renderForm();
      await loaded();

      expect(await screen.findByText(/The header’s menus could not be loaded/)).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'company' })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /not found/ })).toBeNull();

      await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
      expect(await screen.findByRole('option', { name: 'Offers (hidden)' })).toBeInTheDocument();
      expect(screen.queryByText(/The header’s menus could not be loaded/)).toBeNull();
    });

    it('links to the menus, in a new tab', async () => {
      renderForm();
      await loaded();

      const link = screen.getByRole('link', { name: 'Add or change menus' });
      expect(link).toHaveAttribute('href', '/admin/pages/menus');
      expect(link).toHaveAttribute('target', '_blank');
    });
  });
});
