import { Icon } from '@iconify/react';

import Avatar from '../../ui/Avatar';
import LazyImage from '../../ui/LazyImage';
import SectionHeader from '../../ui/SectionHeader';
import { formatPhoneForTel } from '../../../utils/format';
import { useSiteSettings } from '../../../contexts/SiteSettingsContext';

import styles from './TeamSection.module.css';

/**
 * The advisors, as cards: three across on a desktop, two on a tablet, one on a
 * phone. Used by the About page and the CMS `team` block (prompt 30).
 *
 * A member without a photograph gets their initials rather than an empty box,
 * and a member with no phone, WhatsApp or e-mail gets no icon row at all — a
 * row of buttons that lead nowhere is worse than no row (§8.2).
 *
 * @param {object} props
 * @param {Array<object>} props.items §6.9 team members
 * @param {string} [props.title]
 * @param {string} [props.subtitle]
 * @param {string} [props.eyebrow]
 */
export default function TeamSection({
  items = [],
  title = 'The people you will be dealing with',
  subtitle = '',
  eyebrow = '',
  className = '',
}) {
  const { getWhatsappLink } = useSiteSettings();

  const visible = items.filter((member) => member && member.isActive !== false);
  if (visible.length === 0) return null;

  return (
    <div className={[styles.section, className].filter(Boolean).join(' ')}>
      {title ? (
        <SectionHeader eyebrow={eyebrow} title={title} subtitle={subtitle} align="center" />
      ) : null}

      <ul className={styles.grid}>
        {visible.map((member) => (
          <li key={member.id} className={styles.cell}>
            <TeamCard member={member} getWhatsappLink={getWhatsappLink} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One advisor. */
function TeamCard({ member, getWhatsappLink }) {
  const contacts = [
    member.phone
      ? {
          key: 'phone',
          icon: 'mdi:phone-outline',
          href: `tel:${formatPhoneForTel(member.phone)}`,
          label: `Call ${member.name}`,
        }
      : null,
    member.whatsapp
      ? {
          key: 'whatsapp',
          icon: 'mdi:whatsapp',
          href: getWhatsappLink(`Hello, I would like to speak to ${member.name}.`),
          label: `Message ${member.name} on WhatsApp`,
          external: true,
        }
      : null,
    member.email
      ? {
          key: 'email',
          icon: 'mdi:email-outline',
          href: `mailto:${member.email}`,
          label: `E-mail ${member.name}`,
        }
      : null,
  ].filter((entry) => entry && entry.href);

  const social = [
    member.socialLinks?.linkedin
      ? {
          key: 'linkedin',
          icon: 'mdi:linkedin',
          href: member.socialLinks.linkedin,
          label: 'on LinkedIn',
        }
      : null,
    member.socialLinks?.twitter
      ? { key: 'twitter', icon: 'mdi:twitter', href: member.socialLinks.twitter, label: 'on X' }
      : null,
    member.socialLinks?.website
      ? { key: 'website', icon: 'mdi:web', href: member.socialLinks.website, label: 'website' }
      : null,
  ].filter(Boolean);

  return (
    <article className={styles.card}>
      <div className={styles.photo}>
        {member.photoUrl ? (
          <LazyImage
            src={member.photoUrl}
            alt={member.name}
            ratio="1"
            className={styles.image}
            onErrorFallback={<Avatar name={member.name} size={96} />}
          />
        ) : (
          <span className={styles.initials}>
            <Avatar name={member.name} size={96} />
          </span>
        )}
      </div>

      <h3 className={styles.name}>{member.name}</h3>
      {member.designation ? <p className={styles.role}>{member.designation}</p> : null}
      {member.reraId ? (
        <p className={styles.rera}>
          <Icon icon="mdi:shield-check-outline" width="16" height="16" aria-hidden="true" />
          RERA {member.reraId}
        </p>
      ) : null}

      {contacts.length > 0 ? (
        <div className={styles.contacts}>
          {contacts.map((contact) => (
            <a
              key={contact.key}
              className={styles.contact}
              href={contact.href}
              aria-label={contact.label}
              {...(contact.external ? { target: '_blank', rel: 'noopener noreferrer' } : null)}
            >
              <Icon icon={contact.icon} width="20" height="20" aria-hidden="true" />
            </a>
          ))}
        </div>
      ) : null}

      {social.length > 0 ? (
        <div className={styles.social}>
          {social.map((link) => (
            <a
              key={link.key}
              className={styles.socialLink}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${member.name} ${link.label}`}
            >
              <Icon icon={link.icon} width="18" height="18" aria-hidden="true" />
            </a>
          ))}
        </div>
      ) : null}
    </article>
  );
}
