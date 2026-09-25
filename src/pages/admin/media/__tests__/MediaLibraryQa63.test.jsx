import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ApiError from '../../../../services/apiError';
import MediaLibraryPage from '../MediaLibraryPage';
import mediaService from '../../../../services/mediaService';
import renderWith from '../../../../test-utils';
import { SiteSettingsContext } from '../../../../contexts/SiteSettingsContext';
import { uploadToCloudinary } from '../../../../utils/cloudinary';

jest.mock('../../../../services/mediaService', () => ({
  __esModule: true,
  default: {
    list: jest.fn(),
    create: jest.fn(),
    patch: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock('../../../../utils/cloudinary', () => ({
  ...jest.requireActual('../../../../utils/cloudinary'),
  uploadToCloudinary: jest.fn(),
}));

/**
 * Admin → Media, the QA-63 pass: what the library shows when a request fails
 * or is slow, the folders it offers, paging, and the drawer's editing rules.
 */

const file = (id, overrides = {}) => ({
  id,
  url: `https://picsum.photos/seed/qa-${id}/800/600`,
  publicId: null,
  provider: 'external',
  type: 'image',
  width: 800,
  height: 600,
  bytes: null,
  format: 'jpg',
  alt: `Photograph ${id}`,
  title: null,
  folder: 'properties',
  tags: [],
  usedIn: [],
  createdAt: '2026-09-01T09:00:00.000Z',
  ...overrides,
});

const envelope = (data, meta = {}) => ({
  data,
  meta: { page: 1, perPage: 24, total: data.length, totalPages: 1, ...meta },
});

const FOLDERS = ['authors', 'banks', 'properties'];

const render = ({ url = '/admin/media', cloudName = '', uploadPreset = '' } = {}) =>
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
    </SiteSettingsContext.Provider>,
    { initialEntries: [url] }
  );

const folderSelect = () => screen.getByLabelText('Folder', { selector: 'select' });
const optionsOf = (select) =>
  within(select)
    .getAllByRole('option')
    .map((option) => option.value);

/**
 * Types a tag and presses Enter. `fireEvent` renders each step in full, as a
 * browser does; `userEvent` v13 types sixty letters into MUI's Autocomplete
 * too slowly for a test's budget.
 */
const enterTag = async (field, text) => {
  fireEvent.focus(field);
  fireEvent.change(field, { target: { value: text } });
  await screen.findByRole('listbox');
  fireEvent.keyDown(field, { key: 'Enter' });
};

const openDrawer = async (name) => {
  await userEvent.click(await screen.findByRole('button', { name: new RegExp(`^${name}`, 'i') }));
  return screen.findByRole('dialog', { name: 'File details' });
};

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
  delete process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;
  mediaService.list.mockResolvedValue(
    envelope([file(1), file(2, { alt: 'Photograph two' })], { folders: FOLDERS })
  );
  mediaService.patch.mockImplementation((id, body) =>
    Promise.resolve({ data: { ...file(id), ...body } })
  );
  mediaService.remove.mockResolvedValue({ data: null, message: 'Deleted' });
  mediaService.create.mockImplementation((body) =>
    Promise.resolve({ data: { id: 500 + mediaService.create.mock.calls.length, ...body } })
  );
});

describe('the Folder filter', () => {
  it('offers every folder in the library, not only those of the page on screen', async () => {
    render();
    await screen.findByText('Photograph 1');

    expect(optionsOf(folderSelect())).toEqual(['', ...FOLDERS]);
  });

  it('still offers the others once one is chosen', async () => {
    render();
    await screen.findByText('Photograph 1');

    mediaService.list.mockResolvedValue(
      envelope([file(7, { folder: 'banks', alt: 'A bank logo' })], { folders: FOLDERS })
    );
    await userEvent.selectOptions(folderSelect(), 'banks');
    await screen.findByText('A bank logo');

    expect(optionsOf(folderSelect())).toEqual(['', ...FOLDERS]);
    expect(folderSelect()).toHaveValue('banks');
  });

  it('keeps the page’s own folders for an API that does not list them', async () => {
    mediaService.list.mockResolvedValue(envelope([file(1), file(2, { folder: 'misc' })]));
    render();
    await screen.findByText('Photograph 1');

    expect(optionsOf(folderSelect())).toEqual(['', 'misc', 'properties']);
  });
});

describe('a request that fails, or is slow', () => {
  it('shows the error instead of the last answer, with no count and no pages', async () => {
    mediaService.list.mockResolvedValueOnce(
      envelope([file(1), file(2, { alt: 'Photograph two' })], {
        total: 60,
        totalPages: 3,
        folders: FOLDERS,
      })
    );
    render();
    await screen.findByText('Photograph 1');
    expect(screen.getByText('60 files')).toBeInTheDocument();

    mediaService.list.mockRejectedValueOnce(
      new ApiError({ status: 0, isNetworkError: true, message: 'No connection' })
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Type', { selector: 'select' }),
      'document'
    );

    expect(await screen.findByText('The library could not be loaded')).toBeInTheDocument();
    expect(screen.queryByText('Photograph 1')).not.toBeInTheDocument();
    expect(screen.queryByText('60 files')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Media library pages' })).toBeNull();

    mediaService.list.mockResolvedValueOnce(
      envelope([file(9, { type: 'document', alt: 'A price list' })], { folders: FOLDERS })
    );
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByText('A price list')).toBeInTheDocument();
  });

  it('marks the grid busy while the next answer is on its way', async () => {
    render();
    await screen.findByText('Photograph 1');

    mediaService.list.mockReturnValueOnce(new Promise(() => {}));
    await userEvent.selectOptions(screen.getByLabelText('Type', { selector: 'select' }), 'video');

    await waitFor(() =>
      expect(screen.getByRole('list', { name: 'Media library' })).toHaveAttribute(
        'aria-busy',
        'true'
      )
    );
  });
});

describe('paging', () => {
  it('offers the first page when the address points past the end', async () => {
    mediaService.list.mockResolvedValue(envelope([], { page: 3, total: 5, totalPages: 1 }));
    render({ url: '/admin/media?page=3' });

    await userEvent.click(await screen.findByRole('button', { name: 'Go to first page' }));

    await waitFor(() => expect(mediaService.list.mock.calls.at(-1)[0]).toMatchObject({ page: 1 }));
  });

  it('steps back a page when a removal empties the one on screen', async () => {
    mediaService.list.mockResolvedValue(
      envelope([file(30, { alt: 'The last one' })], { page: 2, total: 25, totalPages: 2 })
    );
    render({ url: '/admin/media?page=2' });

    const drawer = await openDrawer('The last one');
    await userEvent.click(within(drawer).getByRole('button', { name: /remove from the library/i }));
    await userEvent.click(within(drawer).getByRole('button', { name: /remove from the library/i }));

    await waitFor(() => expect(mediaService.remove).toHaveBeenCalledWith(30, { force: false }));
    await waitFor(() => expect(mediaService.list.mock.calls.at(-1)[0]).toMatchObject({ page: 1 }));
  });
});

it('files a file added by address in the folder on screen', async () => {
  render({ url: '/admin/media?folder=banks' });
  await screen.findByText('Photograph 1');

  await userEvent.click(screen.getByRole('button', { name: /add by url/i }));
  const dialog = await screen.findByRole('dialog', { name: /add a file by address/i });

  expect(within(dialog).getByLabelText('Folder')).toHaveValue('banks');
});

describe('the drawer', () => {
  it('adds a tag typed and entered, and saves it', async () => {
    render();
    const drawer = await openDrawer('Photograph 1');

    await enterTag(within(drawer).getByLabelText('Tags'), 'aerial');
    expect(
      await within(drawer).findByRole('button', { name: 'Remove aerial' })
    ).toBeInTheDocument();

    await userEvent.click(within(drawer).getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(mediaService.patch).toHaveBeenCalled());
    expect(mediaService.patch.mock.calls[0][1]).toMatchObject({ tags: ['aerial'] });
  });

  it('refuses a tag that is too long with a word, and adds none twice', async () => {
    mediaService.list.mockResolvedValue(envelope([file(1, { tags: ['Lobby'] })]));
    render();
    const drawer = await openDrawer('Photograph 1');
    const tags = within(drawer).getByLabelText('Tags');

    await enterTag(tags, 'x'.repeat(61));
    expect(await within(drawer).findByText(/at most 60 characters/i)).toBeInTheDocument();

    // A tag the file already has, in any case, is not offered as a new one.
    fireEvent.change(tags, { target: { value: 'lobby' } });
    fireEvent.keyDown(tags, { key: 'Enter' });
    await waitFor(() =>
      expect(within(drawer).getAllByRole('button', { name: /^Remove lobby$/i })).toHaveLength(1)
    );
  });

  it('says there is nothing to save rather than writing the same record', async () => {
    render();
    const drawer = await openDrawer('Photograph 1');

    await userEvent.click(within(drawer).getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('No changes to save.')).toBeInTheDocument();
    expect(mediaService.patch).not.toHaveBeenCalled();
  });

  it('asks before throwing edits away, and starts the next opening from the stored file', async () => {
    render();
    let drawer = await openDrawer('Photograph 1');
    const alt = within(drawer).getByLabelText(/alt text/i);
    await userEvent.clear(alt);
    await userEvent.type(alt, 'Not saved');

    await userEvent.keyboard('{Escape}');
    const confirm = await screen.findByRole('dialog', { name: 'Discard unsaved changes?' });
    await userEvent.click(within(confirm).getByRole('button', { name: 'Keep editing' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Discard unsaved changes?' })
      ).not.toBeInTheDocument()
    );
    expect(within(drawer).getByLabelText(/alt text/i)).toHaveValue('Not saved');

    // The footer's "Close", after the header's ×.
    await userEvent.click(within(drawer).getAllByRole('button', { name: 'Close' }).at(-1));
    const again = await screen.findByRole('dialog', { name: 'Discard unsaved changes?' });
    await userEvent.click(within(again).getByRole('button', { name: 'Discard changes' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'File details' })).not.toBeInTheDocument()
    );

    drawer = await openDrawer('Photograph 1');
    expect(within(drawer).getByLabelText(/alt text/i)).toHaveValue('Photograph 1');
  });

  it('stays open while its save is on its way', async () => {
    let answer;
    mediaService.patch.mockReturnValueOnce(
      new Promise((resolve) => {
        answer = resolve;
      })
    );
    render();
    const drawer = await openDrawer('Photograph 1');
    await userEvent.type(within(drawer).getByLabelText('Title'), 'Lobby');
    await userEvent.click(within(drawer).getByRole('button', { name: 'Save changes' }));

    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('dialog', { name: 'File details' })).toBeInTheDocument();

    await act(async () => answer({ data: { ...file(1), title: 'Lobby' } }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'File details' })).not.toBeInTheDocument()
    );
    expect(screen.getByText('File saved')).toBeInTheDocument();
  });

  it('says so when the file was removed elsewhere, and reads the library again', async () => {
    mediaService.patch.mockRejectedValueOnce(new ApiError({ status: 404, message: 'Not found' }));
    render();
    const drawer = await openDrawer('Photograph 1');
    await userEvent.type(within(drawer).getByLabelText('Title'), 'Lobby');
    await userEvent.click(within(drawer).getByRole('button', { name: 'Save changes' }));

    expect(
      await screen.findByText(/is no longer here — it was deleted elsewhere/)
    ).toBeInTheDocument();
    await waitFor(() => expect(mediaService.list).toHaveBeenCalledTimes(2));
  });

  it('says so when the file it removes had already gone', async () => {
    mediaService.remove.mockRejectedValueOnce(new ApiError({ status: 404, message: 'Not found' }));
    render();
    const drawer = await openDrawer('Photograph 1');
    await userEvent.click(within(drawer).getByRole('button', { name: /remove from the library/i }));
    await userEvent.click(within(drawer).getByRole('button', { name: /remove from the library/i }));

    expect(await screen.findByText(/had already been deleted/)).toBeInTheDocument();
  });

  it('takes the in-use warning away with the box it points at', async () => {
    mediaService.list.mockResolvedValue(
      envelope([file(1, { usedIn: [{ type: 'bank', id: 2, title: 'Garden City Bank' }] })])
    );
    mediaService.remove.mockRejectedValueOnce(
      new ApiError({
        status: 409,
        message: 'This file is still in use.',
        data: { usedIn: [{ type: 'bank', id: 2, title: 'Garden City Bank' }] },
      })
    );
    render();
    const drawer = await openDrawer('Photograph 1');
    // A bank's logo is a use of the file, with a link to where banks are kept.
    expect(within(drawer).getByRole('link', { name: 'Garden City Bank' })).toHaveAttribute(
      'href',
      '/admin/master-data/banks'
    );

    await userEvent.click(within(drawer).getByRole('button', { name: /remove from the library/i }));
    await userEvent.click(within(drawer).getByRole('button', { name: /remove from the library/i }));
    expect(await within(drawer).findByText('This file is still in use')).toBeInTheDocument();
    expect(within(drawer).getByText('It appears in 1 place:')).toBeInTheDocument();

    await userEvent.click(within(drawer).getByRole('button', { name: 'Keep it' }));
    expect(within(drawer).queryByText('This file is still in use')).not.toBeInTheDocument();
  });
});

describe('uploads', () => {
  const JPEG = (name) => new File(['x'], name, { type: 'image/jpeg' });

  it('are announced once per batch, and the library read once', async () => {
    uploadToCloudinary.mockImplementation((one) =>
      Promise.resolve({
        url: `https://res.cloudinary.com/qa/image/upload/v1/sna/${one.name}`,
        publicId: one.name,
        bytes: 1,
        format: 'jpg',
        width: 10,
        height: 10,
      })
    );
    render({ cloudName: 'qa', uploadPreset: 'qa-unsigned' });
    await screen.findByText('Photograph 1');

    await userEvent.click(screen.getByRole('button', { name: /^upload$/i }));
    userEvent.upload(screen.getByLabelText('Choose files to upload'), [
      JPEG('front.jpg'),
      JPEG('back.jpg'),
    ]);

    expect(await screen.findByText('2 files are in the library.')).toBeInTheDocument();
    expect(screen.queryByText(/“front\.jpg” is in the library/)).not.toBeInTheDocument();
    await waitFor(() => expect(mediaService.list).toHaveBeenCalledTimes(2));
  });
});
