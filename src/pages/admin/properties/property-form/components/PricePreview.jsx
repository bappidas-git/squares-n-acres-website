import { Icon } from '@iconify/react';

import { formatPrice, formatPriceRange } from '../../../../../utils/format';
import { hasPriceRange, showsOnwards } from '../../../../../utils/priceDisplay';
import { derivedPricePerSqft } from '../fieldRules';

import styles from './PricePreview.module.css';

/** `pricing` → the lines the public page prints, in its order (D33). */
export function previewLines(values = {}) {
  const pricing = values.pricing ?? {};
  const rental = values.listingType === 'rent' || values.listingType === 'lease';
  const lines = [];

  if (pricing.priceOnRequest === true) {
    lines.push({ id: 'headline', text: 'Price on Request', headline: true });
  } else if (rental) {
    const rent = pricing.rentPerMonth;
    lines.push({
      id: 'headline',
      headline: true,
      text:
        rent === null || rent === undefined || rent === ''
          ? 'No rent yet'
          : formatPrice(rent, { perMonth: true }),
      missing: rent === null || rent === undefined || rent === '',
    });
  } else {
    // The card's own rules (`utils/priceDisplay`): a range when it has two
    // different ends, "onwards" only when the figure is the bottom of a range
    // or of several unit types — not under every single price.
    const hasRange = hasPriceRange(values);
    const hasPrice = pricing.price !== null && pricing.price !== undefined && pricing.price !== '';
    const onwards = showsOnwards(values) ? ' onwards' : '';

    if (hasRange) {
      lines.push({
        id: 'headline',
        headline: true,
        text: `${formatPriceRange(pricing.priceRangeMin, pricing.priceRangeMax)}${onwards}`,
      });
    } else if (hasPrice) {
      lines.push({
        id: 'headline',
        headline: true,
        text: `${formatPrice(pricing.price)}${onwards}`,
      });
    } else {
      lines.push({ id: 'headline', headline: true, text: 'No price yet', missing: true });
    }
  }

  // The stored rate is empty while it is following the price, and `toPayload`
  // fills it in on save (D33) — so the preview shows what will be saved.
  const perSqft =
    pricing.pricePerSqft === null ||
    pricing.pricePerSqft === undefined ||
    pricing.pricePerSqft === ''
      ? derivedPricePerSqft(values)
      : pricing.pricePerSqft;
  if (!rental && perSqft !== null && perSqft !== undefined && perSqft !== '') {
    lines.push({ id: 'perSqft', text: `${formatPrice(perSqft)} per sq ft` });
  }

  const maintenance = pricing.maintenanceChargesMonthly;
  if (maintenance !== null && maintenance !== undefined && maintenance !== '') {
    lines.push({
      id: 'maintenance',
      text: `+ ${formatPrice(maintenance, { perMonth: true })} maintenance`,
    });
  }

  const deposit = pricing.securityDeposit;
  if (rental && deposit !== null && deposit !== undefined && deposit !== '') {
    lines.push({ id: 'deposit', text: `${formatPrice(deposit)} deposit` });
  }

  const booking = pricing.bookingAmount;
  if (booking !== null && booking !== undefined && booking !== '') {
    const label = values.listingType === 'lease' ? 'advance' : 'booking amount';
    lines.push({ id: 'booking', text: `${formatPrice(booking)} ${label}` });
  }

  if (pricing.priceNegotiable === true) lines.push({ id: 'negotiable', text: 'Negotiable' });

  (pricing.otherCharges ?? [])
    .filter((charge) => String(charge.label ?? '').trim() !== '')
    .forEach((charge, index) => {
      const amount =
        charge.amount === null || charge.amount === undefined || charge.amount === ''
          ? null
          : formatPrice(charge.amount);
      lines.push({
        id: `charge-${charge.id ?? index}`,
        text: amount ? `${charge.label}: ${amount}` : charge.label,
      });
    });

  return lines;
}

/**
 * What the price will look like on the site, while it is being typed.
 *
 * Money on this form is entered in paise-free integers — `15000000` — and
 * printed in lakh and crore (D33). The gap between those two is wide enough
 * that an editor cannot check their own work, so the card prints exactly what
 * `formatPrice` will print on the card, the details page and the search result.
 *
 * @param {object} props
 * @param {object} props.values the whole form values — the listing type decides the shape
 */
export default function PricePreview({ values }) {
  const lines = previewLines(values);
  const [headline, ...rest] = lines;

  return (
    <aside className={styles.card} aria-label="Price preview">
      <p className={styles.eyebrow}>
        <Icon icon="mdi:eye-outline" width="16" height="16" aria-hidden="true" />
        On the site
      </p>
      <p
        className={[styles.headline, headline?.missing ? styles.missing : '']
          .filter(Boolean)
          .join(' ')}
      >
        {headline?.text}
      </p>
      {rest.length > 0 ? (
        <ul className={styles.lines}>
          {rest.map((line) => (
            <li key={line.id}>{line.text}</li>
          ))}
        </ul>
      ) : null}
    </aside>
  );
}
