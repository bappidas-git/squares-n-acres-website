/**
 * Admin → Articles → add / edit (prompt 33).
 *
 * Three things this screen must get right, because getting them wrong is
 * invisible until a visitor notices: the publish rules of §2 are enforced before
 * a save is attempted, a scheduled article needs a future moment (which the API
 * also refuses — §6.8), and the ten-second draft is offered back after a crash.
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';

import ArticleFormPage from '../ArticleFormPage';
import ToastProvider from '../../../../components/common/ToastProvider';
import articleService from '../../../../services/articleService';
import authService from '../../../../services/authService';
import masterDataService from '../../../../services/masterDataService';
import ApiError from '../../../../services/apiError';
import renderWith from '../../../../test-utils';
import storage from '../../../../utils/storage';
import { AUTH_STORAGE_KEYS, clearSession } from '../../../../services/http';
import { AdminAuthProvider } from '../../../../contexts/AdminAuthContext';
import { draftKey, savedMessage } from '../useArticleForm';
import { toDateTimeLocal } from '../../../../utils/articleUtils';

jest.mock('../../../../services/authService');
jest.mock('../../../../services/articleService');
jest.mock('../../../../services/propertyService');
// `NavigationGuardContext` drives the in-app confirm through `useBlocker`, which
// only exists inside a data router; the test renders a `MemoryRouter`, so the
// guard is stubbed out to the two things this screen asks of it.
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
    articleTags: collection([
      { id: 1, name: 'rera', slug: 'rera' },
      { id: 2, name: 'khata', slug: 'khata' },
    ]),
    authors: collection([
      { id: 1, name: 'Editorial Team', slug: 'editorial-team', isActive: true },
    ]),
  };
  return { __esModule: true, default: service, ...service };
});

// The editor is a 150 KB lazy chunk of ProseMirror; what this screen owes it is
// a value and a handler, which a textarea proves just as well and instantly.
jest.mock('../../../../components/editor/RichTextField', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef(function MockRichTextField(
      { label, value, onChange, disabled, error },
      _ref
    ) {
      return (
        <label>
          {label}
          <textarea
            value={value ?? ''}
            disabled={disabled}
            onChange={(event) => onChange?.(event.target.value)}
          />
          {error ? <span role="alert">{error}</span> : null}
        </label>
      );
    }),
  };
});

/** A body with more than the 300 words a publish needs (§2). */
const longBody = `<p>${'Bengaluru buyers read the approval before the brochure. '.repeat(40)}</p>`;

