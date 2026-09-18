import { Icon } from '@iconify/react';

import Button from '../../../../components/ui/Button';
import IconButton from '../../../../components/ui/IconButton';
import SortableList from '../../../../components/admin/SortableList';
import styles from '../SettingsPage.module.css';
import { LIMITS } from '../settingsSchema';
import { TextField } from '../../../../components/ui/FormField';

/**
 * The hero's counters (§6.13 `hero.stats`) — an empty list hides the block,
 * which is how the seed ships it: a number nobody has confirmed is worse than
 * no number at all (§14).
 *
 * The value is a string rather than a number because "500+", "4.8" and "12"
 * are all legitimate, and the suffix is separate so the layout can style it.
 *
 * @param {object} props
 * @param {Array<{label: string, value: string, suffix?: string}>} props.value
 * @param {(rows: Array<object>) => void} props.onChange
 * @param {(path: string) => string|undefined} [props.errorAt] `'0.label'`
 * @param {boolean} [props.disabled]
 */
export default function StatsEditor({ value = [], onChange, errorAt, disabled = false }) {
  const rows = Array.isArray(value) ? value : [];
  const full = rows.length >= LIMITS.heroStats;

  const setRow = (index, field, next) =>
    onChange?.(rows.map((row, at) => (at === index ? { ...row, [field]: next } : row)));

  const remove = (index) => onChange?.(rows.filter((_row, at) => at !== index));

  const add = () => onChange?.([...rows, { label: '', value: '', suffix: '' }]);

  return (
    <div className={styles.repeater}>
      <p className={styles.repeaterCount}>
        {rows.length} of {LIMITS.heroStats} — the hero draws them in one row.
      </p>

      {rows.length === 0 ? (
        <p className={styles.repeaterEmpty}>
          No counters — the hero leaves the strip out entirely.
        </p>
      ) : (
        <SortableList
          label="Hero statistics"
          items={rows}
          disabled={disabled}
          getId={(_row, index) => index}
          getLabel={(row) => row?.label || 'A counter with no label'}
          onReorder={(next) => onChange?.(next)}
          renderItem={(row, index) => (
            <div className={[styles.repeaterRow, styles.repeaterRowThree].join(' ')}>
              <TextField
                label="Label"
                value={row?.label ?? ''}
                onChange={(event) => setRow(index, 'label', event.target.value)}
                error={errorAt?.(`${index}.label`)}
                placeholder="Properties listed"
                disabled={disabled}
              />
              <TextField
                label="Value"
                value={row?.value ?? ''}
                onChange={(event) => setRow(index, 'value', event.target.value)}
                error={errorAt?.(`${index}.value`)}
                placeholder="500"
                disabled={disabled}
              />
              <TextField
                label="Suffix"
                value={row?.suffix ?? ''}
                onChange={(event) => setRow(index, 'suffix', event.target.value)}
                error={errorAt?.(`${index}.suffix`)}
                placeholder="+"
                disabled={disabled}
              />
              <IconButton
                label={`Remove ${row?.label || `counter ${index + 1}`}`}
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
          disabled={disabled || full}
          icon={<Icon icon="mdi:plus" width="16" height="16" />}
        >
          Add a counter
        </Button>
        {full ? <span className={styles.hint}>Four is what the strip can hold.</span> : null}
      </div>
    </div>
  );
}
