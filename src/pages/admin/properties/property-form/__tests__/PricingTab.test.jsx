import { useMemo, useReducer } from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import renderWith from '../../../../../test-utils';
import { PropertyFormProvider } from '../PropertyFormContext';
import reducer, { actions, createFormState } from '../reducer';
import PricingTab from '../tabs/PricingTab';

/**
 * The tab, wired to the real reducer.
 *
 * Nothing is stubbed: the point of the tab is what happens to `values` when a
 * control is used, and a fake dispatcher would be testing the fake.
 */
function Harness({ patch = {}, disabled = false }) {
  const [state, dispatch] = useReducer(
    reducer,
    { propertyId: 1, record: null },
    ({ propertyId }) => {
      const base = createFormState({ propertyId });
      const values = { ...base.values, ...patch };
      return { ...base, values, initial: values };
    }
  );

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
      disabled,
      isNew: false,
      propertyId: 1,
    }),
    [state, disabled]
  );

  return (
    <PropertyFormProvider value={api}>
      <PricingTab />
      <output data-testid="values">{JSON.stringify(api.values.pricing)}</output>
    </PropertyFormProvider>
  );
}

const pricing = (patch) => ({ pricing: { ...createFormState({}).values.pricing, ...patch } });
const area = (patch) => ({ area: { ...createFormState({}).values.area, ...patch } });
const stored = () => JSON.parse(screen.getByTestId('values').textContent);

