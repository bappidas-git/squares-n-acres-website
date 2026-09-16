import { useEffect, useState } from 'react';

import FormSection, { FormColumn } from '../../../../../components/admin/FormSection';
import { Button, Modal, SelectField, TextField } from '../../../../../components/ui';
import { LOCALITY_ZONES } from '../../../../../config/enums';
import masterDataService from '../../../../../services/masterDataService';
import { firstFieldMessage } from '../../../../../services/apiError';

/**
 * "Add new locality", without leaving the property.
 *
 * A locality that does not exist yet is the one thing that stops a listing
 * being written at all, and sending an editor to master data and back loses
 * everything they have typed. This creates the record with the three fields it
 * needs — the full guide, the SEO branch and the connectivity table stay in
 * `/admin/master-data/localities` — and hands it straight back to be selected.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {Array<{id: number, name: string}>} props.cities
 * @param {number|null} [props.defaultCityId]
 * @param {(locality: object) => void} props.onCreated the new record
 */
export default function LocalityQuickCreateDialog({
  open,
  onClose,
  cities = [],
  defaultCityId = null,
  onCreated,
}) {
  const [name, setName] = useState('');
  const [zone, setZone] = useState('');
  const [cityId, setCityId] = useState(defaultCityId ?? cities[0]?.id ?? '');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Opening a second time starts from a clean form rather than the last one.
  useEffect(() => {
    if (!open) return;
    setName('');
    setZone('');
    setCityId(defaultCityId ?? cities[0]?.id ?? '');
    setErrors({});
    setSaving(false);
  }, [open, defaultCityId, cities]);

  const submit = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setErrors({ name: 'A locality needs a name of at least two characters.' });
      return;
    }
    if (!cityId) {
      setErrors({ cityId: 'Choose the city this locality is in.' });
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      const response = await masterDataService.localities.create({
        name: trimmed,
        cityId: Number(cityId),
        zone: zone || null,
      });
      onCreated?.(response?.data ?? null);
    } catch (thrown) {
      setErrors({ name: firstFieldMessage(thrown, 'The locality could not be created.') });
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title="Add a locality"
      description="It is created in master data and selected here. The guide, the SEO fields and the price trend can be filled in later."
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
            placeholder="e.g. Hoskote Road"
            onChange={(event) => setName(event.target.value)}
          />
        </FormColumn>
        <FormColumn half>
          <SelectField
            label="City"
            required
            placeholder="Select a city"
            options={cities.map((city) => ({ value: city.id, label: city.name }))}
            value={cityId}
            error={errors.cityId}
            onChange={(event) => setCityId(event.target.value)}
          />
        </FormColumn>
        <FormColumn half>
          <SelectField
            label="Zone"
            placeholder="Not specified"
            options={LOCALITY_ZONES.options}
            value={zone}
            error={errors.zone}
            hint="Which side of the city it is on — it groups the locality pages."
            onChange={(event) => setZone(event.target.value)}
          />
        </FormColumn>
      </FormSection>
    </Modal>
  );
}
