/**
 * Admin → Articles: the list screen (prompt 33).
 *
 * The service is a set of spies, so what the screen asks the API for is the
 * assertion: the table pages, sorts and filters on the server (§5.6, BUG-19),
 * and the writes it offers are the ones §5.8 gives the resource.
 */

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';

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
    wordCount: 1154,
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
    wordCount: 212,
    seo: { score: null, scoreBand: 'none' },
    updatedAt: '2026-09-14T06:00:00.000Z',
  },
];

/** Two drafts with everything going live needs (`config/articleRules`). */
const READY_DRAFTS = [3, 4].map((id) => ({
  ...ROWS[0],
  id,
  slug: `ready-draft-${id}`,
  title: `A Ready Draft Number ${id}`,
  status: 'draft',
  publishedAt: null,
  isFeatured: false,
  wordCount: 640,
}));

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

const renderList = ({ url = '/admin/articles', routes = false } = {}) => {
  storage.setItem(AUTH_STORAGE_KEYS.token, 'seeded-token');
  storage.setItem(AUTH_STORAGE_KEYS.user, ADMIN);
  storage.setItem(
    AUTH_STORAGE_KEYS.expiresAt,
    new Date(Date.now() + 6 * 3600 * 1000).toISOString()
  );
  authService.profile.mockResolvedValue({ data: ADMIN });

  // `routes` puts the list beside the public article, so a test can see which
  // of the two the tab ends up on.
  const screenUnderTest = routes ? (
    <Routes>
      <Route path="/admin/articles" element={<ArticlesListPage />} />
      <Route path="/insights/articles/:slug" element={<p>The public article</p>} />
    </Routes>
  ) : (
    <ArticlesListPage />
  );

  return renderWith(
    <ToastProvider>
      <AdminAuthProvider>{screenUnderTest}</AdminAuthProvider>
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
        isFeatured: true,
      }),
      expect.anything()
    );
  });

  it('reads a featured flag that is not true or false as no filter at all (QA-55)', async () => {
    renderList({ url: '/admin/articles?isFeatured=maybe' });
    await screen.findByText('Karnataka RERA: A Complete Guide');

    expect(articleService.adminList).toHaveBeenCalledWith(
      expect.objectContaining({ isFeatured: undefined }),
      expect.anything()
    );
    expect(screen.queryByRole('button', { name: /Remove filter Featured/ })).toBeNull();
  });

  it('names a category the address carries but the list does not know (QA-55)', async () => {
    renderList({ url: '/admin/articles?categoryId=9' });
    await screen.findByText('Karnataka RERA: A Complete Guide');

    expect(
      await screen.findByRole('button', { name: 'Remove filter Category: Unknown category' })
    ).toBeInTheDocument();
  });

  it('shows a scheduled article with the moment it is waiting for', async () => {
    renderList();
    await screen.findByText('Khata Transfer: The Checklist');

    const table = within(screen.getByRole('table'));
    expect(table.getByText('Scheduled')).toBeInTheDocument();
    // 03:30 UTC is 09:00 in Bengaluru (D22).
    expect(table.getByText(/12 Oct 2026, 09:00 am/)).toBeInTheDocument();
    // Its date is a promise, not a publication (QA-55).
    expect(table.getByText('Due 12 Oct 2026')).toBeInTheDocument();
    // The SEO column, and the copy that folds under the status below 1,536 px.
    expect(table.getAllByText('78 · Needs work').length).toBeGreaterThan(0);
    expect(table.getAllByText('Not analysed').length).toBeGreaterThan(0);
  });

  it('marks a featured article and names each row checkbox after its article (QA-55)', async () => {
    renderList();
    await screen.findByText('Karnataka RERA: A Complete Guide');

    const table = within(screen.getByRole('table'));
    expect(table.getAllByRole('img', { name: 'Featured' })).toHaveLength(1);
    expect(
      table.getByRole('checkbox', { name: 'Select Karnataka RERA: A Complete Guide' })
    ).toBeInTheDocument();
  });

  describe('bulk actions', () => {
    it('publishes the ticked rows through one call (§5.8)', async () => {
      articleService.adminList.mockResolvedValue(envelope(READY_DRAFTS));
      renderList();
      await screen.findByText('A Ready Draft Number 3');

      await userEvent.click(screen.getByRole('checkbox', { name: 'Select all rows on this page' }));
      await userEvent.click(screen.getByRole('button', { name: 'Publish' }));

      await waitFor(() =>
        expect(articleService.bulk).toHaveBeenCalledWith({ ids: [3, 4], action: 'publish' })
      );
      expect(await screen.findByText('2 articles updated.')).toBeInTheDocument();
    });

    it('names what an article lacks before publishing it, and publishes the ready ones (QA-55)', async () => {
      articleService.adminList.mockResolvedValue(envelope([...READY_DRAFTS, ROWS[1]]));
      renderList();
      await screen.findByText('A Ready Draft Number 3');

      await userEvent.click(screen.getByRole('checkbox', { name: 'Select all rows on this page' }));
      await userEvent.click(screen.getByRole('button', { name: 'Publish' }));

      const dialog = await screen.findByRole('dialog');
      expect(
        within(dialog).getByText('1 of the 3 selected articles is not ready to go live')
      ).toBeInTheDocument();
      expect(
        within(dialog).getByRole('link', { name: 'Khata Transfer: The Checklist' })
      ).toHaveAttribute('href', '/admin/articles/edit/2');
      expect(
        within(dialog).getByText('no excerpt · no featured image · 212 of 300 words')
      ).toBeInTheDocument();
      expect(articleService.bulk).not.toHaveBeenCalled();

      await userEvent.click(within(dialog).getByRole('button', { name: 'Publish 2 articles' }));
      await waitFor(() =>
        expect(articleService.bulk).toHaveBeenCalledWith({ ids: [3, 4], action: 'publish' })
      );
    });

    it('publishes nothing when nothing chosen is ready', async () => {
      renderList();
      await screen.findByText('Khata Transfer: The Checklist');

      await userEvent.click(
        screen.getByRole('checkbox', { name: 'Select Khata Transfer: The Checklist' })
      );
      await userEvent.click(screen.getByRole('button', { name: 'Publish' }));

      const dialog = await screen.findByRole('dialog');
      expect(
        within(dialog).getByText('“Khata Transfer: The Checklist” is not ready to go live')
      ).toBeInTheDocument();
      await userEvent.click(within(dialog).getByRole('button', { name: 'Got it' }));
      expect(articleService.bulk).not.toHaveBeenCalled();
    });

    it('confirms before deleting, naming what it is about to remove', async () => {
      renderList();
      await screen.findByText('Karnataka RERA: A Complete Guide');

      await userEvent.click(
        screen.getByRole('checkbox', { name: 'Select Karnataka RERA: A Complete Guide' })
      );
      await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByText(/1 article will be deleted/)).toBeInTheDocument();
      expect(articleService.bulk).not.toHaveBeenCalled();

      await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
      await waitFor(() =>
        expect(articleService.bulk).toHaveBeenCalledWith({ ids: [1], action: 'delete' })
      );
    });

    it('keeps its sentence while the confirmation fades out (QA-55)', async () => {
      renderList();
      await screen.findByText('Karnataka RERA: A Complete Guide');

      await userEvent.click(
        screen.getByRole('checkbox', { name: 'Select Karnataka RERA: A Complete Guide' })
      );
      await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
      const dialog = await screen.findByRole('dialog');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

      // Still on screen for its exit, and still saying what it asked.
      expect(dialog).toBeInTheDocument();
      expect(within(dialog).getByText(/1 article will be deleted/)).toBeInTheDocument();
      expect(
        within(dialog).getByRole('heading', { name: 'Delete the selected articles?' })
      ).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(articleService.bulk).not.toHaveBeenCalled();
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

    it('asks for a preview token and opens the article behind it in a new tab (D28)', async () => {
      const tab = { opener: 'the list' };
      const open = jest.spyOn(window, 'open').mockImplementation(() => tab);
      renderList({ routes: true });
      await screen.findByText('Khata Transfer: The Checklist');

      await userEvent.click(
        screen.getByRole('button', { name: 'Actions for Khata Transfer: The Checklist' })
      );
      await userEvent.click(await screen.findByRole('menuitem', { name: 'Preview' }));

      await waitFor(() => expect(articleService.previewToken).toHaveBeenCalledWith(2));
      // Without `noopener`, which makes `window.open` answer `null` whether or
      // not the tab opened; the opener is cut by hand (QA-55).
      expect(open).toHaveBeenCalledWith(
        '/insights/articles/khata-transfer-checklist?preview=tok-1',
        '_blank'
      );
      expect(tab.opener).toBeNull();
      // The list stays where it was.
      expect(screen.queryByText('The public article')).toBeNull();
      expect(screen.getByText('Khata Transfer: The Checklist')).toBeInTheDocument();
      open.mockRestore();
    });

    it('opens the preview here only when the browser refuses the new tab', async () => {
      const open = jest.spyOn(window, 'open').mockImplementation(() => null);
      renderList({ routes: true });
      await screen.findByText('Khata Transfer: The Checklist');

      await userEvent.click(
        screen.getByRole('button', { name: 'Actions for Khata Transfer: The Checklist' })
      );
      await userEvent.click(await screen.findByRole('menuitem', { name: 'Preview' }));

      expect(await screen.findByText('The public article')).toBeInTheDocument();
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
      // Read again, so a list filtered by the flag loses the row (QA-55).
      await waitFor(() => expect(articleService.adminList).toHaveBeenCalledTimes(2));
    });

    it('steps back a page when a delete empties the one on screen (QA-55)', async () => {
      articleService.adminList.mockImplementation((params) =>
        Promise.resolve(
          params.page === 2
            ? envelope([ROWS[1]], { page: 2, perPage: 1, total: 2, totalPages: 2 })
            : envelope([ROWS[0]], { page: 1, perPage: 1, total: 2, totalPages: 2 })
        )
      );
      renderList({ url: '/admin/articles?page=2&perPage=1' });
      await screen.findByText('Khata Transfer: The Checklist');

      await userEvent.click(
        screen.getByRole('button', { name: 'Actions for Khata Transfer: The Checklist' })
      );
      await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));
      const dialog = await screen.findByRole('dialog');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

      await waitFor(() => expect(articleService.remove).toHaveBeenCalledWith(2));
      expect(await screen.findByText('Karnataka RERA: A Complete Guide')).toBeInTheDocument();
      expect(articleService.adminList).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1 }),
        expect.anything()
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
