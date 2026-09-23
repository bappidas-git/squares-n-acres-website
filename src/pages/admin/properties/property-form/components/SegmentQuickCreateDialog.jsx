import { useEffect, useState } from 'react';

import FormSection, { FormColumn } from '../../../../../components/admin/FormSection';
import { Button, Modal, SelectField, TextField } from '../../../../../components/ui';
import masterDataService from '../../../../../services/masterDataService';
import { SEGMENT_KIND_OPTIONS } from '../../../../../config/segments';
import { firstFieldMessage } from '../../../../../services/apiError';
import { findByName, nextOrder } from './quickCreate';

/** One message, whether this browser or the API spotted the clash. */
const duplicateMessage = (name) =>
  `A segment called “${name}” already exists. Close this and choose it instead.`;

/**
 * "Add a segment", without leaving the property (QA-52).
 *
 * The two fields a segment cannot do without: its name, and the layout its
 * listings get — which is what decides the rest of this form. The icon, the
 * description and the order stay in `/admin/master-data/segments`, and the new
 * segment is handed straight back to be chosen.
 *
 * A name master data already holds is refused here (§6.17 keeps only the slug
 * unique, so the API would answer a second "Industrial" with `industrial-2`).
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {Array<{name: string}>} [props.existing] every segment, retired ones too
 * @param {string} [props.defaultKind] the layout to start from
 * @param {(segment: object) => void} props.onCreated the new record
 */
export default function SegmentQuickCreateDialog({
  open,
  onClose,
  existing = [],
  defaultKind = 'residential',
  onCreated,
}) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState(defaultKind);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Opening a second time starts from a clean form rather than the last one.
  useEffect(() => {
    if (!open) return;
    setName('');
    setKind(defaultKind);
    setErrors({});
    setSaving(false);
  }, [open, defaultKind]);

  const submit = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setErrors({ name: 'A segment needs a name of at least two characters.' });
      return;
    }
    if (!kind) {
      setErrors({ kind: 'Choose the fields its listings have.' });
      return;
    }

    if (findByName(existing, trimmed)) {
      setErrors({ name: duplicateMessage(trimmed) });
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      const response = await masterDataService.segments.create({
        name: trimmed,
        kind,
        order: nextOrder(existing),
      });
      onCreated?.(response?.data ?? null);
    } catch (thrown) {
      setErrors({
        name:
          thrown?.status === 409
            ? duplicateMessage(trimmed)
            : firstFieldMessage(thrown, 'The segment could not be created.'),
      });
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title="Add a segment"
      description="It is created in master data and chosen here. The icon and the description can be filled in later under Master data → Segments."
      size="sm"
      dismissible={!saving}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Create and select
          </Button>
        </>
      }
    >
      <FormSection plain>
        <FormColumn>
          <TextField
            label="Name"
            required
            autoFocus
            value={name}
            error={errors.name}
            maxLength={60}
            placeholder="e.g. Industrial"
            onChange={(event) => setName(event.target.value)}
          />
        </FormColumn>
        <FormColumn>
          <SelectField
            label="Form layout"
            required
            options={SEGMENT_KIND_OPTIONS}
            value={kind}
            error={errors.kind}
            hint="Which fields a listing in this segment has. It can be changed later."
            onChange={(event) => setKind(event.target.value)}
          />
        </FormColumn>
      </FormSection>
    </Modal>
  );
}
