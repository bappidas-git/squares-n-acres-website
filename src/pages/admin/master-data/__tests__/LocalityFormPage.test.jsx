/**
 * Admin → Master data → Localities → add / edit (QA-60).
 *
 * The rich-text editor, the map and the SEO panel have suites of their own;
 * here they are stand-ins, so what is asserted is the form's part: what it
 * saves, when it refuses to and how it says so, where the SEO panel's hints
 * lead, and what happens to a live address that moves.
 */

import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation, useNavigationType } from 'react-router-dom';

import LocalityFormPage from '../LocalityFormPage';
import masterDataService from '../../../../services/masterDataService';
import redirectService from '../../../../services/redirectService';
import renderWith from '../../../../test-utils';

jest.mock('../../../../services/redirectService');
// `useBlocker` needs a data router; the test renders a `MemoryRouter`.
jest.mock('../../../../contexts/NavigationGuardContext', () => ({
  __esModule: true,
  useNavigationGuard: () => ({ register: () => () => {}, isBlocking: false }),
  NavigationGuardProvider: ({ children }) => children,
}));
jest.mock('../../../../contexts/AdminAuthContext', () => ({
  __esModule: true,
  useAdminAuth: () => ({ can: () => true }),
}));
const mockMasterData = { cities: [], loading: false, refresh: jest.fn() };
jest.mock('../../../../contexts/MasterDataContext', () => ({
  __esModule: true,
  useMasterData: () => mockMasterData,
}));
jest.mock('../../../../components/seo/SeoPanel', () => ({
  __esModule: true,
  default: function MockSeoPanel() {
    return <div data-testid="seo-panel" />;
  },
}));
jest.mock('../../../../components/editor/RichTextField', () => ({
  __esModule: true,
  default: function MockRichTextField({ label, value, onChange }) {
    return (
      <label>
        {label}
        <textarea value={value} onChange={(event) => onChange(event.target.value)} />
      </label>
    );
  },
}));
jest.mock('../../../../components/common/MapEmbed', () => ({
  __esModule: true,
  default: () => null,
}));

const service = masterDataService.localities;

const RECORD = {
  id: 7,
  name: 'Hebbal',
  slug: 'hebbal',
  cityId: 1,
  city: { id: 1, name: 'Bengaluru', slug: 'bengaluru' },
  zone: 'north',
  shortDescription: 'North of the city.',
  description: '<p>The guide.</p>',
  heroImageUrl: null,
  latitude: 13.0358,
  longitude: 77.597,
  pincodes: ['560024'],
  highlights: ['Near the airport road', 'Two lakes', 'Metro coming'],
  connectivity: [],
  avgPricePerSqft: 9000,
  priceTrendNote: null,
  isFeatured: true,
  isActive: true,
  order: 4,
  seo: { slug: 'hebbal' },
  updatedAt: '2026-09-01T00:00:00.000Z',
};

/** Wherever a navigation away from the form landed, and how. */
function Elsewhere() {
  const location = useLocation();
  const how = useNavigationType();
  return <p data-testid="elsewhere">{`${how} ${location.pathname}`}</p>;
}

const renderForm = ({ record = RECORD, add = false } = {}) => {
  jest.spyOn(service, 'adminGet').mockResolvedValue({ data: record });
  const url = add
    ? '/admin/master-data/localities/add'
    : `/admin/master-data/localities/edit/${record.id}`;
  const path = add ? '/admin/master-data/localities/add' : '/admin/master-data/localities/edit/:id';
  return renderWith(
    <Routes>
      <Route path={path} element={<LocalityFormPage />} />
      <Route path="*" element={<Elsewhere />} />
    </Routes>,
    { initialEntries: [url] }
  );
};

const loaded = () => screen.findByDisplayValue(RECORD.name);
const saveButton = () => screen.getAllByRole('button', { name: 'Save' })[0];

