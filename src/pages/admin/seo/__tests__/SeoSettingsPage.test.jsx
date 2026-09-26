/**
 * Admin → SEO → Settings: what a refused value is called.
 *
 * The form passed `useForm` no labels, so every message the schema wrote and
 * every 422 the API sent reached the screen with the record's key — "The
 * knowledgeGraph.email must be a valid email address." A message about one
 * profile of the knowledge graph was not shown at all: the chips show the
 * list's message, and the save was refused with nothing on the screen saying
 * why. And the first refused save opened no tab, because the page read the
 * form's errors a render before they were painted.
 */

import fs from 'fs';
import path from 'path';
import { fireEvent, screen, waitFor } from '@testing-library/react';

import SeoSettingsPage from '../SeoSettingsPage';
import ToastProvider from '../../../../components/common/ToastProvider';
import authService from '../../../../services/authService';
import renderWith from '../../../../test-utils';
import seoService from '../../../../services/seoService';
import storage from '../../../../utils/storage';
import { AUTH_STORAGE_KEYS, clearSession } from '../../../../services/http';
import { AdminAuthProvider } from '../../../../contexts/AdminAuthContext';
import { SiteSettingsContext } from '../../../../contexts/SiteSettingsContext';

jest.mock('../../../../services/authService');
jest.mock('../../../../services/seoService', () => ({
  __esModule: true,
  default: { adminSettings: jest.fn(), updateSettings: jest.fn(), llmsPreview: jest.fn() },
}));
jest.mock('../useSeoOverview', () => ({
  useSeoOverviewAll: () => ({ rows: [], loading: false, error: null }),
}));
// The head preview resolves the home page's own record (prompt 51).
jest.mock('../../../../services/pageService', () => ({
  __esModule: true,
  default: {
    getBySlug: jest.fn(() =>
      Promise.resolve({
        data: { id: 1, slug: 'home', title: 'Home', status: 'published', blocks: [], seo: {} },
      })
    ),
  },
}));

/** The seed, as the API serves it. */
const SEED = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', '..', 'db.json'), 'utf-8')
);
const RECORD = SEED.seoSettings;

const ADMIN = {
  id: 1,
  name: 'Admin User',
  email: 'admin@squaresnacres.com',
  role: 'admin',
  phone: '9880000010',
  avatarUrl: null,
};

const siteSettings = {
  settings: {},
  seoSettings: null,
  loading: false,
  error: null,
  refresh: jest.fn(() => Promise.resolve({})),
  updateLocal: jest.fn(),
};

const renderPage = (context = siteSettings) => {
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
        <SiteSettingsContext.Provider value={context}>
          <SeoSettingsPage />
        </SiteSettingsContext.Provider>
      </AdminAuthProvider>
    </ToastProvider>,
    { initialEntries: ['/admin/seo/settings'] }
  );
};

const openTab = (name) =>
  fireEvent.click(screen.getByRole('tab', { name: new RegExp(`^${name}`, 'i') }));

const save = () => fireEvent.click(screen.getAllByRole('button', { name: 'Save settings' })[0]);

const change = (field, value) => fireEvent.change(field, { target: { value } });

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
  clearSession();

  seoService.adminSettings.mockResolvedValue({ data: RECORD });
  seoService.updateSettings.mockImplementation((body) =>
    Promise.resolve({ data: { ...body, updatedAt: '2026-09-25T13:00:00.000Z' } })
  );
  seoService.llmsPreview.mockResolvedValue({ data: '' });
});

describe('a refused value is named as its tab labels the field', () => {
  it.each([
    [
      'Titles & meta',
      () => screen.getByLabelText('Site URL'),
      'not a url',
      'site URL',
      'siteUrl',
      'must be a valid URL.',
    ],
    [
      'Knowledge graph',
      () => screen.getByLabelText('E-mail'),
      'nobody',
      'e-mail',
      'knowledgeGraph.email',
      'must be a valid email address.',
    ],
    [
      'Verification',
      () => screen.getByLabelText('Google Search Console'),
      'x'.repeat(201),
      'Google Search Console token',
      'verification.google',
      'may not be greater than 200 characters.',
    ],
    [
      'Sitemap',
      () => screen.getAllByLabelText('Priority')[0],
      '2',
      'priority of the properties sitemap',
      'sitemap.priority.property',
      'may not be greater than 1.',
    ],
    [
      'robots.txt',
      () => screen.getByLabelText('Document'),
      'x'.repeat(10001),
      'robots.txt document',
      'robotsTxt',
      'may not be greater than 10000 characters.',
    ],
    [
      'llms.txt',
      () => screen.getByLabelText('Document'),
      'x'.repeat(20001),
      'llms.txt document',
      'llmsTxt',
      'may not be greater than 20000 characters.',
    ],
    [
      'Breadcrumbs',
      () => screen.getByLabelText('Label for the home step'),
      'x'.repeat(41),
      'label for the home step',
      'breadcrumbs.homeLabel',
      'may not be greater than 40 characters.',
    ],
    [
      'Custom HTML',
      () => screen.getByLabelText('Custom head HTML'),
      'x'.repeat(20001),
      'custom head HTML',
      'customHeadHtml',
      'may not be greater than 20000 characters.',
    ],
  ])('on %s', async (tab, field, value, label, key, rest) => {
    renderPage();
    await screen.findByLabelText('Site URL');
    openTab(tab);

    change(field(), value);
    save();

    expect(await screen.findByText(`The ${label} ${rest}`)).toBeInTheDocument();
    expect(screen.queryByText(`The ${key} ${rest}`)).not.toBeInTheDocument();
    expect(seoService.updateSettings).not.toHaveBeenCalled();
  });
});

