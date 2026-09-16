import { useEffect, useState } from 'react';

import FormSection, { FormColumn } from '../../../../../components/admin/FormSection';
import { Button, Modal, TextField, UrlField } from '../../../../../components/ui';
import masterDataService from '../../../../../services/masterDataService';
import { URL_PATTERN } from '../../../../../utils/validation';
import { firstFieldMessage } from '../../../../../services/apiError';

/** One message, whether this browser or the API spotted the clash. */
const duplicateMessage = (name) =>
  `A developer called “${name}” already exists. Close this and search for it instead.`;

/**
 * "Add new developer", without leaving the property.
 *
 * The same bargain as the locality dialog of prompt 19: the two fields that
 * make a developer findable are asked for here, the profile — the logo, the
 * description, the RERA ids, the SEO branch — stays in
 * `/admin/master-data/developers`, and the new record is handed straight back
 * to the picker.
 *
 * A name that already exists is refused twice over: once here, against the
 * developer list the session already holds (§6.5 makes only the **slug**
 * unique, so the API is free to answer a duplicate name with a second record
 * and a suffixed slug), and once on a 409 from an API that does enforce it
 * (§5.8, D88). Either way the message goes under the field rather than into a
 * toast, because the fix is in the field.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} [props.defaultName] what was typed into the picker's search
 * @param {Array<{id: number, name: string}>} [props.existing] the developers already known
 * @param {(developer: object) => void} props.onCreated the new record
 */
export default function DeveloperQuickCreateDialog({
  open,
  onClose,
  defaultName = '',
  existing = [],
  onCreated,
}) {
  const [name, setName] = useState(defaultName);
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Opening a second time starts from a clean form rather than the last one.
  useEffect(() => {
    if (!open) return;
    setName(defaultName);
    setWebsite('');
    setErrors({});
    setSaving(false);
  }, [open, defaultName]);

  const submit = async () => {
    const trimmed = name.trim();
    const site = website.trim();

    if (trimmed.length < 2) {
      setErrors({ name: 'A developer needs a name of at least two characters.' });
      return;
    }
    if (site && !URL_PATTERN.test(site)) {
      setErrors({ website: 'The website must start with http:// or https://.' });
      return;
    }

    const clash = existing.find(
      (record) =>
        String(record.name ?? '')
          .trim()
          .toLowerCase() === trimmed.toLowerCase()
    );
    if (clash) {
      setErrors({ name: duplicateMessage(trimmed) });
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      const response = await masterDataService.developers.create({
        name: trimmed,
        website: site || null,
      });
      onCreated?.(response?.data ?? null);
    } catch (thrown) {
      setErrors({
        name:
          thrown?.status === 409
            ? duplicateMessage(trimmed)
            : firstFieldMessage(thrown, 'The developer could not be created.'),
      });
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title="Add a developer"
      description="It is created in master data and selected here. The logo, the profile and the RERA ids can be filled in later."
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
            maxLength={150}
            placeholder="e.g. Nandi Ridge Developers"
            onChange={(event) => setName(event.target.value)}
          />
        </FormColumn>
        <FormColumn>
          <UrlField
            label="Website"
            value={website}
            error={errors.website}
            hint="Optional. Include https://"
            placeholder="https://…"
            onChange={(event) => setWebsite(event.target.value)}
          />
        </FormColumn>
      </FormSection>
    </Modal>
  );
}
