import { Icon } from '@iconify/react';

import { Button } from '../ui';
import CallButton from './CallButton';
import WhatsAppButton from './WhatsAppButton';
import { LEADS } from '../../config/copy';

import styles from './LeadForm.module.css';

/** What a form says when it has nothing more specific to say. */
export const DEFAULT_SUCCESS_MESSAGE = LEADS.successMessage;

/**
 * The panel that replaces a lead form once the lead is filed.
 *
 * It is not only a receipt: a visitor who has just asked to be contacted is
 * the most likely person on the site to want to talk *now*, so the panel
 * offers the two ways of doing that. Both buttons are the shared
 * `WhatsAppButton` / `CallButton`, which means the click is tracked and — now
 * that this visitor is identified — recorded as a `whatsapp-click` or
 * `call-click` lead for the sales desk.
 *
 * @param {object} props
 * @param {string} [props.title]
 * @param {string} [props.message]
 * @param {Array<'whatsapp'|'call'>} [props.actions] which follow-ups to offer
 * @param {number|string|null} [props.propertyId] carried by the click events
 * @param {string} [props.propertyTitle] quoted in the WhatsApp message
 * @param {{name?: string, phone?: string, whatsapp?: string}|null} [props.agent]
 *   the listing's own advisor, when the editor published one
 * @param {{label: string, icon?: string, href?: string, onClick?: () => void,
 *   loading?: boolean}|null} [props.primaryAction] offered above the follow-ups —
 *   how a gated download hands the file over again when a pop-up blocker
 *   swallowed the tab it opened (BUG-08). A `href` makes it a real link, which
 *   no blocker intercepts; `loading` holds it while the address is fetched.
 * @param {(() => void)|null} [props.onClose]
 */
export default function LeadSuccess({
  title = LEADS.successTitle,
  message = DEFAULT_SUCCESS_MESSAGE,
  actions = ['whatsapp', 'call'],
  propertyId = null,
  propertyTitle = '',
  agent = null,
  primaryAction = null,
  onClose = null,
}) {
  const wanted = Array.isArray(actions) ? actions : [];

  return (
    <div className={styles.success} role="status">
      <Icon icon="mdi:check-circle-outline" className={styles.successIcon} aria-hidden="true" />
      <h3 className={styles.successTitle}>{title}</h3>
      <p className={styles.successText}>{message}</p>

      <div className={styles.successActions}>
        {primaryAction ? (
          <Button
            variant="primary"
            href={primaryAction.href}
            target={primaryAction.href ? '_blank' : undefined}
            rel={primaryAction.href ? 'noopener noreferrer' : undefined}
            onClick={primaryAction.onClick}
            loading={Boolean(primaryAction.loading)}
            icon={
              primaryAction.icon ? <Icon icon={primaryAction.icon} aria-hidden="true" /> : undefined
            }
          >
            {primaryAction.label}
          </Button>
        ) : null}

        {wanted.includes('whatsapp') ? (
          <WhatsAppButton
            variant="button"
            buttonVariant="secondary"
            propertyId={propertyId}
            propertyTitle={propertyTitle}
            number={agent?.whatsapp}
            label={LEADS.whatsapp}
            context="lead-success"
          />
        ) : null}

        {wanted.includes('call') ? (
          <CallButton
            variant="button"
            buttonVariant="outline"
            propertyId={propertyId}
            number={agent?.phone}
            context="lead-success"
          />
        ) : null}

        {onClose ? (
          <Button variant="ghost" onClick={onClose}>
            {LEADS.close}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
