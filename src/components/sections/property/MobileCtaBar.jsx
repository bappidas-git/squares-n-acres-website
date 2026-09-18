import { Icon } from '@iconify/react';

import CallButton from '../../common/CallButton';
import WhatsAppButton from '../../common/WhatsAppButton';

import styles from './MobileCtaBar.module.css';

/**
 * Call · WhatsApp · Enquire, fixed to the bottom of a phone screen.
 *
 * It takes the place of the site's bottom navigation on this one page: a
 * visitor reading a listing wants to reach somebody about *this* property, and
 * two stacked bars would cover a third of the screen. The number is the
 * listing's own advisor when the editor published one, and the company line
 * otherwise (§14 — never a hardcoded number).
 *
 * D86: this bar is the reason `sectionVisibility.enquiry` may be switched off
 * without a listing becoming uncontactable.
 *
 * @param {object} props
 * @param {object} props.property
 * @param {(entry: string) => void} props.onEnquire
 * @param {object} [props.triggerProps] spread onto the enquiry button — see `PriceCard`
 */
export default function MobileCtaBar({ property, onEnquire, triggerProps }) {
  if (!property) return null;

  const agent = property.agent ?? {};
  const listed = agent.showOnListing === true;

  return (
    <div className={styles.bar} role="region" aria-label="Contact about this property">
      <CallButton
        variant="link"
        number={listed ? agent.phone : undefined}
        propertyId={property.id}
        label="Call"
        context="cta-bar"
        className={styles.action}
        iconClassName={styles.icon}
      />

      <WhatsAppButton
        variant="link"
        number={listed ? agent.whatsapp : undefined}
        propertyId={property.id}
        propertyTitle={property.title}
        label="WhatsApp"
        context="cta-bar"
        className={styles.action}
        iconClassName={styles.icon}
      />

      <button
        type="button"
        className={`${styles.action} ${styles.primary}`}
        onClick={() => onEnquire?.('property-enquiry')}
        {...triggerProps}
      >
        <Icon icon="mdi:email-fast-outline" className={styles.icon} aria-hidden="true" />
        <span>Enquire</span>
      </button>
    </div>
  );
}
