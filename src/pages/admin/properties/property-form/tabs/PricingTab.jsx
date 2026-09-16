import FormSection, { FormColumn } from '../../../../../components/admin/FormSection';
import { SwitchField } from '../../../../../components/ui';
import { LISTING_TYPES } from '../../../../../config/enums';
import { formatPrice } from '../../../../../utils/format';
import { makeOtherCharge } from '../initialState';
import NumberWithUnit from '../components/NumberWithUnit';
import OtherChargesRepeater from '../components/OtherChargesRepeater';
import PricePreview from '../components/PricePreview';
import { derivedPricePerSqft, isRentOrLease } from '../fieldRules';
import { usePropertyFormContext } from '../PropertyFormContext';

import styles from './PropertyTabs.module.css';

/** The clauses a commercial lease repeats on every listing (§3 of prompt 19). */
const LEASE_PRESETS = [
  { label: 'Lock-in period', note: 'In months' },
  { label: 'Annual escalation', note: 'Per cent a year' },
];

/** The sale fields `priceOnRequest` disables, and the value each returns to. */
const ON_REQUEST_CLEARS = {
  'pricing.price': null,
  'pricing.priceRangeMin': null,
  'pricing.priceRangeMax': null,
  'pricing.pricePerSqft': null,
  'pricing.rentPerMonth': null,
};

/** A number the editor actually entered, rather than an empty control. */
const has = (value) => value !== null && value !== undefined && value !== '';

/**
 * Tab 3 — Pricing.
 *
 * Money is entered as plain integers and printed in lakh and crore (D33), which
 * is a gap wide enough that an editor cannot proof-read their own typing. So
 * every amount carries the formatted figure underneath it, and the card beside
 * the fields prints the whole block exactly as the listing page will.
 *
 * `pricePerSqft` is derived while nobody has touched it and left alone the
 * moment somebody does — developers quote a rate that is not the division.
 */
