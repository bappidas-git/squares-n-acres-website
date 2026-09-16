import { Icon } from '@iconify/react';

import { Avatar } from '../../ui';
import { formatPhoneForTel, whatsappLink } from '../../../utils/format';
import { track } from '../../../utils/analytics';

import styles from './AgentCard.module.css';

/**
 * Who to talk to about this listing.
 *
 * Shown only when the editor asked for it (`agent.showOnListing`, §6.1) — the
 * API strips the number from the record altogether when they did not, so there
 * is nothing here to leak. The photograph falls back to the person's initials
 * rather than to a stock silhouette.
 *
 * @param {object} props
 * @param {{name?: string, phone?: string, whatsapp?: string, email?: string,
 *   photoUrl?: string, showOnListing?: boolean}} props.agent
 * @param {string} [props.propertyTitle] quoted in the WhatsApp message
 * @param {number|string} [props.propertyId] carried by the click events
 */
export default function AgentCard({ agent, propertyTitle = '', propertyId }) {
  if (!agent || agent.showOnListing !== true) return null;

  const name = agent.name || 'Your advisor';
  const phoneHref = agent.phone ? `tel:${formatPhoneForTel(agent.phone)}` : '';
  const whatsappHref = whatsappLink(
    agent.whatsapp,
    propertyTitle ? `Hi, I am interested in ${propertyTitle}` : 'Hi, I would like to know more.'
  );
  const emailHref = agent.email
    ? `mailto:${agent.email}${propertyTitle ? `?subject=${encodeURIComponent(propertyTitle)}` : ''}`
    : '';

  if (!phoneHref && !whatsappHref && !emailHref) return null;

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <Avatar src={agent.photoUrl || undefined} name={name} size={48} />
        <div className={styles.headText}>
          <p className={styles.label}>Your advisor</p>
          <p className={styles.name}>{name}</p>
        </div>
      </div>

      <div className={styles.actions}>
        {phoneHref ? (
          <a
            className={styles.action}
            href={phoneHref}
            onClick={() => track('call_click', { propertyId, context: 'agent-card' })}
          >
            <Icon icon="mdi:phone-outline" aria-hidden="true" />
            Call
          </a>
        ) : null}
        {whatsappHref ? (
          <a
            className={styles.action}
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('whatsapp_click', { propertyId, context: 'agent-card' })}
          >
            <Icon icon="mdi:whatsapp" aria-hidden="true" />
            WhatsApp
          </a>
        ) : null}
        {emailHref ? (
          <a className={styles.action} href={emailHref}>
            <Icon icon="mdi:email-outline" aria-hidden="true" />
            E-mail
          </a>
        ) : null}
      </div>
    </div>
  );
}