const RECORD = {
  id: 7,
  slug: 'khata-transfer-checklist',
  title: 'Khata Transfer: The Complete Bengaluru Checklist',
  excerpt: 'What the BBMP asks for, and in what order.',
  content: longBody,
  contentText: 'Bengaluru buyers read the approval before the brochure.',
  featuredImage: { url: 'https://images.test/khata.jpg', alt: 'A khata extract', caption: null },
  categoryId: 1,
  category: { id: 1, name: 'Legal & RERA', slug: 'legal-rera' },
  tagIds: [2],
  tags: [{ id: 2, name: 'khata', slug: 'khata' }],
  authorId: 1,
  author: { id: 1, name: 'Editorial Team', slug: 'editorial-team', avatarUrl: null },
  status: 'draft',
  publishedAt: null,
  updatedAtDisplay: null,
  readingTimeMinutes: 2,
  wordCount: 320,
  isFeatured: false,
  allowComments: false,
  relatedArticleIds: [],
  relatedPropertyIds: [],
  faqs: [],
  tableOfContents: true,
  seo: {
    focusKeyword: 'khata transfer',
    title: '',
    description: '',
    slug: 'khata-transfer-checklist',
  },
  viewCount: 0,
  createdAt: '2026-09-01T06:00:00.000Z',
  updatedAt: '2026-09-15T06:00:00.000Z',
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

/** A change the save has to send: the headline, a few words longer. */
const editHeadline = (suffix = ' (revised)') => {
  const field = screen.getByDisplayValue(RECORD.title);
  fireEvent.change(field, { target: { value: `${RECORD.title}${suffix}` } });
};

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

/** Wherever a navigation away from the form landed. */
function Elsewhere() {
  const location = useLocation();
  return <p data-testid="elsewhere">{`${location.pathname}${location.search}`}</p>;
}

/** Renders the form at `/admin/articles/edit/:id`, or at `/add` with no id. */
const renderForm = ({ id = '7' } = {}) => {
  storage.setItem(AUTH_STORAGE_KEYS.token, 'seeded-token');
  storage.setItem(AUTH_STORAGE_KEYS.user, ADMIN);
  storage.setItem(
    AUTH_STORAGE_KEYS.expiresAt,
    new Date(Date.now() + 6 * 3600 * 1000).toISOString()
  );
  authService.profile.mockResolvedValue({ data: ADMIN });

  const url = id ? `/admin/articles/edit/${id}` : '/admin/articles/add';
  const path = id ? '/admin/articles/edit/:id' : '/admin/articles/add';

  const { Routes, Route } = require('react-router-dom');

  return renderWith(
    <ToastProvider>
      <AdminAuthProvider>
        <Routes>
          <Route path={path} element={<ArticleFormPage />} />
          <Route path="*" element={<Elsewhere />} />
        </Routes>
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
  articleService.adminGet.mockResolvedValue({ data: RECORD });
  articleService.adminList.mockResolvedValue({
    data: [],
    meta: { page: 1, perPage: 20, total: 0, totalPages: 0 },
  });
  articleService.checkSlug.mockResolvedValue({ data: { available: true, suggestion: null } });
  articleService.update.mockImplementation((id, body) =>
    Promise.resolve({ data: { ...RECORD, ...body, id: Number(id) } })
  );
  articleService.create.mockImplementation((body) =>
    Promise.resolve({ data: { ...RECORD, ...body, id: 99 } })
  );
  articleService.previewToken.mockResolvedValue({ data: { token: 'tok-1', url: 'x' } });
});

describe('ArticleFormPage — the publish rules (§2)', () => {
  it('refuses to publish an article with no excerpt and no featured image', async () => {
    articleService.adminGet.mockResolvedValue({
      data: { ...RECORD, excerpt: '', featuredImage: null },
    });
    renderForm();
    await screen.findByDisplayValue(RECORD.title);

    await userEvent.click(screen.getByRole('button', { name: 'Publish now' }));

    expect(
      await screen.findByText('An excerpt is required before an article goes live.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('A featured image is required before an article goes live.')
    ).toBeInTheDocument();
    expect(articleService.update).not.toHaveBeenCalled();
  });

  it('refuses to publish a body shorter than 300 words and says how short', async () => {
    articleService.adminGet.mockResolvedValue({
      data: { ...RECORD, content: '<p>Two words.</p>' },
    });
    renderForm();
    await screen.findByDisplayValue(RECORD.title);

    await userEvent.click(screen.getByRole('button', { name: 'Publish now' }));

    expect(
      await screen.findByText('An article needs at least 300 words to go live — this one has 2.')
    ).toBeInTheDocument();
    expect(articleService.update).not.toHaveBeenCalled();
  });

  it('refuses a featured image with no alt text, published or not', async () => {
    articleService.adminGet.mockResolvedValue({
      data: {
        ...RECORD,
        featuredImage: { url: 'https://images.test/x.jpg', alt: '', caption: null },
      },
    });
    renderForm();
    await screen.findByDisplayValue(RECORD.title);

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Alt text is required — describe the image in a few words.')
    ).toBeInTheDocument();
    expect(articleService.update).not.toHaveBeenCalled();
  });

  it('publishes a complete article and leaves the date to the API', async () => {
    renderForm();
    await screen.findByDisplayValue(RECORD.title);

    await userEvent.click(screen.getByRole('button', { name: 'Publish now' }));

    await waitFor(() =>
      expect(articleService.update).toHaveBeenCalledWith(
        '7',
        expect.objectContaining({ status: 'published', publishedAt: null })
      )
    );
    expect(await screen.findByText('Article published.')).toBeInTheDocument();
  });

  it('lists what is missing under "Content checks"', async () => {
    articleService.adminGet.mockResolvedValue({
      data: { ...RECORD, excerpt: '', tagIds: [] },
    });
    renderForm();
    await screen.findByDisplayValue(RECORD.title);

    const checks = screen.getByRole('complementary', { name: 'Content checks' });
    expect(within(checks).getByText('Excerpt written')).toBeInTheDocument();
    expect(within(checks).getByText('0 tags')).toBeInTheDocument();
    expect(within(checks).getByText('4 of 7 checks pass')).toBeInTheDocument();
  });
});

describe('ArticleFormPage — scheduling (§7)', () => {
  const selectScheduled = async () => {
    await userEvent.click(screen.getByRole('radio', { name: 'Scheduled' }));
  };

  it('refuses a moment in the past before the API is asked', async () => {
    renderForm();
    await screen.findByDisplayValue(RECORD.title);
    await selectScheduled();

    const field = screen.getByLabelText(/Goes live at/);
    await userEvent.clear(field);
    // Typed into a `datetime-local`, so the value is IST wall-clock time.
    fireChange(field, '2020-01-01T09:00');

    await userEvent.click(screen.getByRole('button', { name: 'Schedule' }));

    expect(
      await screen.findByText('A scheduled article needs a date and time in the future.')
    ).toBeInTheDocument();
    expect(articleService.update).not.toHaveBeenCalled();
  });

  it('asks for the date when the status is scheduled and the field is empty', async () => {
    renderForm();
    await screen.findByDisplayValue(RECORD.title);
    await selectScheduled();

    await userEvent.click(screen.getByRole('button', { name: 'Schedule' }));

    expect(
      await screen.findByText('Choose the date and time this article should appear.')
    ).toBeInTheDocument();
    expect(articleService.update).not.toHaveBeenCalled();
  });

  it('sends a future moment as an ISO instant in UTC (§5.5)', async () => {
    renderForm();
    await screen.findByDisplayValue(RECORD.title);
    await selectScheduled();

    const tomorrow = new Date(Date.now() + 36 * 3600 * 1000);
    const local = toDateTimeLocal(tomorrow.toISOString());
    fireChange(screen.getByLabelText(/Goes live at/), local);

    await userEvent.click(screen.getByRole('button', { name: 'Schedule' }));

    await waitFor(() => expect(articleService.update).toHaveBeenCalled());
    const [, body] = articleService.update.mock.calls[0];
    expect(body.status).toBe('scheduled');
    expect(body.publishedAt).toMatch(/Z$/);
    expect(Date.parse(body.publishedAt)).toBeGreaterThan(Date.now());
    expect(await screen.findByText('Article scheduled.')).toBeInTheDocument();
  });
});

describe('ArticleFormPage — the autosaved draft', () => {
  it('offers a draft newer than the record and restores it', async () => {
    storage.setItem(draftKey('7'), {
      savedAt: new Date(Date.parse(RECORD.updatedAt) + 60000).toISOString(),
      values: {
        ...RECORD,
        title: 'Khata Transfer: the version that was never saved',
        featuredImage: { url: RECORD.featuredImage.url, alt: 'A khata extract', caption: '' },
        scheduledAt: '',
        faqs: [],
        seo: RECORD.seo,
      },
    });

    renderForm();
    await screen.findByDisplayValue(RECORD.title);

    expect(
      await screen.findByText('Unsaved changes were found in this browser')
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Restore the draft' }));

    expect(
      await screen.findByDisplayValue('Khata Transfer: the version that was never saved')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Unsaved changes were found in this browser')
    ).not.toBeInTheDocument();
  });

  it('throws away a draft older than the record without asking', async () => {
    storage.setItem(draftKey('7'), {
      savedAt: new Date(Date.parse(RECORD.updatedAt) - 60000).toISOString(),
      values: { ...RECORD, title: 'An older draft nobody wants' },
    });

    renderForm();
    await screen.findByDisplayValue(RECORD.title);

    expect(
      screen.queryByText('Unsaved changes were found in this browser')
    ).not.toBeInTheDocument();
    expect(storage.getItem(draftKey('7'), null)).toBeNull();
  });

  it('clears the draft once the article has been saved', async () => {
    storage.setItem(draftKey('7'), {
      savedAt: new Date(Date.parse(RECORD.updatedAt) + 60000).toISOString(),
      values: { ...RECORD, scheduledAt: '', faqs: [] },
    });

    renderForm();
    await screen.findByDisplayValue(RECORD.title);
    await screen.findByText('Unsaved changes were found in this browser');

    editHeadline();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(articleService.update).toHaveBeenCalled());
    expect(storage.getItem(draftKey('7'), null)).toBeNull();
  });

  it('keeps a draft on offer through a Save that had nothing to save', async () => {
    storage.setItem(draftKey('7'), {
      savedAt: new Date(Date.parse(RECORD.updatedAt) + 60000).toISOString(),
      values: { ...RECORD, title: 'Khata Transfer: the version on offer', scheduledAt: '' },
    });

    renderForm();
    await screen.findByDisplayValue(RECORD.title);
    await screen.findByText('Unsaved changes were found in this browser');

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('No changes to save.')).toBeInTheDocument();
    expect(screen.getByText('Unsaved changes were found in this browser')).toBeInTheDocument();
    expect(storage.getItem(draftKey('7'), null)).not.toBeNull();
  });

  it('forgets a copy autosaved before the edit was taken back (QA-55)', async () => {
    renderForm();
    await screen.findByDisplayValue(RECORD.title);

    // What the ten-second autosave wrote while the headline was different.
    storage.setItem(draftKey('7'), {
      savedAt: new Date().toISOString(),
      values: { ...RECORD, title: 'An edit that was typed and then taken back' },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('No changes to save.')).toBeInTheDocument();
    expect(storage.getItem(draftKey('7'), null)).toBeNull();
  });
});

describe('ArticleFormPage — the excerpt', () => {
  it('generates one from the first paragraph of the body', async () => {
    articleService.adminGet.mockResolvedValue({
      data: {
        ...RECORD,
        excerpt: '',
        content: '<h2>Khata</h2><p>A khata is the record of a property in the city ledger.</p>',
      },
    });
    renderForm();
    await screen.findByDisplayValue(RECORD.title);

    await userEvent.click(screen.getByRole('button', { name: /Generate from content/ }));

    expect(
      await screen.findByDisplayValue('A khata is the record of a property in the city ledger.')
    ).toBeInTheDocument();
  });
});

/**
 * Sets a value on a controlled input the way React hears it.
 *
 * `userEvent@13` types character by character, which a `datetime-local` input
 * in jsdom does not assemble into a value; a native input event with the whole
 * string does, and it is what a date picker does in a browser too.
 */
function fireChange(element, value) {
  const { fireEvent } = require('@testing-library/react');
  fireEvent.change(element, { target: { value } });
}

describe('ArticleFormPage — one save at a time', () => {
  it('does not start a second save while one is in flight (Ctrl+S held down)', async () => {
    let resolve;
    articleService.update.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = () => done({ data: RECORD });
        })
    );

    renderForm();
    await screen.findByDisplayValue(RECORD.title);
    editHeadline();

    const press = (init) =>
      // `keydown` on the window, which is where the shortcut listens.
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true, ...init })
      );

    press();
    await waitFor(() => expect(articleService.update).toHaveBeenCalledTimes(1));

    // The auto-repeat of a held key, and a second deliberate press while the
    // first save is still open.
    press({ repeat: true });
    press();
    expect(articleService.update).toHaveBeenCalledTimes(1);

    resolve();
    expect(await screen.findByText(/Article saved|Article published/)).toBeInTheDocument();
  });
});

