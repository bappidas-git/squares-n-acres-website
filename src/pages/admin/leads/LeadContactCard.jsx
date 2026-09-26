import { useState } from 'react';
import { Icon } from '@iconify/react';

import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Chip from '../../../components/ui/Chip';
import StatusChip from '../../../components/admin/StatusChip';
import { LEAD_SOURCES } from '../../../config/enums';
import { TextField } from '../../../components/ui';
import { formatDateTime, formatPhone } from '../../../utils/format';
import {
  getEmailErrorMessage,
  getMobileErrorMessage,
  getNameErrorMessage,
  normalizePhone,
} from '../../../utils/validators';
import { leadTelLink, leadWhatsappLink } from './leadColumns';

import styles from './LeadDetailPage.module.css';

/** The five `utm_*` parameters of §6.7, in the order a campaign reads them. */
const UTM_KEYS = [
  ['source', 'Source'],
  ['medium', 'Medium'],
  ['campaign', 'Campaign'],
  ['term', 'Term'],
  ['content', 'Content'],
];

/**
 * Who enquired, and the three ways to answer them.
 *
 * Call, WhatsApp and Mail are the whole point of the screen, so they are
 * buttons at the top rather than links inside a table of fields; everything
 * below them is context for the conversation those buttons start — where the
 * enquiry came from, which page it was made on, and whether the visitor agreed
 * to be contacted.
 *
 * The card is headed "Contact": the page's own heading is already the lead's
 * name, and a card repeating it read as the name printed twice (QA-53).
 *
 * The name, the number and the address are the desk's to correct once the
 * call has been made (prompt 51) — a digit mistyped on the form used to make
 * the lead unreachable for good. Calling or messaging readies "Log activity"
 * for what comes next, without getting in the way of the call itself.
 *
 * @param {object} props
 * @param {object} props.lead
 * @param {boolean} [props.canEdit] admins and managers, and sales on their own lead
 * @param {(changes: object) => Promise<boolean>} [props.onSave]
 * @param {(type: 'call'|'whatsapp') => void} [props.onContact]
 */
export default function LeadContactCard({ lead, canEdit = false, onSave, onContact }) {
  const tel = leadTelLink(lead);
  const wa = leadWhatsappLink(lead);
  const utm = lead.utm ?? {};
  const utmChips = UTM_KEYS.filter(([key]) => Boolean(utm[key]));
  const [editing, setEditing] = useState(false);

  return (
    <Card as="section" className={styles.card} aria-labelledby="lead-contact-heading">
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle} id="lead-contact-heading">
          Contact
        </h2>
        <StatusChip label={LEAD_SOURCES.labelOfAny(lead.source) || 'Unknown source'} />
        {canEdit && !editing ? (
          <Button
            size="sm"
            variant="ghost"
            className={styles.cardEdit}
            icon={<Icon icon="mdi:pencil-outline" width="16" height="16" />}
            onClick={() => setEditing(true)}
          >
            Edit details
          </Button>
        ) : null}
      </div>

      {editing ? (
        <ContactEditor
          lead={lead}
          onCancel={() => setEditing(false)}
          onSave={async (changes) => {
            const saved = await onSave?.(changes);
            if (saved) setEditing(false);
          }}
        />
      ) : null}

      <div className={styles.contactActions}>
        {tel ? (
          <Button
            variant="outline"
            href={tel}
            icon={<Icon icon="mdi:phone-outline" width="18" height="18" />}
            onClick={() => onContact?.('call')}
          >
            {formatPhone(lead.phone)}
          </Button>
        ) : null}
        {wa ? (
          <Button
            variant="outline"
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            icon={<Icon icon="mdi:whatsapp" width="18" height="18" />}
            onClick={() => onContact?.('whatsapp')}
          >
            WhatsApp
          </Button>
        ) : null}
        {lead.email ? (
          <Button
            variant="outline"
            href={`mailto:${lead.email}`}
            icon={<Icon icon="mdi:email-outline" width="18" height="18" />}
          >
            {lead.email}
          </Button>
        ) : null}
      </div>

      {lead.message ? <p className={styles.message}>{lead.message}</p> : null}

      <dl className={styles.facts}>
        <div>
          <dt>Received</dt>
          <dd>{formatDateTime(lead.createdAt)}</dd>
        </div>
        <div>
          <dt>Last updated</dt>
          <dd>{formatDateTime(lead.updatedAt)}</dd>
        </div>
        <div>
          <dt>Consent</dt>
          <dd>
            {lead.consent ? (
              <StatusChip tone="success" icon="mdi:check" label="Given" />
            ) : (
              <StatusChip tone="warning" icon="mdi:alert-outline" label="Not given" />
            )}
          </dd>
        </div>
        {lead.pageUrl ? (
          <div className={styles.factWide}>
            <dt>Submitted from</dt>
            <dd>
              <a
                className={styles.link}
                href={lead.pageUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {lead.pageUrl}
              </a>
            </dd>
          </div>
        ) : null}
      </dl>

      {utmChips.length > 0 ? (
        <div className={styles.utm}>
          <span className={styles.utmLabel}>Campaign</span>
          {utmChips.map(([key, label]) => (
            <Chip key={key} tone="info">{`${label}: ${utm[key]}`}</Chip>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

/**
 * The three contact boxes, checked as the site's forms check them, sending only
 * what changed.
 *
 * @param {object} props
 * @param {object} props.lead
 * @param {() => void} props.onCancel
 * @param {(changes: object) => Promise<void>} props.onSave
 */
function ContactEditor({ lead, onCancel, onSave }) {
  const [name, setName] = useState(lead.name ?? '');
  const [phone, setPhone] = useState(lead.phone ?? '');
  const [email, setEmail] = useState(lead.email ?? '');
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  const errors = {
    name: getNameErrorMessage(name, { label: 'Name' }),
    phone: getMobileErrorMessage(phone, { label: 'Phone' }),
    email: getEmailErrorMessage(email, false),
  };

  const submit = async (event) => {
    event.preventDefault();
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;

    const changes = {};
    if (name.trim() !== (lead.name ?? '')) changes.name = name.trim();
    const number = normalizePhone(phone);
    if (number !== (lead.phone ?? '')) changes.phone = number;
    const address = email.trim() || null;
    if (address !== (lead.email ?? null)) changes.email = address;
    if (Object.keys(changes).length === 0) {
      onCancel();
      return;
    }

    setBusy(true);
    await onSave(changes);
    setBusy(false);
  };

  return (
    <form className={styles.detailsEditor} noValidate onSubmit={submit}>
      <TextField
        label="Name"
        required
        value={name}
        maxLength={80}
        error={touched ? errors.name || undefined : undefined}
        onChange={(event) => setName(event.target.value)}
      />
      <TextField
        label="Phone"
        required
        type="tel"
        value={phone}
        error={touched ? errors.phone || undefined : undefined}
        onChange={(event) => setPhone(event.target.value)}
      />
      <TextField
        label="E-mail"
        type="email"
        value={email}
        error={touched ? errors.email || undefined : undefined}
        onChange={(event) => setEmail(event.target.value)}
      />
      <div className={styles.railActions}>
        <Button type="submit" size="sm" loading={busy}>
          Save details
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
