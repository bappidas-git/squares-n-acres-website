import { fireEvent, render as rtlRender, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import ApiError from '../../../../services/apiError';
import FolderField from '../../../../components/admin/FolderField';
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
    bulk: jest.fn(),
    move: jest.fn(),
    renameFolder: jest.fn(),
  },
}));

/**
 * The media library's folders (prompt 51): a folder field that makes the
 * folder being typed, a rail with the counts, "New folder" before any upload,
 * a select mode that moves files, "Manage folders" that renames them, and the
 * filter for the files nothing uses.
 */

const file = (id, overrides = {}) => ({
  id,
  url: `https://picsum.photos/seed/folders-${id}/800/600`,
  publicId: null,
  provider: 'external',
  type: 'image',
  width: 800,
  height: 600,
  bytes: null,
  format: 'jpg',
  alt: `Photograph ${id}`,
  title: null,
  folder: 'campaigns',
  tags: [],
  usedIn: [],
  createdAt: '2026-09-01T09:00:00.000Z',
  ...overrides,
});

const FOLDERS = [
  { name: 'campaigns', count: 2 },
  { name: 'pages', count: 19 },
];

const envelope = (data, meta = {}) => ({
  data,
  meta: {
    page: 1,
    perPage: 24,
    total: data.length,
    totalPages: 1,
    folders: FOLDERS,
    unfiled: 3,
    ...meta,
  },
});

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

const rail = () => screen.getByRole('region', { name: 'Folders' });
const lastListCall = () => mediaService.list.mock.calls.at(-1)[0];

/** Waits for the grid, then turns select mode on. */
const startSelecting = async () => {
  await screen.findByRole('button', { name: /^Photograph 1/ });
  await userEvent.click(screen.getByRole('button', { name: 'Select' }));
};

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
  delete process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;
  mediaService.list.mockResolvedValue(envelope([file(1), file(2, { alt: 'Photograph two' })]));
});

describe('FolderField', () => {
  /** The field with its own state, as a form holds it. */
  function Harness({ initial = '', folders = FOLDERS, onPick }) {
    const [value, setValue] = useState(initial);
    return (
      <FolderField
        value={value}
        folders={folders}
        onChange={(next) => {
          setValue(next ?? '');
          onPick?.(next);
        }}
      />
    );
  }

  it('offers to create the folder being typed, cleaned as the library files it', async () => {
    const onPick = jest.fn();
    rtlRender(<Harness onPick={onPick} />);

    const input = screen.getByRole('combobox', { name: 'Folder' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: ' /projects//aurelia/ ' } });

    const create = await screen.findByRole('option', { name: 'Create “projects/aurelia”' });
    await userEvent.click(create);

    expect(onPick).toHaveBeenLastCalledWith('projects/aurelia');
    expect(input).toHaveValue('projects/aurelia');
    expect(
      screen.getByText(/Cloudinary stores it under sna\/projects\/aurelia/)
    ).toBeInTheDocument();
  });

  it('picks a folder that exists instead of creating it, from the keyboard', () => {
    const onPick = jest.fn();
    rtlRender(<Harness onPick={onPick} />);

    const input = screen.getByRole('combobox', { name: 'Folder' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'pages' } });

    // The name is taken: no "Create", the folder itself with its count.
    expect(screen.queryByRole('option', { name: /Create/ })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: /pages\s*19 files/ })).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute('aria-activedescendant');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onPick).toHaveBeenLastCalledWith('pages');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

