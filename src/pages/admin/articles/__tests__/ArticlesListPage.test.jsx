/**
 * Admin → Articles: the list screen (prompt 33).
 *
 * The service is a set of spies, so what the screen asks the API for is the
 * assertion: the table pages, sorts and filters on the server (§5.6, BUG-19),
 * and the writes it offers are the ones §5.8 gives the resource.
 */

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ArticlesListPage from '../ArticlesListPage';
import ToastProvider from '../../../../components/common/ToastProvider';
import articleService from '../../../../services/articleService';
import authService from '../../../../services/authService';
import renderWith from '../../../../test-utils';
import storage from '../../../../utils/storage';
import { AUTH_STORAGE_KEYS, clearSession } from '../../../../services/http';
import { AdminAuthProvider } from '../../../../contexts/AdminAuthContext';

jest.mock('../../../../services/authService');
jest.mock('../../../../services/articleService');
jest.mock('../../../../services/masterDataService', () => {
  const collection = (data) => ({
    adminList: jest.fn(() => Promise.resolve({ data })),
    create: jest.fn(() => Promise.resolve({ data: null })),
  });
  const service = {
    articleCategories: collection([{ id: 1, name: 'Legal & RERA', slug: 'legal-rera', order: 1 }]),
    articleTags: collection([{ id: 1, name: 'rera', slug: 'rera' }]),
    authors: collection([
      { id: 1, name: 'Editorial Team', slug: 'editorial-team', isActive: true },
    ]),
  };
  return { __esModule: true, default: service, ...service };
});

