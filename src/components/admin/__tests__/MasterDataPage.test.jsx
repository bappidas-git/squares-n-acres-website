import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ApiError from '../../../services/apiError';
import MasterDataPage from '../MasterDataPage';
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
});
