import { useState } from 'react';

import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { SwitchField, TextField } from '../../../components/ui';
import { derivedPricePerSqft, heldPricePerSqft, isRentOrLease } from './property-form/fieldRules';
import { formatPrice } from '../../../utils/format';
import { previewLines } from './property-form/components/PricePreview';
import { publishProblems } from '../../../config/propertyRules';
import { validatePricing } from './property-form/validators/property';

import styles from './PropertiesListPage.module.css';

/** The boxes a sale shows, in the Pricing tab's words. */
const SALE_FIELDS = [
  { key: 'price', label: 'Price (₹)' },
  { key: 'priceRangeMin', label: 'Range from (₹)', half: true },
  { key: 'priceRangeMax', label: 'Range up to (₹)', half: true },
];

/** …and a rental or a lease. */
const RENTAL_FIELDS = [
  { key: 'rentPerMonth', label: 'Rent per month (₹)' },
  { key: 'securityDeposit', label: 'Security deposit (₹)', half: true },
  { key: 'maintenanceChargesMonthly', label: 'Maintenance per month (₹)', half: true },
];

/** The figures "Price on request" empties, as the Pricing tab does. */
const ON_REQUEST_CLEARS = [
  'price',
  'priceRangeMin',
  'priceRangeMax',
  'pricePerSqft',
  'rentPerMonth',
];

const asText = (value) => (value === null || value === undefined ? '' : String(value));
const asNumber = (text) => (String(text).trim() === '' ? null : Number(text));

/**
 * The `pricing` a PATCH sends: the listing's own, with the boxes of the dialog
 * over it. The rate per sq ft follows the price unless somebody typed one —
 * the form's rule (D33) — and a rental has none.
 *
 * @param {object} property
 * @param {object} texts the boxes, as typed
 * @param {{priceOnRequest: boolean, priceNegotiable: boolean}} flags
 * @returns {object}
 */
export function nextPricing(property, texts, flags) {
  const fields = isRentOrLease(property) ? RENTAL_FIELDS : SALE_FIELDS;
  const pricing = {
    ...(property.pricing ?? {}),
    ...Object.fromEntries(fields.map(({ key }) => [key, asNumber(texts[key] ?? '')])),
    priceOnRequest: flags.priceOnRequest,
    priceNegotiable: flags.priceNegotiable,
  };
  if (flags.priceOnRequest) {
    for (const key of ON_REQUEST_CLEARS) pricing[key] = null;
    return pricing;
  }
  if (isRentOrLease(property)) return { ...pricing, pricePerSqft: null };
  const typed = heldPricePerSqft(property);
  return {
    ...pricing,
    pricePerSqft:
      typed ?? derivedPricePerSqft({ ...property, pricing: { ...pricing, pricePerSqft: null } }),
  };
}

/**
 * "Edit price…" from a listing's row menu (prompt 51): the figure, the range
 * or the rent, checked as the Pricing tab checks them, and sent as a `PATCH`
 * of `pricing` alone — a price change is the edit a live listing gets most.
 *
 * A live listing keeps the publish rule: it may not be left without a price.
 *
 * @param {object} props
 * @param {object|null} props.property the row, or `null` when closed
 * @param {boolean} [props.loading]
 * @param {(body: {pricing: object}, headline: string) => void} props.onConfirm
 * @param {() => void} props.onClose
 */
export default function EditPriceDialog({ property, loading = false, onConfirm, onClose }) {
  const [texts, setTexts] = useState({});
  const [flags, setFlags] = useState({ priceOnRequest: false, priceNegotiable: false });
  const [touched, setTouched] = useState(false);

  const [seen, setSeen] = useState(null);
  if (property !== seen) {
    setSeen(property);
    if (property) {
      const pricing = property.pricing ?? {};
      setTexts(
        Object.fromEntries(
          [...SALE_FIELDS, ...RENTAL_FIELDS].map(({ key }) => [key, asText(pricing[key])])
        )
      );
      setFlags({
        priceOnRequest: pricing.priceOnRequest === true,
        priceNegotiable: pricing.priceNegotiable === true,
      });
      setTouched(false);
    }
  }

  if (!property) return null;

  const rental = isRentOrLease(property);
  const fields = rental ? RENTAL_FIELDS : SALE_FIELDS;
  const pricing = nextPricing(property, texts, flags);
  const record = { ...property, pricing };

  const typedErrors = Object.fromEntries(
    fields
      .filter(({ key }) => String(texts[key] ?? '').trim() !== '')
      .filter(({ key }) => !/^\d+(\.\d+)?$/.test(String(texts[key]).trim()))
      .map(({ key }) => [`pricing.${key}`, 'Enter an amount in rupees, digits only.'])
  );
  const errors = {
    ...validatePricing(record),
    ...(property.isActive === true ? publishProblems(record) : {}),
    ...typedErrors,
  };
  const fieldError = (key) => (touched ? errors[`pricing.${key}`] : undefined);
  // The publish rule names the headline box; a rental's rent, a sale's price.
  const shownKeys = new Set(fields.map(({ key }) => `pricing.${key}`));
  const invalid = Object.keys(errors).some((key) => shownKeys.has(key));
  const headline = previewLines(record)[0]?.text ?? '';

  const submit = (event) => {
    event?.preventDefault();
    setTouched(true);
    if (invalid) return;
    onConfirm?.({ pricing }, headline);
  };

  return (
    <Modal
      open
      onClose={loading ? undefined : onClose}
      dismissible={!loading}
      size="sm"
      mobile="fullscreen"
      title={`Price of “${property.title}”`}
      description={rental ? 'Rent and deposit, per month.' : 'A figure, a range, or both.'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="edit-price-form" loading={loading}>
            Save price
          </Button>
        </>
      }
    >
      <form id="edit-price-form" className={styles.priceForm} noValidate onSubmit={submit}>
        <div className={styles.priceGrid}>
          {fields.map((field) => (
            <div key={field.key} className={field.half ? styles.priceHalf : styles.priceFull}>
              <TextField
                label={field.label}
                inputMode="numeric"
                value={texts[field.key] ?? ''}
                disabled={flags.priceOnRequest || loading}
                error={fieldError(field.key)}
                hint={
                  asNumber(texts[field.key] ?? '') > 0
                    ? formatPrice(asNumber(texts[field.key]))
                    : undefined
                }
                onChange={(event) =>
                  setTexts((current) => ({
                    ...current,
                    [field.key]: event.target.value.replace(/[^\d.]/g, ''),
                  }))
                }
              />
            </div>
          ))}
        </div>
        <SwitchField
          label="Price on request"
          checked={flags.priceOnRequest}
          disabled={loading}
          onChange={(checked) => setFlags((current) => ({ ...current, priceOnRequest: checked }))}
        />
        <SwitchField
          label="Negotiable"
          checked={flags.priceNegotiable}
          disabled={loading}
          onChange={(checked) => setFlags((current) => ({ ...current, priceNegotiable: checked }))}
        />
        <p className={styles.priceHeadline}>
          The site will show: <strong>{headline}</strong>
        </p>
      </form>
    </Modal>
  );
}
