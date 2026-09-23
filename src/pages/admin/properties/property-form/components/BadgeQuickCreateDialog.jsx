import { useEffect, useState } from 'react';

import FormSection, { FormColumn } from '../../../../../components/admin/FormSection';
import ToneSelect from '../../../../../components/admin/ToneSelect';
import { Button, Chip, Modal, TextField } from '../../../../../components/ui';
import masterDataService from '../../../../../services/masterDataService';
import { firstFieldMessage } from '../../../../../services/apiError';
import { findByName, nextOrder } from './quickCreate';

import styles from './QuickCreateDialogs.module.css';

/** One message, whether this browser or the API spotted the clash. */
const duplicateMessage = (name) =>
  `A badge called “${name}” already exists. Close this and pick it from the list instead.`;

/**
 * "Add a badge", without leaving the property (QA-52).
 *
 * A badge is a name and a tone (§6.4) — never a hex value, so the chip on a
 * card is painted from the same token as the preview here. The icon and the
 * order stay in `/admin/master-data/badges`; the new badge is added to this
 * listing's badges straight away.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {Array<{name: string}>} [props.existing] the badges already known
 * @param {(badge: object) => void} props.onCreated the new record
 */
export default function BadgeQuickCreateDialog({ open, onClose, existing = [], onCreated }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('primary');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Opening a second time starts from a clean form rather than the last one.
  useEffect(() => {
    if (!open) return;
    setName('');
    setColor('primary');
    setErrors({});
    setSaving(false);
  }, [open]);

  const submit = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setErrors({ name: 'A badge needs a name of at least two characters.' });
      return;
    }

    if (findByName(existing, trimmed)) {
      setErrors({ name: duplicateMessage(trimmed) });
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      const response = await masterDataService.badges.create({
        name: trimmed,
        color,
        order: nextOrder(existing),
      });
      onCreated?.(response?.data ?? null);
    } catch (thrown) {
      setErrors({
        name:
          thrown?.status === 409
            ? duplicateMessage(trimmed)
            : firstFieldMessage(thrown, 'The badge could not be created.'),
      });
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title="Add a badge"
      description="It is created in master data and added to this listing. An icon can be chosen later under Master data → Badges."
      size="sm"
      dismissible={!saving}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Create and add
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
            placeholder="e.g. Lake View"
            onChange={(event) => setName(event.target.value)}
          />
        </FormColumn>
        <FormColumn>
          <ToneSelect
            label="Colour"
            required
            value={color}
            error={errors.color}
            disabled={saving}
            onChange={setColor}
          />
        </FormColumn>
        <FormColumn>
          <p className={styles.preview}>
            On a card:
            <Chip tone={color}>{name.trim() || 'Your badge'}</Chip>
          </p>
        </FormColumn>
      </FormSection>
    </Modal>
  );
}