describe('ArticleFormPage — the payload', () => {
  it('never sends the same id twice in a set-like field', async () => {
    articleService.adminGet.mockResolvedValue({
      data: { ...RECORD, tagIds: [2, 2, 1], relatedArticleIds: [3, 3] },
    });
    renderForm();
    await screen.findByDisplayValue(RECORD.title);
    editHeadline();

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(articleService.update).toHaveBeenCalled());
    const [, body] = articleService.update.mock.calls[0];
    expect(body.tagIds).toEqual([2, 1]);
    expect(body.relatedArticleIds).toEqual([3]);
  });
});

describe('ArticleFormPage — saving what changed (QA-55)', () => {
  it('says so, and sends nothing, when Save is pressed with nothing changed', async () => {
    renderForm();
    await screen.findByDisplayValue(RECORD.title);

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('No changes to save.')).toBeInTheDocument();
    expect(articleService.update).not.toHaveBeenCalled();
  });

  it('tells a Save of a live article that it stayed live, not that it was published', async () => {
    const live = { ...RECORD, status: 'published', publishedAt: '2026-09-10T06:00:00.000Z' };
    articleService.adminGet.mockResolvedValue({ data: live });
    articleService.update.mockImplementation((id, body) =>
      Promise.resolve({ data: { ...live, ...body, id: Number(id) } })
    );
    renderForm();
    await screen.findByDisplayValue(RECORD.title);
    editHeadline();

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Changes saved. The article is live.')).toBeInTheDocument();
    expect(screen.queryByText('Article published.')).not.toBeInTheDocument();
  });

  it('puts the status back when "Publish now" is refused', async () => {
    articleService.adminGet.mockResolvedValue({ data: { ...RECORD, excerpt: '' } });
    renderForm();
    await screen.findByDisplayValue(RECORD.title);

    await userEvent.click(screen.getByRole('button', { name: 'Publish now' }));

    expect(
      await screen.findByText('An excerpt is required before an article goes live.')
    ).toBeInTheDocument();
    // Still a draft, and still offering the button that publishes it — a plain
    // Save after the fix must not publish the article on the way.
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Draft' })).toBeChecked());
    expect(screen.getByRole('button', { name: 'Publish now' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Excerpt/), {
      target: { value: 'What the BBMP asks for, and in what order.' },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(articleService.update).toHaveBeenCalled());
    expect(articleService.update.mock.calls[0][1].status).toBe('draft');
  });

  it('names the category and the author rather than their keys', async () => {
    renderForm({ id: null });
    await screen.findByRole('button', { name: 'Save' });

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('The category field is required.')).toBeInTheDocument();
    expect(screen.getByText('The author field is required.')).toBeInTheDocument();
    expect(screen.queryByText(/categoryId|authorId/)).not.toBeInTheDocument();
    expect(articleService.create).not.toHaveBeenCalled();
  });
});

