/*
 * `@testing-library/user-event` is pinned at 13.5 (§3.1), which — unlike v14 —
 * does not wrap its own interactions in `act`. The wrappers below are what keep
 * the state updates that follow a click inside the click's `act` scope.
 */
/* eslint-disable testing-library/no-unnecessary-act */
/**
 * Admin → Site settings (prompt 40, §6.13).
 *
 * The screen edits one singleton through seven panels, and the three things it
 * must get right are all invisible in a screenshot:
 *
 *   - a nested field goes back as part of the **whole** record, so a save from
 *     the General tab cannot flatten the footer or drop the lead branch;
 *   - an id that is not an id is refused before the request, on the tab that
 *     holds it, and the same save goes through once it is fixed;
 *   - a manager reads everything and saves nothing (§7), which the API enforces
 *     again with a 403.
 */

import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import SettingsPage from '../SettingsPage';
import ToastProvider from '../../../../components/common/ToastProvider';
import authService from '../../../../services/authService';
import renderWith from '../../../../test-utils';
import settingsService from '../../../../services/settingsService';
import storage from '../../../../utils/storage';
import { AUTH_STORAGE_KEYS, clearSession } from '../../../../services/http';
import { AdminAuthProvider } from '../../../../contexts/AdminAuthContext';
import { SiteSettingsContext } from '../../../../contexts/SiteSettingsContext';

jest.mock('../../../../services/authService');
jest.mock('../../../../services/settingsService', () => ({
  __esModule: true,
  default: { admin: jest.fn(), update: jest.fn(), public: jest.fn() },
}));

const RECORD = {
  general: {
    siteName: 'Squares N Acres',
    tagline: 'Your trusted partner for Bengaluru property',
    logoUrl: 'https://images.test/logo.png',
    iconUrl: 'https://images.test/icon.png',
    siteUrl: 'https://www.squaresnacres.com',
    defaultLanguage: 'en-IN',
    contactEmail: 'info@squaresnacres.com',
    contactPhone: '+91 98000 00001',
    alternatePhone: null,
    whatsappNumber: '+91 98000 00000',
    whatsappDefaultMessage: 'Hi Squares N Acres, I am interested in a property.',
    address: {
      line1: '[Office address to be provided]',
      line2: null,
      locality: null,
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      country: 'India',
    },
    mapEmbedUrl: null,
    latitude: 12.9716,
    longitude: 77.5946,
    workingHours: [{ days: 'Monday to Saturday', hours: '9:30 am – 6:30 pm' }],
    reraNumber: 'To be provided',
    gstNumber: 'To be provided',
    establishedYear: null,
  },
  hero: {
    title: 'Find your next home in Bengaluru',
    subtitle: 'Verified apartments, villas, plots and commercial spaces.',
    backgroundImageUrl: 'https://images.test/hero.jpg',
    backgroundVideoUrl: null,
    mobileImageUrl: null,
    searchTabs: ['sale', 'rent'],
    stats: [],
    badges: [],
  },
  navigation: {
    headerCtaLabel: 'Post Requirement',
    headerCtaHref: '#post-requirement',
    showCallButton: true,
    showWhatsappButton: true,
  },
  social: {
    facebook: null,
    instagram: null,
    linkedin: null,
    youtube: null,
    x: null,
    pinterest: null,
  },
  footer: {
    aboutText: 'A property advisory based in Bengaluru.',
    columns: [
      {
        title: 'Buy',
        links: [{ label: 'Ready to move', href: '/buy/ready-to-move', external: false }],
      },
    ],
    disclaimer: 'Listings are subject to availability.',
    copyrightText: '© %year% Squares N Acres. All rights reserved.',
    showNewsletter: true,
    showGallery: false,
    galleryImageUrls: [],
  },
  newsletter: {
    enabled: true,
    title: 'Property insight, once a month',
    subtitle: 'Locality notes and new launches.',
    successMessage: 'Thank you — please check your inbox.',
  },
  integrations: {
    googleAnalyticsId: null,
    googleTagManagerId: null,
    facebookPixelId: null,
    googleMapsApiKey: null,
    cloudinaryCloudName: null,
    cloudinaryUploadPreset: null,
    recaptchaSiteKey: null,
  },
  leads: {
    notificationEmails: ['info@squaresnacres.com'],
    autoAssign: 'none',
    defaultPriority: 'medium',
  },
  updatedAt: '2026-09-13T11:00:00.000Z',
};

const userOf = (role) => ({
  id: role === 'manager' ? 2 : 1,
  name: `${role} user`,
  email: `${role}@squaresnacres.com`,
  role,
  phone: '9880000012',
  avatarUrl: null,
});

const siteSettings = {
  settings: RECORD,
  seoSettings: null,
  loading: false,
  error: null,
  refresh: jest.fn(() => Promise.resolve(RECORD)),
  updateLocal: jest.fn(),
  siteName: 'Squares N Acres',
  tagline: '',
  getContact: () => ({}),
  getLogoUrl: () => '',
  getWhatsappLink: () => '',
};

/** Renders the screen with a signed-in session of the given role (§7). */
const renderAs = (role) => {
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
        <SiteSettingsContext.Provider value={siteSettings}>
          <SettingsPage />
        </SiteSettingsContext.Provider>
      </AdminAuthProvider>
    </ToastProvider>,
    { initialEntries: ['/admin/settings'] }
  );
};

