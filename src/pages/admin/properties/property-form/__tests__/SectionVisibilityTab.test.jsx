import { useMemo, useReducer } from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import renderWith from '../../../../../test-utils';
import { MasterDataContext } from '../../../../../contexts/MasterDataContext';
import { PropertyFormProvider } from '../PropertyFormContext';
import { SECTION_DEFINITIONS } from '../../../../../utils/propertySections';
import SectionVisibilityTab from '../tabs/SectionVisibilityTab';
import reducer, { actions, createFormState } from '../reducer';

/**
 * The eighteen toggles against the real reducer.
 *
 * What matters is what reaches `sectionVisibility` — the boilerplate wrote
 * `!value` over a key it read as `!== false`, so the first press of an absent
 * key did nothing (NEW-09) — and what the hint chip says, because the chip is
 * the only place the form admits that a switched-on section is empty.
 */

const BANKS = [{ id: 1, name: 'Garden City Bank', slug: 'garden-city-bank', isActive: true }];

const masterData = (banks) => ({
  localities: [],
  cities: [],
  propertyTypes: [],
  amenities: [],
  badges: [],
  developers: [],
  banks,
  loading: false,
  refresh: () => Promise.resolve(),
  byId: () => null,
  bySlug: () => null,
});

function Harness({ patch = {}, disabled = false, banks = BANKS }) {
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
    <MasterDataContext.Provider value={masterData(banks)}>
      <PropertyFormProvider value={api}>
        <SectionVisibilityTab />
        <output data-testid="visibility">{JSON.stringify(api.values.sectionVisibility)}</output>
      </PropertyFormProvider>
    </MasterDataContext.Provider>
  );
}

const stored = () => JSON.parse(screen.getByTestId('visibility').textContent);

/** The hint chip of one row, found by the label it carries for a screen reader. */
const chip = (label, hint) => screen.getByLabelText(`${label}: ${hint}`);

describe('the rows', () => {
  it('renders one switch per section of the contract, in page order', () => {
    renderWith(<Harness />);

    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(18);
    expect(switches.map((control) => control.getAttribute('aria-checked'))).toEqual(
      Array(18).fill('true')
    );
    expect(
      SECTION_DEFINITIONS.every((section) => screen.getByRole('switch', { name: section.label }))
    ).toBe(true);
  });

  it('counts what the page would actually show', () => {
    renderWith(
      <Harness patch={{ description: '<p>A home.</p>', videoUrl: 'https://youtu.be/x' }} />
    );
    // Overview, video and enquiry hold something; the other fifteen do not.
    expect(screen.getByText('3 of 18 sections show on the page')).toBeInTheDocument();
  });
});

describe('the toggle', () => {
  it('writes false explicitly, and true back again (NEW-09)', async () => {
    renderWith(<Harness />);

    await userEvent.click(screen.getByRole('switch', { name: 'Video' }));
    expect(stored().video).toBe(false);

    await userEvent.click(screen.getByRole('switch', { name: 'Video' }));
    expect(stored().video).toBe(true);
  });

  it('turns a key the record never carried off on the first press', async () => {
    renderWith(<Harness patch={{ sectionVisibility: {} }} />);

    const control = screen.getByRole('switch', { name: 'Gallery' });
    expect(control).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(control);
    expect(stored().gallery).toBe(false);
    expect(screen.getByRole('switch', { name: 'Gallery' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  it('touches nothing but the section pressed', async () => {
    renderWith(<Harness />);
    await userEvent.click(screen.getByRole('switch', { name: 'FAQs' }));

    const written = stored();
    expect(written.faqs).toBe(false);
    expect(Object.values(written).filter((value) => value === false)).toHaveLength(1);
  });
});

describe('enable all / disable all', () => {
  it('writes every key, so none is left undefined', async () => {
    renderWith(<Harness patch={{ sectionVisibility: { overview: false } }} />);

    await userEvent.click(screen.getByRole('button', { name: 'Disable all' }));
    expect(Object.keys(stored())).toHaveLength(18);
    expect(Object.values(stored()).every((value) => value === false)).toBe(true);

    await userEvent.click(screen.getByRole('button', { name: 'Enable all' }));
    expect(Object.values(stored()).every((value) => value === true)).toBe(true);
  });

  it('disables the button that would change nothing', async () => {
    renderWith(<Harness />);
    expect(screen.getByRole('button', { name: 'Enable all' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Disable all' })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: 'Disable all' }));
    expect(screen.getByRole('button', { name: 'Disable all' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Enable all' })).toBeEnabled();
  });
});

describe('the hint chip', () => {
  it('warns when a section is on over nothing, and names the tab that fills it', () => {
    renderWith(<Harness />);
    expect(chip('Gallery', 'No data yet — add at least two images in Media')).toBeInTheDocument();
  });

  it('says “Showing” once the section holds something', () => {
    renderWith(<Harness patch={{ videoUrl: 'https://youtu.be/x' }} />);
    expect(chip('Video', 'Showing')).toBeInTheDocument();
  });

  it('says “Hidden” for a switched-off section, whatever it holds', async () => {
    renderWith(<Harness patch={{ videoUrl: 'https://youtu.be/x' }} />);

    await userEvent.click(screen.getByRole('switch', { name: 'Video' }));
    expect(chip('Video', 'Hidden')).toBeInTheDocument();
  });

  it('blames the missing banks rather than the editor', () => {
    const priced = { listingType: 'sale', pricing: { price: 9500000 } };

    const { unmount } = renderWith(<Harness patch={priced} banks={[]} />);
    expect(chip('Finance & EMI', 'Hidden automatically — no active banks')).toBeInTheDocument();
    unmount();

    renderWith(<Harness patch={priced} />);
    expect(chip('Finance & EMI', 'Showing')).toBeInTheDocument();
  });

  it('says a rental has no finance section of its own', () => {
    renderWith(<Harness patch={{ listingType: 'rent', pricing: { rentPerMonth: 45000 } }} />);
    expect(chip('Finance & EMI', 'Hidden automatically — sale listings only')).toBeInTheDocument();
  });
});

describe('read-only', () => {
  it('leaves a sales user nothing to press', () => {
    renderWith(<Harness disabled />);

    screen.getAllByRole('switch').forEach((control) => expect(control).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Disable all' })).toBeDisabled();
  });
});
