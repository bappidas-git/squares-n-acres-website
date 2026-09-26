import { useCallback, useState } from 'react';

import EntityPicker from '../../../components/admin/EntityPicker';
import LeadRequirementEditor, {
  requirementErrors,
  valuesToRequirement,
} from './LeadRequirementEditor';
import leadService from '../../../services/leadService';
import propertyService from '../../../services/propertyService';
import { ADMIN_LEAD_SOURCES, LEAD_SOURCES } from '../../../config/enums';
import {
  Alert,
  Button,
  Modal,
  SelectField,
  TextField,
  TextareaField,
} from '../../../components/ui';
import { fieldMessages, firstFieldMessage } from '../../../services/apiError';
import {
  getEmailErrorMessage,
  getMobileErrorMessage,
  getNameErrorMessage,
  normalizePhone,
} from '../../../utils/validators';

import styles from './LeadDetailPage.module.css';

/** The desk's own sources first — the ones a lead entered by hand usually has. */
export const ADD_LEAD_SOURCES = [
  ...ADMIN_LEAD_SOURCES.map((value) => ({ value, label: LEAD_SOURCES.labelOf(value) })),
  ...LEAD_SOURCES.options.filter((option) => !ADMIN_LEAD_SOURCES.includes(option.value)),
];

/** The fields with a box of their own, which a 422 names under the box. */
const OWN_FIELDS = ['name', 'phone', 'email', 'source', 'propertyId', 'assignedTo', 'note'];

/** "Assign automatically" — the rule a public lead follows. */
const AUTO = '';

const EMPTY = {
  name: '',
  phone: '',
  email: '',
  source: 'walk-in',
  propertyId: null,
  assignedTo: AUTO,
  note: '',
  requirement: {
    listingType: '',
    propertyTypeId: '',
    localityId: '',
    bedrooms: '',
    budgetMin: '',
    budgetMax: '',
    timeline: '',
  },
};

/**
 * "Add lead" — a walk-in, a phone call, a portal enquiry, entered by the desk
 * (prompt 51).
 *
 * Leads used to arrive only through the site's forms, so the agency's other
 * doors — the office, the phone, the portals — left no record at all. The
 * dialog asks what the desk knows: who, how to reach them, where the enquiry
 * came from, the listing it was about, what they want, and the first note. A
 * sales user's lead is theirs; an admin or a manager may hand it to a
 * colleague or leave it to the automatic rule.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {(lead: object) => void} props.onCreated
 * @param {boolean} [props.canAssign] admins and managers
 * @param {Array<object>} [props.users] the active colleagues
 */
