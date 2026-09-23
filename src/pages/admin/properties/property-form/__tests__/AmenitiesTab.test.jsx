import { useMemo, useReducer } from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import renderWith from '../../../../../test-utils';
import { MasterDataContext } from '../../../../../contexts/MasterDataContext';
import { PropertyFormProvider } from '../PropertyFormContext';
import AmenitiesTab, { orderGroupsForSegment, sortAmenityIds } from '../tabs/AmenitiesTab';
import reducer, { actions, createFormState } from '../reducer';

/**
 * The amenity tab against the real reducer and a real master-data list: what
 * matters here is what ends up in `amenityIds`, and a mocked dispatcher would
 * be testing the mock.
 */

const AMENITIES = [
  { id: 11, name: 'Power Backup', slug: 'power-backup', category: 'basic', order: 1 },
  { id: 12, name: 'Lift', slug: 'lift', category: 'basic', order: 2 },
  { id: 21, name: 'Swimming Pool', slug: 'swimming-pool', category: 'lifestyle', order: 1 },
  { id: 22, name: 'Clubhouse', slug: 'clubhouse', category: 'lifestyle', order: 2 },
  { id: 31, name: 'Tennis Court', slug: 'tennis-court', category: 'sports', order: 1 },
  { id: 32, name: 'Basketball Court', slug: 'basketball-court', category: 'sports', order: 2 },
  { id: 33, name: 'Jogging Track', slug: 'jogging-track', category: 'sports', order: 3 },
  { id: 41, name: 'Conference Room', slug: 'conference-room', category: 'commercial', order: 1 },
];

const masterData = {
  localities: [],
  cities: [],
  propertyTypes: [],
  amenities: AMENITIES,
  badges: [],
  developers: [],
  banks: [],
  loading: false,
  refresh: () => Promise.resolve(),
  byId: () => null,
  bySlug: () => null,
};

function Harness({ patch = {}, disabled = false, amenities = AMENITIES }) {
  const [state, dispatch] = useReducer(reducer, { propertyId: 1 }, ({ propertyId }) => {
    const base = createFormState({ propertyId });
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
      isNew: false,
      propertyId: 1,
    }),
    [state, disabled]
  );

  return (
    <MasterDataContext.Provider value={{ ...masterData, amenities }}>
      <PropertyFormProvider value={api}>
        <AmenitiesTab />
        <output data-testid="ids">{JSON.stringify(api.values.amenityIds)}</output>
      </PropertyFormProvider>
    </MasterDataContext.Provider>
  );
}

const stored = () => JSON.parse(screen.getByTestId('ids').textContent);

const selectAll = (group) => screen.getByLabelText(`Select all in ${group}`);