const click = (element) =>
  act(async () => {
    await userEvent.click(element);
  });

const type = (element, value) =>
  act(async () => {
    await userEvent.clear(element);
    await userEvent.type(element, value);
  });

/** The first of the two Save buttons (the header's, then the save bar's). */
const save = () => click(screen.getAllByRole('button', { name: /save settings/i })[0]);

const openTab = (name) => click(screen.getByRole('tab', { name: new RegExp(name, 'i') }));

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
  clearSession();

  authService.logout.mockResolvedValue({ data: null, message: 'Logged out.' });
  settingsService.admin.mockResolvedValue({ data: RECORD });
  settingsService.update.mockImplementation((body) =>
    Promise.resolve({ data: { ...body, updatedAt: '2026-09-18T09:00:00.000Z' } })
  );
});

it('loads the singleton into the form and shows every panel', async () => {
  renderAs('admin');

  expect(await screen.findByLabelText(/site name/i)).toHaveValue('Squares N Acres');
  expect(screen.getByLabelText(/tagline/i)).toHaveValue(
    'Your trusted partner for Bengaluru property'
  );
  // The default language is stated, not offered.
  expect(screen.getByLabelText(/default language/i)).toBeDisabled();

  expect(screen.getAllByRole('tab')).toHaveLength(7);
  expect(screen.getByRole('tab', { name: /lead notifications/i })).toBeInTheDocument();
  // Nothing is dirty yet, so there is nothing to save.
  expect(screen.getByRole('button', { name: /save settings/i })).toBeDisabled();
});

it('sends the whole record when one nested field changes', async () => {
  renderAs('admin');

  await type(await screen.findByLabelText(/tagline/i), 'Bengaluru property, plainly explained');
  await save();

  await waitFor(() => expect(settingsService.update).toHaveBeenCalled());
  const body = settingsService.update.mock.calls[0][0];

  expect(body.general.tagline).toBe('Bengaluru property, plainly explained');
  // The panels nobody opened travel back untouched — the merge on the API is a
  // safety net, not what this screen relies on.
  expect(body.footer.columns).toEqual(RECORD.footer.columns);
  expect(body.hero.searchTabs).toEqual(['sale', 'rent']);
  expect(body.leads.notificationEmails).toEqual(['info@squaresnacres.com']);
  // An empty optional box is `null`, the way the contract describes it.
  expect(body.general.alternatePhone).toBeNull();
  // Nothing the model does not declare is sent.
  expect(body).not.toHaveProperty('updatedAt');

  // The public site is reading this record through the context.
  await waitFor(() => expect(siteSettings.updateLocal).toHaveBeenCalled());
  expect(siteSettings.updateLocal.mock.calls[0][0].general.tagline).toBe(
    'Bengaluru property, plainly explained'
  );
  expect(siteSettings.refresh).toHaveBeenCalled();
  expect(await screen.findByText(/site settings saved/i)).toBeInTheDocument();
});

it('refuses a measurement id that is not one, on the tab that holds it', async () => {
  renderAs('admin');
  await screen.findByLabelText(/site name/i);

  await openTab('integrations');
  await type(await screen.findByLabelText(/ga4 measurement id/i), 'UA-12345');
  await save();

  expect(settingsService.update).not.toHaveBeenCalled();
  expect(await screen.findByText(/GA4 measurement ID looks like/i)).toBeInTheDocument();
  // The tab strip says where the problem is, for the panels nobody is looking at.
  const tab = screen.getByRole('tab', { name: /integrations/i });
  expect(within(tab).getByText('1')).toBeInTheDocument();

  await type(screen.getByLabelText(/ga4 measurement id/i), 'G-ABCD123456');
  await save();

  await waitFor(() => expect(settingsService.update).toHaveBeenCalled());
  expect(settingsService.update.mock.calls[0][0].integrations.googleAnalyticsId).toBe(
    'G-ABCD123456'
  );
});

it('restores the last saved values when the changes are discarded', async () => {
  renderAs('admin');

  await type(await screen.findByLabelText(/site name/i), 'Something else');
  await openTab('contact');
  await type(screen.getByLabelText(/^contact e-mail/i), 'someone@example.com');

  await click(screen.getByRole('button', { name: /discard changes/i }));

  expect(screen.getByLabelText(/^contact e-mail/i)).toHaveValue('info@squaresnacres.com');
  await openTab('general');
  expect(screen.getByLabelText(/site name/i)).toHaveValue('Squares N Acres');
  expect(screen.queryByRole('button', { name: /discard changes/i })).not.toBeInTheDocument();
});

it('is read-only for a manager, with no way to save (§7)', async () => {
  renderAs('manager');

  expect(await screen.findByLabelText(/site name/i)).toBeDisabled();
  expect(screen.getByText(/only administrators can change settings/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /save settings/i })).not.toBeInTheDocument();
  // Reading is the point of the screen for a manager: the record is all there.
  expect(screen.getByLabelText(/tagline/i)).toHaveValue(
    'Your trusted partner for Bengaluru property'
  );
  // Users belongs to administrators; the profile link is for everyone.
  expect(screen.queryByRole('link', { name: /^users$/i })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /my profile/i })).toBeInTheDocument();
});
