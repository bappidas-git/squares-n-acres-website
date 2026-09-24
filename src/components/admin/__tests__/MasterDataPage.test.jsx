import {
  act,
  fireEvent,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ApiError from '../../../services/apiError';
import MasterDataPage, { labelsOf, rangeErrors, sanitiseParams, trimText } from '../MasterDataPage';
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

const render = (config, { initialEntries } = {}) =>
  renderWith(
    <ToastProvider>
      <MasterDataPage config={config} />
    </ToastProvider>,
    { initialEntries }
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

    it('takes the name a field gives itself for a sentence (QA-60)', () => {
      expect(
        labelsOf([
          {
            name: 'interestRateMin',
            label: 'Interest rate from (% p.a.)',
            messageLabel: 'lowest interest rate',
          },
          { name: 'maxTenureYears', label: 'Maximum tenure (years)' },
        ])
      ).toEqual({
        interestRateMin: 'lowest interest rate',
        maxTenureYears: 'maximum tenure (years)',
      });
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
      // It names the record: "This item is in use." named nothing (QA-59).
      expect(within(guard).getByText('“Whitefield” is still used by:')).toBeInTheDocument();
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

    // Named for the record, not "Select row 2" (QA-59).
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select Jayanagar' }));
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
      await userEvent.type(within(dialog).getByLabelText(/Name/), ' East');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
      // The toast is raised in the same moment the dialog is closed.
      await screen.findByText('Locality saved');

      expect(within(dialog).getByRole('heading', { name: 'Edit locality' })).toBeInTheDocument();
      expect(within(dialog).queryByText('New locality')).toBeNull();
      expect(within(dialog).getByLabelText(/Name/)).toHaveValue('Whitefield East');

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
      expect(within(guard).getByText('“Whitefield” is still used by:')).toBeInTheDocument();
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

  it('saves nothing, and says so, when nothing was changed (QA-59)', async () => {
    const service = fakeService();
    render(baseConfig(service));
    await screen.findByText('Whitefield');

    await userEvent.click(screen.getByRole('button', { name: 'Edit Whitefield' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit locality' });
    await waitFor(() => expect(within(dialog).getByLabelText(/Name/)).toHaveValue('Whitefield'));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('No changes to save.')).toBeInTheDocument();
    expect(service.update).not.toHaveBeenCalled();
    await waitForElementToBeRemoved(dialog);
  });

  it('saves the dialog with Ctrl+S (QA-59)', async () => {
    const service = fakeService();
    render(baseConfig(service));
    await screen.findByText('Whitefield');

    await userEvent.click(screen.getByRole('button', { name: 'Add locality' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/Name/), 'Koramangala');
    fireEvent.keyDown(within(dialog).getByLabelText(/Name/), { key: 's', ctrlKey: true });

    await waitFor(() =>
      expect(service.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Koramangala' }))
    );
  });

  it('names each record a refused bulk delete is refused over (QA-59)', async () => {
    const service = fakeService({
      bulk: jest.fn().mockRejectedValue(
        new ApiError({
          status: 409,
          message: '1 of the selected localities is still in use, so none was deleted.',
          data: {
            usedBy: [{ type: 'property', id: 12, title: 'Lakeview Heights' }],
            refused: [
              {
                id: 2,
                label: 'Jayanagar',
                reason: 'Used by 1 property',
                usedBy: [{ type: 'property', id: 12, title: 'Lakeview Heights' }],
              },
            ],
          },
        })
      ),
    });
    render({
      ...baseConfig(service),
      bulkActions: [{ key: 'delete', label: 'Delete', danger: true }],
    });
    await screen.findByText('Whitefield');

    await userEvent.click(screen.getByRole('checkbox', { name: 'Select Whitefield' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select Jayanagar' }));
    await userEvent.click(screen.getByRole('button', { name: /^Delete$/ }));

    const guard = await screen.findByRole('dialog', { name: 'Still in use' });
    expect(
      within(guard).getByText('1 of the selected localities is still in use, so none was deleted.')
    ).toBeInTheDocument();
    expect(within(guard).getByText('“Jayanagar”')).toBeInTheDocument();
    expect(within(guard).getByRole('link', { name: /Lakeview Heights/ })).toBeInTheDocument();
    // The selection stays, so the one in the way can be unticked.
    expect(screen.getByRole('checkbox', { name: 'Select Whitefield', hidden: true })).toBeChecked();
  });

  it('says the page is past the end, not that the list is empty (QA-59)', async () => {
    const service = fakeService({
      list: jest.fn().mockResolvedValue({
        data: [],
        meta: { page: 9, perPage: 20, total: 2, totalPages: 1 },
      }),
    });
    render(baseConfig(service), { initialEntries: ['/?page=9'] });

    expect(await screen.findByText('Nothing on this page')).toBeInTheDocument();
    expect(screen.queryByText('No localities yet')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Go to first page' }));
    await waitFor(() =>
      expect(service.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1 }),
        expect.anything()
      )
    );
  });

  it('steps back a page when a delete empties the one on screen (QA-59)', async () => {
    const service = fakeService({
      list: jest.fn().mockResolvedValue({
        data: [ROWS[1]],
        meta: { page: 2, perPage: 20, total: 21, totalPages: 2 },
      }),
    });
    render(baseConfig(service), { initialEntries: ['/?page=2'] });
    await screen.findByText('Jayanagar');

    await userEvent.click(screen.getByRole('button', { name: 'Delete Jayanagar' }));
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' })
    );

    await waitFor(() =>
      expect(service.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1 }),
        expect.anything()
      )
    );
  });

  it('re-reads the list after a switch, so a filtered row can leave it (QA-59)', async () => {
    const service = fakeService();
    render(baseConfig(service));
    await screen.findByText('Whitefield');
    expect(service.list).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('switch', { name: 'Whitefield is active' }));

    await waitFor(() => expect(service.patch).toHaveBeenCalledWith(1, { isActive: false }));
    await waitFor(() => expect(service.list).toHaveBeenCalledTimes(2));
  });

  describe('parameters no control can show (QA-59)', () => {
    const filters = [
      { key: 'zone', type: 'select', label: 'Zone', options: [{ value: 'east', label: 'East' }] },
      { key: 'isFeatured', type: 'toggle', label: 'Featured' },
    ];

    it('are left out of the request and the chips', async () => {
      const service = fakeService();
      render(
        { ...baseConfig(service), filters },
        { initialEntries: ['/?zone=bogus&isFeatured=maybe&sort=nonsense&order=sideways'] }
      );
      await screen.findByText('Whitefield');

      const [params] = service.list.mock.calls[0];
      expect(params.zone).toBeUndefined();
      expect(params.isFeatured).toBeUndefined();
      expect(params).toEqual(expect.objectContaining({ sort: 'name', order: 'asc' }));
      expect(screen.queryByText(/Zone: bogus/)).toBeNull();
      expect(screen.queryByText(/Featured: No/)).toBeNull();
    });

    it('keep the values an option names', () => {
      const defaults = { sort: 'name', order: 'asc' };
      expect(
        sanitiseParams(
          { zone: 'east', isFeatured: 'false', sort: 'name', order: 'desc' },
          { filters, sortKeys: ['name'], defaults }
        )
      ).toEqual({ zone: 'east', isFeatured: 'false', sort: 'name', order: 'desc' });
    });
  });

  describe('the drag list (QA-59)', () => {
    const ORDERED = [
      { id: 1, name: 'First', order: 1, isActive: true },
      { id: 2, name: 'Second', order: 2, isActive: false },
      { id: 3, name: 'Third', order: 3, isActive: true },
    ];

    const orderedService = (overrides = {}) =>
      fakeService({ list: jest.fn().mockResolvedValue(envelope(ORDERED)), ...overrides });

    const orderedConfig = (service) => ({
      ...baseConfig(service),
      defaultSort: { field: 'order', order: 'asc' },
      orderable: true,
      columns: [
        { key: 'order', label: 'Order', sortable: true },
        { key: 'name', label: 'Name', sortable: true, primary: true },
      ],
    });

    const row = (name) => screen.getByRole('listitem', { name: new RegExp(`^${name},`) });
    const shownOrder = () =>
      screen
        .getAllByRole('listitem')
        .map((item) => item.getAttribute('aria-label')?.split(',')[0])
        .filter(Boolean);

    it('moves a row at once, and names the row it was dropped next to', async () => {
      const service = orderedService();
      render(orderedConfig(service));
      await screen.findByRole('listitem', { name: /^First,/ });

      fireEvent.keyDown(row('First'), { key: 'ArrowDown', altKey: true });

      // Before the API has answered: it snapped back and jumped, and the
      // focus that followed it landed on the neighbour.
      expect(shownOrder()).toEqual(['Second', 'First', 'Third']);
      await waitFor(() => expect(row('First')).toHaveFocus());
      await waitFor(() => expect(service.patch).toHaveBeenCalledWith(1, { order: 3, after: 2 }));
      await waitFor(() => expect(service.list).toHaveBeenCalledTimes(2));
    });

    it('writes quick moves one at a time, each placed by the row it landed next to', async () => {
      let answerFirst;
      const patch = jest
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              answerFirst = () => resolve({ data: { id: 1 } });
            })
        )
        .mockResolvedValue({ data: { id: 1 } });
      const service = orderedService({ patch });
      render(orderedConfig(service));
      await screen.findByRole('listitem', { name: /^First,/ });

      fireEvent.keyDown(row('First'), { key: 'ArrowDown', altKey: true });
      fireEvent.keyDown(row('First'), { key: 'ArrowDown', altKey: true });

      expect(shownOrder()).toEqual(['Second', 'Third', 'First']);
      await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
      expect(patch).toHaveBeenLastCalledWith(1, { order: 3, after: 2 });

      // The second waits for the first, and names where it was dropped.
      await act(async () => answerFirst());
      await waitFor(() => expect(patch).toHaveBeenCalledTimes(2));
      expect(patch).toHaveBeenLastCalledWith(1, { order: 4, after: 3 });
      await waitFor(() => expect(service.list).toHaveBeenCalledTimes(2));
    });

    it('puts the order back when a move is refused', async () => {
      const service = orderedService({
        patch: jest.fn().mockRejectedValue(new ApiError({ status: 500, message: 'Down.' })),
      });
      render(orderedConfig(service));
      await screen.findByRole('listitem', { name: /^First,/ });

      fireEvent.keyDown(row('First'), { key: 'ArrowDown', altKey: true });

      expect(await screen.findByText('Down.')).toBeInTheDocument();
      await waitFor(() => expect(shownOrder()).toEqual(['First', 'Second', 'Third']));
    });

    it('keeps the focus on an arrow pressed from the keyboard', async () => {
      render(orderedConfig(orderedService()));
      await screen.findByRole('listitem', { name: /^First,/ });

      await userEvent.click(screen.getByRole('button', { name: 'Move First down' }));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Move First down' })).toHaveFocus()
      );
    });

    it('offers each row’s actions, and says which are not live', async () => {
      render(orderedConfig(orderedService()));
      await screen.findByRole('listitem', { name: /^First,/ });

      expect(
        within(row('Second')).getByRole('button', { name: 'Edit Second' })
      ).toBeInTheDocument();
      expect(
        within(row('Second')).getByRole('button', { name: 'Delete Second' })
      ).toBeInTheDocument();
      expect(within(row('Second')).getByText('Inactive')).toBeInTheDocument();
      expect(within(row('First')).queryByText('Inactive')).toBeNull();

      await userEvent.click(within(row('First')).getByRole('button', { name: 'Edit First' }));
      expect(await screen.findByRole('dialog', { name: 'Edit locality' })).toBeInTheDocument();
    });

    it('keeps the pages of a list longer than one', async () => {
      const service = orderedService({
        list: jest.fn().mockResolvedValue({
          data: ORDERED,
          meta: { page: 1, perPage: 3, total: 5, totalPages: 2 },
        }),
      });
      render(orderedConfig(service));
      await screen.findByRole('listitem', { name: /^First,/ });

      expect(screen.getByText('Showing 1–3 of 5')).toBeInTheDocument();
      expect(screen.getByLabelText('Rows per page')).toBeInTheDocument();
    });

    it('is a table, with a way back, when the list is upside down or sorted otherwise', async () => {
      const service = orderedService();
      render(orderedConfig(service), { initialEntries: ['/?order=desc'] });
      await screen.findByRole('table');
      expect(screen.queryByRole('listitem', { name: /^First,/ })).toBeNull();

      await userEvent.click(screen.getByRole('button', { name: 'Reorder' }));
      expect(await screen.findByRole('listitem', { name: /^First,/ })).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Table view' }));
      expect(await screen.findByRole('table')).toBeInTheDocument();
    });
  });
});

