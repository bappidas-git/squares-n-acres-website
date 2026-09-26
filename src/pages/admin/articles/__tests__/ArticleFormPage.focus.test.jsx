/**
 * "Fix SEO" on the article form lands on the right tab **and** the right field
 * (prompt 51). The first failure of most articles is a test of the SEO panel's
 * own fields — "The title does not carry the focus keyword" is `seo.title` — and
 * the rail's button used to keep the Content tab open and focus nothing.
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ArticleFormPage from '../ArticleFormPage';
import ToastProvider from '../../../../components/common/ToastProvider';
import articleService from '../../../../services/articleService';
import authService from '../../../../services/authService';
import renderWith from '../../../../test-utils';
import storage from '../../../../utils/storage';
import { AUTH_STORAGE_KEYS, clearSession } from '../../../../services/http';
import { AdminAuthProvider } from '../../../../contexts/AdminAuthContext';
import { fieldId } from '../../../../components/seo/SeoPanel/SeoPanel';
import { resetSeoCaches } from '../../../../components/seo/SeoPanel/useSiteSeoIndex';

jest.mock('../../../../services/authService');
jest.mock('../../../../services/articleService');
jest.mock('../../../../services/propertyService');
jest.mock('../../../../services/seoService', () => ({
  __esModule: true,
  default: {
    settings: () =>
      Promise.resolve({
        data: {
          siteUrl: 'https://www.squaresnacres.com',
          separator: '|',
          titleTemplates: { default: '%title% %sep% %sitename%' },
          defaults: {},
        },
      }),
    overview: () => Promise.resolve({ data: [] }),
  },
}));
jest.mock('../../../../contexts/NavigationGuardContext', () => ({
  __esModule: true,
  useNavigationGuard: () => ({ register: () => () => {}, isBlocking: false }),
  NavigationGuardProvider: ({ children }) => children,
  UNSAVED_CHANGES_MESSAGE: 'unsaved',
}));
jest.mock('../../../../services/masterDataService', () => {
  const collection = (data) => ({
    adminList: jest.fn(() => Promise.resolve({ data })),
    create: jest.fn(() => Promise.resolve({ data: null })),
  });
  const service = {
    articleCategories: collection([
      { id: 1, name: 'Legal & RERA', slug: 'legal-rera', order: 1, isActive: true },
    ]),
    articleTags: collection([{ id: 2, name: 'khata', slug: 'khata' }]),
    authors: collection([
      { id: 1, name: 'Editorial Team', slug: 'editorial-team', isActive: true },
    ]),
  };
  return { __esModule: true, default: service, ...service };
});
jest.mock('../../../../components/editor/RichTextField', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef(function MockRichTextField({ label, value, onChange }, _ref) {
      return (
        <label>
          {label}
          <textarea value={value ?? ''} onChange={(event) => onChange?.(event.target.value)} />
        </label>
      );
    }),
  };
});

const failing = (field, message) => ({
  score: 40,
  scoreBand: 'poor',
  testsPassed: 10,
  testsTotal: 30,
  analysis: {
    basic: [{ id: 'first', status: 'fail', message, field }],
    additional: [],
    titleReadability: [],
    contentReadability: [],
  },
});

const RECORD = {
  id: 9,
  slug: 'khata-transfer-checklist',
  title: 'Khata Transfer: The Complete Bengaluru Checklist',
  excerpt: 'What the BBMP asks for, and in what order.',
  content: `<p>${'Bengaluru buyers read the approval before the brochure. '.repeat(40)}</p>`,
  featuredImage: { url: 'https://images.test/khata.jpg', alt: 'A khata extract' },
  categoryId: 1,
  tagIds: [2],
  authorId: 1,
  status: 'draft',
  publishedAt: null,
  relatedArticleIds: [],
  relatedPropertyIds: [],
  faqs: [],
  tableOfContents: true,
  seo: { focusKeyword: 'khata transfer', title: '', description: '', slug: 'khata-transfer' },
  createdAt: '2026-09-01T06:00:00.000Z',
  updatedAt: '2026-09-15T06:00:00.000Z',
};

const ADMIN = {
  id: 1,
  name: 'Admin user',
  email: 'admin@squaresnacres.com',
  role: 'admin',
  phone: '9880000012',
  avatarUrl: null,
};

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

function renderForm(seo) {
  storage.setItem(AUTH_STORAGE_KEYS.token, 'seeded-token');
  storage.setItem(AUTH_STORAGE_KEYS.user, ADMIN);
  storage.setItem(
    AUTH_STORAGE_KEYS.expiresAt,
    new Date(Date.now() + 6 * 3600 * 1000).toISOString()
  );
  authService.profile.mockResolvedValue({ data: ADMIN });
  articleService.adminGet.mockResolvedValue({
    data: { ...RECORD, seo: { ...RECORD.seo, ...seo } },
  });

  const { Routes, Route } = require('react-router-dom');
  return renderWith(
    <ToastProvider>
      <AdminAuthProvider>
        <Routes>
          <Route path="/admin/articles/edit/:id" element={<ArticleFormPage />} />
        </Routes>
      </AdminAuthProvider>
    </ToastProvider>,
    { initialEntries: ['/admin/articles/edit/9'] }
  );
}

const tab = (name) => screen.getByRole('tab', { name: new RegExp(`^${name}`) });

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
  clearSession();
  resetSeoCaches();
  setViewport(1280);
  Element.prototype.scrollIntoView = jest.fn();
  articleService.checkSlug.mockResolvedValue({ data: { available: true, suggestion: null } });
});

describe('ArticleFormPage — Fix SEO', () => {
  it('opens the SEO tab on an seo.* failure and puts the cursor in that field', async () => {
    renderForm(failing('seo.title', 'The title does not carry the focus keyword.'));
    await screen.findByDisplayValue(RECORD.title);
    expect(tab('Content')).toHaveAttribute('aria-selected', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'Fix SEO' }));

    await waitFor(() => expect(tab('SEO')).toHaveAttribute('aria-selected', 'true'));
    const title = await screen.findByLabelText('SEO title');
    expect(title).toHaveAttribute('id', fieldId('seo.title'));
    await waitFor(() => expect(title).toHaveFocus());
    expect(
      await screen.findByText('Opened SEO — “The title does not carry the focus keyword.”')
    ).toBeInTheDocument();
  });

  it('keeps an excerpt failure on the Content tab, in the excerpt box', async () => {
    renderForm(failing('excerpt', 'The excerpt does not carry the focus keyword.'));
    await screen.findByDisplayValue(RECORD.title);

    await userEvent.click(screen.getByRole('button', { name: 'Fix SEO' }));

    expect(tab('Content')).toHaveAttribute('aria-selected', 'true');
    const excerpt = screen.getByLabelText('Excerpt');
    expect(excerpt).toHaveAttribute('id', 'article-excerpt');
    await waitFor(() => expect(excerpt).toHaveFocus());
  });

  it('takes an images failure to the body, where an article’s images are', async () => {
    renderForm(failing('images', 'No image in the body carries the keyword.'));
    await screen.findByDisplayValue(RECORD.title);

    await userEvent.click(screen.getByRole('button', { name: 'Fix SEO' }));

    expect(tab('Content')).toHaveAttribute('aria-selected', 'true');
    // The mocked editor is a textarea labelled "Content", inside `#article-content`.
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Content' })).toHaveFocus());
  });

  it('asks again when Fix SEO is pressed a second time', async () => {
    renderForm(failing('seo.description', 'No meta description.'));
    await screen.findByDisplayValue(RECORD.title);

    await userEvent.click(screen.getByRole('button', { name: 'Fix SEO' }));
    await waitFor(() => expect(screen.getByLabelText('Meta description')).toHaveFocus());

    await userEvent.click(tab('Content'));
    await userEvent.click(screen.getByRole('button', { name: 'Fix SEO' }));

    await waitFor(() => expect(tab('SEO')).toHaveAttribute('aria-selected', 'true'));
    await waitFor(() => expect(screen.getByLabelText('Meta description')).toHaveFocus());
  });
});
