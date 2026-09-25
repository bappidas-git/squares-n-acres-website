import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ApiError from '../../../../services/apiError';
import MediaLibraryPage from '../MediaLibraryPage';
import mediaService from '../../../../services/mediaService';
import renderWith from '../../../../test-utils';
import { SiteSettingsContext } from '../../../../contexts/SiteSettingsContext';

jest.mock('../../../../services/mediaService', () => ({
  __esModule: true,
  default: {
    list: jest.fn(),
    create: jest.fn(),
    patch: jest.fn(),
    remove: jest.fn(),
  },
}));

/**
 * Admin → Media (prompt 39, §6.12).
 *
 * Two behaviours carry the screen and both are worth asserting end to end:
 * adding a file by its address makes a record (the only way in that works
 * before a client has given us a cloud name), and deleting a file something
 * still shows is refused with the list of places it appears — the 409 of §5 —
 * until the editor says to go ahead anyway.
 *
 * The third is the absence of a control: with no Cloudinary configured there
 * is no Upload button anywhere, and the URL route is still there (§7).
 */

const USED = {
  id: 1,
  url: 'https://picsum.photos/seed/sna-lakeview-1/1200/800',
  publicId: null,
  provider: 'external',
  type: 'image',
  width: 1200,
  height: 800,
  bytes: null,
  format: 'jpg',
  alt: 'Lakeview Heights – photo 1',
  title: 'lakeview-1.jpg',
  folder: 'properties',
  tags: [],
  usedIn: [{ type: 'property', id: 1, title: 'Lakeview Heights' }],
  createdAt: '2026-09-01T09:00:00.000Z',
};

const SPARE = {
  ...USED,
  id: 2,
  url: 'https://res.cloudinary.com/dn9gyaiik/image/upload/v1/sna/misc/spare.png',
  provider: 'cloudinary',
  format: 'png',
  alt: 'A picture nobody uses',
  title: 'spare.png',
  folder: 'misc',
  usedIn: [],
};

const envelope = (data) => ({
  data,
  meta: { page: 1, perPage: 24, total: data.length, totalPages: 1 },
});

/** The page, with the settings context saying whether uploads are possible. */
const render = ({ cloudName = '', uploadPreset = '' } = {}) =>
  renderWith(
    <SiteSettingsContext.Provider
      value={{
        settings: {
          integrations: { cloudinaryCloudName: cloudName, cloudinaryUploadPreset: uploadPreset },
        },
        seoSettings: null,
        loading: false,
        error: null,
        refresh: () => {},
        siteName: 'Squares N Acres',
        tagline: '',
        getContact: () => ({}),
        getLogoUrl: () => '',
        getWhatsappLink: () => '',
      }}
    >
      <MediaLibraryPage />
    </SiteSettingsContext.Provider>
  );

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
  delete process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;
  mediaService.list.mockResolvedValue(envelope([USED, SPARE]));
  mediaService.create.mockImplementation((body) =>
    Promise.resolve({ data: { id: 99, usedIn: [], ...body } })
  );
  mediaService.patch.mockImplementation((id, body) =>
    Promise.resolve({ data: { ...USED, ...body } })
  );
  mediaService.remove.mockResolvedValue({ data: null, message: 'Deleted' });
});

it('asks for the usage of every file on the page in one request', async () => {
  render();

  expect(await screen.findByText('lakeview-1.jpg')).toBeInTheDocument();
  expect(mediaService.list.mock.calls[0][0]).toMatchObject({
    page: 1,
    perPage: 24,
    withUsage: true,
  });
  expect(screen.getByText('Used in 1')).toBeInTheDocument();
  expect(screen.getByText('Not used yet')).toBeInTheDocument();
});

it('offers no upload anywhere until Cloudinary is configured, and says why', async () => {
  render();
  await screen.findByText('lakeview-1.jpg');

  expect(screen.queryByRole('button', { name: /^upload$/i })).not.toBeInTheDocument();
  expect(screen.getByText(/Configure Cloudinary in Settings → Integrations/)).toBeInTheDocument();
  // The way in that always works is still there.
  expect(screen.getByRole('button', { name: /add by url/i })).toBeInTheDocument();
});

it('shows the upload zone once a cloud name and a preset exist', async () => {
  render({ cloudName: 'dn9gyaiik', uploadPreset: 'sna-unsigned' });
  await screen.findByText('lakeview-1.jpg');

  expect(screen.queryByText(/Configure Cloudinary in Settings/)).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /^upload$/i }));
  expect(await screen.findByLabelText('Choose files to upload')).toBeInTheDocument();
});