describe('savedMessage', () => {
  it.each([
    [{ status: 'published' }, 'draft', 'Article published.'],
    [{ status: 'published' }, 'published', 'Changes saved. The article is live.'],
    [{ status: 'scheduled' }, 'draft', 'Article scheduled.'],
    [{ status: 'scheduled' }, 'scheduled', 'Changes saved. The article is still scheduled.'],
    [{ status: 'draft' }, 'published', 'Article unpublished and saved as a draft.'],
    [{ status: 'draft' }, 'scheduled', 'Article unpublished and saved as a draft.'],
    [{ status: 'draft' }, 'draft', 'Article saved as a draft.'],
    [{ status: 'draft' }, null, 'Article saved as a draft.'],
    [{ status: 'archived' }, 'published', 'Article archived.'],
    [{ status: 'archived' }, 'archived', 'Changes saved.'],
  ])('%j after %s says "%s"', (saved, before, message) => {
    expect(savedMessage(saved, before)).toBe(message);
  });
});

describe('ArticleFormPage — the FAQ rows (QA-55)', () => {
  it('takes a removed row’s errors with it rather than leaving them on the next one', async () => {
    articleService.adminGet.mockResolvedValue({
      data: {
        ...RECORD,
        faqs: [
          { question: '', answer: '' },
          { question: 'Does a khata transfer need the seller?', answer: '<p>Yes.</p>' },
        ],
      },
    });
    renderForm();
    await screen.findByDisplayValue(RECORD.title);

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Write the question, or remove this row.')).toBeInTheDocument();
    expect(screen.getByText('Write the answer, or remove this row.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Remove question 1' }));

    expect(screen.getByDisplayValue('Does a khata transfer need the seller?')).toBeInTheDocument();
    expect(screen.queryByText('Write the question, or remove this row.')).not.toBeInTheDocument();
    expect(screen.queryByText('Write the answer, or remove this row.')).not.toBeInTheDocument();
  });
});