export default function PricingTab() {
  const { values, errors, setField, setFields, addItem, removeItem, updateItem, disabled } =
    usePropertyFormContext();

  const pricing = values.pricing ?? {};
  const rental = isRentOrLease(values);
  const onRequest = pricing.priceOnRequest === true;

  // The rate is the one field of the form that is usually arithmetic and
  // occasionally a negotiation, so it is *shown* derived and *stored* only
  // when somebody types one: an empty `pricing.pricePerSqft` means "follow the
  // price", and `toPayload` fills the same figure in on save (D33). Holding the
  // flag in the record rather than in this component is what makes the rate
  // survive a tab switch — and a reload — still following the price.
  const manual = has(pricing.pricePerSqft);
  const rate = manual ? pricing.pricePerSqft : derivedPricePerSqft(values);

  const toggleOnRequest = (checked) => {
    if (!checked) {
      setField('pricing.priceOnRequest', false);
      return;
    }
    setFields({ 'pricing.priceOnRequest': true, ...ON_REQUEST_CLEARS });
  };

  const money = (key) => ({
    prefix: '₹',
    min: 0,
    value: pricing[key] ?? '',
    error: errors[`pricing.${key}`],
    readout: has(pricing[key]) ? formatPrice(pricing[key]) : null,
    onChange: (amount) => setField(`pricing.${key}`, amount),
  });

  const advanceLabel = values.listingType === 'lease' ? 'Advance' : 'Booking amount';

  return (
    <>
      <FormSection
        title={rental ? 'Rent' : 'Price'}
        description={
          rental
            ? 'What a tenant pays every month, and what they put down before moving in.'
            : `What this listing is quoted at. ${LISTING_TYPES.labelOf(values.listingType)} listings show a starting price, a range, or neither.`
        }
      >
        <FormColumn half>
          <SwitchField
            label="Price on request"
            checked={onRequest}
            disabled={disabled}
            hint="The listing prints “Price on Request” and every amount below is cleared."
            onChange={toggleOnRequest}
          />
        </FormColumn>

        <FormColumn half>
          <SwitchField
            label="Negotiable"
            checked={pricing.priceNegotiable === true}
            disabled={disabled}
            hint="Adds a “Negotiable” note beside the price."
            onChange={(checked) => setField('pricing.priceNegotiable', checked)}
          />
        </FormColumn>

        {rental ? (
          <>
            <FormColumn half>
              <NumberWithUnit
                label="Rent per month"
                suffix="/ month"
                disabled={disabled || onRequest}
                hint="The headline figure on the card and the details page."
                {...money('rentPerMonth')}
              />
            </FormColumn>

            <FormColumn half>
              <NumberWithUnit
                label="Security deposit"
                disabled={disabled}
                hint="Typically 5–10 months of rent in Bengaluru."
                {...money('securityDeposit')}
              />
            </FormColumn>

            <FormColumn half>
              <NumberWithUnit
                label="Maintenance per month"
                suffix="/ month"
                disabled={disabled}
                hint="Printed under the rent as “+ ₹2,500/month maintenance”."
                {...money('maintenanceChargesMonthly')}
              />
            </FormColumn>

            <FormColumn half>
              <NumberWithUnit
                label={advanceLabel}
                disabled={disabled}
                {...money('bookingAmount')}
              />
            </FormColumn>
          </>
        ) : (
          <>
            <FormColumn half>
              <NumberWithUnit
                label="Price"
                disabled={disabled || onRequest}
                hint="The starting price — the listing prints it as “₹1.42 Cr onwards”."
                {...money('price')}
              />
            </FormColumn>

            <FormColumn half>
              <NumberWithUnit
                label="Price per sq ft"
                suffix="/ sq ft"
                disabled={disabled || onRequest}
                hint={
                  manual
                    ? 'Entered by hand. Clear the field to go back to the computed rate.'
                    : 'Computed from the price and the area. Type over it to fix the rate the developer quotes.'
                }
                {...money('pricePerSqft')}
                value={rate ?? ''}
                readout={rate === null ? null : formatPrice(rate)}
                onChange={(amount) => setField('pricing.pricePerSqft', amount)}
              />
            </FormColumn>

            <FormColumn half>
              <NumberWithUnit
                label="Range — lowest"
                disabled={disabled || onRequest}
                hint="For a project with several unit types. Both ends or neither."
                {...money('priceRangeMin')}
              />
            </FormColumn>

            <FormColumn half>
              <NumberWithUnit
                label="Range — highest"
                disabled={disabled || onRequest}
                {...money('priceRangeMax')}
              />
            </FormColumn>

            <FormColumn half>
              <NumberWithUnit
                label={advanceLabel}
                disabled={disabled}
                hint="What a buyer pays to block the unit."
                {...money('bookingAmount')}
              />
            </FormColumn>

            <FormColumn half>
              <NumberWithUnit
                label="Maintenance per month"
                suffix="/ month"
                disabled={disabled}
                hint="Printed under the price when the building charges one."
                {...money('maintenanceChargesMonthly')}
              />
            </FormColumn>
          </>
        )}

        <FormColumn>
          <div className={styles.sticky}>
            <PricePreview values={values} />
          </div>
        </FormColumn>
      </FormSection>

      <FormSection
        title="Other charges"
        description="Everything a buyer or a tenant pays beside the headline figure. Each row is printed under the price."
      >
        <FormColumn>
          <OtherChargesRepeater
            charges={pricing.otherCharges ?? []}
            errors={errors}
            disabled={disabled}
            presets={rental ? LEASE_PRESETS : []}
            onAdd={(patch) => addItem('pricing.otherCharges', makeOtherCharge(patch))}
            onUpdate={(id, patch) => updateItem('pricing.otherCharges', id, patch)}
            onRemove={(id) => removeItem('pricing.otherCharges', id)}
          />
        </FormColumn>
      </FormSection>
    </>
  );
}
