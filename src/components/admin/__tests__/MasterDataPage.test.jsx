import { screen, waitFor, waitForElementToBeRemoved, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ApiError from '../../../services/apiError';
import MasterDataPage, { labelsOf } from '../MasterDataPage';
import ToastProvider from '../../common/ToastProvider';
import renderWith from '../../../test-utils';

const ROWS = [
  { id: 1, name: 'Whitefield', zone: 'east', isActive: true },
  { id: 2, name: 'Jayanagar', zone: 'south', isActive: false },
];

const envelope = (data) => ({
  data,
  meta: { page: 1, perPage: 20, total: data.length, totalPages: 1 },
});

/** A service with the shape `MasterDataPage` expects, every call a spy. */
const fakeService = (overrides = {}) => ({
  list: jest.fn().mockResolvedValue(envelope(ROWS)),
  create: jest.fn().mockResolvedValue({ data: { id: 3 } }),
  update: jest.fn().mockResolvedValue({ data: { id: 1 } }),
  patch: jest.fn().mockResolvedValue({ data: { id: 1 } }),
  remove: jest.fn().mockResolvedValue({ data: null, message: 'Deleted' }),
  bulk: jest.fn().mockResolvedValue({ data: { affected: 1 }, message: '1 record updated.' }),
  ...overrides,
});

const baseConfig = (service) => ({
  key: 'localities',
  title: 'Localities',
  singular: 'locality',
  service,
  defaultSort: { field: 'name', order: 'asc' },
  columns: [
    { key: 'name', label: 'Name', sortable: true, primary: true },
    { key: 'zone', label: 'Zone' },
  ],
  formFields: [
    { name: 'name', type: 'text', label: 'Name', required: true },
    { name: 'zone', type: 'text', label: 'Zone' },
  ],
  schema: { name: { type: 'string', required: true, min: 2 } },
});

const render = (config) =>
  renderWith(
    <ToastProvider>
      <MasterDataPage config={config} />
    </ToastProvider>
  );

const realRect = Element.prototype.getBoundingClientRect;
beforeAll(() => {
  Element.prototype.getBoundingClientRect = function boundingRect() {
    return { width: 120, height: 40, top: 0, left: 0, bottom: 40, right: 120, x: 0, y: 0 };
  };
});
afterAll(() => {
  Element.prototype.getBoundingClientRect = realRect;
});

describe('MasterDataPage', () => {
  it('renders the rows a service answers with', async () => {
    const service = fakeService();
    render(baseConfig(service));

    expect(await screen.findByText('Whitefield')).toBeInTheDocument();
    expect(screen.getByText('Jayanagar')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Localities/ })).toBeInTheDocument();
    expect(service.list).toHaveBeenCalled();
  });

  it('asks the API for the configured sort and page size', async () => {
    const service = fakeService();
    render(baseConfig(service));

    await screen.findByText('Whitefield');
    expect(service.list).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, perPage: 20, sort: 'name', order: 'asc' }),
      expect.anything()
    );
  });

  describe('field names in messages (QA-55)', () => {
    it('names a field by its label rather than its key', async () => {
      const service = fakeService({
        create: jest.fn().mockRejectedValue(
          new ApiError({
            status: 422,
            message: 'The given data was invalid.',
            errors: { 'socialLinks.linkedin': ['The socialLinks.linkedin must be a valid URL.'] },
          })
        ),
      });
      const config = baseConfig(service);
      render({
        ...config,
        formFields: [
          ...config.formFields,
          { name: 'socialLinks.linkedin', type: 'url', label: 'LinkedIn' },
        ],
      });
      await screen.findByText('Whitefield');

      await userEvent.click(screen.getByRole('button', { name: 'Add locality' }));
      const dialog = await screen.findByRole('dialog');
      await userEvent.type(within(dialog).getByLabelText(/^Name/), 'Koramangala');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Create locality' }));

      expect(
        await within(dialog).findByText('The LinkedIn address must be a valid URL.')
      ).toBeInTheDocument();
    });

    it('labels only the keys that are not words already', () => {
      expect(
        labelsOf([
          { name: 'name', label: 'Name' },
          { name: 'avatarUrl', type: 'image', label: 'Photograph' },
          { name: 'socialLinks.website', type: 'url', label: 'Website' },
          { name: 'socialLinks.linkedin', type: 'url', label: 'LinkedIn' },
        ])
      ).toEqual({
        avatarUrl: 'photograph',
        'socialLinks.website': 'website address',
        'socialLinks.linkedin': 'LinkedIn address',
      });
    });
  });

  describe('create', () => {
    it('submits the dialog through the service and reloads the list', async () => {
      const service = fakeService();
      render(baseConfig(service));
      await screen.findByText('Whitefield');

      await userEvent.click(screen.getByRole('button', { name: 'Add locality' }));

      const dialog = await screen.findByRole('dialog');
      await userEvent.type(within(dialog).getByLabelText(/Name/), 'Koramangala');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Create locality' }));

      await waitFor(() =>
        expect(service.create).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'Koramangala' })
        )
      );
      await waitFor(() => expect(service.list).toHaveBeenCalledTimes(2));
    });

    it('refuses to submit a record the schema rejects', async () => {
      const service = fakeService();
      render(baseConfig(service));
      await screen.findByText('Whitefield');

      await userEvent.click(screen.getByRole('button', { name: 'Add locality' }));
      const dialog = await screen.findByRole('dialog');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Create locality' }));

      expect(await within(dialog).findByText('The name field is required.')).toBeInTheDocument();
      expect(service.create).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('confirms first, then calls the service', async () => {
      const service = fakeService();
      render(baseConfig(service));
      await screen.findByText('Whitefield');

      await userEvent.click(screen.getByRole('button', { name: 'Delete Whitefield' }));

      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByText(/“Whitefield” will be removed/)).toBeInTheDocument();
      expect(service.remove).not.toHaveBeenCalled();

      await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
      await waitFor(() => expect(service.remove).toHaveBeenCalledWith(1));
    });

    it('shows the usage guard when the API answers 409', async () => {
      const service = fakeService({
        remove: jest.fn().mockRejectedValue(
          new ApiError({
            status: 409,
            message: 'This item is in use.',
            errors: { id: ['Used by 1 property'] },
            data: { usedBy: [{ type: 'property', id: 12, title: 'Lakeview Heights' }] },
          })
        ),
      });
      render(baseConfig(service));
      await screen.findByText('Whitefield');

      await userEvent.click(screen.getByRole('button', { name: 'Delete Whitefield' }));
      await userEvent.click(
        within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' })
      );

      const guard = await screen.findByRole('dialog', { name: 'Still in use' });
      expect(within(guard).getByText('This item is in use.')).toBeInTheDocument();
      expect(within(guard).getByRole('link', { name: /Lakeview Heights/ })).toHaveAttribute(
        'href',
        '/admin/properties/edit/12'
      );
    });
  });

  describe('the active toggle', () => {
    it('patches the record it belongs to', async () => {
      const service = fakeService();
      render(baseConfig(service));
      await screen.findByText('Whitefield');

      await userEvent.click(screen.getByRole('switch', { name: 'Whitefield is active' }));

      await waitFor(() => expect(service.patch).toHaveBeenCalledWith(1, { isActive: false }));
    });

    it('puts the old value back when the API refuses', async () => {
      const service = fakeService({
        patch: jest.fn().mockRejectedValue(
          new ApiError({
            status: 422,
            message: 'The given data was invalid.',
            errors: { id: ['You cannot deactivate your own account.'] },
          })
        ),
      });
      render(baseConfig(service));
      await screen.findByText('Whitefield');

      const toggle = screen.getByRole('switch', { name: 'Whitefield is active' });
      expect(toggle).toBeChecked();

      await userEvent.click(toggle);

      // The server's sentence, not Laravel's generic one.
      expect(
        await screen.findByText('You cannot deactivate your own account.')
      ).toBeInTheDocument();
      await waitFor(() =>
        expect(screen.getByRole('switch', { name: 'Whitefield is active' })).toBeChecked()
      );
    });
  });

  it('applies a bulk action to the selected ids', async () => {
    const service = fakeService();
    render({
      ...baseConfig(service),
      bulkActions: [{ key: 'activate', label: 'Activate' }],
    });
    await screen.findByText('Whitefield');

    await userEvent.click(screen.getByRole('checkbox', { name: 'Select row 2' }));
    await userEvent.click(screen.getByRole('button', { name: 'Activate' }));

    await waitFor(() =>
      expect(service.bulk).toHaveBeenCalledWith({ ids: [2], action: 'activate' })
    );
  });

  it('offers to reset the filters when a filtered list comes back empty', async () => {
    const service = fakeService({ list: jest.fn().mockResolvedValue(envelope([])) });
    render({
      ...baseConfig(service),
      filters: [{ key: 'q', type: 'search', label: 'Search' }],
    });

    await waitFor(() => expect(service.list).toHaveBeenCalled());
    expect(await screen.findByText('No localities yet')).toBeInTheDocument();
  });

  /**
   * `editing` is cleared the moment the dialog is asked to close, and the
   * dialog then takes its exit transition to leave. MUI keeps it in the
   * document until it has faded out, which is where these assertions run: a
   * dialog drawn from `editing` read "New locality" there, with no fields and a
   * "Create locality" button.
   */
  describe('the dialog as it closes', () => {
    /** Opens a row's dialog and waits for its form to be filled in. */
    const openEdit = async (name) => {
      await userEvent.click(screen.getByRole('button', { name: `Edit ${name}` }));
      const dialog = await screen.findByRole('dialog', { name: 'Edit locality' });
      await waitFor(() => expect(within(dialog).getByLabelText(/Name/)).toHaveValue(name));
      return dialog;
    };

    it('still reads "Edit …", with its fields, while it fades out after Cancel', async () => {
      render(baseConfig(fakeService()));
      await screen.findByText('Whitefield');

      const dialog = await openEdit('Whitefield');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

      expect(within(dialog).getByRole('heading', { name: 'Edit locality' })).toBeInTheDocument();
      expect(within(dialog).queryByText('New locality')).toBeNull();
      expect(within(dialog).getByLabelText(/Name/)).toHaveValue('Whitefield');
      expect(within(dialog).getByRole('button', { name: 'Save changes' })).toBeInTheDocument();

      await waitForElementToBeRemoved(dialog);
    });

    it('still reads "Edit …" after Save changes, and a click that lands then creates nothing', async () => {
      const service = fakeService();
      render(baseConfig(service));
      await screen.findByText('Whitefield');

      const dialog = await openEdit('Whitefield');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
      // The toast is raised in the same moment the dialog is closed.
      await screen.findByText('Locality saved');

      expect(within(dialog).getByRole('heading', { name: 'Edit locality' })).toBeInTheDocument();
      expect(within(dialog).queryByText('New locality')).toBeNull();
      expect(within(dialog).getByLabelText(/Name/)).toHaveValue('Whitefield');

      // The button is still under the pointer. With `editing` gone, a submit
      // would have created a copy of the record just saved.
      await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
      expect(service.update).toHaveBeenCalledTimes(1);
      expect(service.create).not.toHaveBeenCalled();

      await waitForElementToBeRemoved(dialog);
    });

    it('opens a clean create form after an edit, and the right record after an add', async () => {
      render(baseConfig(fakeService()));
      await screen.findByText('Whitefield');

      const edit = await openEdit('Whitefield');
      await userEvent.click(within(edit).getByRole('button', { name: 'Cancel' }));
      await waitForElementToBeRemoved(edit);

      await userEvent.click(screen.getByRole('button', { name: 'Add locality' }));
      const add = await screen.findByRole('dialog', { name: 'New locality' });
      await waitFor(() => expect(within(add).getByLabelText(/Name/)).toHaveValue(''));

      await userEvent.click(within(add).getByRole('button', { name: 'Cancel' }));
      // A create form fades out as one too, not as an empty box.
      expect(within(add).getByLabelText(/Name/)).toBeInTheDocument();
      expect(within(add).getByRole('button', { name: 'Create locality' })).toBeInTheDocument();
      await waitForElementToBeRemoved(add);

      // `openEdit` waits for the form to read "Jayanagar".
      await openEdit('Jayanagar');
    });

    it('keeps the delete confirmation’s sentence while it fades out, and a second "Delete" deletes nothing', async () => {
      const service = fakeService();
      render(baseConfig(service));
      await screen.findByText('Whitefield');

      await userEvent.click(screen.getByRole('button', { name: 'Delete Whitefield' }));
      const dialog = await screen.findByRole('dialog', { name: 'Delete locality?' });
      await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
      // The toast is raised in the same moment the dialog is closed.
      await screen.findByText('“Whitefield” deleted');

      expect(within(dialog).getByText(/“Whitefield” will be removed/)).toBeInTheDocument();

      await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
      expect(service.remove).toHaveBeenCalledTimes(1);

      await waitForElementToBeRemoved(dialog);
    });

    it('keeps the usage guard’s message and list while it fades out', async () => {
      const service = fakeService({
        remove: jest.fn().mockRejectedValue(
          new ApiError({
            status: 409,
            message: 'This item is in use.',
            data: { usedBy: [{ type: 'property', id: 12, title: 'Lakeview Heights' }] },
          })
        ),
      });
      render(baseConfig(service));
      await screen.findByText('Whitefield');

      await userEvent.click(screen.getByRole('button', { name: 'Delete Whitefield' }));
      await userEvent.click(
        within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' })
      );
      const guard = await screen.findByRole('dialog', { name: 'Still in use' });
      await userEvent.click(within(guard).getByRole('button', { name: 'Got it' }));

      // Drawn from nothing, it read "“undefined” cannot be deleted" over an
      // empty list.
      expect(within(guard).getByText('This item is in use.')).toBeInTheDocument();
      expect(within(guard).getByRole('link', { name: /Lakeview Heights/ })).toBeInTheDocument();
      expect(within(guard).queryByText(/undefined/)).toBeNull();

      await waitForElementToBeRemoved(guard);
    });

    it('keeps a save warning whole while Cancel fades it out, and its button then saves nothing', async () => {
      const service = fakeService();
      render({
        ...baseConfig(service),
        confirmSave: async () => ({
          heading: 'Change the zone?',
          title: 'Whitefield',
          confirmLabel: 'Change zone',
          message: '“Whitefield” moves from East to South.',
          usedBy: [{ type: 'property', id: 12, title: 'Lakeview Heights' }],
          hint: '',
        }),
      });
      await screen.findByText('Whitefield');

      const dialog = await openEdit('Whitefield');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
      const warning = await screen.findByRole('dialog', { name: 'Change the zone?' });
      await userEvent.click(within(warning).getByRole('button', { name: 'Cancel' }));

      expect(
        within(warning).getByRole('heading', { name: 'Change the zone?' })
      ).toBeInTheDocument();
      expect(
        within(warning).getByText('“Whitefield” moves from East to South.')
      ).toBeInTheDocument();
      expect(within(warning).getByRole('link', { name: /Lakeview Heights/ })).toBeInTheDocument();

      // The form behind it is still open, so a click that lands on "Change
      // zone" now would save the change that was just declined.
      await userEvent.click(within(warning).getByRole('button', { name: 'Change zone' }));
      await waitForElementToBeRemoved(warning);
      expect(service.update).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog', { name: 'Edit locality' })).toBeInTheDocument();
    });

    it('keeps the edits when "Discard changes" is clicked as "Keep editing" fades the question out', async () => {
      const service = fakeService();
      render(baseConfig(service));
      await screen.findByText('Whitefield');

      const dialog = await openEdit('Whitefield');
      await userEvent.type(within(dialog).getByLabelText(/Name/), ' East');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
      const discard = await screen.findByRole('dialog', { name: 'Discard unsaved changes?' });
      await userEvent.click(within(discard).getByRole('button', { name: 'Keep editing' }));
      await userEvent.click(within(discard).getByRole('button', { name: 'Discard changes' }));
      await waitForElementToBeRemoved(discard);

      // Still open, still holding the edit: saving it sends it.
      expect(within(dialog).getByLabelText(/Name/)).toHaveValue('Whitefield East');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
      await waitFor(() =>
        expect(service.update).toHaveBeenCalledWith(
          1,
          expect.objectContaining({ name: 'Whitefield East' })
        )
      );
    });
  });
});
