import { useState } from 'react';
import { Icon } from '@iconify/react';

import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import LeadRequirementEditor, {
  requirementErrors,
  requirementToValues,
  valuesToRequirement,
} from './LeadRequirementEditor';
import { LISTING_TYPES, REQUIREMENT_TIMELINES } from '../../../config/enums';
import { formatBhk, formatPriceRange } from '../../../utils/format';
import { useLocalities, usePropertyTypes } from '../../../hooks/useMasterData';

import styles from './LeadDetailPage.module.css';

/**
 * What the visitor said they were looking for (§6.7 `requirement`).
 *
 * Only the fields the form actually captured are rendered: a requirement card
 * full of em dashes says "we asked and they did not answer", which is not what
 * happened — most forms ask for two of these six.
 *
 * The ids are resolved against the master data the panel already holds (D93),
 * so a locality that was renamed reads by its current name.
 *
 * The desk corrects it, or records it when the form asked for nothing
 * (prompt 51): the call is where a requirement is usually learned.
 *
 * @param {object} props
 * @param {object} props.requirement
 * @param {boolean} [props.canEdit]
 * @param {(requirement: object|null) => Promise<boolean>} [props.onSave]
 * @returns {React.ReactNode|null} `null` when nothing was captured and nothing may be
 */
export default function LeadRequirementCard({ requirement, canEdit = false, onSave }) {
  const propertyTypes = usePropertyTypes({ activeOnly: false });
  const localities = useLocalities({ activeOnly: false });
  const [editing, setEditing] = useState(false);

  const wanted = requirement ?? {};
  const nameOf = (records, id) =>
    records.find((record) => String(record.id) === String(id))?.name ?? null;

  const budget =
    wanted.budgetMin || wanted.budgetMax
      ? formatPriceRange(wanted.budgetMin, wanted.budgetMax, {
          listingType: wanted.listingType,
        })
      : null;

  const rows = [
    ['Looking to', LISTING_TYPES.labelOf(wanted.listingType) || null],
    ['Property type', nameOf(propertyTypes, wanted.propertyTypeId)],
    ['Locality', nameOf(localities, wanted.localityId)],
    // 0 is an answer — a studio — as the export prints it, not "not asked".
    ['Configuration', Number.isFinite(wanted.bedrooms) ? formatBhk(wanted.bedrooms) : null],
    ['Budget', budget],
    ['Timeline', REQUIREMENT_TIMELINES.labelOf(wanted.timeline) || null],
  ].filter(([, value]) => Boolean(value));

  if (rows.length === 0 && !canEdit) return null;

  return (
    <Card as="section" className={styles.card} aria-labelledby="lead-requirement-heading">
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle} id="lead-requirement-heading">
          Requirement
        </h2>
        {canEdit && !editing ? (
          <Button
            size="sm"
            variant="ghost"
            className={styles.cardEdit}
            icon={<Icon icon="mdi:pencil-outline" width="16" height="16" />}
            onClick={() => setEditing(true)}
          >
            {rows.length === 0 ? 'Add requirement' : 'Edit requirement'}
          </Button>
        ) : null}
      </div>

      {editing ? (
        <RequirementForm
          requirement={requirement}
          onCancel={() => setEditing(false)}
          onSave={async (next) => {
            const saved = await onSave?.(next);
            if (saved) setEditing(false);
          }}
        />
      ) : rows.length === 0 ? (
        <p className={styles.emptyLine}>Nothing captured yet — add what they said on the call.</p>
      ) : (
        <dl className={styles.facts}>
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );
}

/** The requirement, editable, sending the whole object back. */
function RequirementForm({ requirement, onCancel, onSave }) {
  const [values, setValues] = useState(() => requirementToValues(requirement));
  const [busy, setBusy] = useState(false);
  const errors = requirementErrors(values);

  const submit = async (event) => {
    event.preventDefault();
    if (Object.keys(errors).length > 0) return;
    setBusy(true);
    await onSave(valuesToRequirement(values));
    setBusy(false);
  };

  return (
    <form className={styles.detailsEditor} noValidate onSubmit={submit}>
      <LeadRequirementEditor
        values={values}
        errors={errors}
        disabled={busy}
        legend="What they are looking for"
        onChange={(name, value) => setValues((current) => ({ ...current, [name]: value }))}
      />
      <div className={styles.railActions}>
        <Button type="submit" size="sm" loading={busy}>
          Save requirement
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