const ROWS = [
  {
    id: 1,
    slug: 'karnataka-rera-guide-for-homebuyers',
    title: 'Karnataka RERA: A Complete Guide',
    excerpt: 'What a registration number tells a buyer.',
    featuredImage: { url: 'https://images.test/rera.jpg', alt: 'RERA', caption: null },
    category: { id: 1, name: 'Legal & RERA', slug: 'legal-rera' },
    author: { id: 1, name: 'Editorial Team', slug: 'editorial-team', avatarUrl: null },
    status: 'published',
    publishedAt: '2026-05-27T06:30:00.000Z',
    isFeatured: true,
    viewCount: 412,
    seo: { score: 78, scoreBand: 'ok' },
    updatedAt: '2026-09-15T06:00:00.000Z',
  },
  {
    id: 2,
    slug: 'khata-transfer-checklist',
    title: 'Khata Transfer: The Checklist',
    excerpt: '',
    featuredImage: null,
    category: { id: 1, name: 'Legal & RERA', slug: 'legal-rera' },
    author: { id: 1, name: 'Editorial Team', slug: 'editorial-team', avatarUrl: null },
    status: 'scheduled',
    publishedAt: '2026-10-12T03:30:00.000Z',
    isFeatured: false,
    viewCount: 0,
    seo: { score: null, scoreBand: 'none' },
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
// one, which it takes for "not laid out".
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

const renderList = ({ url = '/admin/articles' } = {}) => {
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
        <ArticlesListPage />
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
  articleService.adminList.mockResolvedValue(envelope());
  articleService.patch.mockResolvedValue({ data: ROWS[0] });
  articleService.remove.mockResolvedValue({ data: null, message: 'Deleted' });
  articleService.duplicate.mockResolvedValue({ data: { ...ROWS[0], id: 99 } });
  articleService.previewToken.mockResolvedValue({
    data: { token: 'tok-1', url: 'https://example.test' },
  });
  articleService.bulk.mockResolvedValue({
    data: { affected: 2 },
    message: '2 articles updated.',
  });
});

describe('ArticlesListPage', () => {
  it('renders one row per article the service answers with', async () => {
    renderList();

    expect(await screen.findByText('Karnataka RERA: A Complete Guide')).toBeInTheDocument();
    expect(screen.getByText('Khata Transfer: The Checklist')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Articles/ })).toBeInTheDocument();
  });

  it('asks the API for the page, the page size and the sort (§5.6)', async () => {
    renderList();
    await screen.findByText('Karnataka RERA: A Complete Guide');

    expect(articleService.adminList).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, perPage: 20, sort: 'updatedAt', order: 'desc' }),
      expect.anything()
    );
  });

  it('reads the filters out of the URL rather than narrowing in the browser', async () => {
    renderList({ url: '/admin/articles?status=draft,scheduled&categoryId=1&isFeatured=true' });
    await screen.findByText('Karnataka RERA: A Complete Guide');

    expect(articleService.adminList).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ['draft', 'scheduled'],
        categoryId: '1',
        isFeatured: 'true',
      }),
      expect.anything()
    );
  });

  it('shows a scheduled article with the moment it is waiting for', async () => {
    renderList();
    await screen.findByText('Khata Transfer: The Checklist');

    const table = within(screen.getByRole('table'));
    expect(table.getByText('Scheduled')).toBeInTheDocument();
    // 03:30 UTC is 09:00 in Bengaluru (D22).
    expect(table.getByText(/12 Oct 2026, 09:00 am/)).toBeInTheDocument();
    expect(table.getByText('78 · Needs work')).toBeInTheDocument();
    expect(table.getByText('Not analysed')).toBeInTheDocument();
  });

  describe('bulk actions', () => {
    it('publishes the ticked rows through one call (§5.8)', async () => {
      renderList();
      await screen.findByText('Karnataka RERA: A Complete Guide');

      await userEvent.click(screen.getByRole('checkbox', { name: 'Select all rows on this page' }));
      await userEvent.click(screen.getByRole('button', { name: 'Publish' }));

      await waitFor(() =>
        expect(articleService.bulk).toHaveBeenCalledWith({ ids: [1, 2], action: 'publish' })
      );
      expect(await screen.findByText('2 articles updated.')).toBeInTheDocument();
    });

    it('confirms before deleting, naming what it is about to remove', async () => {
      renderList();
      await screen.findByText('Karnataka RERA: A Complete Guide');

      await userEvent.click(screen.getByRole('checkbox', { name: 'Select row 1' }));
      await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByText(/1 article will be deleted/)).toBeInTheDocument();
      expect(articleService.bulk).not.toHaveBeenCalled();

      await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
      await waitFor(() =>
        expect(articleService.bulk).toHaveBeenCalledWith({ ids: [1], action: 'delete' })
      );
    });
  });

  describe('row actions', () => {
    it('duplicates an article as a draft and opens the copy', async () => {
      renderList();
      await screen.findByText('Karnataka RERA: A Complete Guide');

      await userEvent.click(
        screen.getByRole('button', { name: 'Actions for Karnataka RERA: A Complete Guide' })
      );
      await userEvent.click(await screen.findByRole('menuitem', { name: 'Duplicate' }));

      await waitFor(() => expect(articleService.duplicate).toHaveBeenCalledWith(1));
    });

    it('asks for a preview token and opens the article behind it (D28)', async () => {
      const open = jest.spyOn(window, 'open').mockImplementation(() => null);
      renderList();
      await screen.findByText('Khata Transfer: The Checklist');

      await userEvent.click(
        screen.getByRole('button', { name: 'Actions for Khata Transfer: The Checklist' })
      );
      await userEvent.click(await screen.findByRole('menuitem', { name: 'Preview' }));

      await waitFor(() => expect(articleService.previewToken).toHaveBeenCalledWith(2));
      expect(open).toHaveBeenCalledWith(
        '/insights/articles/khata-transfer-checklist?preview=tok-1',
        '_blank',
        'noopener,noreferrer'
      );
      open.mockRestore();
    });

    it('offers "View on the site" only for an article that is live', async () => {
      renderList();
      await screen.findByText('Khata Transfer: The Checklist');

      await userEvent.click(
        screen.getByRole('button', { name: 'Actions for Khata Transfer: The Checklist' })
      );
      expect(screen.queryByRole('menuitem', { name: 'View on the site' })).not.toBeInTheDocument();
    });

    it('patches the featured flag of one row', async () => {
      renderList();
      await screen.findByText('Khata Transfer: The Checklist');

      await userEvent.click(
        screen.getByRole('button', { name: 'Actions for Khata Transfer: The Checklist' })
      );
      await userEvent.click(await screen.findByRole('menuitem', { name: 'Feature' }));

      await waitFor(() =>
        expect(articleService.patch).toHaveBeenCalledWith(2, { isFeatured: true })
      );
    });
  });

  describe('the empty state', () => {
    it('offers to reset the filters when a filtered list comes back empty', async () => {
      articleService.adminList.mockResolvedValue(envelope([], { total: 0, totalPages: 0 }));
      renderList({ url: '/admin/articles?q=nothing' });

      expect(await screen.findByText('No articles match')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reset filters' })).toBeInTheDocument();
    });

    it('invites the first article when nothing is filtered and nothing exists', async () => {
      articleService.adminList.mockResolvedValue(envelope([], { total: 0, totalPages: 0 }));
      renderList();

      expect(await screen.findByText('No articles yet')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Write the first article' })).toBeInTheDocument();
    });
  });
});