describe('MasterDataPage — QA-60', () => {
  // The dialog hands its form the new record's values from an effect, which
  // jsdom runs a little after the dialog appears; a person does not type into
  // it within that tick, and neither do these tests.
  const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)));

  const withOrder = (service, extra = {}) => ({
    ...baseConfig(service),
    formFields: [
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'order', type: 'number', label: 'Order', min: 0 },
    ],
    newValues: { order: 0 },
    appendNew: true,
    ...extra,
  });

  it('proposes the end of the list for a new record, not the top', async () => {
    const service = fakeService();
    render(withOrder(service));
    await screen.findByText('Whitefield');

    await userEvent.click(screen.getByRole('button', { name: 'Add locality' }));
    const dialog = await screen.findByRole('dialog');
    // Two records on an unfiltered list: the new one is third. The box read
    // 0, which the API reads as "first".
    await waitFor(() => expect(within(dialog).getByLabelText('Order')).toHaveValue(3));

    await userEvent.type(within(dialog).getByLabelText(/Name/), 'Hebbal');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create locality' }));
    await waitFor(() =>
      expect(service.create).toHaveBeenCalledWith(expect.objectContaining({ order: 3 }))
    );
  });

  it('keeps the form’s default on a screen that does not append (FAQs, QA-59)', async () => {
    const service = fakeService();
    render(withOrder(service, { appendNew: false }));
    await screen.findByText('Whitefield');

    await userEvent.click(screen.getByRole('button', { name: 'Add locality' }));
    const dialog = await screen.findByRole('dialog');
    await settle();
    expect(within(dialog).getByLabelText('Order')).toHaveValue(0);
  });

  it('asks for the size of the collection when the list on screen is filtered', async () => {
    const list = jest.fn((params) =>
      Promise.resolve(
        params?.perPage === 1
          ? { data: [ROWS[0]], meta: { page: 1, perPage: 1, total: 7, totalPages: 7 } }
          : envelope(ROWS.slice(0, 1))
      )
    );
    const service = fakeService({ list });
    render(
      withOrder(service, {
        filters: [{ key: 'q', type: 'search', label: 'Search', placeholder: 'Name' }],
      }),
      { initialEntries: ['/?q=white'] }
    );
    await screen.findByText('Whitefield');

    await userEvent.click(screen.getByRole('button', { name: 'Add locality' }));
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(within(dialog).getByLabelText('Order')).toHaveValue(8));
    expect(list).toHaveBeenCalledWith({ perPage: 1 });
  });

  it('brings the first field in error into view when a save is refused', async () => {
    const service = fakeService();
    render({
      ...baseConfig(service),
      formFields: [
        { name: 'name', type: 'text', label: 'Name' },
        { name: 'zone', type: 'text', label: 'Zone', required: true },
      ],
      schema: { zone: { type: 'string', required: true } },
    });
    await screen.findByText('Whitefield');

    await userEvent.click(screen.getByRole('button', { name: 'Add locality' }));
    const dialog = await screen.findByRole('dialog');
    await settle();
    await userEvent.type(within(dialog).getByLabelText('Name'), 'Hebbal');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create locality' }));

    expect(await within(dialog).findByText('The zone field is required.')).toBeInTheDocument();
    await waitFor(() => expect(within(dialog).getByLabelText(/Zone/)).toHaveFocus());
    expect(service.create).not.toHaveBeenCalled();
  });

  it('hands what runs after a save the record, not the envelope it came in', async () => {
    const afterSave = jest.fn();
    const service = fakeService({
      update: jest.fn().mockResolvedValue({ data: { id: 1, name: 'Whitefield East', slug: 'x' } }),
    });
    render({ ...baseConfig(service), afterSave });
    await screen.findByText('Whitefield');

    await userEvent.click(screen.getByRole('button', { name: 'Edit Whitefield' }));
    const dialog = await screen.findByRole('dialog');
    await settle();
    await userEvent.clear(within(dialog).getByLabelText(/Name/));
    await userEvent.type(within(dialog).getByLabelText(/Name/), 'Whitefield East');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    // Handed the envelope, the SEO side effect found no slug on it and never
    // wrote the redirect a property type's panel asked for.
    await waitFor(() =>
      expect(afterSave).toHaveBeenCalledWith(
        { id: 1, name: 'Whitefield East', slug: 'x' },
        expect.objectContaining({ id: 1, name: 'Whitefield' }),
        expect.objectContaining({ toast: expect.any(Object) })
      )
    );
  });

  it('holds a number box to the bounds it declares', async () => {
    const service = fakeService();
    render({
      ...baseConfig(service),
      formFields: [
        { name: 'name', type: 'text', label: 'Name', required: true },
        { name: 'rate', type: 'number', label: 'Rate', min: 5, max: 20, step: 0.05 },
      ],
    });
    await screen.findByText('Whitefield');

    await userEvent.click(screen.getByRole('button', { name: 'Add locality' }));
    const dialog = await screen.findByRole('dialog');
    await settle();
    await userEvent.type(within(dialog).getByLabelText(/Name/), 'Garden City Bank');
    await userEvent.type(within(dialog).getByLabelText('Rate'), '25');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create locality' }));

    expect(await within(dialog).findByText('Use a value between 5 and 20.')).toBeInTheDocument();
    expect(service.create).not.toHaveBeenCalled();
  });

  it('suggests a free slug when the one sent is taken', async () => {
    const service = fakeService({
      create: jest.fn().mockRejectedValue(
        new ApiError({
          status: 409,
          message: 'The slug has already been taken.',
          errors: { slug: ['The slug has already been taken.'] },
        })
      ),
      checkSlug: jest
        .fn()
        .mockResolvedValue({ data: { available: false, suggestion: 'hebbal-2' } }),
    });
    render({
      ...baseConfig(service),
      formFields: [
        { name: 'name', type: 'text', label: 'Name', required: true },
        { name: 'slug', type: 'slug', label: 'Slug', source: 'name' },
      ],
      schema: undefined,
    });
    await screen.findByText('Whitefield');

    await userEvent.click(screen.getByRole('button', { name: 'Add locality' }));
    const dialog = await screen.findByRole('dialog');
    await settle();
    await userEvent.type(within(dialog).getByLabelText(/Name/), 'Hebbal');
    // The URL follows the name from an effect of its own.
    await waitFor(() => expect(within(dialog).getByDisplayValue('hebbal')).toBeInTheDocument());
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create locality' }));

    expect(
      await within(dialog).findByText('The slug has already been taken. Try “hebbal-2”.')
    ).toBeInTheDocument();
    // The dialog's slug hint says "name", which is what it follows.
    expect(service.checkSlug).toHaveBeenCalledWith('hebbal', { excludeId: null });
  });

  it('goes back to the screen’s own table from the drag list', async () => {
    const list = jest.fn().mockResolvedValue(
      envelope([
        { id: 1, name: 'First', zone: 'east', order: 1, isActive: true },
        { id: 2, name: 'Second', zone: 'west', order: 2, isActive: true },
      ])
    );
    const service = fakeService({ list });
    render(
      {
        ...baseConfig(service),
        orderable: true,
        defaultSort: { field: 'name', order: 'asc' },
        columns: [
          { key: 'order', label: 'Order', sortable: true },
          { key: 'zone', label: 'Zone', sortable: true },
          { key: 'name', label: 'Name', sortable: true, primary: true },
        ],
      },
      { initialEntries: ['/?sort=order'] }
    );
    await screen.findByRole('listitem', { name: /^First,/ });

    await userEvent.click(screen.getByRole('button', { name: 'Table view' }));
    await screen.findByRole('table');
    // The amenities' own table is grouped by category, its default; the
    // first sortable column after Order ("Zone" here) was a different one.
    expect(list).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: 'name', order: 'asc' }),
      expect.anything()
    );
  });

  it('moves a row of a list field twice from the keyboard, the focus following it', async () => {
    const service = fakeService();
    render({
      ...baseConfig(service),
      formFields: [
        { name: 'name', type: 'text', label: 'Name', required: true },
        { name: 'items', type: 'list', label: 'Items', defaultValue: [] },
      ],
    });
    await screen.findByText('Whitefield');

    await userEvent.click(screen.getByRole('button', { name: 'Add locality' }));
    const dialog = await screen.findByRole('dialog');
    await settle();
    for (const text of ['Alpha', 'Beta', 'Gamma']) {
      await userEvent.click(within(dialog).getByRole('button', { name: 'Add item' }));
      const boxes = within(dialog).getAllByLabelText(/^Items \d$/);
      fireEvent.change(boxes[boxes.length - 1], { target: { value: text } });
    }
    const values = () =>
      within(dialog)
        .getAllByLabelText(/^Items \d$/)
        .map((box) => box.value);
    expect(values()).toEqual(['Alpha', 'Beta', 'Gamma']);

    // Keyed by index, the moved row's key went to its neighbour: the focus
    // followed the neighbour, and the second Alt+↓ moved it back.
    fireEvent.keyDown(within(dialog).getByRole('listitem', { name: /^Alpha,/ }), {
      key: 'ArrowDown',
      altKey: true,
    });
    await waitFor(() =>
      expect(within(dialog).getByRole('listitem', { name: /^Alpha,/ })).toHaveFocus()
    );
    fireEvent.keyDown(within(dialog).getByRole('listitem', { name: /^Alpha,/ }), {
      key: 'ArrowDown',
      altKey: true,
    });
    await waitFor(() => expect(values()).toEqual(['Beta', 'Gamma', 'Alpha']));
  });

  describe('helpers', () => {
    it('trims the text boxes and leaves everything else as it is', () => {
      const fields = [
        { name: 'name', type: 'text' },
        { name: 'note', type: 'textarea' },
        { name: 'code' },
        { name: 'url', type: 'url' },
      ];
      const values = { name: '  Mysuru ', note: ' x ', code: ' y ', url: ' https://a.b ', n: 1 };
      expect(trimText(values, fields)).toEqual({
        name: 'Mysuru',
        note: 'x',
        code: 'y',
        url: ' https://a.b ',
        n: 1,
      });
      const clean = { name: 'Mysuru' };
      expect(trimText(clean, fields)).toBe(clean);
    });

    it('words a number box’s bounds', () => {
      const fields = [
        { name: 'rate', type: 'number', min: 5, max: 20 },
        { name: 'order', type: 'number', min: 0 },
        { name: 'cap', type: 'number', max: 0.5 },
        { name: 'free', type: 'number' },
      ];
      expect(rangeErrors({ rate: 25, order: -1, cap: 1, free: 99 }, fields)).toEqual({
        rate: 'Use a value between 5 and 20.',
        order: 'Use a value of 0 or more.',
        cap: 'Use a value of 0.5 or less.',
      });
      expect(rangeErrors({ rate: 8.4, order: null, cap: '' }, fields)).toEqual({});
    });
  });
});
