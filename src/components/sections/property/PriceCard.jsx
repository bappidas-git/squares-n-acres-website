import { Icon } from '@iconify/react';

import { Button, Chip, Price } from '../../ui';
import { DEFAULT_LTV_PERCENT, DEFAULT_TENURE_YEARS, startingEmi } from '../../../utils/finance';
import { formatPrice } from '../../../utils/format';
import { track } from '../../../utils/analytics';
import { useSiteSettings } from '../../../contexts/SiteSettingsContext';
import AgentCard from './AgentCard';

import styles from './PriceCard.module.css';

/** The three ways a visitor asks to be contacted, and the source each records. */
const CTAS = [
  {
    source: 'property-enquiry',
    label: 'Enquire now',
    variant: 'primary',
    icon: 'mdi:email-fast-outline',
  },
  {
    source: 'callback-request',
    label: 'Request a call back',
    variant: 'outline',
    icon: 'mdi:phone-return-outline',
  },
  {
    source: 'site-visit-request',
    label: 'Schedule a site visit',
    variant: 'outline',
    icon: 'mdi:calendar-check-outline',
  },
];

/**
 * What the property costs and how to ask about it.
 *
 * The figure follows the listing type: a sale prints the price (or the range
 * the unit configurations span, with "onwards"), a rent or a lease prints the
 * monthly figure and the deposit under it, and a listing marked
 * `priceOnRequest` prints exactly that — with no EMI line under it, because
 * there is no principal to compute one from (§7).
 *
 * The EMI is the cheapest active lender's advertised rate over twenty years at
 * 80 % of the price, and the footnote says so. With no active lender the line
 * is absent rather than falling back to an invented rate (§6.6).
 *
 * @param {object} props
 * @param {object} props.property a record of §6.1
 * @param {Array<object>} [props.banks] the active lenders
 * @param {(source: string) => void} props.onRequest opens the lead dialog
 */
export default function PriceCard({ property, banks = [], onRequest }) {
  const { getWhatsappLink } = useSiteSettings();
  if (!property) return null;

  const pricing = property.pricing ?? {};
  const onRequestPrice = pricing.priceOnRequest === true;
  const isRental = property.listingType === 'rent' || property.listingType === 'lease';
  const hasRange =
    !isRental &&
    !onRequestPrice &&
    Boolean(pricing.priceRangeMin) &&
    Boolean(pricing.priceRangeMax) &&
    pricing.priceRangeMin !== pricing.priceRangeMax;

  const units = Array.isArray(property.unitConfigurations)
    ? property.unitConfigurations.filter((unit) => unit?.isActive !== false)
    : [];
  const onwards = !isRental && !onRequestPrice && (hasRange || units.length > 1);

  // "EMI from" quotes the lowest instalment the card's own figure implies, so a
  // listing showing "₹88.5 L – ₹1.42 Cr" computes it from the ₹88.5 L end.
  const emi =
    isRental || onRequestPrice
      ? null
      : startingEmi(hasRange ? pricing.priceRangeMin : pricing.price, banks);

  const whatsappMessage = `Hi, I am interested in ${property.title}${
    typeof window === 'undefined' ? '' : ` — ${window.location.href}`
  }`;
  const whatsappHref = getWhatsappLink(whatsappMessage);

  return (
    <aside className={styles.card} aria-label="Price and enquiry">
      <div className={styles.priceRow}>
        {onRequestPrice ? (
          <Price value={null} onRequest size="lg" accent />
        ) : isRental ? (
          <Price value={pricing.rentPerMonth} listingType={property.listingType} size="lg" accent />
        ) : hasRange ? (
          <Price min={pricing.priceRangeMin} max={pricing.priceRangeMax} size="lg" accent />
        ) : (
          <Price value={pricing.price} size="lg" accent />
        )}
        {onwards ? <span className={styles.onwards}>onwards</span> : null}
      </div>

      {!isRental && !onRequestPrice && pricing.pricePerSqft ? (
        <p className={styles.perSqft}>{formatPrice(pricing.pricePerSqft)} per sq ft</p>
      ) : null}

      {isRental && pricing.securityDeposit ? (
        <p className={styles.perSqft}>
          Security deposit {formatPrice(pricing.securityDeposit)}
          {pricing.maintenanceChargesMonthly
            ? ` · Maintenance ${formatPrice(pricing.maintenanceChargesMonthly, { perMonth: true })}`
            : ''}
        </p>
      ) : null}

      {pricing.priceNegotiable || pricing.bookingAmount ? (
        <div className={styles.chips}>
          {pricing.priceNegotiable ? <Chip tone="success">Negotiable</Chip> : null}
          {pricing.bookingAmount ? (
            <Chip tone="info">Booking amount {formatPrice(pricing.bookingAmount)}</Chip>
          ) : null}
        </div>
      ) : null}

      {emi ? (
        <p className={styles.emi}>
          <Icon icon="mdi:bank-outline" aria-hidden="true" />
          <span>
            EMI from <strong>{formatPrice(emi.emi, { perMonth: true })}</strong>
            <span aria-hidden="true">*</span>
          </span>
        </p>
      ) : null}

      <div className={styles.ctas}>
        {CTAS.map((cta) => (
          <Button
            key={cta.source}
            variant={cta.variant}
            fullWidth
            icon={<Icon icon={cta.icon} aria-hidden="true" />}
            onClick={() => onRequest?.(cta.source)}
          >
            {cta.label}
          </Button>
        ))}

        {whatsappHref ? (
          <Button
            variant="secondary"
            fullWidth
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            icon={<Icon icon="mdi:whatsapp" aria-hidden="true" />}
            onClick={() => track('whatsapp_click', { propertyId: property.id })}
          >
            WhatsApp us
          </Button>
        ) : null}
      </div>

      {emi ? (
        <p className={styles.footnote}>
          *Indicative, {emi.ltvPercent ?? DEFAULT_LTV_PERCENT} % loan to value,{' '}
          {emi.years ?? DEFAULT_TENURE_YEARS} years at {emi.annualRate} % p.a. Your bank decides the
          rate and the amount.
        </p>
      ) : null}

      <AgentCard agent={property.agent} propertyTitle={property.title} propertyId={property.id} />
    </aside>
  );
}
