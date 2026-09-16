import { Icon } from '@iconify/react';

import { useSiteSettings } from '../../../contexts/SiteSettingsContext';

import styles from './ContactMethods.module.css';

/**
 * Phone, e-mail and WhatsApp, from the settings record (D83).
 *
 * The boilerplate printed a US phone number on the FAQ page and five `#`
 * links on the contact page (ADD-17); every number here comes from
 * `siteSettings.general`, and a method the client has not provided is simply
 * not rendered — including all three, in which case the component renders
 * nothing rather than an empty grid.
 *
 * @param {object} props
 * @param {string} [props.whatsappMessage] overrides the configured default
 * @param {'row'|'stack'} [props.layout]
 */
export default function ContactMethods({ whatsappMessage, layout = 'row', className = '' }) {
  const { getContact, getWhatsappLink } = useSiteSettings();
  const contact = getContact();
  const whatsappLink = contact.whatsappNumber ? getWhatsappLink(whatsappMessage) : '';

  const methods = [
    contact.phone
      ? {
          key: 'phone',
          icon: 'mdi:phone-outline',
          label: 'Call us',
          value: contact.phone,
          href: contact.phoneHref,
        }
      : null,
    contact.email
      ? {
          key: 'email',
          icon: 'mdi:email-outline',
          label: 'E-mail us',
          value: contact.email,
          href: `mailto:${contact.email}`,
        }
      : null,
    whatsappLink
      ? {
          key: 'whatsapp',
          icon: 'mdi:whatsapp',
          label: 'WhatsApp',
          value: 'Chat with an advisor',
          href: whatsappLink,
          external: true,
        }
      : null,
  ].filter(Boolean);

  if (methods.length === 0) return null;

  return (
    <ul
      className={[styles.methods, layout === 'stack' ? styles.stack : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      {methods.map((method) => (
        <li key={method.key}>
          <a
            className={styles.method}
            href={method.href}
            {...(method.external ? { target: '_blank', rel: 'noopener noreferrer' } : null)}
          >
            <span className={styles.icon} aria-hidden="true">
              <Icon icon={method.icon} width="22" height="22" />
            </span>
            <span className={styles.text}>
              <span className={styles.label}>{method.label}</span>
              <span className={styles.value}>{method.value}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