describe('choosing amenities', () => {
  it('writes the id of a ticked amenity and takes it back out', async () => {
    renderWith(<Harness />);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Swimming Pool' }));
    expect(stored()).toEqual([21]);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Swimming Pool' }));
    expect(stored()).toEqual([]);
  });

  it('keeps the ids in master-data order however they were ticked', async () => {
    renderWith(<Harness />);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Jogging Track' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Lift' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Swimming Pool' }));

    expect(stored()).toEqual([12, 21, 33]);
  });

  it('counts what is selected, in total and per group', async () => {
    renderWith(<Harness />);

    expect(screen.getByText('0 selected')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Tennis Court' }));

    expect(screen.getByText('1 selected')).toBeInTheDocument();
    expect(screen.getByText('1 of 3 selected')).toBeInTheDocument();
  });

  it('puts the group toggle and every chip in the tab order', () => {
    renderWith(<Harness />);

    // The chips hide their checkbox behind the label, which is exactly how a
    // chip stops being operable with a keyboard if the CSS ever hides it for
    // real. Tabbing to it is the assertion that it has not.
    screen.getByLabelText('Search amenities').focus();

    userEvent.tab();
    expect(selectAll('Basic')).toHaveFocus();

    userEvent.tab();
    expect(screen.getByRole('checkbox', { name: 'Power Backup' })).toHaveFocus();

    userEvent.tab();
    expect(screen.getByRole('checkbox', { name: 'Lift' })).toHaveFocus();
  });

  it('gives a sales user nothing to click', () => {
    renderWith(<Harness disabled />);

    screen.getAllByRole('checkbox').forEach((checkbox) => expect(checkbox).toBeDisabled());
  });
});

describe('the group header', () => {
  it('ticks every amenity of its group and clears them again', async () => {
    renderWith(<Harness />);

    await userEvent.click(selectAll('Sports'));
    expect(stored()).toEqual([31, 32, 33]);

    await userEvent.click(selectAll('Sports'));
    expect(stored()).toEqual([]);
  });

  it('becomes indeterminate when one of a full group is unticked (§7)', async () => {
    renderWith(<Harness />);

    await userEvent.click(selectAll('Sports'));
    expect(selectAll('Sports').checked).toBe(true);
    expect(selectAll('Sports').indeterminate).toBe(false);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Basketball Court' }));

    expect(selectAll('Sports').checked).toBe(false);
    expect(selectAll('Sports').indeterminate).toBe(true);
    expect(stored()).toEqual([31, 33]);
  });

  it('leaves the other groups alone', async () => {
    renderWith(<Harness patch={{ amenityIds: [11] }} />);

    await userEvent.click(selectAll('Lifestyle'));

    expect(stored()).toEqual([11, 21, 22]);
    expect(selectAll('Basic').indeterminate).toBe(true);
  });
});

describe('the search', () => {
  it('narrows to the amenities that match, across every group', async () => {
    renderWith(<Harness />);

    await userEvent.type(screen.getByLabelText('Search amenities'), 'court');

    expect(screen.getByRole('checkbox', { name: 'Tennis Court' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Basketball Court' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Swimming Pool' })).not.toBeInTheDocument();
  });

  it('hides a group with no match at all', async () => {
    renderWith(<Harness />);

    await userEvent.type(screen.getByLabelText('Search amenities'), 'pool');

    expect(screen.getByRole('checkbox', { name: 'Swimming Pool' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Select all in Sports')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Select all in Basic')).not.toBeInTheDocument();
  });

  it('says so when nothing matches', async () => {
    renderWith(<Harness />);

    await userEvent.type(screen.getByLabelText('Search amenities'), 'helipad');

    expect(screen.getByText('No amenity matches “helipad”.')).toBeInTheDocument();
  });

  it('keeps what was already chosen while it filters', async () => {
    renderWith(<Harness patch={{ amenityIds: [31, 32, 33] }} />);

    await userEvent.type(screen.getByLabelText('Search amenities'), 'pool');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Swimming Pool' }));

    expect(stored()).toEqual([21, 31, 32, 33]);
  });
});

describe('the segment', () => {
  it('reads the commercial group first for a commercial listing', () => {
    renderWith(<Harness patch={{ segment: 'commercial' }} />);

    const headings = screen
      .getAllByRole('group')
      .map(
        (section) =>
          within(section).queryByText(/^(Basic|Lifestyle|Sports|Commercial)$/)?.textContent
      )
      .filter(Boolean);

    expect(headings[0]).toBe('Commercial');
  });

  it('leaves the order alone for a residential listing', () => {
    expect(
      orderGroupsForSegment([{ category: 'basic' }, { category: 'commercial' }], 'residential').map(
        (group) => group.category
      )
    ).toEqual(['basic', 'commercial']);
  });
});

describe('amenities master data no longer offers', () => {
  const withRetired = AMENITIES.map((amenity) =>
    amenity.id === 22 ? { ...amenity, isActive: false } : amenity
  );

  it('shows a switched-off amenity the listing still claims, so it can be unticked', async () => {
    renderWith(<Harness amenities={withRetired} patch={{ amenityIds: [11, 22] }} />);

    const retired = screen.getByRole('checkbox', { name: 'Clubhouse (switched off)' });
    expect(retired).toBeChecked();

    await userEvent.click(retired);
    expect(stored()).toEqual([11]);
  });

  it('does not offer a switched-off amenity to a listing without it', () => {
    renderWith(<Harness amenities={withRetired} />);
    expect(screen.queryByRole('checkbox', { name: /Clubhouse/ })).not.toBeInTheDocument();
  });

  it('says when a chosen amenity was deleted, and drops it on request', async () => {
    renderWith(<Harness patch={{ amenityIds: [11, 99] }} />);

    // "2 selected" with one box ticked was the only trace of it before.
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(
      screen.getByText(/One amenity this listing had has since been deleted/)
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Remove it from this listing' }));
    expect(stored()).toEqual([11]);
    expect(screen.queryByText(/has since been deleted/)).not.toBeInTheDocument();
  });
});

describe('sortAmenityIds', () => {
  const ordered = [11, 12, 21, 22];

  it('sorts by the display order and de-duplicates', () => {
    expect(sortAmenityIds([22, 11, 22, 12], ordered)).toEqual([11, 12, 22]);
  });

  it('keeps an id master data no longer holds, at the end', () => {
    expect(sortAmenityIds([99, 12], ordered)).toEqual([12, 99]);
  });

  it('gives numbers back as numbers', () => {
    expect(sortAmenityIds(['12', 11], ordered)).toEqual([11, 12]);
  });
});
