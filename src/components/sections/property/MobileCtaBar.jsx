import { Icon } from '@iconify/react';

import { formatPhoneForTel, whatsappLink } from '../../../utils/format';
import { track } from '../../../utils/analytics';
import { useSiteSettings } from '../../../contexts/SiteSettingsContext';

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
 * @param {(source: string) => void} props.onEnquire
 */
export default function MobileCtaBar({ property, onEnquire }) {
  const { getContact, getWhatsappLink } = useSiteSettings();
  if (!property) return null;

  const agent = property.agent ?? {};
  const listed = agent.showOnListing === true;
  const contact = getContact();

  const phone = (listed && agent.phone) || contact.phone;
  const phoneHref = phone ? `tel:${formatPhoneForTel(phone)}` : '';

  const message = `Hi, I am interested in ${property.title}${
    typeof window === 'undefined' ? '' : ` — ${window.location.href}`
  }`;
  const whatsappHref =
    (listed ? whatsappLink(agent.whatsapp, message) : '') || getWhatsappLink(message);

  return (
    <div className={styles.bar} role="region" aria-label="Contact about this property">
      {phoneHref ? (
        <a
          className={styles.action}
          href={phoneHref}
          onClick={() => track('call_click', { propertyId: property.id, context: 'cta-bar' })}
        >
          <Icon icon="mdi:phone-outline" className={styles.icon} aria-hidden="true" />
          <span>Call</span>
        </a>
      ) : null}

      {whatsappHref ? (
        <a
          className={styles.action}
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('whatsapp_click', { propertyId: property.id, context: 'cta-bar' })}
        >
          <Icon icon="mdi:whatsapp" className={styles.icon} aria-hidden="true" />
          <span>WhatsApp</span>
        </a>
      ) : null}

      <button
        type="button"
        className={`${styles.action} ${styles.primary}`}
        onClick={() => onEnquire?.('property-enquiry')}
      >
        <Icon icon="mdi:email-fast-outline" className={styles.icon} aria-hidden="true" />
        <span>Enquire</span>
      </button>
    </div>
  );
}
