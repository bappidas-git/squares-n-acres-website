import { useMemo, useReducer } from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import renderWith from '../../../../../test-utils';
import propertyService from '../../../../../services/propertyService';
import { PropertyFormProvider } from '../PropertyFormContext';
import ToastProvider from '../../../../../components/common/ToastProvider';
import SimilarPropertiesTab from '../tabs/SimilarPropertiesTab';
import reducer, { actions, createFormState } from '../reducer';

/**
 * The picker against the real reducer and a stubbed service.
 *
 * The service is the one thing that has to be stubbed — the tab's whole job is
 * turning what `/admin/properties` and `/properties/:id/similar` answer into
 * `similarPropertyIds` — and every assertion is about what ends up in the form.
 */

jest.mock('../../../../../services/propertyService', () => ({
  __esModule: true,
  default: { adminList: jest.fn(), similar: jest.fn() },
}));

const listing = (id, title, patch = {}) => ({
  id,
  title,
  slug: `listing-${id}`,
  isActive: true,
  listingType: 'sale',
  constructionStatus: 'ready-to-move',
  images: [{ id: 1, url: `https://example.com/${id}.jpg`, isCover: true }],
  location: { locality: { id: 7, name: 'Whitefield' }, city: { id: 1, name: 'Bengaluru' } },
  pricing: { price: 9500000 },
  ...patch,
});

const CATALOGUE = [
  listing(2, 'Nandi Ridge Villa'),
  listing(3, 'Cauvery Green Villa'),
  listing(4, 'Aurelia Park Villa'),
  listing(5, 'Skyline Villa'),
  listing(6, 'Trident Villa'),
  listing(7, 'Greenfield Villa'),
  listing(8, 'Prakriti Villa'),
];

function Harness({ patch = {}, disabled = false, isNew = false, propertyId = 1 }) {
  const [state, dispatch] = useReducer(reducer, { propertyId }, (init) => {
    const base = createFormState({ propertyId: init.propertyId });
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
      addItem: (path, item, index) => dispatch(actions.listAdd(path, item, index)),
      removeItem: (path, id) => dispatch(actions.listRemove(path, id)),
      moveItem: (path, from, to) => dispatch(actions.listMove(path, from, to)),
      updateItem: (path, id, itemPatch) => dispatch(actions.listUpdate(path, id, itemPatch)),
      goToTab: () => {},
      disabled,
      isNew,
      propertyId: isNew ? null : propertyId,
    }),
    [state, disabled, isNew, propertyId]
  );

  return (
    <ToastProvider>
      <PropertyFormProvider value={api}>
        <SimilarPropertiesTab />
        <output data-testid="ids">{JSON.stringify(api.values.similarPropertyIds)}</output>
      </PropertyFormProvider>
    </ToastProvider>
  );
}

const stored = () => JSON.parse(screen.getByTestId('ids').textContent);
const box = () => screen.getByRole('combobox');

/**
 * Types into the search and waits for the debounced request to answer.
 *
 * Real timers rather than fake ones: `@testing-library/user-event` 13 (D18) has
 * no `setup({ advanceTimers })`, and the picker's own 300 ms debounce is well
 * inside `findBy`'s second.
 */
const search = async (text, name = text) => {
  // `fireEvent` rather than `userEvent.type`: v13 focuses the element directly,
  // outside `act`, and the picker opens its list on focus.
  fireEvent.focus(box());
  fireEvent.change(box(), { target: { value: text } });
  return screen.findByRole('option', { name: new RegExp(name, 'i') });
};

beforeEach(() => {
  propertyService.adminList.mockImplementation(({ q = '', ids }) => {
    if (ids) {
      const wanted = String(ids).split(',');
      return Promise.resolve({
        data: CATALOGUE.filter((row) => wanted.includes(String(row.id))),
      });
    }
    const needle = q.trim().toLowerCase();
    return Promise.resolve({
      data: CATALOGUE.filter((row) => row.title.toLowerCase().includes(needle)),
    });
  });
  propertyService.similar.mockResolvedValue({ data: CATALOGUE.slice(0, 6) });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('choosing listings', () => {
  it('searches active listings and stores the id of the one chosen', async () => {
    renderWith(<Harness />);

    await userEvent.click(await search('villa', 'Nandi Ridge Villa'));

    expect(stored()).toEqual([2]);
    expect(propertyService.adminList).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'villa', isActive: true }),
      expect.anything()
    );
  });

  it('never offers the listing being edited', async () => {
    propertyService.adminList.mockResolvedValue({ data: [listing(1, 'This Villa'), CATALOGUE[0]] });
    renderWith(<Harness />);

    await search('villa', 'Nandi Ridge Villa');
    expect(screen.queryByRole('option', { name: /This Villa/ })).not.toBeInTheDocument();
  });

  it('prints the locality and the price on the card', async () => {
    renderWith(<Harness />);

    const option = await search('Nandi');
    expect(
      within(option).getByText(/Whitefield, Bengaluru · ₹95 L · Ready to Move/)
    ).toBeInTheDocument();
  });

  it('removes a chosen listing and puts the slot back', async () => {
    renderWith(<Harness patch={{ similarPropertyIds: [2] }} />);

    await screen.findByText('Nandi Ridge Villa');
    await userEvent.click(screen.getByRole('button', { name: 'Remove Nandi Ridge Villa' }));
    expect(stored()).toEqual([]);
  });
});

