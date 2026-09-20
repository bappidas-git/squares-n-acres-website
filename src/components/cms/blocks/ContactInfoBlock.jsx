import { Icon } from '@iconify/react';

import ContactMethods from '../../sections/shared/ContactMethods';
import { Container, Section } from '../../ui';
import { useSiteSettings } from '../../../contexts/SiteSettingsContext';

import styles from './blocks.module.css';

/**
 * How to reach us (§6.10 `contactInfo`), entirely from Site settings (D83).
 *
 * The boilerplate's contact page printed a phone number, an address and five
 * `#` social links as JSX (ADD-17). Every one of them is a settings field now,
 * and a field the client has not provided renders nothing at all — no empty
 * card, no dead link. With none of them provided the whole band stands down.
 */

const SOCIAL = {
  facebook: { icon: 'mdi:facebook', label: 'Facebook' },
  instagram: { icon: 'mdi:instagram', label: 'Instagram' },
  linkedin: { icon: 'mdi:linkedin', label: 'LinkedIn' },
  youtube: { icon: 'mdi:youtube', label: 'YouTube' },
  x: { icon: 'mdi:twitter', label: 'X' },
  pinterest: { icon: 'mdi:pinterest', label: 'Pinterest' },
};

export default function ContactInfoBlock({ data = {}, background = 'bg' }) {
  const { settings, getContact } = useSiteSettings();
  const contact = getContact();

  const address = [
    contact.address?.line1,
    contact.address?.line2,
    contact.address?.locality,
    contact.address?.city,
    contact.address?.state,
    contact.address?.pincode,
  ]
    .filter(Boolean)
    .join(', ');

  const hours = (contact.workingHours ?? []).filter((row) => row?.days && row?.hours);

  const social = Object.entries(settings?.social ?? {})
    .filter(([key, url]) => Boolean(url) && SOCIAL[key])
    .map(([key, url]) => ({ key, href: url, ...SOCIAL[key] }));

  const hasMethods = Boolean(contact.phone || contact.email || contact.whatsappNumber);
  if (!hasMethods && !address && hours.length === 0 && social.length === 0) return null;

  // The block's own title is the h2 the cards sit under. It is optional, and
  // the seeded contact page leaves it out — which left the three cards at h3
  // directly below the page's h1, a level with nothing in it. Without a title
  // the cards *are* the top level of the band, so they take the h2 themselves.
  const CardHeading = data.title ? 'h3' : 'h2';

  return (
    <Section background={background} spacing="lg">
      <Container>
        {data.title ? <h2 className={styles.contactHeading}>{data.title}</h2> : null}

        {hasMethods ? <ContactMethods /> : null}

        <div className={styles.contactGrid}>
          {address ? (
            <div className={styles.contactCard}>
              <CardHeading className={styles.contactCardTitle}>
                <Icon icon="mdi:map-marker-outline" width="20" height="20" aria-hidden="true" />
                Office
              </CardHeading>
              <address className={styles.contactAddress}>{address}</address>
            </div>
          ) : null}

          {hours.length > 0 ? (
            <div className={styles.contactCard}>
              <CardHeading className={styles.contactCardTitle}>
                <Icon icon="mdi:clock-outline" width="20" height="20" aria-hidden="true" />
                Working hours
              </CardHeading>
              <dl className={styles.hours}>
                {hours.map((row) => (
                  <div key={row.days} className={styles.hoursRow}>
                    <dt className={styles.hoursDays}>{row.days}</dt>
                    <dd className={styles.hoursTime}>{row.hours}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          {social.length > 0 ? (
            <div className={styles.contactCard}>
              <CardHeading className={styles.contactCardTitle}>
                <Icon icon="mdi:share-variant-outline" width="20" height="20" aria-hidden="true" />
                Follow us
              </CardHeading>
              <ul className={styles.social}>
                {social.map((item) => (
                  <li key={item.key}>
                    <a
                      className={styles.socialLink}
                      href={item.href}
                      aria-label={item.label}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Icon icon={item.icon} width="20" height="20" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </Container>
    </Section>
  );
}