describe('ArticleFormPage — preview (QA-55)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('opens the preview in a new tab and leaves the editor where it is', async () => {
    const tab = { opener: window };
    const open = jest.spyOn(window, 'open').mockImplementation(() => tab);
    renderForm();
    await screen.findByDisplayValue(RECORD.title);

    await userEvent.click(screen.getByRole('button', { name: 'Preview' }));

    await waitFor(() => expect(articleService.previewToken).toHaveBeenCalledWith('7'));
    expect(open).toHaveBeenCalledWith(
      '/insights/articles/khata-transfer-checklist?preview=tok-1',
      '_blank'
    );
    expect(tab.opener).toBeNull();
    // A clean article is not saved again just to be looked at.
    expect(articleService.update).not.toHaveBeenCalled();
    await new Promise((done) => setTimeout(done, 20));
    expect(screen.queryByTestId('elsewhere')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue(RECORD.title)).toBeInTheDocument();
  });

  it('opens it in this tab only when the browser refuses a new one', async () => {
    jest.spyOn(window, 'open').mockImplementation(() => null);
    renderForm();
    await screen.findByDisplayValue(RECORD.title);

    await userEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(await screen.findByTestId('elsewhere')).toHaveTextContent(
      '/insights/articles/khata-transfer-checklist?preview=tok-1'
    );
  });
});

