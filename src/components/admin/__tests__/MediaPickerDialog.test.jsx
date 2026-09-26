import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MediaPickerDialog, { toSelection } from '../MediaPickerDialog';
import mediaService from '../../../services/mediaService';
import renderWith from '../../../test-utils';
import { SiteSettingsContext } from '../../../contexts/SiteSettingsContext';

jest.mock('../../../services/mediaService', () => ({
  __esModule: true,
  default: { list: jest.fn(), create: jest.fn() },
}));

/**
 * `MediaPickerDialog` (prompt 39 §5).
 *
 * What the dialog is *for* is handing a form five fields about a file, so the
 * shape of what comes back is the thing to pin: a single-select answers the
 * moment a tile is pressed, a multi-select answers in the order the tiles were
 * pressed (§7), and neither hands over the library's own bookkeeping.
 *
 * The Upload tab is the other assertion worth making, and it is about absence:
 * with no Cloudinary configured it is not there, while Library and URL are.
 */

const FILES = [
  {
    id: 11,
    url: 'https://picsum.photos/seed/sna-a/1200/800',
    provider: 'external',
    type: 'image',
    width: 1200,
    height: 800,
    format: 'jpg',
    alt: 'The lobby',
    title: 'lobby.jpg',
    folder: 'properties',
    tags: [],
    createdAt: '2026-09-01T09:00:00.000Z',
  },
  {
    id: 12,
    url: 'https://picsum.photos/seed/sna-b/1200/800',
    provider: 'external',
    type: 'image',
    width: 1200,
    height: 800,
    format: 'jpg',
    alt: 'The clubhouse',
    title: 'clubhouse.jpg',
    folder: 'properties',
    tags: [],
    createdAt: '2026-09-02T09:00:00.000Z',
  },
];

const envelope = (data) => ({
  data,
  meta: { page: 1, perPage: 18, total: data.length, totalPages: 1 },
});

const settings = (cloudName = '', uploadPreset = '') => ({
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
});

const render = (props = {}, cloud = {}) => {
  const onSelect = jest.fn();
  const onClose = jest.fn();
  renderWith(
    <SiteSettingsContext.Provider value={settings(cloud.cloudName, cloud.uploadPreset)}>
      <MediaPickerDialog open onClose={onClose} onSelect={onSelect} {...props} />
    </SiteSettingsContext.Provider>
  );
  return { onSelect, onClose };
};

/** The tile of a file: its accessible name starts with the title. */
const tile = (title) => screen.findByRole('button', { name: new RegExp(`^${title}`, 'i') });

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
  delete process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;
  mediaService.list.mockResolvedValue(envelope(FILES));
  mediaService.create.mockImplementation((body) => Promise.resolve({ data: { id: 99, ...body } }));
});

it('asks only for the kind of file the field accepts', async () => {
  render({ accept: 'document' });

  await waitFor(() => expect(mediaService.list).toHaveBeenCalled());
  expect(mediaService.list.mock.calls[0][0]).toMatchObject({ type: 'document', perPage: 18 });
});

it('answers with the record the moment a tile is pressed, when one is wanted', async () => {
  const { onSelect, onClose } = render();

  await userEvent.click(await tile('clubhouse\\.jpg'));

  expect(onSelect).toHaveBeenCalledWith([
    {
      id: 12,
      url: 'https://picsum.photos/seed/sna-b/1200/800',
      alt: 'The clubhouse',
      title: 'clubhouse.jpg',
      width: 1200,
      height: 800,
    },
  ]);
  expect(onClose).toHaveBeenCalled();
});

