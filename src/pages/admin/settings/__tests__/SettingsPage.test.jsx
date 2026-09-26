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

import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';

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
  default: { admin: jest.fn(), update: jest.fn(), public: jest.fn(), testLeadAlert: jest.fn() },
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

/** Prints the address, so a test can read what the screen put in it. */
function Location() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

/** Renders the screen with a signed-in session of the given role (§7). */
const renderAs = (role, { at = '/admin/settings' } = {}) => {
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
          <Location />
        </SiteSettingsContext.Provider>
      </AdminAuthProvider>
    </ToastProvider>,
    { initialEntries: [at] }
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
  // Nothing is dirty yet, so there is nothing to save — and Save says so
  // rather than being a button that does nothing (QA-64).
  await save();
  expect(await screen.findByText('No changes to save.')).toBeInTheDocument();
  expect(settingsService.update).not.toHaveBeenCalled();
});

it('sends what changed, and nothing it did not (QA-64)', async () => {
  renderAs('admin');

  await type(await screen.findByLabelText(/tagline/i), 'Bengaluru property, plainly explained');
  await save();

  await waitFor(() => expect(settingsService.update).toHaveBeenCalled());
  // The API deep-merges (§5.14): the panels nobody touched are not sent, so a
  // colleague's change to them is not sent back over.
  expect(settingsService.update.mock.calls[0][0]).toEqual({
    general: { tagline: 'Bengaluru property, plainly explained' },
  });

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

describe('QA-64', () => {
  const serverAfter = (body, patch = {}) => ({
    data: {
      ...RECORD,
      ...patch,
      general: { ...RECORD.general, ...(patch.general ?? {}), ...(body.general ?? {}) },
      updatedAt: '2026-09-25T09:00:00.000Z',
    },
  });

  it('does not put back what a colleague saved after the form was opened', async () => {
    // The server's record, after a colleague changed the hero title elsewhere.
    settingsService.update.mockImplementation(async (body) =>
      serverAfter(body, { hero: { ...RECORD.hero, title: 'Saved by a colleague' } })
    );
    renderAs('admin');

    await type(await screen.findByLabelText(/tagline/i), 'A tagline of my own');
    await save();

    await waitFor(() => expect(settingsService.update).toHaveBeenCalled());
    expect(settingsService.update.mock.calls[0][0]).not.toHaveProperty('hero');

    // The form now shows the server's copy — the colleague's title included —
    // and has nothing left to save.
    await openTab('hero');
    expect(screen.getByLabelText(/^title$/i)).toHaveValue('Saved by a colleague');
    expect(screen.queryByText(/you have unsaved changes/i)).not.toBeInTheDocument();
  });

  it('leaves the form clean when a phone box is visited and left', async () => {
    settingsService.admin.mockResolvedValue({
      data: { ...RECORD, general: { ...RECORD.general, contactPhone: '+919800000001' } },
    });
    renderAs('admin');
    await screen.findByLabelText(/site name/i);

    await openTab('contact');
    const phone = screen.getByLabelText(/^phone/i);
    expect(phone).toHaveValue('+91 98000 00001');
    await click(phone);
    // The alternate number is empty — `null` in the record.
    await click(screen.getByLabelText(/^alternate phone/i));
    await click(screen.getByLabelText(/^whatsapp number/i));
    await click(screen.getByLabelText(/^contact e-mail/i));

    expect(screen.queryByText(/you have unsaved changes/i)).not.toBeInTheDocument();
  });

  it('takes a WhatsApp number typed with 91 or 0 in front, and sends it readable', async () => {
    renderAs('admin');
    await screen.findByLabelText(/site name/i);
    await openTab('contact');

    await type(screen.getByLabelText(/^whatsapp number/i), '919876543210');
    await save();

    await waitFor(() => expect(settingsService.update).toHaveBeenCalled());
    expect(settingsService.update.mock.calls[0][0].general.whatsappNumber).toBe('+91 98765 43210');
  });

  it('names the field a message is about, not its key', async () => {
    renderAs('admin');

    await type(await screen.findByLabelText(/site name/i), 'A'.repeat(121));
    await save();

    expect(
      await screen.findByText('The site name may not be greater than 120 characters.')
    ).toBeInTheDocument();
    expect(settingsService.update).not.toHaveBeenCalled();
  });

  it('names an API message in the same words', async () => {
    settingsService.update.mockRejectedValue(
      Object.assign(new Error('The given data was invalid.'), {
        status: 422,
        errors: {
          'general.tagline': ['The general.tagline may not be greater than 200 characters.'],
        },
      })
    );
    renderAs('admin');

    await type(await screen.findByLabelText(/tagline/i), 'Accepted here, refused there');
    await save();

    expect(
      await screen.findByText('The tagline may not be greater than 200 characters.')
    ).toBeInTheDocument();
  });

  it('refuses a latitude without its longitude', async () => {
    renderAs('admin');
    await screen.findByLabelText(/site name/i);
    await openTab('contact');

    await act(async () => {
      await userEvent.clear(screen.getByLabelText(/^longitude/i));
    });
    await save();

    expect(
      await screen.findByText('Add the longitude too — the map needs both, or neither.')
    ).toBeInTheDocument();
    expect(settingsService.update).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^latitude/i)).toHaveAttribute('inputmode', 'decimal');
  });

  it('keeps the six digits of a PIN code pasted with a space', async () => {
    renderAs('admin');
    await screen.findByLabelText(/site name/i);
    await openTab('contact');

    fireEvent.change(screen.getByLabelText(/^pin code/i), { target: { value: ' 560 034' } });
    expect(screen.getByLabelText(/^pin code/i)).toHaveValue('560034');
  });

  it('keeps the open panel in the address, and opens the panel an address names', async () => {
    renderAs('admin', { at: '/admin/settings?tab=integrations' });

    expect(await screen.findByRole('tab', { name: /integrations/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    await openTab('hero');
    expect(screen.getByTestId('location')).toHaveTextContent('/admin/settings?tab=hero');

    await openTab('general');
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/admin\/settings$/);
  });

  it('opens General for an address that names no panel it has', async () => {
    renderAs('admin', { at: '/admin/settings?tab=nonsense' });

    expect(await screen.findByRole('tab', { name: /general/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('saves on Ctrl+S, and says there is nothing to save when there is not', async () => {
    renderAs('admin');
    await screen.findByLabelText(/site name/i);

    await act(async () => {
      fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    });
    expect(await screen.findByText('No changes to save.')).toBeInTheDocument();
    expect(settingsService.update).not.toHaveBeenCalled();

    await type(screen.getByLabelText(/tagline/i), 'Saved from the keyboard');
    await act(async () => {
      fireEvent.keyDown(window, { key: 's', metaKey: true });
    });
    await waitFor(() => expect(settingsService.update).toHaveBeenCalledTimes(1));
  });

  it('opens the panel of a refused field and puts the cursor in it', async () => {
    renderAs('admin');
    await screen.findByLabelText(/site name/i);

    await openTab('contact');
    fireEvent.change(screen.getByLabelText(/^pin code/i), { target: { value: '12' } });
    await openTab('hero');
    await save();

    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /contact/i })).toHaveAttribute('aria-selected', 'true')
    );
    await waitFor(() => expect(screen.getByLabelText(/^pin code/i)).toHaveFocus());
    expect(settingsService.update).not.toHaveBeenCalled();
  });

  it('sends nothing when the change was only spaces', async () => {
    renderAs('admin');
    const tagline = await screen.findByLabelText(/tagline/i);

    await act(async () => {
      await userEvent.type(tagline, '   ');
    });
    await save();

    expect(await screen.findByText('No changes to save.')).toBeInTheDocument();
    expect(settingsService.update).not.toHaveBeenCalled();
    expect(screen.queryByText(/you have unsaved changes/i)).not.toBeInTheDocument();
  });

  it('adds a notification address typed and left, and says why one is refused', async () => {
    renderAs('admin');
    await screen.findByLabelText(/site name/i);
    await openTab('lead notifications');

    const box = screen.getByLabelText(/notification e-mails/i);
    await act(async () => {
      fireEvent.change(box, { target: { value: 'not-an-email' } });
    });
    expect(await screen.findByText('“not-an-email” is not an e-mail address')).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(box, { target: { value: 'Ops@SquaresNAcres.com' } });
    });
    expect(await screen.findByText('Add "Ops@SquaresNAcres.com"')).toBeInTheDocument();
    // Leaving the box — a click on Save — adds what was typed, as Enter would.
    await act(async () => {
      fireEvent.blur(box);
    });

    await save();
    await waitFor(() => expect(settingsService.update).toHaveBeenCalled());
    expect(settingsService.update.mock.calls[0][0].leads.notificationEmails).toEqual([
      'info@squaresnacres.com',
      'ops@squaresnacres.com',
    ]);
  });

  it('routes to the listing’s advisor and words the WhatsApp message, placeholders checked', async () => {
    renderAs('admin');
    await screen.findByLabelText(/site name/i);
    await openTab('lead notifications');

    await act(async () => {
      await userEvent.selectOptions(
        screen.getByLabelText(/assign automatically to/i),
        'listing-advisor'
      );
    });
    expect(screen.getByText(/goes to the listing’s advisor/)).toBeInTheDocument();

    // The stored record has no message yet: the default is shown, filled in.
    const message = screen.getByLabelText(/^message/i);
    expect(message).toHaveValue('Hello {name}, this is {brand} following up on your enquiry.');
    expect(
      screen.getByText('Hello Ananya, this is Squares N Acres following up on your enquiry.')
    ).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(message, { target: { value: 'Hi {name}, about {price}.' } });
    });
    await save();
    expect(await screen.findByText(/\{price\} is not a placeholder/)).toBeInTheDocument();
    expect(settingsService.update).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.change(message, { target: { value: 'Hi {name}, about {property}: {link}' } });
    });
    expect(
      screen.getByText(
        'Hi Ananya, about Lakeview Heights: https://www.squaresnacres.com/properties/lakeview-heights'
      )
    ).toBeInTheDocument();
    await save();

    await waitFor(() => expect(settingsService.update).toHaveBeenCalled());
    expect(settingsService.update.mock.calls[0][0]).toEqual({
      leads: {
        autoAssign: 'listing-advisor',
        whatsappTemplate: 'Hi {name}, about {property}: {link}',
      },
    });
  });

  it('sends a test alert and says where it went — or why it did not', async () => {
    settingsService.testLeadAlert
      .mockResolvedValueOnce({
        data: { sentTo: ['info@squaresnacres.com'], sentAt: '2026-09-26T09:30:00.000Z' },
        message: 'A test alert was sent to info@squaresnacres.com.',
      })
      .mockRejectedValueOnce(
        Object.assign(new Error('The given data was invalid.'), {
          status: 422,
          errors: {
            'leads.notificationEmails': [
              'Add at least one notification e-mail and save the settings first.',
            ],
          },
        })
      );
    renderAs('admin');
    await screen.findByLabelText(/site name/i);
    await openTab('lead notifications');

    expect(
      screen.getByText('Sends a sample lead alert to the saved addresses.')
    ).toBeInTheDocument();
    await click(screen.getByRole('button', { name: 'Send a test alert' }));
    expect(
      await screen.findByText(/^Last test: sent to info@squaresnacres\.com at/)
    ).toBeInTheDocument();
    expect(
      await screen.findByText('A test alert was sent to info@squaresnacres.com.')
    ).toBeInTheDocument();

    await click(screen.getByRole('button', { name: 'Send a test alert' }));
    expect(
      await screen.findByText(
        'Last test failed: Add at least one notification e-mail and save the settings first.'
      )
    ).toBeInTheDocument();
  });

  it('saves an address typed and followed straight away by a click on Save', async () => {
    renderAs('admin');
    await screen.findByLabelText(/site name/i);
    await openTab('lead notifications');

    const box = screen.getByLabelText(/notification e-mails/i);
    await act(async () => {
      box.focus();
      fireEvent.change(box, { target: { value: 'ops@squaresnacres.com' } });
    });
    await screen.findByText('Add "ops@squaresnacres.com"');

    // The only change is the one still in the box: the click that leaves it
    // is the click that saves it. A browser moves the focus on the press and
    // runs the page's microtasks before the click lands; user-event 13 runs the
    // two back to back, so the press is written out.
    await act(async () => {
      box.blur();
    });
    await save();

    await waitFor(() => expect(settingsService.update).toHaveBeenCalled());
    expect(settingsService.update.mock.calls[0][0]).toEqual({
      leads: { notificationEmails: ['info@squaresnacres.com', 'ops@squaresnacres.com'] },
    });
  });

  it('refuses a badge the hero cannot hold as it is typed', async () => {
    renderAs('admin');
    await screen.findByLabelText(/site name/i);
    await openTab('hero');

    await act(async () => {
      fireEvent.change(screen.getByLabelText(/^badges/i), { target: { value: 'B'.repeat(61) } });
    });
    expect(await screen.findByText('Too long — keep a badge to 60 characters')).toBeInTheDocument();
    expect(screen.queryByText(/^Add "/)).not.toBeInTheDocument();
  });
});
