import { useState } from 'react';

import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { AVAILABILITY } from '../../../config/enums';
import { RadioGroup } from '../../../components/ui/FormField';

/**
 * "Availability…" from a listing's row menu (prompt 51): sold, reserved,
 * rented or available again, without opening the form and its twelve tabs —
 * the change a desk makes most often after the day a listing goes live.
 *
 * @param {object} props
 * @param {object|null} props.property the row, or `null` when closed
 * @param {boolean} [props.loading]
 * @param {(availability: string) => void} props.onConfirm
 * @param {() => void} props.onClose
 */
export default function AvailabilityDialog({ property, loading = false, onConfirm, onClose }) {
  const [value, setValue] = useState(property?.availability ?? 'available');

  // Each listing opens on its own availability.
  const [seen, setSeen] = useState(property);
  if (property !== seen) {
    setSeen(property);
    if (property) setValue(property.availability ?? 'available');
  }

  const unchanged = value === (property?.availability ?? 'available');

  return (
    <Modal
      open={Boolean(property)}
      onClose={loading ? undefined : onClose}
      dismissible={!loading}
      size="sm"
      title={property ? `Availability of “${property.title}”` : 'Availability'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm?.(value)} loading={loading} disabled={unchanged}>
            Set availability
          </Button>
        </>
      }
    >
      <RadioGroup
        label="The listing is"
        column
        value={value}
        options={AVAILABILITY.options}
        onChange={setValue}
        hint="Sold, rented and reserved listings stay on the site, labelled so."
      />
    </Modal>
  );
}