export default function AddLeadDialog({ open, onClose, onCreated, canAssign = false, users = [] }) {
  const [values, setValues] = useState(EMPTY);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState({});
  const [failure, setFailure] = useState('');

  // A dialog that reopens starts empty.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setValues(EMPTY);
      setTouched(false);
      setRefused({});
      setFailure('');
    }
  }

  const set = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (refused[field]) setRefused((current) => ({ ...current, [field]: undefined }));
  };

  const errors = touched
    ? {
        name: getNameErrorMessage(values.name, { label: 'Name' }) || refused.name,
        phone: getMobileErrorMessage(values.phone, { label: 'Phone' }) || refused.phone,
        email: getEmailErrorMessage(values.email, false) || refused.email,
        ...requirementErrors(values.requirement),
      }
    : refused;
  const invalid = Boolean(
    getNameErrorMessage(values.name, { label: 'Name' }) ||
    getMobileErrorMessage(values.phone, { label: 'Phone' }) ||
    getEmailErrorMessage(values.email, false) ||
    Object.keys(requirementErrors(values.requirement)).length > 0
  );

  const searchProperties = useCallback(
    (query, options) => propertyService.adminList(query, options),
    []
  );

  const submit = async (event) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (busy) return;
    setTouched(true);
    if (invalid) return;

    setBusy(true);
    setFailure('');
    try {
      const { data } = await leadService.adminCreate({
        name: values.name.trim(),
        phone: normalizePhone(values.phone),
        email: values.email.trim() || null,
        source: values.source,
        propertyId: values.propertyId ?? null,
        requirement: valuesToRequirement(values.requirement),
        ...(canAssign && values.assignedTo !== AUTO
          ? { assignedTo: values.assignedTo === 'none' ? null : Number(values.assignedTo) }
          : null),
        note: values.note.trim() || null,
      });
      onCreated?.(data);
    } catch (thrown) {
      // A refusal the dialog has a box for is shown under the box; any other
      // (a requirement id, the whole request) above the form.
      const fields = Object.fromEntries(
        Object.entries(fieldMessages(thrown)).filter(([field]) => OWN_FIELDS.includes(field))
      );
      setRefused(fields);
      setFailure(
        Object.keys(fields).length > 0
          ? ''
          : firstFieldMessage(thrown, 'The lead could not be added. Try again.')
      );
    } finally {
      setBusy(false);
    }
  };

  const assigneeOptions = [
    { value: AUTO, label: 'Assign automatically' },
    { value: 'none', label: 'Leave unassigned' },
    ...users.map((user) => ({ value: String(user.id), label: user.name })),
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!busy}
      title="Add a lead"
      description="A walk-in, a phone call, a portal enquiry — anything that did not come through a form on the site."
      size="md"
      mobile="fullscreen"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="add-lead-form" loading={busy}>
            Add lead
          </Button>
        </>
      }
    >
      <form id="add-lead-form" className={styles.addLead} noValidate onSubmit={submit}>
        {failure ? (
          <Alert tone="error" title="Not added">
            {failure}
          </Alert>
        ) : null}

        <div className={styles.addLeadRow}>
          <TextField
            label="Name"
            required
            value={values.name}
            error={errors.name || undefined}
            maxLength={80}
            onChange={(event) => set('name', event.target.value)}
          />
          <TextField
            label="Phone"
            required
            type="tel"
            value={values.phone}
            error={errors.phone || undefined}
            hint="An Indian mobile number."
            onChange={(event) => set('phone', event.target.value)}
          />
        </div>

        <div className={styles.addLeadRow}>
          <TextField
            label="E-mail"
            type="email"
            value={values.email}
            error={errors.email || undefined}
            onChange={(event) => set('email', event.target.value)}
          />
          <SelectField
            label="Where it came from"
            required
            value={values.source}
            options={ADD_LEAD_SOURCES}
            error={refused.source}
            onChange={(event) => set('source', event.target.value)}
          />
        </div>

        <EntityPicker
          label="Listing they asked about"
          placeholder="Search listings…"
          multiple={false}
          labelKey="title"
          value={values.propertyId}
          fetcher={searchProperties}
          error={refused.propertyId}
          onChange={(value) =>
            set('propertyId', value === null || value === undefined ? null : Number(value))
          }
        />

        <LeadRequirementEditor
          values={values.requirement}
          errors={errors}
          onChange={(name, value) =>
            setValues((current) => ({
              ...current,
              requirement: { ...current.requirement, [name]: value },
            }))
          }
        />

        {canAssign ? (
          <SelectField
            label="Assign to"
            value={values.assignedTo}
            options={assigneeOptions}
            error={refused.assignedTo}
            hint="“Assign automatically” follows Settings → Lead notifications, as a lead from the site does."
            onChange={(event) => set('assignedTo', event.target.value)}
          />
        ) : (
          <p className={styles.emptyLine}>The lead will be yours.</p>
        )}

        <TextareaField
          label="First note"
          rows={3}
          maxLength={2000}
          value={values.note}
          hint="What was said — it starts the lead’s notes."
          error={refused.note}
          onChange={(event) => set('note', event.target.value)}
        />
      </form>
    </Modal>
  );
}