describe('the folder rail', () => {
  it('lists every folder with its count, the files in none, and the whole library', async () => {
    render();

    const list = within(await screen.findByRole('region', { name: 'Folders' }));
    expect(await list.findByRole('button', { name: /campaigns\s*2/ })).toBeInTheDocument();
    expect(list.getByRole('button', { name: /pages\s*19/ })).toBeInTheDocument();
    expect(list.getByRole('button', { name: /No folder\s*3/ })).toBeInTheDocument();
    // 2 + 19 + 3.
    expect(list.getByRole('button', { name: /All files\s*24/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('filters on a folder, and on the files in no folder', async () => {
    render();

    await userEvent.click(await within(rail()).findByRole('button', { name: /pages\s*19/ }));
    await waitFor(() => expect(lastListCall()).toMatchObject({ folder: 'pages' }));

    await userEvent.click(within(rail()).getByRole('button', { name: /No folder/ }));
    await waitFor(() => expect(lastListCall()).toMatchObject({ unfiled: true }));
    expect(lastListCall().folder).toBeUndefined();
  });

  it('asks for the files nothing uses', async () => {
    render();

    await userEvent.click(await screen.findByRole('checkbox', { name: /Only files nothing uses/ }));
    await waitFor(() => expect(lastListCall()).toMatchObject({ usage: 'unused' }));
  });

  it('makes a folder before any upload, and offers it to the address form', async () => {
    mediaService.list.mockImplementation((params) =>
      Promise.resolve(
        params.folder === 'campaigns/diwali' ? envelope([]) : envelope([file(1), file(2)])
      )
    );
    render();

    await userEvent.click(await within(rail()).findByRole('button', { name: 'New folder' }));
    const dialog = await screen.findByRole('dialog', { name: 'New folder' });
    await userEvent.type(within(dialog).getByLabelText(/Folder name/), 'campaigns/diwali');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create and add a file' }));

    // Uploads are off, so the address form opens with the folder chosen…
    const address = await screen.findByRole('dialog', { name: 'Add a file by address' });
    expect(within(address).getByRole('combobox', { name: 'Folder' })).toHaveValue(
      'campaigns/diwali'
    );
    await waitFor(() => expect(lastListCall()).toMatchObject({ folder: 'campaigns/diwali' }));

    // …and the rail shows it, empty, until a file lands in it.
    await userEvent.click(within(address).getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Add a file by address' })
      ).not.toBeInTheDocument()
    );
    expect(
      within(rail()).getByRole('button', { name: /campaigns\/diwali\s*Empty/ })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('“campaigns/diwali” is ready for its first file')).toBeInTheDocument();
  });
});

describe('select mode', () => {
  it('moves the selected files with the ids and the folder', async () => {
    mediaService.move.mockResolvedValue({ data: { affected: 2, missing: [] } });
    render();

    await startSelecting();
    await userEvent.click(screen.getByRole('button', { name: /^Photograph 1/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Photograph two/ }));

    const bar = screen.getByRole('region', { name: /bulk actions/i });
    expect(within(bar).getByText('2 selected')).toBeInTheDocument();
    await userEvent.click(within(bar).getByRole('button', { name: 'Move to folder' }));

    const dialog = await screen.findByRole('dialog', { name: 'Move 2 files' });
    const field = within(dialog).getByRole('combobox', { name: 'Move to' });
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: 'pages' } });
    await userEvent.click(within(dialog).getByRole('option', { name: /pages/ }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Move' }));

    await waitFor(() => expect(mediaService.move).toHaveBeenCalledWith([1, 2], 'pages'));
    expect(await screen.findByText('Moved 2 files to “pages”.')).toBeInTheDocument();
  });

  it('selects a run with Shift, and leaves select mode on Escape', async () => {
    mediaService.list.mockResolvedValue(envelope([file(1), file(2), file(3), file(4)]));
    render();

    await startSelecting();
    await userEvent.click(screen.getByRole('button', { name: /^Photograph 1/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Photograph 3/ }), {
      shiftKey: true,
    });

    const bar = screen.getByRole('region', { name: /bulk actions/i });
    expect(within(bar).getByText('3 selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Photograph 2/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    fireEvent.keyDown(document.body, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: /bulk actions/i })).not.toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: 'Select' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('lists every file still in use when a removal is refused, and removes nothing', async () => {
    mediaService.bulk.mockRejectedValue(
      new ApiError({
        status: 409,
        message: '2 of the selected files are still in use, so none was removed.',
        data: {
          refused: [
            {
              id: 1,
              label: 'Photograph 1',
              reason: 'Used by 1 property',
              usedBy: [{ type: 'property', id: 7, title: 'Lakeview Heights' }],
            },
            {
              id: 2,
              label: 'Photograph two',
              reason: 'Used by the SEO settings',
              usedBy: [{ type: 'seoSettings', id: 0, title: 'SEO settings' }],
            },
          ],
          usedIn: [],
        },
      })
    );
    render();

    await startSelecting();
    await userEvent.click(screen.getByRole('button', { name: /^Photograph 1/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Photograph two/ }));
    const bar = screen.getByRole('region', { name: /bulk actions/i });
    await userEvent.click(within(bar).getByRole('button', { name: 'Remove from library' }));
    const confirm = await screen.findByRole('dialog', { name: /Remove 2 files from the library/ });
    await userEvent.click(within(confirm).getByRole('button', { name: 'Remove from library' }));

    const refused = await screen.findByRole('dialog', { name: /nothing was removed/ });
    expect(within(refused).getByText('Lakeview Heights')).toBeInTheDocument();
    expect(within(refused).getByText('SEO settings', { selector: 'a' })).toBeInTheDocument();
    expect(mediaService.bulk).toHaveBeenCalledWith(
      { ids: [1, 2], action: 'delete' },
      { force: false }
    );
  });
});

describe('Manage folders', () => {
  it('renames a folder and reads the library again', async () => {
    mediaService.renameFolder.mockResolvedValue({
      data: { from: 'campaigns', to: 'marketing', moved: 2, merged: false },
      message: 'Moved 2 files from “campaigns” to “marketing”.',
    });
    render();

    await within(rail()).findByRole('button', { name: /campaigns\s*2/ });
    await userEvent.click(within(rail()).getByRole('button', { name: 'Manage' }));
    const dialog = await screen.findByRole('dialog', { name: 'Manage folders' });
    expect(
      within(dialog).getByText(/Cloudinary keeps it under the path it was uploaded to/)
    ).toBeInTheDocument();

    const calls = mediaService.list.mock.calls.length;
    await userEvent.click(within(dialog).getByRole('button', { name: 'Rename campaigns' }));
    const field = within(dialog).getByLabelText(/New name for “campaigns”/);
    await userEvent.clear(field);
    await userEvent.type(field, 'marketing');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Rename' }));

    await waitFor(() =>
      expect(mediaService.renameFolder).toHaveBeenCalledWith({
        from: 'campaigns',
        to: 'marketing',
        merge: false,
      })
    );
    expect(
      await screen.findByText('Moved 2 files from “campaigns” to “marketing”.')
    ).toBeInTheDocument();
    await waitFor(() => expect(mediaService.list.mock.calls.length).toBeGreaterThan(calls));
  });

  it('offers to merge into a folder that already exists', async () => {
    mediaService.renameFolder
      .mockRejectedValueOnce(
        new ApiError({
          status: 422,
          message: 'The given data was invalid.',
          errors: {
            to: ['“pages” already holds 19 files — merge into it, or choose another name.'],
          },
          data: { existing: { name: 'pages', count: 19 } },
        })
      )
      .mockResolvedValueOnce({
        data: { from: 'campaigns', to: 'pages', moved: 2, merged: true },
        message: 'Merged 2 files from “campaigns” into “pages”.',
      });
    render();

    await within(rail()).findByRole('button', { name: /campaigns\s*2/ });
    await userEvent.click(within(rail()).getByRole('button', { name: 'Manage' }));
    const dialog = await screen.findByRole('dialog', { name: 'Manage folders' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Rename campaigns' }));
    const field = within(dialog).getByLabelText(/New name for “campaigns”/);
    await userEvent.clear(field);
    await userEvent.type(field, 'pages');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Rename' }));

    await userEvent.click(
      await within(dialog).findByRole('button', { name: 'Merge into “pages”' })
    );
    await waitFor(() =>
      expect(mediaService.renameFolder).toHaveBeenLastCalledWith({
        from: 'campaigns',
        to: 'pages',
        merge: true,
      })
    );
    expect(
      await screen.findByText('Merged 2 files from “campaigns” into “pages”.')
    ).toBeInTheDocument();
  });
});
