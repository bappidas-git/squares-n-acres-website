import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';

import { Button, Modal } from '../../ui';
import {
  BEDROOM_OPTIONS,
  LEAD_SOURCES,
  LISTING_TYPES,
  PRICE_BUCKETS_RENT,
  PRICE_BUCKETS_SALE,
  REQUIREMENT_TIMELINES,
} from '../../../config/enums';
import { formatPhoneForTel, whatsappLink } from '../../../utils/format';
import { leadStorage } from '../../../utils/leadStorage';
import { track } from '../../../utils/analytics';
import { useLocalities, usePropertyTypes } from '../../../hooks/useMasterData';
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
 * @param {boolean} [props.requirement] adds the six requirement selects of
 *   D82 — what, where, how big, how much and by when — which the API stores
 *   under `lead.requirement` (§6.7)
 */
/** A price bucket as a `min-max` option value; the open-ended one ends in `-`. */
const bucketOptions = (buckets) =>
  buckets.map((bucket) => ({
    value: `${bucket.min}-${bucket.max ?? ''}`,
    label: bucket.label,
  }));

/** `"5000000-10000000"` back into the two numbers §6.7 stores. */
function budgetToBody(value) {
  const [min, max] = String(value ?? '').split('-');
  return {
    budgetMin: min === '' ? null : Number(min),
    budgetMax: max === '' || max === undefined ? null : Number(max),
  };
}

/**
 * The six requirement selects of D82.
 *
 * Every one of them nests under `requirement` in the `POST /leads` body, and
 * the budget bands follow the listing type the visitor picked above them — the
 * sale and rent scales are two orders of magnitude apart (D90).
 */
function requirementFields({ propertyTypes, localities }) {
  return [
    {
      name: 'listingType',
      label: 'I want to',
      type: 'select',
      group: 'requirement',
      placeholder: 'Buy, rent or lease',
      options: LISTING_TYPES.options,
    },
    {
      name: 'propertyTypeId',
      label: 'Property type',
      type: 'select',
      group: 'requirement',
      placeholder: 'Any property type',
      options: propertyTypes.map((type) => ({ value: type.id, label: type.name })),
      toBody: (value) => ({ propertyTypeId: Number(value) }),
    },
    {
      name: 'localityId',
      label: 'Preferred locality',
      type: 'select',
      group: 'requirement',
      placeholder: 'Any locality',
      options: localities.map((locality) => ({ value: locality.id, label: locality.name })),
      toBody: (value) => ({ localityId: Number(value) }),
    },
    {
      name: 'bedrooms',
      label: 'Bedrooms',
      type: 'select',
      group: 'requirement',
      placeholder: 'Any configuration',
      options: BEDROOM_OPTIONS.options,
      toBody: (value) => ({ bedrooms: Number(value) }),
    },
    {
      name: 'budget',
      label: 'Budget',
      type: 'select',
      group: 'requirement',
      placeholder: 'Any budget',
      options: (values) =>
        bucketOptions(
          values.listingType === 'rent' || values.listingType === 'lease'
            ? PRICE_BUCKETS_RENT
            : PRICE_BUCKETS_SALE
        ),
      toBody: budgetToBody,
    },
    {
      name: 'timeline',
      label: 'Timeline',
      type: 'select',
      group: 'requirement',
      placeholder: 'When are you looking to move?',
      options: REQUIREMENT_TIMELINES.options,
    },
  ];
}

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
  requirement = false,
}) {
  const { getContact, getWhatsappLink } = useSiteSettings();
  const propertyTypes = usePropertyTypes();
  const localities = useLocalities();
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
    ...(requirement ? requirementFields({ propertyTypes, localities }) : []),
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
