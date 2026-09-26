import { useMemo, useReducer } from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import BasicsTab from '../tabs/BasicsTab';
import masterDataService from '../../../../../services/masterDataService';
import propertyService from '../../../../../services/propertyService';
import renderWith from '../../../../../test-utils';
import { MasterDataProvider } from '../../../../../contexts/MasterDataContext';
import { PropertyFormProvider } from '../PropertyFormContext';
import { setKnownSegments } from '../../../../../config/segments';
import reducer, { actions, createFormState } from '../reducer';

/**
 * The Basics tab's segment, property type and badges, and the "Add a …"
 * dialogs that create each of them without leaving the listing (QA-52).
 *
 * The real `MasterDataProvider` runs over a service whose lists read an
 * in-memory store and whose creates write to it, so a `refresh` after a create
 * re-renders the tab with the new record exactly as it does in the app.
 */

/** The collections `MasterDataContext` loads, each a list and a create here. */
const COLLECTIONS = [
  'localities',
  'cities',
  'segments',
  'propertyTypes',
  'amenities',
  'badges',
  'developers',
  'banks',
];

jest.mock('../../../../../services/masterDataService', () => {
  const service = Object.fromEntries(
    [
      'localities',
      'cities',
      'segments',
      'propertyTypes',
      'amenities',
      'badges',
      'developers',
      'banks',
    ].map((name) => [name, { list: jest.fn(), create: jest.fn() }])
  );
  return { __esModule: true, default: service, ...service };
});

/**
 * CRA resets every mock before each test (`resetMocks`), so the store-backed
 * implementations are installed here rather than in the factory.
 */
function installStore(store) {
  for (const name of COLLECTIONS) {
    masterDataService[name].list.mockImplementation(() => Promise.resolve({ data: store[name] }));
    masterDataService[name].create.mockImplementation((body) => {
      const record = {
        id: 100 + store[name].length,
        slug: String(body.name)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-'),
        isActive: true,
        ...body,
      };
      store[name] = [...store[name], record];
      return Promise.resolve({ data: record });
    });
  }
}

jest.mock('../../../../../services/propertyService', () => ({
  __esModule: true,
  default: { checkSlug: jest.fn() },
}));

jest.mock('../../../../../contexts/AdminAuthContext', () => ({
  useAdminAuth: () => ({ can: () => global.__CAN__ !== false }),
}));

const seedStore = () => ({
  localities: [],
  cities: [],
  segments: [
    { id: 1, name: 'Residential', slug: 'residential', kind: 'residential', order: 1 },
    { id: 2, name: 'Commercial', slug: 'commercial', kind: 'commercial', order: 2 },
    { id: 3, name: 'Plots & Land', slug: 'land', kind: 'land', order: 3 },
    { id: 4, name: 'Industrial', slug: 'industrial', kind: 'commercial', order: 4 },
  ],
  propertyTypes: [
    { id: 1, name: 'Apartments', slug: 'apartments', segment: 'residential', order: 1 },
    { id: 14, name: 'Warehouses', slug: 'warehouses', segment: 'industrial', order: 14 },
  ],
  amenities: [],
  badges: [{ id: 1, name: 'New Launch', slug: 'new-launch', color: 'info', order: 1 }],
  developers: [],
  banks: [],
});

function Harness({ patch = {}, disabled = false }) {
  const [state, dispatch] = useReducer(reducer, null, () => {
    const base = createFormState({ propertyId: null });
    const values = { ...base.values, ...patch };
    return { ...base, values, initial: values };
  });

  const api = useMemo(
    () => ({
      state,
      dispatch,
      values: state.values,
      errors: state.errors,
      setField: (path, value) => dispatch(actions.set(path, value)),
      setFields: (fields) => dispatch(actions.setMany(fields)),
      disabled,
      isNew: true,
      propertyId: null,
    }),
    [state, disabled]
  );

  return (
    <PropertyFormProvider value={api}>
      <BasicsTab />
      <output data-testid="values">
        {JSON.stringify({
          segment: state.values.segment,
          propertyTypeId: state.values.propertyTypeId,
          badgeIds: state.values.badgeIds,
        })}
      </output>
    </PropertyFormProvider>
  );
}

const stored = () => JSON.parse(screen.getByTestId('values').textContent);

const renderTab = (props) =>
  renderWith(
    <MasterDataProvider>
      <Harness {...props} />
    </MasterDataProvider>
  );

beforeEach(() => {
  installStore(seedStore());
  propertyService.checkSlug.mockResolvedValue({ data: { available: true } });
  window.sessionStorage.clear();
});

afterEach(() => {
  delete global.__CAN__;
  setKnownSegments([]);
});