it('creates a record from a pasted address, working out what the file is', async () => {
  render();
  await screen.findByText('lakeview-1.jpg');

  await userEvent.click(screen.getByRole('button', { name: /add by url/i }));

  const dialog = await screen.findByRole('dialog');
  await userEvent.type(
    within(dialog).getByLabelText(/file address/i),
    'https://picsum.photos/seed/sna-new/1600/900'
  );
  await userEvent.type(within(dialog).getByLabelText(/alt text/i), 'A new photograph');
  await userEvent.click(within(dialog).getByRole('button', { name: /add to library/i }));

  await waitFor(() => expect(mediaService.create).toHaveBeenCalled());
  expect(mediaService.create.mock.calls[0][0]).toMatchObject({
    url: 'https://picsum.photos/seed/sna-new/1600/900',
    alt: 'A new photograph',
    // The extension says nothing, so the host decides — not "document".
    type: 'image',
    provider: 'external',
  });
  // The grid is re-read so the new file appears without a reload.
  await waitFor(() => expect(mediaService.list).toHaveBeenCalledTimes(2));
});

it('refuses an address that is not one, and a record with no alt text', async () => {
  render();
  await screen.findByText('lakeview-1.jpg');

  await userEvent.click(screen.getByRole('button', { name: /add by url/i }));
  const dialog = await screen.findByRole('dialog');

  await userEvent.type(within(dialog).getByLabelText(/file address/i), 'not-a-url');
  await userEvent.click(within(dialog).getByRole('button', { name: /add to library/i }));

  expect(await within(dialog).findByText(/paste a complete https/i)).toBeInTheDocument();
  expect(within(dialog).getByText(/alt text is required|describe the file/i)).toBeInTheDocument();
  expect(mediaService.create).not.toHaveBeenCalled();
});

/**
 * Opens a file's drawer.
 *
 * The tile's accessible name *starts* with the title; "Copy the address of …"
 * ends with it, so the anchor is what tells the two buttons apart.
 */
const openDrawer = async (title) => {
  await userEvent.click(await screen.findByRole('button', { name: new RegExp(`^${title}`, 'i') }));
};

describe('deleting', () => {
  it('is blocked when the file is in use, and lists where (§5, §7)', async () => {
    mediaService.remove.mockRejectedValue(
      new ApiError({
        status: 409,
        message: 'This file is still in use.',
        errors: { id: ['Used by 1 listing'] },
        data: { usedIn: [{ type: 'property', id: 1, title: 'Lakeview Heights' }] },
      })
    );

    render();
    await openDrawer('lakeview-1\\.jpg');

    await userEvent.click(await screen.findByRole('button', { name: /remove from the library/i }));
    await userEvent.click(screen.getByRole('button', { name: /remove from the library/i }));

    expect(await screen.findByText('This file is still in use')).toBeInTheDocument();
    expect(mediaService.remove).toHaveBeenCalledWith(1, { force: false });
    // Two places name the listing now: the usage list and the warning.
    expect(screen.getAllByText('Lakeview Heights').length).toBeGreaterThan(1);
  });

  it('goes through once the editor forces it', async () => {
    render();
    await openDrawer('lakeview-1\\.jpg');

    await userEvent.click(await screen.findByRole('button', { name: /remove from the library/i }));
    await userEvent.click(screen.getByLabelText(/even though it is in use/i));
    await userEvent.click(screen.getByRole('button', { name: /remove from the library/i }));

    await waitFor(() => expect(mediaService.remove).toHaveBeenCalledWith(1, { force: true }));
  });

  it('is explicit that the file itself survives — where it actually is (QA-63)', async () => {
    render();
    await openDrawer('lakeview-1\\.jpg');

    await userEvent.click(await screen.findByRole('button', { name: /remove from the library/i }));
    // A picsum photograph is not on Cloudinary, and the drawer used to say it was.
    expect(screen.getByText(/stays on picsum\.photos/i)).toBeInTheDocument();
    expect(screen.queryByText(/stays on Cloudinary/i)).not.toBeInTheDocument();
  });

  it('says Cloudinary for a Cloudinary file, and offers no force for a file nobody uses', async () => {
    render();
    await openDrawer('spare\\.png');

    await userEvent.click(await screen.findByRole('button', { name: /remove from the library/i }));
    expect(screen.getByText(/stays on Cloudinary/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/even though it is in use/i)).not.toBeInTheDocument();
  });
});

it('saves the alt text from the drawer, and only what changed', async () => {
  render();
  await openDrawer('spare\\.png');

  const alt = await screen.findByLabelText(/alt text/i);
  expect(alt).toHaveValue('A picture nobody uses');
  await userEvent.clear(alt);
  await userEvent.type(alt, 'A spare picture of the lobby');
  await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

  await waitFor(() => expect(mediaService.patch).toHaveBeenCalled());
  // Only what changed (QA-63): a field left alone is not written back over
  // whatever somebody else has saved in it since the drawer opened.
  expect(mediaService.patch.mock.calls[0][1]).toEqual({ alt: 'A spare picture of the lobby' });
});