describe('ArticleFormPage — keys that belong to a dialog (QA-55)', () => {
  it('leaves Ctrl+S to a dialog open over the form', async () => {
    renderForm();
    await screen.findByDisplayValue(RECORD.title);
    editHeadline();

    await userEvent.click(screen.getByRole('button', { name: 'Add a category' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add a category' });
    fireEvent.keyDown(within(dialog).getByRole('textbox', { name: /Name/ }), {
      key: 's',
      ctrlKey: true,
    });

    await new Promise((done) => setTimeout(done, 20));
    expect(articleService.update).not.toHaveBeenCalled();

    fireEvent.keyDown(document.body, { key: 's', ctrlKey: true });
    await waitFor(() => expect(articleService.update).toHaveBeenCalledTimes(1));
  });
});

describe('ArticleFormPage — replacing the excerpt (QA-55)', () => {
  const content = '<h2>Khata</h2><p>A khata is the record of a property in the city ledger.</p>';

  it('asks before the body’s first paragraph takes the place of a written excerpt', async () => {
    articleService.adminGet.mockResolvedValue({ data: { ...RECORD, content } });
    renderForm();
    await screen.findByDisplayValue(RECORD.title);

    await userEvent.click(screen.getByRole('button', { name: /Generate from content/ }));
    const question = await screen.findByRole('dialog', { name: 'Replace the excerpt?' });
    await userEvent.click(within(question).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByDisplayValue(RECORD.excerpt)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Generate from content/ }));
    await userEvent.click(
      within(await screen.findByRole('dialog', { name: 'Replace the excerpt?' })).getByRole(
        'button',
        { name: 'Replace it' }
      )
    );
    expect(
      await screen.findByDisplayValue('A khata is the record of a property in the city ledger.')
    ).toBeInTheDocument();
  });
});

describe('ArticleFormPage — the classification card (QA-55)', () => {
  const LEGAL = { id: 1, name: 'Legal & RERA', slug: 'legal-rera', order: 1, isActive: true };
  const RETIRED = { id: 2, name: 'Old Section', slug: 'old-section', order: 2, isActive: false };
  const GONE = {
    id: 3,
    name: 'Retired Section',
    slug: 'retired-section',
    order: 3,
    isActive: false,
  };

  const categorySelect = () => screen.getByRole('combobox', { name: /^Category/ });

  // CRA resets every mock before each test, the factory's lists included.
  beforeEach(() => {
    masterDataService.articleCategories.adminList.mockResolvedValue({ data: [LEGAL] });
    masterDataService.articleTags.adminList.mockResolvedValue({ data: [] });
    masterDataService.authors.adminList.mockResolvedValue({
      data: [{ id: 1, name: 'Editorial Team', slug: 'editorial-team', isActive: true }],
    });
  });

  it('offers only active categories, and keeps the article’s own inactive one, marked', async () => {
    masterDataService.articleCategories.adminList.mockResolvedValueOnce({
      data: [LEGAL, RETIRED, GONE],
    });
    articleService.adminGet.mockResolvedValue({
      data: { ...RECORD, categoryId: 2, category: { id: 2, name: 'Old Section' } },
    });
    renderForm();
    await screen.findByDisplayValue(RECORD.title);

    const select = categorySelect();
    await within(select).findByRole('option', { name: 'Old Section (inactive)' });
    expect(within(select).getByRole('option', { name: 'Legal & RERA' })).toBeInTheDocument();
    expect(within(select).queryByRole('option', { name: /Retired Section/ })).toBeNull();
    expect(select).toHaveValue('2');
  });

  it('shows the article’s own category when the lists fail, and offers to load them again', async () => {
    masterDataService.articleCategories.adminList.mockRejectedValueOnce(
      new ApiError({ status: 500, message: 'Internal server error' })
    );
    renderForm();
    await screen.findByDisplayValue(RECORD.title);

    expect(
      await screen.findByText('The categories, tags and authors could not be loaded.')
    ).toBeInTheDocument();
    expect(categorySelect()).toHaveValue('1');
    expect(
      within(categorySelect()).getByRole('option', { name: 'Legal & RERA' })
    ).toBeInTheDocument();

    const calls = masterDataService.articleCategories.adminList.mock.calls.length;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() =>
      expect(masterDataService.articleCategories.adminList.mock.calls.length).toBeGreaterThan(calls)
    );
    await waitFor(() =>
      expect(
        screen.queryByText('The categories, tags and authors could not be loaded.')
      ).not.toBeInTheDocument()
    );
  });

  it('answers a category name that already exists with that category, ready to select', async () => {
    renderForm({ id: null });
    await within(categorySelect()).findByRole('option', { name: 'Legal & RERA' });

    await userEvent.click(screen.getByRole('button', { name: 'Add a category' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add a category' });
    await userEvent.type(within(dialog).getByRole('textbox', { name: /Name/ }), ' legal & rera ');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create and select' }));

    expect(
      await within(dialog).findByText('“Legal & RERA” is already a category.')
    ).toBeInTheDocument();
    expect(masterDataService.articleCategories.create).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Select “Legal & RERA”' }));

    expect(await screen.findByText('“Legal & RERA” selected.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(categorySelect()).toHaveValue('1');
  });

  it('finds the category behind a 409 when this screen’s list did not know it', async () => {
    const created = { id: 5, name: 'Rental Guides', slug: 'rental-guides', isActive: true };
    masterDataService.articleCategories.create.mockRejectedValueOnce(
      new ApiError({
        status: 409,
        message: 'The slug has already been taken.',
        errors: { slug: ['The slug has already been taken.'] },
      })
    );
    renderForm({ id: null });
    await within(categorySelect()).findByRole('option', { name: 'Legal & RERA' });
    // The lookup by slug that follows the 409 finds it.
    masterDataService.articleCategories.adminList.mockResolvedValueOnce({ data: [created] });

    await userEvent.click(screen.getByRole('button', { name: 'Add a category' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add a category' });
    await userEvent.type(within(dialog).getByRole('textbox', { name: /Name/ }), 'Rental Guides');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create and select' }));

    expect(
      await within(dialog).findByText('“Rental Guides” is already a category.')
    ).toBeInTheDocument();
    expect(masterDataService.articleCategories.adminList).toHaveBeenLastCalledWith({
      q: 'rental-guides',
      perPage: 20,
    });
    expect(screen.queryByText('The slug has already been taken.')).not.toBeInTheDocument();
  });
});

describe('ArticleFormPage — the URL (QA-55)', () => {
  it('drops the API’s complaint about the URL once the URL is typed again', async () => {
    renderForm();
    await screen.findByDisplayValue(RECORD.title);
    editHeadline();
    // A live article's URL does not follow its headline, however soon after
    // the record arrived the headline was typed.
    expect(screen.getByDisplayValue(RECORD.slug)).toBeInTheDocument();
    articleService.update.mockRejectedValueOnce(
      new ApiError({
        status: 422,
        message: 'The given data was invalid.',
        errors: { 'seo.slug': ['The seo.slug may only contain lowercase letters.'] },
      })
    );

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    // Named the way the editor knows it, under the one box that holds it.
    expect(
      await screen.findByText('The URL may only contain lowercase letters.')
    ).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue(RECORD.slug), {
      target: { value: 'khata-transfer-guide' },
    });

    await waitFor(() =>
      expect(
        screen.queryByText('The URL may only contain lowercase letters.')
      ).not.toBeInTheDocument()
    );
  });
});

describe('ArticleFormPage — related articles (QA-55)', () => {
  it('offers only the pieces a reader can reach — live, or scheduled and on their way', async () => {
    renderForm();
    await screen.findByDisplayValue(RECORD.title);
    articleService.adminList.mockClear();

    fireEvent.change(screen.getByRole('combobox', { name: /^Related articles/ }), {
      target: { value: 'rera' },
    });

    await waitFor(() =>
      expect(articleService.adminList).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'rera', status: ['published', 'scheduled'] }),
        expect.anything()
      )
    );
  });
});