describe('the segment choice', () => {
  it('offers the segments of master data, an added one included', async () => {
    renderTab();

    expect(await screen.findByRole('radio', { name: 'Industrial' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Residential' })).toBeChecked();
  });

  it('lists a type under the segment it belongs to', async () => {
    renderTab({ patch: { segment: 'industrial' } });

    const types = await screen.findByRole('combobox', { name: /Property type/ });
    await waitFor(() =>
      expect(within(types).getByRole('option', { name: 'Warehouses' })).toBeInTheDocument()
    );
    expect(within(types).queryByRole('option', { name: 'Apartments' })).not.toBeInTheDocument();
  });
});

describe('adding master data from the listing', () => {
  it('offers an add and a manage link under each control to an editor', async () => {
    renderTab();
    await screen.findByRole('radio', { name: 'Industrial' });

    for (const label of ['Add a segment', 'Add a property type', 'Add a badge']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: 'Manage segments' })).toHaveAttribute(
      'href',
      '/admin/master-data/segments'
    );
    expect(screen.getByRole('link', { name: 'Manage property types' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Manage badges' })).toBeInTheDocument();
  });

  it('offers neither to a read-only form, nor to a role that may not write master data', async () => {
    renderTab({ disabled: true });
    await screen.findByRole('radio', { name: 'Industrial' });
    expect(screen.queryByRole('button', { name: 'Add a segment' })).not.toBeInTheDocument();
  });

  it('hides the manage links from a role that may not open master data', async () => {
    global.__CAN__ = false;
    renderTab();
    await screen.findByRole('radio', { name: 'Industrial' });
    expect(screen.queryByRole('link', { name: 'Manage segments' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add a badge' })).not.toBeInTheDocument();
  });

  it('creates a segment with its layout, at the end of the list, and chooses it', async () => {
    renderTab();
    await screen.findByRole('radio', { name: 'Industrial' });

    await userEvent.click(screen.getByRole('button', { name: 'Add a segment' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add a segment' });
    await userEvent.type(within(dialog).getByLabelText(/Name/), 'Agricultural');
    await userEvent.selectOptions(within(dialog).getByLabelText(/Form layout/), 'land');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create and select' }));

    expect(masterDataService.segments.create).toHaveBeenCalledWith({
      name: 'Agricultural',
      kind: 'land',
      order: 5,
    });
    // The radio is outside the dialog, so it is in the accessibility tree only
    // once the dialog's exit transition has run — which, under a full parallel
    // test run, has taken longer than the default second.
    expect(
      await screen.findByRole('radio', { name: 'Agricultural' }, { timeout: 5000 })
    ).toBeChecked();
    expect(stored().segment).toBe('agricultural');
  });

  it('refuses a segment name master data already holds, without asking the API', async () => {
    renderTab();
    await screen.findByRole('radio', { name: 'Industrial' });

    await userEvent.click(screen.getByRole('button', { name: 'Add a segment' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add a segment' });
    await userEvent.type(within(dialog).getByLabelText(/Name/), ' industrial ');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create and select' }));

    expect(await within(dialog).findByText(/already exists/)).toBeInTheDocument();
    expect(masterDataService.segments.create).not.toHaveBeenCalled();
  });

  it("creates a property type in the listing's segment and selects it", async () => {
    renderTab({ patch: { segment: 'industrial' } });
    await screen.findByRole('radio', { name: 'Industrial' });

    await userEvent.click(screen.getByRole('button', { name: 'Add a property type' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add a property type' });
    expect(dialog).toHaveTextContent('created in the Industrial segment');
    // It starts from the commercial layout's icon — Industrial is of that kind.
    expect(await within(dialog).findByText('mdi:office-building-outline')).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText(/Name/), 'Cold Stores');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create and select' }));

    expect(masterDataService.propertyTypes.create).toHaveBeenCalledWith({
      name: 'Cold Stores',
      segment: 'industrial',
      icon: 'mdi:office-building-outline',
      order: 15,
    });
    await waitFor(() => expect(stored().propertyTypeId).toBe(102));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('combobox', { name: /Property type/ })).toHaveValue('102');
  });

  it('creates a badge and adds it to the listing', async () => {
    renderTab({ patch: { badgeIds: [1] } });
    await screen.findByRole('radio', { name: 'Industrial' });

    await userEvent.click(screen.getByRole('button', { name: 'Add a badge' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add a badge' });
    await userEvent.type(within(dialog).getByLabelText(/Name/), 'Lake View');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create and add' }));

    expect(masterDataService.badges.create).toHaveBeenCalledWith({
      name: 'Lake View',
      color: 'primary',
      order: 2,
    });
    await waitFor(() => expect(stored().badgeIds).toEqual([1, 101]));
  });
});
