import { useState } from 'react';
import { Icon } from '@iconify/react';

import { Button } from '../../ui';
import { formatPhoneForTel, whatsappLink } from '../../../utils/format';
import { leadStorage } from '../../../utils/leadStorage';
import LeadForm from '../../common/LeadForm';
import SectionShell from './SectionShell';
import { track } from '../../../utils/analytics';
import { useSiteSettings } from '../../../contexts/SiteSettingsContext';

import styles from './EnquirySection.module.css';

/**
 * The one enquiry form on the page.
 *
 * The boilerplate mounted `EnquiryForm` three times — in the sidebar, in the
 * page and inside a mobile drawer — so a visitor met the same four boxes three
 * times over and the page carried three copies of their state (ADD-12). There
 * is one form here; the price card, the sticky bar and the gated sections all
 * open the dialog instead.
 *
 * Switching the section off hides this block only: the sticky bar and the
 * enquire buttons stay, because a listing must always be enquirable (D86).
 *
 * @param {object} props
 * @param {object} props.property a record of §6.1
 * @param {'bg'|'surface'} [props.background]
 */
export default function EnquirySection({ property, background = 'bg' }) {
  const { getContact, getWhatsappLink } = useSiteSettings();
  const [sent, setSent] = useState(false);

  const propertyId = property?.id ?? null;
  const title = property?.title ?? 'this property';
  const saved = leadStorage.getUserDetails() ?? {};

  const agent = property?.agent?.showOnListing ? property.agent : null;
  const contact = getContact();
  const phone = agent?.phone || contact.phone;
  const phoneHref = phone ? `tel:${formatPhoneForTel(phone)}` : '';
  const whatsappHref =
    whatsappLink(agent?.whatsapp, `Hi, I am interested in ${title}`) ||
    getWhatsappLink(`Hi, I am interested in ${title}`);

  const fields = [
    {
      name: 'name',
      label: 'Your name',
      type: 'text',
      required: true,
      placeholder: 'Your name *',
      defaultValue: saved.name || '',
    },
    {
      name: 'phone',
      label: 'Phone',
      type: 'tel',
      required: true,
      placeholder: 'Phone number *',
      defaultValue: saved.phone || '',
    },
    {
      name: 'email',
      label: 'E-mail',
      type: 'email',
      required: false,
      placeholder: 'E-mail address',
      defaultValue: saved.email || '',
    },
    {
      name: 'message',
      label: 'Message',
      type: 'textarea',
      required: false,
      placeholder: 'Anything we should know?',
      defaultValue: `I'm interested in ${title}`,
    },
  ];

  return (
    <SectionShell
      id="enquiry"
      title={`Interested in ${title}?`}
      subtitle="Tell us how to reach you and an advisor will call with the price sheet, the availability and a site visit slot."
      background={background}
    >
      <div className={styles.panel}>
        {sent ? (
          <div className={styles.sent}>
            <Icon icon="mdi:check-circle-outline" className={styles.sentIcon} aria-hidden="true" />
            <h3 className={styles.sentTitle}>Thank you — we have your enquiry</h3>
            <p className={styles.sentText}>
              An advisor will get back to you as soon as possible. Everything on this page is open
              to you now, including the brochure and the papers.
            </p>
            <div className={styles.sentActions}>
              {whatsappHref ? (
                <Button
                  variant="secondary"
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  icon={<Icon icon="mdi:whatsapp" aria-hidden="true" />}
                  onClick={() =>
                    track('whatsapp_click', { propertyId, source: 'property-enquiry' })
                  }
                >
                  Message on WhatsApp
                </Button>
              ) : null}
              {phoneHref ? (
                <Button
                  variant="outline"
                  href={phoneHref}
                  icon={<Icon icon="mdi:phone-outline" aria-hidden="true" />}
                  onClick={() => track('call_click', { propertyId, source: 'property-enquiry' })}
                >
                  Call {phone}
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <LeadForm
            title=""
            fields={fields}
            source="property-enquiry"
            propertyId={propertyId}
            className={styles.form}
            onSuccess={(values) => {
              // A property enquiry identifies the visitor for the whole listing,
              // so `leadStorage` opens every gated kind on it (prompt 24 §7).
              leadStorage.save(values, propertyId, 'property-enquiry');
              setSent(true);
            }}
          />
        )}
      </div>
    </SectionShell>
  );
}
