import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';

import FormSection, { FormColumn } from '../../../../../components/admin/FormSection';
import IconPicker from '../../../../../components/admin/IconPicker';
import { Button, Field, Modal, TextField } from '../../../../../components/ui';
import masterDataService from '../../../../../services/masterDataService';
import { ICON_ID_PATTERN } from '../../../../../utils/validation';
import { firstFieldMessage } from '../../../../../services/apiError';
import { segmentKind } from '../../../../../config/segments';
import { findByName, nextOrder } from './quickCreate';

import styles from './QuickCreateDialogs.module.css';

/** The icon a new type starts from, by its segment's layout. */
const DEFAULT_ICONS = {
  residential: 'mdi:home-outline',
  commercial: 'mdi:office-building-outline',
  land: 'mdi:land-plots',
};

/** One message, whether this browser or the API spotted the clash. */
const duplicateMessage = (name) =>
  `A property type called “${name}” already exists. Close this and choose it instead.`;

/**
 * "Add a property type", without leaving the property (QA-52).
 *
 * The type is created in the segment this listing is in — the property-type
 * list follows the segment, so that is the only place a new type could be
 * chosen from — with the two fields the API cannot do without: the name,
 * whose slug becomes `/buy/<slug>`, and an icon. The description and the
 * landing page's SEO stay in `/admin/master-data/property-types`.
 *
 * A name any segment already uses is refused here: two "Villas" would share a
 * URL the API could only settle as `/buy/villas-2`.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.segment the slug of the listing's segment
 * @param {string} props.segmentLabel its name, for the sentence that says so
 * @param {Array<{name: string}>} [props.existing] the property types already known
 * @param {(propertyType: object) => void} props.onCreated the new record
 */
export default function PropertyTypeQuickCreateDialog({
  open,
  onClose,
  segment,
  segmentLabel,
  existing = [],
  onCreated,
}) {
  const startIcon = DEFAULT_ICONS[segmentKind(segment)] ?? 'mdi:home-city-outline';

  const [name, setName] = useState('');
  const [icon, setIcon] = useState(startIcon);
  const [picking, setPicking] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Opening a second time starts from a clean form rather than the last one.
  useEffect(() => {
    if (!open) return;
    setName('');
    setIcon(startIcon);
    setPicking(false);
    setErrors({});
    setSaving(false);
  }, [open, startIcon]);

  const submit = async () => {
    const trimmed = name.trim();
    const iconId = icon.trim();

    if (trimmed.length < 2) {
      setErrors({ name: 'A property type needs a name of at least two characters.' });
      return;
    }
    if (!ICON_ID_PATTERN.test(iconId)) {
      setErrors({ icon: 'Use an Iconify MDI id in lower case, like mdi:home-city-outline.' });
      return;
    }

    if (findByName(existing, trimmed)) {
      setErrors({ name: duplicateMessage(trimmed) });
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      const response = await masterDataService.propertyTypes.create({
        name: trimmed,
        segment,
        icon: iconId,
        order: nextOrder(existing),
      });
      onCreated?.(response?.data ?? null);
    } catch (thrown) {
      setErrors({
        name:
          thrown?.status === 409
            ? duplicateMessage(trimmed)
            : firstFieldMessage(thrown, 'The property type could not be created.'),
      });
      setSaving(false);
    }
  };

  const knownIcon = ICON_ID_PATTERN.test(icon.trim());

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title="Add a property type"
      description={`It is created in the ${segmentLabel} segment — the one this listing is in — and selected here. Its description and landing-page SEO can be filled in later under Master data → Property types.`}
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
            maxLength={120}
            placeholder="e.g. Farmhouses"
            hint="Plural — it names the landing page, e.g. /buy/farmhouses."
            onChange={(event) => setName(event.target.value)}
          />
        </FormColumn>
        <FormColumn>
          <Field
            label="Icon"
            required
            error={errors.icon}
            hint="Shown on cards and in the filters."
          >
            {() => (
              <div className={styles.iconRow}>
                <span className={styles.iconPreview} aria-hidden="true">
                  <Icon
                    icon={knownIcon ? icon.trim() : 'mdi:help-rhombus-outline'}
                    width="24"
                    height="24"
                  />
                </span>
                <span className={styles.iconId}>{icon}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => setPicking(true)}
                >
                  Browse icons
                </Button>
              </div>
            )}
          </Field>
        </FormColumn>
      </FormSection>

      <IconPicker
        open={picking}
        currentIcon={icon}
        onClose={() => setPicking(false)}
        onSelect={(next) => {
          setIcon(next);
          setPicking(false);
        }}
      />
    </Modal>
  );
}