describe('the cap of six', () => {
  it('blocks a seventh with a message, and re-enables when one goes', async () => {
    renderWith(<Harness patch={{ similarPropertyIds: [2, 3, 4, 5, 6, 7] }} />);

    expect(screen.getByText('6/6')).toBeInTheDocument();
    expect(
      screen.getByText('Six is the most a page shows. Remove one before choosing another.')
    ).toBeInTheDocument();

    expect(await search('Prakriti')).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Remove Nandi Ridge Villa' }));
    expect(stored()).toHaveLength(5);
    expect(
      screen.queryByText('Six is the most a page shows. Remove one before choosing another.')
    ).not.toBeInTheDocument();
  });

  it('stops "Suggest similar" once the list is full', () => {
    renderWith(<Harness patch={{ similarPropertyIds: [2, 3, 4, 5, 6, 7] }} />);
    expect(screen.getByRole('button', { name: /Suggest similar/ })).toBeDisabled();
  });
});

describe('suggesting', () => {
  it('offers what the page would show and adds only what is confirmed', async () => {
    renderWith(<Harness />);

    await userEvent.click(screen.getByRole('button', { name: /Suggest similar/ }));
    const dialog = await screen.findByRole('dialog');

    expect(propertyService.similar).toHaveBeenCalledWith(1);
    expect(within(dialog).getAllByRole('checkbox')).toHaveLength(6);

    await userEvent.click(within(dialog).getByRole('checkbox', { name: /Nandi Ridge Villa/ }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add selected (5)' }));

    expect(stored()).toEqual([3, 4, 5, 6, 7]);
  });

  it('adds nothing when the dialog is cancelled', async () => {
    renderWith(<Harness />);

    await userEvent.click(screen.getByRole('button', { name: /Suggest similar/ }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(stored()).toEqual([]);
  });

  it('never suggests a listing already chosen, and never more than the room left', async () => {
    renderWith(<Harness patch={{ similarPropertyIds: [2, 3, 4, 5] }} />);

    await userEvent.click(screen.getByRole('button', { name: /Suggest similar/ }));
    const dialog = await screen.findByRole('dialog');

    const offered = within(dialog).getAllByRole('checkbox');
    expect(offered).toHaveLength(2);
    expect(
      within(dialog).queryByRole('checkbox', { name: /Nandi Ridge Villa/ })
    ).not.toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Add selected (2)' }));
    expect(stored()).toEqual([2, 3, 4, 5, 6, 7]);
  });

  it('says so rather than opening an empty dialog', async () => {
    propertyService.similar.mockResolvedValue({ data: [CATALOGUE[0]] });
    renderWith(<Harness patch={{ similarPropertyIds: [2] }} />);

    await userEvent.click(screen.getByRole('button', { name: /Suggest similar/ }));

    expect(
      await screen.findByText(
        'Nothing to suggest — the six this page would show are already chosen.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is not offered before the listing has been saved', () => {
    renderWith(<Harness isNew />);
    expect(screen.queryByRole('button', { name: /Suggest similar/ })).not.toBeInTheDocument();
    expect(
      screen.getByText(/Suggestions are offered once this listing has been saved/)
    ).toBeInTheDocument();
  });
});

describe('read-only', () => {
  it('leaves a sales user nothing to press', async () => {
    renderWith(<Harness patch={{ similarPropertyIds: [2] }} disabled />);

    await screen.findByText('Nandi Ridge Villa');
    expect(box()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove Nandi Ridge Villa' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Suggest similar/ })).toBeDisabled();
  });
});