it('keeps a multiple selection in the order the tiles were pressed (§7)', async () => {
  const { onSelect } = render({ multiple: true });

  await userEvent.click(await tile('clubhouse\\.jpg'));
  await userEvent.click(await tile('lobby\\.jpg'));

  expect(onSelect).not.toHaveBeenCalled();
  expect(screen.getByText('2 selected')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Select 2' }));

  expect(onSelect.mock.calls[0][0].map((one) => one.id)).toEqual([12, 11]);
});

it('lets a tile be pressed again to drop it from the selection', async () => {
  render({ multiple: true });

  await userEvent.click(await tile('lobby\\.jpg'));
  expect(screen.getByText('1 selected')).toBeInTheDocument();

  await userEvent.click(await tile('lobby\\.jpg'));
  expect(screen.getByText('Nothing selected yet')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Select' })).toBeDisabled();
});

describe('the tabs', () => {
  it('offers Library and URL, and no Upload, until Cloudinary is configured (§7)', async () => {
    render();
    await tile('lobby\\.jpg');

    expect(screen.getByRole('tab', { name: 'Library' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'By URL' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Upload' })).not.toBeInTheDocument();
  });

  it('adds Upload once it can work, and opens there when asked to', async () => {
    render({ defaultTab: 'upload' }, { cloudName: 'dn9gyaiik', uploadPreset: 'sna-unsigned' });

    expect(await screen.findByRole('tab', { name: 'Upload' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByLabelText('Choose files to upload')).toBeInTheDocument();
  });

  it('adds a file by address from inside the dialog and hands it straight back', async () => {
    const { onSelect, onClose } = render();
    await tile('lobby\\.jpg');

    await userEvent.click(screen.getByRole('tab', { name: 'By URL' }));

    await userEvent.type(
      screen.getByLabelText(/file address/i),
      'https://picsum.photos/seed/sna-new/1600/900'
    );
    await userEvent.type(screen.getByLabelText(/alt text/i), 'A new photograph');
    await userEvent.click(screen.getByRole('button', { name: /use this file/i }));

    await waitFor(() => expect(onSelect).toHaveBeenCalled());
    expect(onSelect.mock.calls[0][0][0]).toMatchObject({
      url: 'https://picsum.photos/seed/sna-new/1600/900',
      alt: 'A new photograph',
    });
    expect(onClose).toHaveBeenCalled();
  });
});

it('says what to do when the library has nothing of that kind', async () => {
  mediaService.list.mockResolvedValue(envelope([]));
  render({ accept: 'document' });

  expect(await screen.findByText('Nothing to choose from')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /add by url/i }));
  expect(screen.getByLabelText(/file address/i)).toBeInTheDocument();
});

describe('toSelection', () => {
  it('hands over the five fields a form needs and nothing else', () => {
    expect(
      toSelection({ ...FILES[0], tags: ['lobby'], usedIn: [{ type: 'property', id: 1 }] })
    ).toEqual({
      id: 11,
      url: 'https://picsum.photos/seed/sna-a/1200/800',
      alt: 'The lobby',
      title: 'lobby.jpg',
      width: 1200,
      height: 800,
    });
  });

  it('never hands back `undefined` for a field the record left empty', () => {
    expect(toSelection({ id: 5, url: 'https://example.com/a.png' })).toEqual({
      id: 5,
      url: 'https://example.com/a.png',
      alt: '',
      title: '',
      width: null,
      height: null,
    });
  });
});

describe('browsing (QA-63)', () => {
  it('offers every folder in the library, and pages back to the top of the grid', async () => {
    mediaService.list.mockResolvedValue({
      data: FILES,
      meta: {
        page: 1,
        perPage: 18,
        total: 40,
        totalPages: 3,
        folders: ['authors', 'banks', 'properties'],
      },
    });
    render();
    await tile('lobby\\.jpg');

    const folder = screen.getByLabelText('Folder', { selector: 'select' });
    expect([...folder.options].map((option) => option.value)).toEqual([
      '',
      'authors',
      'banks',
      'properties',
    ]);

    // eslint-disable-next-line testing-library/no-node-access -- the scroller has no role
    const grid = screen.getByRole('list', { name: 'Files you can choose' }).parentElement;
    grid.scrollTop = 300;
    await userEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(grid.scrollTop).toBe(0);
    await waitFor(() => expect(mediaService.list.mock.calls.at(-1)[0]).toMatchObject({ page: 2 }));
  });

  it('shows a failed request as one, not as the last answer', async () => {
    mediaService.list.mockResolvedValueOnce({
      data: FILES,
      meta: { page: 1, perPage: 18, total: 40, totalPages: 3 },
    });
    render();
    await tile('lobby\\.jpg');

    mediaService.list.mockRejectedValueOnce(new Error('offline'));
    await userEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(await screen.findByText('The library could not be loaded')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^lobby\.jpg/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Pages of files' })).not.toBeInTheDocument();
  });
});

describe('an empty folder (QA-63)', () => {
  it('says the folder is empty, and shows every file on request', async () => {
    mediaService.list.mockImplementation((params) =>
      Promise.resolve(params.folder ? envelope([]) : envelope(FILES))
    );
    render({ accept: 'document', folder: 'brochures' });

    expect(await screen.findByText('No files match')).toBeInTheDocument();
    expect(screen.getByText(/Nothing in “brochures” answers/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Show every file' }));
    expect(await tile('lobby\\.jpg')).toBeInTheDocument();
    expect(mediaService.list.mock.calls.at(-1)[0].folder).toBeUndefined();
    // The field's own kind of file is still the only kind asked for.
    expect(mediaService.list.mock.calls.at(-1)[0]).toMatchObject({ type: 'document' });
  });
});

describe('a record’s own folder (prompt 51)', () => {
  it('opens on the section’s folder while the record’s own holds nothing yet', async () => {
    mediaService.list.mockImplementation((params) =>
      Promise.resolve({
        ...envelope(params.folder === 'properties' ? FILES : []),
        meta: {
          ...envelope([]).meta,
          folders: [{ name: 'properties', count: 2 }],
        },
      })
    );
    render({ multiple: true, folder: 'properties/lakeview-heights', fallbackFolder: 'properties' });

    expect(await tile('lobby\\.jpg')).toBeInTheDocument();
    expect(mediaService.list.mock.calls[0][0]).toMatchObject({
      folder: 'properties/lakeview-heights',
    });
    expect(mediaService.list.mock.calls.at(-1)[0]).toMatchObject({ folder: 'properties' });
    // The empty folder is never announced on the way.
    expect(screen.queryByText('No files match')).not.toBeInTheDocument();
  });

  it('stays on the record’s folder once it holds something', async () => {
    mediaService.list.mockResolvedValue({
      ...envelope(FILES),
      meta: {
        ...envelope(FILES).meta,
        folders: [
          { name: 'properties', count: 280 },
          { name: 'properties/lakeview-heights', count: 2 },
        ],
      },
    });
    render({ multiple: true, folder: 'properties/lakeview-heights', fallbackFolder: 'properties' });

    expect(await tile('lobby\\.jpg')).toBeInTheDocument();
    expect(
      mediaService.list.mock.calls.every(
        ([params]) => params.folder === 'properties/lakeview-heights'
      )
    ).toBe(true);
    // The folder filter offers each folder with its count.
    expect(screen.getByRole('option', { name: 'properties (280)' })).toBeInTheDocument();
  });
});