beforeEach(() => {
  jest.restoreAllMocks();
  mockMasterData.cities = [{ id: 1, name: 'Bengaluru', slug: 'bengaluru', isActive: true }];
  mockMasterData.loading = false;
  mockMasterData.refresh = jest.fn();
  jest.spyOn(service, 'checkSlug').mockResolvedValue({ data: { available: true } });
  jest
    .spyOn(service, 'adminList')
    .mockResolvedValue({ data: [], meta: { page: 1, perPage: 1, total: 20, totalPages: 20 } });
  jest
    .spyOn(service, 'update')
    .mockImplementation((id, body) =>
      Promise.resolve({ data: { ...RECORD, ...body, id: Number(id), order: body.order } })
    );
  jest
    .spyOn(service, 'create')
    .mockImplementation((body) => Promise.resolve({ data: { ...RECORD, ...body, id: 40 } }));
  redirectService.deactivateByFromPath.mockResolvedValue(null);
  redirectService.upsertByFromPath.mockResolvedValue({ data: {} });
});

describe('LocalityFormPage (QA-60)', () => {
  it('writes nothing, and says so, when nothing has changed', async () => {
    renderForm();
    await loaded();

    await userEvent.click(saveButton());

    expect(await screen.findByText('No changes to save.')).toBeInTheDocument();
    expect(service.update).not.toHaveBeenCalled();
  });

  it('keeps the form on screen through a save instead of reading it again', async () => {
    renderForm();
    await loaded();

    fireEvent.change(screen.getByLabelText('Price trend note'), {
      target: { value: 'Indicative only' },
    });
    await userEvent.click(saveButton());

    expect(await screen.findByText('Locality saved')).toBeInTheDocument();
    expect(service.update).toHaveBeenCalledTimes(1);
    // The answer became the form: no second read, no skeleton, the page
    // stays where the editor was.
    expect(service.adminGet).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Loading the locality…')).toBeNull();
    expect(screen.getByLabelText('Price trend note')).toHaveValue('Indicative only');
  });

  it('says what is wrong with a save it refuses, and puts the cursor there', async () => {
    renderForm();
    await loaded();

    fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '95' } });
    await userEvent.click(saveButton());

    expect(await screen.findByText('Please fix the highlighted fields.')).toBeInTheDocument();
    expect(screen.getByText('The latitude may not be greater than 90.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Latitude')).toHaveFocus());
    expect(service.update).not.toHaveBeenCalled();
  });

  it('names a field by its label in a message', async () => {
    renderForm();
    await loaded();

    fireEvent.change(screen.getByLabelText('Average price per sq ft'), {
      target: { value: '8200.5' },
    });
    await userEvent.click(saveButton());

    expect(
      await screen.findByText('The average price per sq ft must be an integer.')
    ).toBeInTheDocument();
  });

  it('asks for both halves of a connectivity row, on that row', async () => {
    renderForm();
    await loaded();

    // An empty row first: the payload drops it, and the schema's message for
    // the half-filled one used to land on it.
    await userEvent.click(screen.getByRole('button', { name: 'Add row' }));
    await userEvent.click(screen.getByRole('button', { name: 'Add row' }));
    fireEvent.change(screen.getAllByLabelText('Label')[1], { target: { value: 'Metro' } });
    await userEvent.click(saveButton());

    expect(await screen.findByText('Say how far or how — or remove the row.')).toBeInTheDocument();
    const values = screen.getAllByLabelText('Value');
    expect(values[1]).toHaveAttribute('aria-invalid', 'true');
    expect(values[0]).not.toHaveAttribute('aria-invalid');
    expect(service.update).not.toHaveBeenCalled();
  });

  it('moves a highlight twice from the keyboard, the focus following it', async () => {
    renderForm();
    await loaded();

    const list = screen.getByRole('list', { name: 'Highlights, in order' });
    const first = within(list).getByRole('listitem', { name: /^Near the airport road,/ });
    act(() => first.focus());
    fireEvent.keyDown(first, { key: 'ArrowDown', altKey: true });
    await waitFor(() =>
      expect(within(list).getByRole('listitem', { name: /^Near the airport road,/ })).toHaveFocus()
    );
    fireEvent.keyDown(within(list).getByRole('listitem', { name: /^Near the airport road,/ }), {
      key: 'ArrowDown',
      altKey: true,
    });

    await waitFor(() =>
      expect([1, 2, 3].map((n) => screen.getByLabelText(`Highlight ${n}`).value)).toEqual([
        'Two lakes',
        'Metro coming',
        'Near the airport road',
      ])
    );
  });

  it('offers the city a locality is filed under after it has been switched off', async () => {
    mockMasterData.cities = [];
    renderForm();
    await loaded();

    const city = screen.getByRole('combobox', { name: /^City/ });
    expect(city).toHaveValue('1');
    expect(within(city).getByRole('option', { name: 'Bengaluru (inactive)' })).toBeInTheDocument();
    expect(screen.getByText(/This city is switched off/)).toBeInTheDocument();
  });

  it('says so when no city is switched on at all', async () => {
    mockMasterData.cities = [];
    renderForm({ add: true });

    expect(await screen.findByText(/No city is switched on/)).toBeInTheDocument();
  });

  it('proposes the end of the list for a new locality', async () => {
    renderForm({ add: true });

    await waitFor(() => expect(screen.getByLabelText('Order')).toHaveValue(21));
  });

  it('replaces the add route with the new locality’s own', async () => {
    renderForm({ add: true });
    await waitFor(() => expect(screen.getByLabelText('Order')).toHaveValue(21));

    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Hoskote' } });
    await userEvent.click(saveButton());

    expect(await screen.findByTestId('elsewhere')).toHaveTextContent(
      'REPLACE /admin/master-data/localities/edit/40'
    );
    expect(service.create.mock.calls[0][0]).toEqual(
      expect.objectContaining({ name: 'Hoskote', order: 21 })
    );
  });

  it('does not open the page of a locality that is switched off', async () => {
    renderForm({ record: { ...RECORD, isActive: false } });
    await loaded();

    fireEvent.change(screen.getByLabelText('Price trend note'), { target: { value: 'Draft' } });
    await userEvent.click(screen.getAllByRole('button', { name: 'Save & view' })[0]);

    expect(await screen.findByText(/This locality is switched off/)).toBeInTheDocument();
    expect(screen.queryByTestId('elsewhere')).toBeNull();
    expect(service.update).toHaveBeenCalledTimes(1);
  });

  it('redirects a live locality’s old address when its URL changes', async () => {
    renderForm();
    await loaded();

    fireEvent.change(screen.getByDisplayValue('hebbal'), { target: { value: 'hebbal-north' } });
    expect(await screen.findByText(/This page is live at/)).toBeInTheDocument();
    expect(
      screen.getByRole('switch', { name: /Send visitors from \/localities\/hebbal/ })
    ).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(saveButton());

    await waitFor(() =>
      expect(redirectService.upsertByFromPath).toHaveBeenCalledWith(
        expect.objectContaining({
          fromPath: '/localities/hebbal',
          toPath: '/localities/hebbal-north',
          statusCode: 301,
        })
      )
    );
    expect(
      await screen.findByText('/localities/hebbal now redirects to the new address.')
    ).toBeInTheDocument();
  });

  it('leaves the old address alone when the editor says so', async () => {
    renderForm();
    await loaded();

    fireEvent.change(screen.getByDisplayValue('hebbal'), { target: { value: 'hebbal-north' } });
    await userEvent.click(
      await screen.findByRole('switch', { name: /Send visitors from \/localities\/hebbal/ })
    );
    await userEvent.click(saveButton());

    expect(await screen.findByText('Locality saved')).toBeInTheDocument();
    expect(redirectService.upsertByFromPath).not.toHaveBeenCalled();
  });

  it('gives every SEO hint a block to go to', async () => {
    renderForm();
    await loaded();

    for (const id of [
      'locality-description',
      'locality-hero',
      'locality-highlights',
      'locality-connectivity',
      'locality-slug',
    ]) {
      // eslint-disable-next-line testing-library/no-node-access -- the hints target ids
      expect(document.getElementById(id)).not.toBeNull();
    }
  });

  it('keeps a pincode as it was typed, or refuses it', async () => {
    renderForm();
    await loaded();

    const box = screen.getByLabelText('Pincodes');
    await userEvent.type(box, '5600667');
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByText('A pincode is six digits, like 560066.')).toBeInTheDocument();
    expect(screen.queryByText('560066')).toBeNull();
  });
});
