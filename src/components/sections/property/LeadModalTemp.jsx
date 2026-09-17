import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';

import { Button, Modal } from '../../ui';
import { LEAD_SOURCES } from '../../../config/enums';
import { formatPhoneForTel, whatsappLink } from '../../../utils/format';
import { leadStorage } from '../../../utils/leadStorage';
import { track } from '../../../utils/analytics';
import { useSiteSettings } from '../../../contexts/SiteSettingsContext';
import LeadForm from '../../common/LeadForm';

import styles from './LeadModalTemp.module.css';

/**
 * TEMPORARY — one dialog for every "tell us and we will call you" on the
 * property page, parameterised by its `LEAD_SOURCES` value.
 *
 * The boilerplate carried four copy-pasted modal state machines on this page,
 * one of which was unreachable (ADD-12). This is the one that replaces them
 * until prompt 28 unifies every form on the site behind `LeadCaptureModal`,
 * which is where the requirement fields, the throttle (D43) and the gated
 * downloads (BUG-08) belong.
 *
 * Registered in `docs/PROJECT_STATE.md` → "Pending rewrites" (owner 28).
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.source a `LEAD_SOURCES` value
 * @param {number|string|null} [props.propertyId]
 * @param {string} [props.propertyTitle] quoted in the message the lead carries
 * @param {object} [props.hiddenFields] merged into the `POST /leads` body
 * @param {string} [props.message] prefills the message box, e.g. "Price for 3 BHK"
 * @param {(values: object) => void} [props.onCaptured] runs after the lead is
 *   filed — what a gated section unlocks itself with
 * @param {string} [props.successTitle] the heading of the success panel
 * @param {{label: string, icon?: string, onClick: () => void}|null} [props.successAction]
 *   the first button of the success panel — how the documents section offers
 *   the file again when a pop-up blocker swallowed the tab it opened (BUG-08)
 * @param {{phone?: string, whatsapp?: string}|null} [props.agent]
 */
export default function LeadModalTemp({
  open,
  onClose,
  source = 'property-enquiry',
  propertyId = null,
  propertyTitle = '',
  hiddenFields = null,
  message: prefilledMessage = '',
  onCaptured,
  successTitle = 'Request received',
  successAction = null,
  agent = null,
}) {
  const { getContact, getWhatsappLink } = useSiteSettings();
  const [done, setDone] = useState(false);

  // A second request from the same visit starts from the form again, with
  // whatever they typed last time already in the boxes.
  useEffect(() => {
    if (open) setDone(false);
  }, [open]);

  const onSuccess = useCallback(
    (values) => {
      leadStorage.save(values, propertyId, source);
      onCaptured?.(values);
      setDone(true);
    },
    [propertyId, source, onCaptured]
  );

  const saved = leadStorage.getUserDetails() ?? {};
  const contact = getContact();
  const phone = agent?.phone || contact.phone;
  const phoneHref = phone ? `tel:${formatPhoneForTel(phone)}` : '';
  const message = propertyTitle
    ? `Hi, I am interested in ${propertyTitle}`
    : 'Hi, I would like to know more.';
  const whatsappHref = whatsappLink(agent?.whatsapp, message) || getWhatsappLink(message);

  const label = LEAD_SOURCES.labelOf(source) || 'Enquiry';

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
      defaultValue: prefilledMessage,
    },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      mobile="sheet"
      size="sm"
      title={label}
      description={propertyTitle || undefined}
    >
      {done ? (
        <div className={styles.done}>
          <Icon icon="mdi:check-circle-outline" className={styles.doneIcon} aria-hidden="true" />
          <h3 className={styles.doneTitle}>{successTitle}</h3>
          <p className={styles.doneText}>
            An advisor will get back to you as soon as possible. If it is urgent, reach us straight
            away.
          </p>
          <div className={styles.doneActions}>
            {successAction ? (
              <Button
                variant="primary"
                onClick={successAction.onClick}
                icon={
                  successAction.icon ? (
                    <Icon icon={successAction.icon} aria-hidden="true" />
                  ) : undefined
                }
              >
                {successAction.label}
              </Button>
            ) : null}
            {whatsappHref ? (
              <Button
                variant="secondary"
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                icon={<Icon icon="mdi:whatsapp" aria-hidden="true" />}
                onClick={() => track('whatsapp_click', { propertyId, source })}
              >
                WhatsApp
              </Button>
            ) : null}
            {phoneHref ? (
              <Button
                variant="outline"
                href={phoneHref}
                icon={<Icon icon="mdi:phone-outline" aria-hidden="true" />}
                onClick={() => track('call_click', { propertyId, source })}
              >
                Call {phone}
              </Button>
            ) : null}
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <LeadForm
          title=""
          fields={fields}
          source={source}
          propertyId={propertyId}
          hiddenFields={hiddenFields}
          onSuccess={onSuccess}
        />
      )}
    </Modal>
  );
}