describe('a list of the knowledge graph', () => {
  it('shows a refused profile under the list, counts two as one, and opens their tab', async () => {
    seoService.adminSettings.mockResolvedValue({
      data: {
        ...RECORD,
        knowledgeGraph: {
          ...RECORD.knowledgeGraph,
          sameAs: ['https://www.facebook.com/squaresnacres', 'facebook.com/sna', 'not a url'],
        },
      },
    });
    renderPage();

    // A change on the first tab, and the save: the refusal is two tabs away.
    change(await screen.findByLabelText('Home page'), '%title% %sep% %sitename%');
    save();

    expect(await screen.findByText('The profile 2 must be a valid URL.')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Knowledge graph/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('tab', { name: /^Knowledge graph/ })).toHaveAccessibleName(
      'Knowledge graph 1 error in this section'
    );
    expect(seoService.updateSettings).not.toHaveBeenCalled();
  });
});

describe('a 422 from the API', () => {
  it('is named the same way, on the tab that holds its first field', async () => {
    seoService.updateSettings.mockRejectedValue(
      Object.assign(new Error('The given data was invalid.'), {
        status: 422,
        errors: {
          'knowledgeGraph.sameAs.0': [
            'The knowledgeGraph.sameAs.0 may not be greater than 500 characters.',
          ],
          'defaults.ogImageUrl': ['The defaults.ogImageUrl must be a valid URL.'],
        },
      })
    );
    renderPage();

    change(await screen.findByLabelText('Home page'), 'Accepted here, refused there');
    save();

    await waitFor(() => expect(seoService.updateSettings).toHaveBeenCalled());
    expect(
      await screen.findByText('The profile 1 may not be greater than 500 characters.')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('The knowledgeGraph.sameAs.0 may not be greater than 500 characters.')
    ).not.toBeInTheDocument();

    openTab('Titles & meta');
    expect(
      screen.getByText('The default share image address must be a valid URL.')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('The defaults.ogImageUrl must be a valid URL.')
    ).not.toBeInTheDocument();
  });
});

describe('the knowledge graph against Site settings (prompt 51)', () => {
  const withSite = (patch) => ({
    ...siteSettings,
    settings: {
      ...SEED.siteSettings,
      general: { ...SEED.siteSettings.general, ...patch.general },
      social: { ...SEED.siteSettings.social, ...patch.social },
    },
  });

  it('says nothing while the two agree', async () => {
    renderPage(withSite({}));
    await screen.findByLabelText('Site URL');
    openTab('Knowledge graph');

    expect(screen.getByRole('button', { name: 'Copy from Site settings' })).toBeEnabled();
    expect(screen.queryByText('Site settings say something else')).not.toBeInTheDocument();
  });

  it('names the fields that differ, copies them over, and saves them with the rest', async () => {
    renderPage(
      withSite({
        general: { contactPhone: '+919800000099' },
        social: { linkedin: 'https://www.linkedin.com/company/squaresnacres' },
      })
    );
    await screen.findByLabelText('Site URL');
    openTab('Knowledge graph');

    expect(screen.getByText('Site settings say something else')).toBeInTheDocument();
    expect(screen.getByText(/Phone and Profiles differ from Site settings/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Copy from Site settings' }));

    expect(screen.getByLabelText('Phone')).toHaveValue('+919800000099');
    expect(
      await screen.findByText(
        'Copied from Site settings: Phone and Profiles. Save the settings to publish them. “Sunday: By appointment” has no opening-hours form and was left out.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('Site settings say something else')).not.toBeInTheDocument();

    save();
    await waitFor(() => expect(seoService.updateSettings).toHaveBeenCalled());
    const sent = seoService.updateSettings.mock.calls[0][0].knowledgeGraph;
    expect(sent.phone).toBe('+919800000099');
    expect(sent.sameAs).toEqual(['https://www.linkedin.com/company/squaresnacres']);
  });

  it('cannot copy before Site settings have loaded', async () => {
    renderPage({ ...siteSettings, settings: null });
    await screen.findByLabelText('Site URL');
    openTab('Knowledge graph');

    expect(screen.getByRole('button', { name: 'Copy from Site settings' })).toBeDisabled();
  });
});
