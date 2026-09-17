import { Icon } from '@iconify/react';

import Button from '../../../ui/Button';
import IconButton from '../../../ui/IconButton';
import MultiSelect from '../../../admin/MultiSelect';
import SortableList from '../../../admin/SortableList';
import { SelectField, SwitchField, TextField } from '../../../ui';

import styles from '../BlockEditor.module.css';

/**
 * The boxes a `leadForm` block asks for.
 *
 * A row is one `LeadForm` field descriptor (`utils/leadSources.js`): a name the
 * API files it under, the label the visitor reads, a control type, whether it
 * is compulsory, and — for a select — its choices. Four names are special:
 * `name`, `phone`, `email` and `message` are the columns §6.7 stores at the top
 * level of a lead; everything else lands in `lead.meta`, which is why a "Team
 * size" box does not need a schema change to be captured (D56).
 *
 * @param {object} props
 * @param {Array<object>} props.value
 * @param {(fields: Array<object>) => void} props.onChange
 * @param {Record<string, string>} [props.errors] keyed `fields.0.name`
 * @param {boolean} [props.disabled]
 */

/** The controls a CMS-authored form may use. */
const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'email', label: 'E-mail' },
  { value: 'tel', label: 'Phone' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Choice' },
  { value: 'date', label: 'Date' },
];

/** The four answers that become columns of the lead rather than `meta` (§6.7). */
export const TOP_LEVEL_NAMES = ['name', 'phone', 'email', 'message'];

/** The four boxes a new form opens with. */
export const STARTER_FIELDS = [
  { name: 'name', label: 'Your name', type: 'text', required: true, placeholder: 'Full name' },
  { name: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: '98765 43210' },
  {
    name: 'email',
    label: 'E-mail',
    type: 'email',
    required: false,
    placeholder: 'you@example.com',
  },
  { name: 'message', label: 'Message', type: 'textarea', required: false, placeholder: '' },
];

/** `Team size` → `teamSize`, which is the key the lead is stored under. */
export function toFieldName(label) {
  const words = String(label ?? '')
    .replace(/[^A-Za-z0-9 ]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return '';
  return words
    .map((word, index) =>
      index === 0
        ? word.toLowerCase()
        : `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`.replace(/\s/g, '')
    )
    .join('');
}

export default function LeadFieldsBuilder({ value, onChange, errors = {}, disabled = false }) {
  const fields = Array.isArray(value) ? value : [];
  const rows = fields.map((field, index) => ({ key: index, field }));

  const setField = (index, patch) =>
    onChange(fields.map((field, at) => (at === index ? { ...field, ...patch } : field)));

  const remove = (index) => onChange(fields.filter((_field, at) => at !== index));

  const add = () =>
    onChange([
      ...fields,
      { name: '', label: '', type: 'text', required: false, placeholder: '', options: [] },
    ]);

  const nameOf = (field, index) => field?.label || field?.name || `Box ${index + 1}`;

  return (
    <fieldset className={styles.repeater} disabled={disabled}>
      <legend className={styles.repeaterLegend}>Boxes</legend>
      <p className={styles.repeaterHint}>
        Name, phone, e-mail and message are stored as the lead’s own columns; every other box is
        kept with the lead and shown on its page.
      </p>

      {fields.length > 0 ? (
        <SortableList
          items={rows}
          disabled={disabled}
          label="Form boxes, in order"
          getId={(row) => row.key}
          getLabel={(row, index) => nameOf(row.field, index)}
          onReorder={(next) => onChange(next.map((row) => row.field))}
          renderItem={(row, index) => (
            <div className={styles.repeaterRow}>
              <div className={styles.repeaterHead}>
                <span className={styles.repeaterName}>
                  {index + 1}. {nameOf(row.field, index)}
                  {TOP_LEVEL_NAMES.includes(row.field?.name) ? (
                    <span className={styles.repeaterTag}>lead column</span>
                  ) : null}
                </span>
                <span className={styles.repeaterActions}>
                  <IconButton
                    label={`Remove ${nameOf(row.field, index)}`}
                    size="sm"
                    disabled={disabled}
                    onClick={() => remove(index)}
                  >
                    <Icon icon="mdi:close" width="18" height="18" />
                  </IconButton>
                </span>
              </div>

              <div className={styles.repeaterBody}>
                <div className={styles.grid}>
                  <div className={styles.half}>
                    <TextField
                      label="Label"
                      value={row.field?.label ?? ''}
                      required
                      disabled={disabled}
                      error={errors[`fields.${index}.label`]}
                      onChange={(event) => {
                        const label = event.target.value;
                        // The stored key follows the label until it is edited,
                        // so an editor never has to think about `teamSize`.
                        const derived = toFieldName(row.field?.label ?? '');
                        const keep = row.field?.name && row.field.name !== derived;
                        setField(index, {
                          label,
                          ...(keep ? null : { name: toFieldName(label) }),
                        });
                      }}
                    />
                  </div>
                  <div className={styles.half}>
                    <TextField
                      label="Stored as"
                      value={row.field?.name ?? ''}
                      required
                      disabled={disabled}
                      hint="The key the answer is filed under."
                      error={errors[`fields.${index}.name`]}
                      onChange={(event) => setField(index, { name: event.target.value.trim() })}
                    />
                  </div>
                  <div className={styles.half}>
                    <SelectField
                      label="Control"
                      value={row.field?.type ?? 'text'}
                      options={FIELD_TYPES}
                      disabled={disabled}
                      onChange={(event) => setField(index, { type: event.target.value })}
                    />
                  </div>
                  <div className={styles.half}>
                    <TextField
                      label="Placeholder"
                      value={row.field?.placeholder ?? ''}
                      disabled={disabled}
                      onChange={(event) => setField(index, { placeholder: event.target.value })}
                    />
                  </div>

                  {row.field?.type === 'select' ? (
                    <div className={styles.full}>
                      <MultiSelect
                        label="Choices"
                        options={optionRows(row.field)}
                        value={optionRows(row.field).map((option) => option.value)}
                        creatable
                        disabled={disabled}
                        hint="Type a choice and pick “Add …”. Drag is not needed — the order is the order you add them."
                        error={errors[`fields.${index}.options`]}
                        onCreate={(input) => {
                          const label = String(input).trim();
                          if (!label) return null;
                          return { value: toFieldName(label) || label, label };
                        }}
                        onChange={(next) => {
                          const known = new Map(
                            optionRows(row.field).map((option) => [option.value, option.label])
                          );
                          setField(index, {
                            options: next.map((entry) => ({
                              value: entry,
                              label: known.get(entry) ?? entry,
                            })),
                          });
                        }}
                      />
                    </div>
                  ) : null}

                  <div className={styles.full}>
                    <SwitchField
                      label="Compulsory"
                      checked={Boolean(row.field?.required)}
                      disabled={disabled}
                      onChange={(next) => setField(index, { required: next })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        />
      ) : (
        <p className={styles.repeaterEmpty}>
          No boxes yet — a form with none of them cannot capture anything.
        </p>
      )}

      <div className={styles.repeaterFooter}>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          icon={<Icon icon="mdi:plus" width="16" height="16" />}
          onClick={add}
        >
          Add box
        </Button>
        {fields.length === 0 ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => onChange(STARTER_FIELDS)}
          >
            Use the usual four
          </Button>
        ) : null}
      </div>
    </fieldset>
  );
}

/** A select's choices as `{ value, label }`, however the record spells them. */
function optionRows(field) {
  return (Array.isArray(field?.options) ? field.options : []).map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option
  );
}
