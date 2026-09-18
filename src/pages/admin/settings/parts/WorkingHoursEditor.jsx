import { Icon } from '@iconify/react';

import Button from '../../../../components/ui/Button';
import IconButton from '../../../../components/ui/IconButton';
import SortableList from '../../../../components/admin/SortableList';
import styles from '../SettingsPage.module.css';
import { TextField } from '../../../../components/ui/FormField';

/**
 * The opening hours (§6.13 `general.workingHours`).
 *
 * Two free-text columns rather than a day picker and two clocks: the rows the
 * contact page and the knowledge graph have to render are "Monday to Saturday /
 * 9:30 am – 6:30 pm" and "Sunday / By appointment", and the second one is not
 * expressible as a pair of times.
 *
 * @param {object} props
 * @param {Array<{days: string, hours: string}>} props.value
 * @param {(rows: Array<object>) => void} props.onChange
 * @param {(path: string) => string|undefined} [props.errorAt] `'0.days'`
 * @param {boolean} [props.disabled]
 */
export default function WorkingHoursEditor({ value = [], onChange, errorAt, disabled = false }) {
  const rows = Array.isArray(value) ? value : [];

  const setRow = (index, field, next) =>
    onChange?.(rows.map((row, at) => (at === index ? { ...row, [field]: next } : row)));

  const remove = (index) => onChange?.(rows.filter((_row, at) => at !== index));

  const add = () => onChange?.([...rows, { days: '', hours: '' }]);

  return (
    <div className={styles.repeater}>
      {rows.length === 0 ? (
        <p className={styles.repeaterEmpty}>
          No opening hours yet — the contact page simply leaves the block out.
        </p>
      ) : (
        <SortableList
          label="Opening hours"
          items={rows}
          disabled={disabled}
          getId={(_row, index) => index}
          getLabel={(row) => row?.days || 'A row with no days'}
          onReorder={(next) => onChange?.(next)}
          renderItem={(row, index) => (
            <div className={styles.repeaterRow}>
              <TextField
                label="Days"
                value={row?.days ?? ''}
                onChange={(event) => setRow(index, 'days', event.target.value)}
                error={errorAt?.(`${index}.days`)}
                placeholder="Monday to Saturday"
                disabled={disabled}
              />
              <TextField
                label="Hours"
                value={row?.hours ?? ''}
                onChange={(event) => setRow(index, 'hours', event.target.value)}
                error={errorAt?.(`${index}.hours`)}
                placeholder="9:30 am – 6:30 pm"
                disabled={disabled}
              />
              <IconButton
                label={`Remove ${row?.days || `row ${index + 1}`}`}
                onClick={() => remove(index)}
                disabled={disabled}
              >
                <Icon icon="mdi:trash-can-outline" width="18" height="18" />
              </IconButton>
            </div>
          )}
        />
      )}

      <div className={styles.actionRow}>
        <Button
          variant="outline"
          size="sm"
          onClick={add}
          disabled={disabled}
          icon={<Icon icon="mdi:plus" width="16" height="16" />}
        >
          Add a row
        </Button>
      </div>
    </div>
  );
}