describe('the fields a listing type shows', () => {
  it('quotes a sale once, with a range and a rate', () => {
    renderWith(<Harness patch={{ listingType: 'sale' }} />);

    expect(screen.getByLabelText('Price')).toBeInTheDocument();
    expect(screen.getByLabelText('Range — lowest')).toBeInTheDocument();
    expect(screen.getByLabelText('Range — highest')).toBeInTheDocument();
    expect(screen.getByLabelText('Price per sq ft')).toBeInTheDocument();
    expect(screen.getByLabelText('Booking amount')).toBeInTheDocument();
    expect(screen.queryByLabelText('Rent per month')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Security deposit')).not.toBeInTheDocument();
  });

  it('quotes a rental per month, with a deposit and a maintenance charge', () => {
    renderWith(<Harness patch={{ listingType: 'rent' }} />);

    expect(screen.getByLabelText('Rent per month')).toBeInTheDocument();
    expect(screen.getByLabelText('Security deposit')).toBeInTheDocument();
    expect(screen.getByLabelText('Maintenance per month')).toBeInTheDocument();
    expect(screen.queryByLabelText('Price')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Price per sq ft')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Range — lowest')).not.toBeInTheDocument();
  });

  it('calls the advance an advance on a lease (D90)', () => {
    renderWith(<Harness patch={{ listingType: 'lease' }} />);

    expect(screen.getByLabelText('Rent per month')).toBeInTheDocument();
    expect(screen.getByLabelText('Advance')).toBeInTheDocument();
    expect(screen.queryByLabelText('Booking amount')).not.toBeInTheDocument();
  });

  it('offers the lease clause presets only on a tenancy', () => {
    const { unmount } = renderWith(<Harness patch={{ listingType: 'lease' }} />);
    expect(screen.getByRole('button', { name: 'Add lock-in period' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add annual escalation' })).toBeInTheDocument();
    unmount();

    renderWith(<Harness patch={{ listingType: 'sale' }} />);
    expect(screen.queryByRole('button', { name: 'Add lock-in period' })).not.toBeInTheDocument();
  });
});

describe('the price preview (D33)', () => {
  it('prints a sale price as the listing will', () => {
    renderWith(<Harness patch={{ listingType: 'sale', ...pricing({ price: 15000000 }) }} />);

    const preview = screen.getByRole('complementary', { name: 'Price preview' });
    expect(preview).toHaveTextContent('₹1.5 Cr onwards');
  });

  it('prints a range when both ends are given', () => {
    renderWith(
      <Harness
        patch={{
          listingType: 'sale',
          ...pricing({ priceRangeMin: 8500000, priceRangeMax: 12000000 }),
        }}
      />
    );

    expect(screen.getByRole('complementary', { name: 'Price preview' })).toHaveTextContent(
      '₹85 L – ₹1.2 Cr'
    );
  });

  it('prints a rent per month, with the maintenance under it', () => {
    renderWith(
      <Harness
        patch={{
          listingType: 'rent',
          ...pricing({ rentPerMonth: 45000, maintenanceChargesMonthly: 2500 }),
        }}
      />
    );

    const preview = screen.getByRole('complementary', { name: 'Price preview' });
    expect(preview).toHaveTextContent('₹45,000/month');
    expect(preview).toHaveTextContent('+ ₹2,500/month maintenance');
  });

  it('prints "Price on Request" and nothing else', () => {
    renderWith(
      <Harness
        patch={{ listingType: 'sale', ...pricing({ price: 15000000, priceOnRequest: true }) }}
      />
    );

    const preview = screen.getByRole('complementary', { name: 'Price preview' });
    expect(preview).toHaveTextContent('Price on Request');
    expect(preview).not.toHaveTextContent('Cr');
  });

  it('says so while there is no price at all', () => {
    renderWith(<Harness patch={{ listingType: 'sale' }} />);
    expect(screen.getByRole('complementary', { name: 'Price preview' })).toHaveTextContent(
      'No price yet'
    );
  });

  it('follows the field as it is typed', async () => {
    renderWith(<Harness patch={{ listingType: 'sale' }} />);

    await userEvent.type(screen.getByLabelText('Price'), '9900000');
    expect(screen.getByRole('complementary', { name: 'Price preview' })).toHaveTextContent(
      '₹99 L onwards'
    );
  });
});

describe('price on request', () => {
  it('clears the amounts, disables the fields and passes validation', async () => {
    renderWith(
      <Harness
        patch={{ listingType: 'sale', ...pricing({ price: 15000000, pricePerSqft: 10000 }) }}
      />
    );

    await userEvent.click(screen.getByLabelText('Price on request'));

    expect(stored().price).toBeNull();
    expect(stored().pricePerSqft).toBeNull();
    expect(screen.getByLabelText('Price')).toBeDisabled();
    expect(screen.getByLabelText('Price per sq ft')).toBeDisabled();
    expect(screen.getByLabelText('Booking amount')).toBeEnabled();
  });
});

describe('the per-sq-ft rate', () => {
  it('is computed from the price and the area when nobody has set one', () => {
    renderWith(
      <Harness
        patch={{
          listingType: 'sale',
          ...pricing({ price: 15000000 }),
          ...area({ superBuiltUpArea: 1500 }),
        }}
      />
    );

    expect(screen.getByLabelText('Price per sq ft')).toHaveValue(10000);
    // Nothing is stored while the rate is only following the price: `toPayload`
    // writes the same figure on save (D33), and an empty field is what keeps it
    // following.
    expect(stored().pricePerSqft).toBeNull();
    expect(screen.getByRole('complementary', { name: 'Price preview' })).toHaveTextContent(
      '₹10,000 per sq ft'
    );
  });

  it('keeps following the price while it is the computed figure', async () => {
    renderWith(
      <Harness
        patch={{
          listingType: 'sale',
          ...pricing({ price: 15000000 }),
          ...area({ superBuiltUpArea: 1500 }),
        }}
      />
    );

    const price = screen.getByLabelText('Price');
    await userEvent.clear(price);
    await userEvent.type(price, '18000000');

    expect(screen.getByLabelText('Price per sq ft')).toHaveValue(12000);
  });

  it('leaves a rate the editor typed alone', async () => {
    renderWith(
      <Harness
        patch={{
          listingType: 'sale',
          ...pricing({ price: 15000000 }),
          ...area({ superBuiltUpArea: 1500 }),
        }}
      />
    );

    const rate = screen.getByLabelText('Price per sq ft');
    await userEvent.clear(rate);
    await userEvent.type(rate, '9500');

    const price = screen.getByLabelText('Price');
    await userEvent.clear(price);
    await userEvent.type(price, '18000000');

    expect(screen.getByLabelText('Price per sq ft')).toHaveValue(9500);
    expect(stored().pricePerSqft).toBe(9500);
  });

  it('treats a stored rate that is not the division as a rate somebody negotiated', () => {
    renderWith(
      <Harness
        patch={{
          listingType: 'sale',
          ...pricing({ price: 15000000, pricePerSqft: 9500 }),
          ...area({ superBuiltUpArea: 1500 }),
        }}
      />
    );

    expect(screen.getByLabelText('Price per sq ft')).toHaveValue(9500);
  });
});

describe('other charges', () => {
  it('adds a labelled row from a lease preset and shows it in the preview', async () => {
    renderWith(<Harness patch={{ listingType: 'lease' }} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add lock-in period' }));

    expect(screen.getByDisplayValue('Lock-in period')).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Price preview' })).toHaveTextContent(
      'Lock-in period'
    );
  });

  it('removes the row it added', async () => {
    renderWith(<Harness patch={{ listingType: 'sale' }} />);

    await userEvent.click(screen.getByRole('button', { name: 'Add a charge' }));
    expect(stored().otherCharges).toHaveLength(1);

    await userEvent.click(screen.getByRole('button', { name: 'Remove this charge' }));
    expect(stored().otherCharges).toHaveLength(0);
  });
});

describe('a read-only form (§7)', () => {
  it('disables every control', () => {
    renderWith(<Harness patch={{ listingType: 'sale' }} disabled />);

    expect(screen.getByLabelText('Price')).toBeDisabled();
    expect(screen.getByLabelText('Price on request')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add a charge' })).toBeDisabled();
  });
});
